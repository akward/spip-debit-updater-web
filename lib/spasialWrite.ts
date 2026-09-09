/**
 * Spasial Google Sheets writer - accepts client precomputed values
 * (avoids uploading large xlsx through Vercel 4.5MB limit).
 */
import { getSheetsClient } from "@/lib/sheets";
import {
  spasialTasksForGroup,
  spasialEnvForGroup,
  cleanKey,
  type PrecomputedTask,
  type SpasialMode,
} from "@/lib/spasialCore";

/** Resolve value with blank-key aliases (n/a <-> 0000) and zero-pad variants. */
function resolveValueForKey(
  values: Record<string, number>,
  k: string
): number {
  if (k in values) return values[k] ?? 0;
  if (k === "n/a" && "0000" in values) return values["0000"] ?? 0;
  if (k === "0000" && "n/a" in values) return values["n/a"] ?? 0;
  const digits = k.replace(/\D/g, "");
  if (digits) {
    const padded = digits.slice(0, 4).padStart(4, "0");
    if (padded in values) return values[padded] ?? 0;
  }
  return 0;
}

async function ensureMonthSheet(
  sheetsApi: Awaited<ReturnType<typeof getSheetsClient>>,
  spreadsheetId: string,
  monthLabel: string
): Promise<string> {
  const meta = await sheetsApi.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "");
  if (titles.includes(monthLabel)) return monthLabel;

  const template =
    titles.find((t) => /maret/i.test(t)) ||
    titles.find((t) => /\d{4}/.test(t)) ||
    titles[0];
  if (!template) throw new Error("Spreadsheet Spasial kosong (tidak ada sheet).");
  const src = (meta.data.sheets || []).find((s) => s.properties?.title === template);
  const sheetId = src?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Sheet template '${template}' tidak ditemukan.`);
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: sheetId,
            insertSheetIndex: 0,
            newSheetName: monthLabel,
          },
        },
      ],
    },
  });
  return monthLabel;
}

function colToA1(colIdx: number): string {
  let n = colIdx + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function findColIdx(headersClean: string[], label: string): number {
  const labelClean = label.toLowerCase().replace(/[\s_\-]/g, "");
  let colIdx = headersClean.findIndex((h) => h === labelClean);
  if (colIdx >= 0) return colIdx;
  colIdx = headersClean.findIndex(
    (h) => h.includes(labelClean) || labelClean.includes(h)
  );
  if (colIdx >= 0) return colIdx;
  const aliases: Record<string, string[]> = {
    jumlahue: ["jumlahue", "jumlaue", "jumlahuangelektronik", "jumlahueberedar"],
    registered: ["registered", "ueregistered"],
    unregistered: ["unregistered", "ueunregistered"],
    chipbased: ["chipbased", "chip"],
    serverbased: ["serverbased", "server"],
    danafloat: ["danafloat", "float"],
    mesinreader: ["mesinreader", "reader", "jumlahreader"],
    kartuatm: ["kartuatm", "jumlahkartuatm"],
    kartudebet: ["kartudebet", "kartudebit", "jumlahkartudebet"],
    mesinatm: ["mesinatm", "jumlahmesinatm"],
    voltunai: ["voltunai", "voltariktunai"],
    nomtunai: ["nomtunai", "nomtariktunai"],
    volsetortunai: ["volsetortunai", "volsetor"],
    nomsetortunai: ["nomsetortunai", "nomsetor"],
    volbelanja: ["volbelanja"],
    nombelanja: ["nombelanja"],
    volpembayaran: ["volpembayaran"],
    nompembayaran: ["nompembayaran"],
    volinterbank: ["volinterbank"],
    nominterbank: ["nominterbank"],
    volantarbank: ["volantarbank"],
    nomantarbank: ["nomantarbank"],
    voltariktunai: ["voltariktunai", "voltarik"],
    nomtariktunai: ["nomtariktunai"],
    volinitial: ["volinitial"],
    nominitial: ["nominitial"],
    volreload: ["volreload", "voltopup"],
    nomreload: ["nomreload", "nomtopup"],
    voltransferantarue: ["voltransferantarue", "voltransferantar"],
    nomtransferantarue: ["nomtransferantarue", "nomtransferantar"],
    volredeem: ["volredeem", "volreedem"],
    nomredeem: ["nomredeem", "nomreedem"],
    voltransferkerekening: ["voltransferkerekening", "voltransferrekening"],
    nomtransferkerekening: ["nomtransferkerekening", "nomtransferrekening"],
    voltransferpemerintah: ["voltransferpemerintah"],
    nomtransferpemerintah: ["nomtransferpemerintah"],
  };
  const alts = aliases[labelClean] || [];
  for (const a of alts) {
    colIdx = headersClean.findIndex((h) => h === a || h.includes(a));
    if (colIdx >= 0) return colIdx;
  }
  return -1;
}

export async function processSpasialPrecomputed(opts: {
  group: string;
  monthLabel: string;
  dryRun: boolean;
  precomputed: PrecomputedTask[];
  onProgress?: (msg: string, index: number, total: number) => void;
}): Promise<{
  results: Array<Record<string, unknown>>;
  summary: { total: number; ok: number; errors: number };
}> {
  const tasks = spasialTasksForGroup(opts.group);
  if (!tasks) throw new Error(`Group spasial tidak dikenal: ${opts.group}`);

  const envKey = spasialEnvForGroup(opts.group);
  const spreadsheetId = process.env[envKey];
  if (!spreadsheetId) {
    return {
      results: opts.precomputed.map((t) => ({
        job: t.label,
        status: "error",
        reason: `Env ${envKey} belum di-set`,
      })),
      summary: { total: opts.precomputed.length, ok: 0, errors: opts.precomputed.length },
    };
  }

  if (opts.dryRun) {
    const results = opts.precomputed.map((t) => ({
      job: t.label,
      status: t.file || Object.keys(t.values).length ? "ok" : "warn",
      file: t.file,
      spatialKeys: t.spatialKeys,
      lsbuKeys: t.lsbuKeys,
      nonzero: Object.values(t.values).filter((v) => v !== 0).length,
      sumExpr1: t.sumExpr1,
      sumExpr2: t.sumExpr2,
      exprCols: t.exprCols,
      blankKeyValue: t.blankKeyValue,
      blankRowCount: t.blankRowCount,
      formula:
        t.mode === "kartu"
          ? `sum(expr_1)-sum(expr_2)=${(t.sumExpr1 || 0) - (t.sumExpr2 || 0)}`
          : t.mode,
      mode: "dry-run-client-parse",
    }));
    return {
      results,
      summary: {
        total: results.length,
        ok: results.filter((r) => r.status === "ok").length,
        errors: 0,
      },
    };
  }

  const sheetsApi = await getSheetsClient();
  const sheetName = await ensureMonthSheet(sheetsApi, spreadsheetId, opts.monthLabel);

  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'`,
    majorDimension: "ROWS",
  });
  const grid = (res.data.values || []) as string[][];
  if (!grid.length) throw new Error(`Sheet '${sheetName}' kosong.`);

  const headers = grid[0].map((h) => String(h ?? ""));
  const headersClean = headers.map((h) =>
    h.toLowerCase().replace(/[\s_\-]/g, "")
  );
  const keyByRow: string[] = [];
  for (let i = 1; i < grid.length; i++) {
    keyByRow[i] = cleanKey(grid[i]?.[1]);
  }

  const results: Array<Record<string, unknown>> = [];
  let ok = 0;
  let errors = 0;

  for (let ti = 0; ti < opts.precomputed.length; ti++) {
    const pre = opts.precomputed[ti];
    const task = tasks.find((t) => t.label === pre.label) || tasks[ti];
    opts.onProgress?.(pre.label, ti + 1, opts.precomputed.length);
    try {
      if (!Object.keys(pre.values).length && !pre.file) {
        results.push({
          job: pre.label,
          status: "warn",
          reason: "Tidak ada data precomputed",
        });
        continue;
      }
      const colIdx = findColIdx(headersClean, task?.label || pre.label);
      if (colIdx < 0) {
        results.push({
          job: pre.label,
          status: "error",
          reason: `Kolom tidak ditemukan untuk '${pre.label}'`,
          headersSample: headers.slice(0, 15),
        });
        errors++;
        continue;
      }

      const mode = pre.mode as SpasialMode;
      const data: { range: string; values: (string | number)[][] }[] = [];
      let written = 0;
      for (let r = 1; r < grid.length; r++) {
        const k = keyByRow[r];
        if (!k) continue;
        const val = resolveValueForKey(pre.values, k);
        const cell =
          mode === "nom" || mode === "col_juta"
            ? Math.round(val * 100) / 100
            : Math.round(val);
        const a1 = `'${sheetName.replace(/'/g, "''")}'!${colToA1(colIdx)}${r + 1}`;
        data.push({ range: a1, values: [[cell]] });
        written++;
      }
      for (let i = 0; i < data.length; i += 400) {
        const chunk = data.slice(i, i + 400);
        await sheetsApi.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: { valueInputOption: "USER_ENTERED", data: chunk },
        });
      }

      results.push({
        job: pre.label,
        status: "ok",
        file: pre.file,
        column: headers[colIdx],
        sheet: sheetName,
        written,
        spatialKeys: pre.spatialKeys,
        lsbuKeys: pre.lsbuKeys,
        mode: "write-client-parse",
      });
      ok++;
    } catch (e) {
      results.push({
        job: pre.label,
        status: "error",
        reason: e instanceof Error ? e.message : String(e),
      });
      errors++;
    }
  }

  return { results, summary: { total: opts.precomputed.length, ok, errors } };
}
