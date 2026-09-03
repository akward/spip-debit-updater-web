import { getSheetsClient } from "./sheets";
import type { Row } from "./parse";
import { normalizeId } from "./parse";

function colToA1(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, tries = 8): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/429|Quota|rate|502|503|timeout/i.test(msg) || i === tries - 1) throw e;
      const wait = /429|Quota|Write requests/i.test(msg)
        ? 15_000 * (i + 1)
        : 1500 * (i + 1);
      await sleep(wait);
    }
  }
  throw last;
}

function pick(row: Row, names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return undefined;
}

function qSheet(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

async function resolveSheetTitle(
  spreadsheetId: string,
  wanted: string,
  aliases: string[] = []
): Promise<string> {
  const sheets = await getSheetsClient();
  const meta = await withRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    })
  );
  const titles =
    meta.data.sheets?.map((s) => String(s.properties?.title || "")) || [];
  const candidates = [wanted, ...aliases].filter(Boolean);

  for (const c of candidates) {
    if (titles.includes(c)) return c;
  }
  const lower = (s: string) => s.trim().toLowerCase();
  for (const c of candidates) {
    const hit = titles.find((t) => lower(t) === lower(c));
    if (hit) return hit;
  }
  for (const c of candidates) {
    const hit = titles.find(
      (t) => lower(t).includes(lower(c)) || lower(c).includes(lower(t))
    );
    if (hit) return hit;
  }

  throw new Error(
    `Worksheet tidak ditemukan: "${wanted}". Sheet yang ada: ${titles.slice(0, 30).join(" | ")}`
  );
}

function lookupVals(
  byId: Map<string, number[]>,
  rawId: string,
  width: number
): number[] {
  const id = normalizeId(rawId);
  if (byId.has(id)) return byId.get(id)!;
  const bare = id.replace(/^0+/, "") || "0";
  for (const [k, v] of byId.entries()) {
    if (k === id) return v;
    if ((k.replace(/^0+/, "") || "0") === bare) return v;
  }
  return Array(width).fill(0);
}

const ATM_TYPE_MAP: Record<string, number> = {
  ACMAT: 0,
  ACMCD: 1,
  ACMAC: 2,
  ACMNT: 3,
};
const ATM_SUB = ["ATM", "CDM", "ATM+CDM", "Non Tunai", "Total Mesin"];

export async function updateMesinAtmMatrix(opts: {
  spreadsheetId: string;
  sheetName?: string;
  monthLabel: string;
  rows: Row[];
  headerBulanRow?: number;
  headerColRow?: number;
  dataStartRow?: number;
}): Promise<{ written: number; appended: number; mode: string; sheet?: string; matched?: number; sourceIds?: number }> {
  const {
    spreadsheetId,
    sheetName = "Jumlah Mesin ATM",
    monthLabel,
    rows,
    headerBulanRow = 3,
    headerColRow = 4,
    dataStartRow = 5,
  } = opts;

  const resolved = await resolveSheetTitle(spreadsheetId, sheetName);
  const sheets = await getSheetsClient();
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${qSheet(resolved)}!A1:AZ5000`,
      majorDimension: "ROWS",
    })
  );
  const sheetValues = res.data.values || [];
  if (sheetValues.length < headerColRow) {
    throw new Error(`Sheet ${resolved} terlalu pendek`);
  }

  const subHeaders = sheetValues[headerColRow - 1].map((h) => String(h ?? ""));
  const bulanRow = (sheetValues[headerBulanRow - 1] || []).map((h) => String(h ?? ""));

  const byId = new Map<string, number[]>();
  for (const r of rows) {
    const id = normalizeId(pick(r, ["idpelapor", "SANDI_PELAPOR"]) || "");
    if (!id) continue;
    const jenis = String(pick(r, ["jenismesin", "jenis_mesin"]) || "ACMAT")
      .trim()
      .toUpperCase();
    const val = Number(String(pick(r, ["expr_1", "jumlah"]) || "0").replace(/,/g, ""));
    if (!Number.isFinite(val)) continue;
    if (!byId.has(id)) byId.set(id, [0, 0, 0, 0, 0]);
    const arr = byId.get(id)!;
    const idx = ATM_TYPE_MAP[jenis];
    if (idx !== undefined) arr[idx] += val;
    arr[4] = arr[0] + arr[1] + arr[2] + arr[3];
  }

  let startCol0: number;
  if (bulanRow.includes(monthLabel)) {
    startCol0 = bulanRow.indexOf(monthLabel);
  } else if (subHeaders.includes(monthLabel)) {
    startCol0 = subHeaders.indexOf(monthLabel);
  } else {
    startCol0 = Math.max(subHeaders.length, bulanRow.length);
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${qSheet(resolved)}!${colToA1(startCol0 + 1)}${headerBulanRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[monthLabel]] },
      })
    );
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${qSheet(resolved)}!${colToA1(startCol0 + 1)}${headerColRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [ATM_SUB] },
      })
    );
  }

  const dataRows = sheetValues.slice(dataStartRow - 1);
  const matrix: number[][] = [];
  const existing = new Set<string>();

  for (const row of dataRows) {
    const raw = row?.[0];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      matrix.push([0, 0, 0, 0, 0]);
      continue;
    }
    const id = normalizeId(raw);
    existing.add(id);
    const vals = lookupVals(byId, raw, 5);
    matrix.push([...vals]);
  }

  if (matrix.length) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${qSheet(resolved)}!${colToA1(startCol0 + 1)}${dataStartRow}:${colToA1(startCol0 + 5)}${dataStartRow + matrix.length - 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: matrix },
      })
    );
  }

  // ID baru hanya jika total != 0
  let appended = 0;
  for (const [id, vals] of byId.entries()) {
    if (vals[4] === 0) continue;
    if (existing.has(id)) continue;
    const newRow: (string | number)[] = Array(startCol0 + 5).fill("");
    newRow[0] = id;
    for (let i = 0; i < 5; i++) newRow[startCol0 + i] = vals[i];
    await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${qSheet(resolved)}!A${dataStartRow}`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [newRow] },
      })
    );
    appended++;
  }

  const matched = matrix.filter((r) => r.some((x) => x !== 0)).length;
  await sleep(700);
  return {
    written: matrix.length,
    appended,
    matched,
    sourceIds: byId.size,
    mode: "matrix-atm",
    sheet: resolved,
  };
}

const EDC_SUB = ["Open Loop", "Close Loop", "Total"];

const EDC_SHEET_ALIASES: Record<string, string[]> = {
  "EDC UE": ["EDC Uang Elektronik", "EDC UE", "EDC UangElektronik"],
  "EDC Uang Elektronik": ["EDC Uang Elektronik", "EDC UE"],
  "EDC Debet": ["EDC Debet", "EDC Debit"],
  "EDC Kredit": ["EDC Kredit", "EDC Credit"],
  "EDC Gabungan": ["EDC Gabungan"],
  "Merchant Debet": ["Merchant Debet", "Merchant Debit"],
  "Merchant Kredit": ["Merchant Kredit", "Merchant Credit"],
  "Merchant Uang Elektronik": ["Merchant Uang Elektronik", "Merchant UE"],
  "Merchant UE": ["Merchant Uang Elektronik", "Merchant UE"],
  "Merchant Gabungan": ["Merchant Gabungan"],
};

export async function updateEdcMatrix(opts: {
  spreadsheetId: string;
  sheetName: string;
  monthLabel: string;
  rows: Row[];
  valueField?: string;
  headerBulanRow?: number;
  headerColRow?: number;
  dataStartRow?: number;
}): Promise<{ written: number; appended: number; mode: string; sheet?: string; matched?: number; sourceIds?: number }> {
  const {
    spreadsheetId,
    sheetName,
    monthLabel,
    rows,
    valueField = "expr_1",
    headerBulanRow = 3,
    headerColRow = 4,
    dataStartRow = 5,
  } = opts;

  const aliases = EDC_SHEET_ALIASES[sheetName] || [sheetName];
  const resolved = await resolveSheetTitle(spreadsheetId, sheetName, aliases);

  const sheets = await getSheetsClient();
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${qSheet(resolved)}!A1:AZ5000`,
      majorDimension: "ROWS",
    })
  );
  const sheetValues = res.data.values || [];
  if (sheetValues.length < headerColRow) {
    throw new Error(`Sheet ${resolved} terlalu pendek`);
  }

  const subHeaders = sheetValues[headerColRow - 1].map((h) => String(h ?? ""));
  const bulanRow = (sheetValues[headerBulanRow - 1] || []).map((h) => String(h ?? ""));

  const byId = new Map<string, number[]>();
  for (const r of rows) {
    const id = normalizeId(pick(r, ["idpelapor", "SANDI_PELAPOR"]) || "");
    if (!id) continue;
    let status = String(pick(r, ["statusmesin", "status_mesin"]) || "OL")
      .trim()
      .toUpperCase();
    if (status === "OPEN LOOP" || status === "OPEN") status = "OL";
    if (status === "CLOSE LOOP" || status === "CLOSE" || status === "CLOSED") status = "CL";
    const val = Number(
      String(
        pick(r, [
          valueField,
          valueField === "expr_2" ? "expr_2" : "expr_1",
          valueField === "expr_2" ? "jumlah_merchant" : "jumlah_mesin",
          valueField === "expr_2" ? "JUMLAH_MERCHANT" : "JUMLAH_MESIN",
          "jumlahmerchant",
          "jumlahmesin",
          "expr_2",
          "expr_1",
        ]) || "0"
      ).replace(/,/g, "")
    );
    if (!Number.isFinite(val)) continue;
    if (!byId.has(id)) byId.set(id, [0, 0, 0]);
    const arr = byId.get(id)!;
    if (status === "CL") arr[1] += val;
    else arr[0] += val;
    arr[2] = arr[0] + arr[1];
  }

  let startCol0: number;
  if (bulanRow.includes(monthLabel)) {
    startCol0 = bulanRow.indexOf(monthLabel);
  } else if (subHeaders.includes(monthLabel)) {
    startCol0 = subHeaders.indexOf(monthLabel);
  } else {
    startCol0 = Math.max(subHeaders.length, bulanRow.length);
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${qSheet(resolved)}!${colToA1(startCol0 + 1)}${headerBulanRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[monthLabel]] },
      })
    );
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${qSheet(resolved)}!${colToA1(startCol0 + 1)}${headerColRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [EDC_SUB] },
      })
    );
  }

  const dataRows = sheetValues.slice(dataStartRow - 1);
  const matrix: number[][] = [];
  const existing = new Set<string>();

  for (const row of dataRows) {
    const raw = row?.[0];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      matrix.push([0, 0, 0]);
      continue;
    }
    const id = normalizeId(raw);
    existing.add(id);
    const vals = lookupVals(byId, raw, 3);
    matrix.push([...vals]);
  }

  if (matrix.length) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${qSheet(resolved)}!${colToA1(startCol0 + 1)}${dataStartRow}:${colToA1(startCol0 + 3)}${dataStartRow + matrix.length - 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: matrix },
      })
    );
  }

  // ID baru hanya jika total != 0
  let appended = 0;
  for (const [id, vals] of byId.entries()) {
    if (vals[2] === 0) continue;
    if (existing.has(id)) continue;
    const newRow: (string | number)[] = Array(startCol0 + 3).fill("");
    newRow[0] = id;
    for (let i = 0; i < 3; i++) newRow[startCol0 + i] = vals[i];
    await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${qSheet(resolved)}!A${dataStartRow}`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [newRow] },
      })
    );
    appended++;
  }

  const matched = matrix.filter((r) => r.some((x) => x !== 0)).length;
  await sleep(700);
  return {
    written: matrix.length,
    appended,
    matched,
    sourceIds: byId.size,
    mode: "matrix-edc",
    sheet: resolved,
  };
}
