import { google } from "googleapis";
import { isMonthHeader, monthBefore } from "./months";

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

/** Retry on 429 / transient errors */
async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/429|Quota|rate|502|503|timeout/i.test(msg) || i === tries - 1) throw e;
      await sleep(1500 * (i + 1));
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
  /** Jika true dan map kosong → copy kolom bulan sebelumnya */
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
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  if (!sheet) {
    throw new Error(`Worksheet tidak ditemukan: ${sheetName}`);
  }

  const rangeAll = `'${sheetName}'!A1:ZZ`;
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
        range: `'${sheetName}'!${colToA1(colIndex + 1)}${headerRow}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[monthLabel]] },
      })
    );
    headers.push(monthLabel);
  }

  const keyIdx = headers.indexOf(keyHeader);
  if (keyIdx === -1) {
    // fraud penyebab kadang key di kolom A tanpa header "No" yang persis
    if (headers[0] === "No" || headers[0] === "") {
      // ok use 0
    } else {
      throw new Error(`Kolom '${keyHeader}' tidak ada di header sheet ${sheetName}`);
    }
  }
  const kIdx = keyIdx >= 0 ? keyIdx : 0;

  const dataRows = rows.slice(dataStartRow - 1);
  const nRows = dataRows.length;

  // ---- no source data → copy previous month (CLI parity) ----
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
            range: `'${sheetName}'!${colToA1(colIndex + 1)}${dataStartRow}:${colToA1(colIndex + 1)}${dataStartRow + values.length - 1}`,
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
    // zeros
    const zeros = Array.from({ length: nRows }, () => [0]);
    if (zeros.length) {
      await withRetry(() =>
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!${colToA1(colIndex + 1)}${dataStartRow}:${colToA1(colIndex + 1)}${dataStartRow + zeros.length - 1}`,
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

  // ---- write values ----
  const colValues: (string | number)[][] = [];
  let written = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rawKey = row?.[kIdx];
    if (rawKey === undefined || rawKey === null || String(rawKey).trim() === "") {
      colValues.push([0]);
      continue;
    }
    const key = String(rawKey).replace(/\.0$/, "").trim();
    if (key === "Total") {
      colValues.push([0]);
      continue;
    }
    const val = valuesById.has(key)
      ? valuesById.get(key)!
      : valuesById.has(String(Number(key)))
        ? valuesById.get(String(Number(key)))!
        : 0;
    colValues.push([val]);
    written++;
  }

  if (colValues.length) {
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!${colToA1(colIndex + 1)}${dataStartRow}:${colToA1(colIndex + 1)}${dataStartRow + colValues.length - 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: colValues },
      })
    );
  }

  const existing = new Set(
    dataRows
      .map((r) => String(r?.[kIdx] ?? "").replace(/\.0$/, "").trim())
      .filter(Boolean)
  );
  const toAppend: (string | number)[][] = [];
  for (const [id, val] of valuesById.entries()) {
    if (val <= 0) continue;
    if (existing.has(id) || existing.has(String(Number(id)))) continue;
    const row: (string | number)[] = Array(Math.max(headers.length, colIndex + 1)).fill(
      ""
    );
    row[kIdx] = Number.isFinite(Number(id)) ? Number(id) : id;
    row[colIndex] = val;
    toAppend.push(row);
  }
  if (toAppend.length) {
    await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetName}'!A${dataStartRow}`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: toAppend },
      })
    );
  }

  await sleep(400); // mild throttle
  return {
    written,
    appended: toAppend.length,
    column: colIndex + 1,
    mode: "write",
  };
}
