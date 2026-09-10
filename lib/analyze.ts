import { getSheetsClient } from "@/lib/sheets";
import { isMonthHeader } from "@/lib/months";

export type MetricKind = "vol" | "nom" | "count";

export type AnalyzeSheetResult = {
  sheet: string;
  kind: MetricKind;
  latestMonth: string | null;
  histMonths: string[];
  flagged: number;
  rowsScanned: number;
  skipped?: string;
};

export type AnalyzeResult = {
  ok: boolean;
  group: string;
  spreadsheetId: string;
  sheets: AnalyzeSheetResult[];
  totalFlagged: number;
};

function metricKind(sheetName: string): MetricKind {
  const n = sheetName.toLowerCase();
  if (/\bvolume\b|\bvol\b/.test(n) || n.includes("volume")) return "vol";
  if (/\bnominal\b|\bnom\b/.test(n) || n.includes("nominal")) return "nom";
  return "count";
}

/** Parse angka format ID: 1.234.567,89 → 1234567.89 */
export function parseIdNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s || s === "-" || s === "—") return null;
  s = s.replace(/\s/g, "");
  if (!/^-?[\d.,]+$/.test(s)) return null;
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2)
      s = parts[0].replace(/\./g, "") + "." + parts[1];
    else s = s.replace(/,/g, "");
  } else {
    if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function median(vals: number[]): number {
  const a = [...vals].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}

function mean(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function stdev(vals: number[], mu: number): number {
  if (vals.length < 2) return 0;
  const v = vals.reduce((s, x) => s + (x - mu) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(v);
}

/** Deteksi anomali: rule nol + z-score / deviasi, terpisah vol|nom|count */
export function isAnomaly(
  kind: MetricKind,
  last: number | null,
  hist: number[]
): boolean {
  const prev = hist.filter((v) => v !== null && Number.isFinite(v) && v !== 0);
  const histAll = hist.filter((v) => v !== null && Number.isFinite(v));

  if (prev.length > 0 && (last === null || last === 0 || !Number.isFinite(last))) {
    return true;
  }
  if (last === null || !Number.isFinite(last) || histAll.length < 2) return false;

  const mu = mean(histAll);
  const sd = stdev(histAll, mu);
  const z = sd > 1e-9 ? (last - mu) / sd : 0;
  const med = median(histAll);
  const pct = med > 1e-9 ? (Math.abs(last - med) / med) * 100 : 0;

  if (kind === "count") {
    return Math.abs(z) > 2.5;
  }
  if (kind === "vol") {
    return Math.abs(z) > 2.0 || pct > 50;
  }
  const sorted = [...histAll].sort((a, b) => a - b);
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]!;
  return Math.abs(z) > 2.0 || (last >= p90 && Math.abs(z) > 1.5) || pct > 40;
}

function findHeaderRow(rows: string[][]): number {
  let best = 0;
  let bestScore = -1;
  const limit = Math.min(rows.length, 8);
  for (let r = 0; r < limit; r++) {
    const score = (rows[r] || []).filter((c) => isMonthHeader(String(c || ""))).length;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore > 0 ? best : 0;
}

const YELLOW = { red: 1, green: 1, blue: 0 };
const WHITE = { red: 1, green: 1, blue: 1 };

async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/429|Quota|rate|502|503/i.test(msg) || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw last;
}

const ANALYZE_GROUPS = new Set([
  "debit",
  "ue",
  "kk",
  "acquirer",
  "fraud_bank",
  "fraud_penyebab",
  "prop_channel",
]);

export function isAnalyzeGroup(group: string): boolean {
  return ANALYZE_GROUPS.has(group);
}

function resolveSpreadsheetIds(
  group: string
): { id: string; book?: string }[] {
  const env = (k: string) => process.env[k]?.trim() || "";

  if (group === "debit") {
    const id = env("SHEET_DEBIT");
    return id ? [{ id }] : [];
  }
  if (group === "ue") {
    const id = env("SHEET_UE");
    return id ? [{ id }] : [];
  }
  if (group === "kk") {
    const id = env("SHEET_KK");
    return id ? [{ id }] : [];
  }
  if (group === "fraud_bank") {
    const id = env("SHEET_FRAUD_BANK");
    return id ? [{ id }] : [];
  }
  if (group === "fraud_penyebab") {
    const id = env("SHEET_FRAUD_PENYEBAB");
    return id ? [{ id }] : [];
  }
  if (group === "prop_channel") {
    const id = env("SHEET_PROP_CHANNEL");
    return id ? [{ id }] : [];
  }
  if (group === "acquirer") {
    const out: { id: string; book?: string }[] = [];
    const trx = env("SHEET_ACQUIRER_TRX");
    const edc =
      env("SHEET_ACQUIRER_EDC") ||
      env("SHEET_ACQUIRER_TAHUN") ||
      env("SHEET_ACQUIRER");
    if (trx) out.push({ id: trx, book: "transaksi" });
    if (edc && edc !== trx) out.push({ id: edc, book: "tahun" });
    else if (edc) out.push({ id: edc, book: "tahun" });
    return out;
  }
  return [];
}

async function analyzeOneSpreadsheet(opts: {
  spreadsheetId: string;
  group: string;
  book?: string;
  historicalMonths: number;
  dryRun: boolean;
}): Promise<AnalyzeSheetResult[]> {
  const { spreadsheetId, historicalMonths, dryRun } = opts;
  const sheets = await getSheetsClient();
  const meta = await withRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })
  );

  const sheetList =
    meta.data.sheets?.map((s) => ({
      title: String(s.properties?.title || ""),
      sheetId: s.properties?.sheetId as number,
    })) || [];

  const results: AnalyzeSheetResult[] = [];
  const bookPrefix = opts.book ? `[${opts.book}] ` : "";

  for (const { title, sheetId } of sheetList) {
    if (!title || sheetId == null) continue;
    const kind = metricKind(title);
    const displayName = bookPrefix + title;

    const res = await withRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${title.replace(/'/g, "''")}'`,
        majorDimension: "ROWS",
      })
    );
    const rows = (res.data.values || []) as string[][];
    if (rows.length < 3) {
      results.push({
        sheet: displayName,
        kind,
        latestMonth: null,
        histMonths: [],
        flagged: 0,
        rowsScanned: 0,
        skipped: "terlalu sedikit baris",
      });
      continue;
    }

    const headerRowIdx = findHeaderRow(rows);
    const headers = (rows[headerRowIdx] || []).map((h) => String(h ?? ""));
    const monthCols: { col: number; label: string }[] = [];
    for (let c = 0; c < headers.length; c++) {
      if (isMonthHeader(headers[c]!)) monthCols.push({ col: c, label: headers[c]! });
    }
    if (monthCols.length < 2) {
      results.push({
        sheet: displayName,
        kind,
        latestMonth: null,
        histMonths: [],
        flagged: 0,
        rowsScanned: 0,
        skipped: "kolom bulan < 2",
      });
      continue;
    }

    const take = Math.min(monthCols.length, historicalMonths + 1);
    const window = monthCols.slice(-take);
    const latest = window[window.length - 1]!;
    const histCols = window.slice(0, -1);
    const dataStart = headerRowIdx + 1;

    const flagRowIndices0: number[] = [];

    for (let r = dataStart; r < rows.length; r++) {
      const row = rows[r] || [];
      const key = String(row[0] ?? "").trim();
      if (!key || /^total$/i.test(key)) continue;

      const histVals: number[] = [];
      for (const h of histCols) {
        const v = parseIdNumber(row[h.col]);
        if (v !== null) histVals.push(v);
      }
      const lastVal = parseIdNumber(row[latest.col]);

      if (isAnomaly(kind, lastVal, histVals)) {
        flagRowIndices0.push(r);
      }
    }

    if (!dryRun) {
      const requests: object[] = [];
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: dataStart,
            endRowIndex: rows.length,
            startColumnIndex: latest.col,
            endColumnIndex: latest.col + 1,
          },
          cell: { userEnteredFormat: { backgroundColor: WHITE } },
          fields: "userEnteredFormat.backgroundColor",
        },
      });
      let i = 0;
      while (i < flagRowIndices0.length) {
        let j = i + 1;
        while (
          j < flagRowIndices0.length &&
          flagRowIndices0[j] === flagRowIndices0[j - 1]! + 1
        ) {
          j++;
        }
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: flagRowIndices0[i],
              endRowIndex: flagRowIndices0[j - 1]! + 1,
              startColumnIndex: latest.col,
              endColumnIndex: latest.col + 1,
            },
            cell: { userEnteredFormat: { backgroundColor: YELLOW } },
            fields: "userEnteredFormat.backgroundColor",
          },
        });
        i = j;
      }
      for (let k = 0; k < requests.length; k += 40) {
        const chunk = requests.slice(k, k + 40);
        await withRetry(() =>
          sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests: chunk },
          })
        );
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    results.push({
      sheet: displayName,
      kind,
      latestMonth: latest.label,
      histMonths: histCols.map((h) => h.label),
      flagged: flagRowIndices0.length,
      rowsScanned: Math.max(0, rows.length - dataStart),
    });
  }

  return results;
}

/** Analisa anomali untuk group non-Spasial (Debit, UE, KK, Acquirer, Fraud, Prop). */
export async function analyzeGroupSpreadsheet(opts: {
  group: string;
  historicalMonths?: number;
  dryRun?: boolean;
}): Promise<AnalyzeResult> {
  const group = opts.group.toLowerCase();
  const historicalMonths = opts.historicalMonths ?? 3;
  const dryRun = opts.dryRun ?? false;

  if (group.startsWith("spasial_")) {
    throw new Error("Analisa anomali tidak diterapkan untuk Spasial");
  }
  if (!isAnalyzeGroup(group)) {
    throw new Error(`Group tidak didukung untuk analisa: ${group}`);
  }

  const targets = resolveSpreadsheetIds(group);
  if (!targets.length) {
    throw new Error(
      `Env spreadsheet untuk group '${group}' belum di-set (cek SHEET_* di Vercel)`
    );
  }

  const allSheets: AnalyzeSheetResult[] = [];
  let totalFlagged = 0;
  const ids: string[] = [];

  for (const t of targets) {
    ids.push(t.id);
    const part = await analyzeOneSpreadsheet({
      spreadsheetId: t.id,
      group,
      book: t.book,
      historicalMonths,
      dryRun,
    });
    for (const s of part) {
      totalFlagged += s.flagged;
      allSheets.push(s);
    }
  }

  return {
    ok: true,
    group,
    spreadsheetId: ids.join(","),
    sheets: allSheets,
    totalFlagged,
  };
}

/** @deprecated alias */
export async function analyzeDebitSpreadsheet(opts?: {
  historicalMonths?: number;
  dryRun?: boolean;
}): Promise<AnalyzeResult> {
  return analyzeGroupSpreadsheet({ group: "debit", ...opts });
}
