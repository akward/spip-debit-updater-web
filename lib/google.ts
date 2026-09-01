import { google } from "googleapis";

export function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "Env GOOGLE_SERVICE_ACCOUNT_JSON belum diset di Vercel (JSON service account satu baris)."
    );
  }
  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (harus JSON).");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: String(creds.private_key).replace(/\\n/g, "\n"),
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  return google.sheets({ version: "v4", auth });
}

export function spreadsheetIdFor(key: string): string {
  const mapRaw = process.env.SPREADSHEET_IDS_JSON;
  if (!mapRaw) {
    throw new Error('Env SPREADSHEET_IDS_JSON belum diset, contoh: {"debit":"1P5E..."}');
  }
  const map = JSON.parse(mapRaw) as Record<string, string>;
  const id = map[key];
  if (!id) throw new Error(`Spreadsheet key '${key}' tidak ada di SPREADSHEET_IDS_JSON`);
  return id;
}

export function previousMonthLabel(d = new Date()): string {
  const names = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const x = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${names[x.getMonth()]} ${x.getFullYear()}`;
}
