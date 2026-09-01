import { google } from "googleapis";

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
    throw new Error("GOOGLE_CREDENTIALS_JSON tidak valid (butuh client_email & private_key).");
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

export async function updateMonthColumn(opts: {
  spreadsheetId: string;
  sheetName: string;
  monthLabel: string;
  valuesById: Map<string, number>;
  headerRow?: number;
  dataStartRow?: number;
  keyHeader?: string;
}): Promise<{ written: number; appended: number; column: number }> {
  const {
    spreadsheetId,
    sheetName,
    monthLabel,
    valuesById,
    headerRow = 3,
    dataStartRow = 4,
    keyHeader = "No",
  } = opts;

  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheet) {
    throw new Error(`Worksheet tidak ditemukan: ${sheetName}`);
  }

  const rangeAll = `'${sheetName}'!A1:ZZ`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rangeAll,
    majorDimension: "ROWS",
  });
  const rows = res.data.values || [];
  if (rows.length < headerRow) {
    throw new Error(`Header row ${headerRow} tidak ada di sheet ${sheetName}`);
  }

  const headers = rows[headerRow - 1].map((h) => String(h ?? ""));
  let colIndex = headers.indexOf(monthLabel);
  if (colIndex === -1) {
    colIndex = headers.length;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!${colToA1(colIndex + 1)}${headerRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[monthLabel]] },
    });
  }

  const keyIdx = headers.indexOf(keyHeader);
  if (keyIdx === -1) {
    throw new Error(`Kolom '${keyHeader}' tidak ada di header sheet ${sheetName}`);
  }

  const dataRows = rows.slice(dataStartRow - 1);
  const updates: { range: string; values: string[][] }[] = [];
  let written = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rawKey = row[keyIdx];
    if (rawKey === undefined || rawKey === null || String(rawKey).trim() === "") continue;
    const key = String(rawKey).replace(/\.0$/, "").trim();
    const val = valuesById.has(key)
      ? valuesById.get(key)!
      : valuesById.has(String(Number(key)))
        ? valuesById.get(String(Number(key)))!
        : 0;
    const rowNum = dataStartRow + i;
    const a1 = `'${sheetName}'!${colToA1(colIndex + 1)}${rowNum}`;
    updates.push({ range: a1, values: [[String(val)]] });
    written++;
  }

  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: chunk,
      },
    });
  }

  const existing = new Set(
    dataRows
      .map((r) => String(r[keyIdx] ?? "").replace(/\.0$/, "").trim())
      .filter(Boolean)
  );
  const toAppend: (string | number)[][] = [];
  for (const [id, val] of valuesById.entries()) {
    if (val <= 0) continue;
    if (existing.has(id) || existing.has(String(Number(id)))) continue;
    const row: (string | number)[] = Array(Math.max(headers.length, colIndex + 1)).fill("");
    row[keyIdx] = Number.isFinite(Number(id)) ? Number(id) : id;
    row[colIndex] = val;
    toAppend.push(row);
  }
  if (toAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetName}'!A${dataStartRow}`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: toAppend },
    });
  }

  return { written, appended: toAppend.length, column: colIndex + 1 };
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
