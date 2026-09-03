import { google } from "googleapis";
import { isMonthHeader, monthBefore } from "./months";
import { normalizeId, lookupId } from "./parse";

export type Creds = {
  client_email: string;
  private_key: string;
};

export function loadCredentials(): Creds {
  const raw = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error(
      "Env GOOGLE_CREDENTIALS_JSON belum di-set (isi JSON service account)."
    );
  }
  const parsed = JSON.parse(raw) as Creds;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GOOGLE_CREDENTIALS_JSON tidak valid (butuh client_email & private_key)."
    );
  }
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

export async function getSheetsClient() {
  const creds = loadCredentials();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

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

export async function updateMonthColumn(opts: {
  spreadsheetId: string;
  sheetName: string;
  monthLabel: string;
  valuesById: Map<string, number>;
  headerRow?: number;
  dataStartRow?: number;
  keyHeader?: string;
  copyIfEmpty?: boolean;
}): Promise<{
  written: number;
  appended: number;
  column: number;
  mode: "write" | "copy-previous" | "zeros";
  copiedFrom?: string;
}> {
  const {
    spreadsheetId,
    sheetName,
    monthLabel,
    valuesById,
    headerRow = 3,
    dataStartRow = 4,
    keyHeader = "No",
    copyIfEmpty = true,
  } = opts;

  const sheets = await getSheetsClient();

  const meta = await withRetry(() =>
    sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    })
  );
  const titles = meta.data.sheets?.map((s) => String(s.properties?.title || "")) || [];
  let resolved =
    titles.find((t) => t === sheetName) ||
    titles.find((t) => t.trim().toLowerCase() === sheetName.trim().toLowerCase()) ||
    titles.find(
      (t) =>
        t.toLowerCase().includes(sheetName.trim().toLowerCase()) ||
        sheetName.trim().toLowerCase().includes(t.toLowerCase())
    );
  if (!resolved) {
    throw new Error(
      `Worksheet tidak ditemukan: "${sheetName}". Sheet yang ada: ${titles.slice(0, 40).join(" | ")}`
    );
  }
  const effectiveName = resolved;

  const rangeAll = `'${effectiveName.replace(/'/g, "''")}'!A1:AZ5000`;
  const res = await withRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeAll,
      majorDimension: "ROWS",
    })
  );
  const rows = res.data.values || [];
  if (rows.length < headerRow) {
    throw new Error(`Header row ${headerRow} tidak ada di sheet ${sheetName}`);
  }

  const headers = rows[headerRow - 1].map((h) => String(h ?? ""));
  let colIndex = headers.indexOf(monthLabel);
  if (colIndex === -1) {
    colIndex = headers.length;
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${effectiveName.replace(/'/g, "''")}'!${colToA1(colIndex + 1)}${headerRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[monthLabel]] },
      })
    );
    headers.push(monthLabel);
  }

  const keyIdx = headers.indexOf(keyHeader);
  if (keyIdx === -1) {
    if (!(headers[0] === "No" || headers[0] === "")) {
      throw new Error(`Kolom '${keyHeader}' tidak ada di header sheet ${sheetName}`);
    }
  }
  const kIdx = keyIdx >= 0 ? keyIdx : 0;

  const dataRows = rows.slice(dataStartRow - 1);
  const nRows = dataRows.length;

  const hasAny = [...valuesById.values()].some((v) => v !== 0);
  if (copyIfEmpty && (!valuesById.size || !hasAny)) {
    const prev =
      monthBefore(monthLabel) && headers.includes(monthBefore(monthLabel)!)
        ? monthBefore(monthLabel)!
        : [...headers].reverse().find((h) => h !== monthLabel && isMonthHeader(h));

    if (prev) {
      const prevIdx = headers.indexOf(prev);
      const values: (string | number)[][] = [];
      for (let i = 0; i < nRows; i++) {
        const cell = dataRows[i]?.[prevIdx];
        values.push([cell === undefined || cell === "" ? 0 : cell]);
      }
      if (values.length) {
        await withRetry(() =>
          sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${effectiveName.replace(/'/g, "''")}'!${colToA1(colIndex + 1)}${dataStartRow}:${colToA1(colIndex + 1)}${dataStartRow + values.length - 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values },
          })
        );
      }
      return {
        written: values.length,
        appended: 0,
        column: colIndex + 1,
        mode: "copy-previous",
        copiedFrom: prev,
      };
    }
    const zeros = Array.from({ length: nRows }, () => [0]);
    if (zeros.length) {
      await withRetry(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${effectiveName.replace(/'/g, "''")}'!${colToA1(colIndex + 1)}${dataStartRow}:${colToA1(colIndex + 1)}${dataStartRow + zeros.length - 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: zeros },
        })
      );
    }
    return {
      written: zeros.length,
      appended: 0,
      column: colIndex + 1,
      mode: "zeros",
    };
  }

  const colValues: (string | number)[][] = [];
  let written = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rawKey = row?.[kIdx];
    if (rawKey === undefined || rawKey === null || String(rawKey).trim() === "") {
      colValues.push([0]);
      continue;
    }
    const key = normalizeId(rawKey);
    if (key === "Total") {
      colValues.push([0]);
      continue;
    }
    const val = lookupId(valuesById, key);
    colValues.push([val]);
    written++;
  }

  if (colValues.length) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${effectiveName.replace(/'/g, "''")}'!${colToA1(colIndex + 1)}${dataStartRow}:${colToA1(colIndex + 1)}${dataStartRow + colValues.length - 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: colValues },
      })
    );
  }

  // Rule: ID baru tidak ditambahkan (hanya update baris yang sudah ada di sheet)
  const appended = 0;

  await sleep(700);
  return {
    written,
    appended,
    column: colIndex + 1,
    mode: "write",
  };
}
