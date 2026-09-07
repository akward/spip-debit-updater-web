/**
 * Spasial — parity with Spasial Debet / Kredit / UE .ipynb
 * sheet=bulan, rows=kode kota 4 digit, columns=metrik
 * Env: SHEET_SPASIAL_ATM | SHEET_SPASIAL_UE | SHEET_SPASIAL_KK
 */
import * as XLSX from "xlsx";
import { getSheetsClient } from "@/lib/sheets";
import type { Row } from "@/lib/parse";

export type SpasialMode =
  | "kartu"
  | "kk_sum"
  | "mesin"
  | "vol"
  | "nom"
  | "col_raw"
  | "col_juta"
  | "reader";

export type SpasialTask = {
  label: string;
  fileHints: string[];
  spKey: string;
  mode: SpasialMode;
  valueCol?: string;
  lsbuCodes?: string[];
  lsbuCols?: string[];
};

export const SPASIAL_ATM_TASKS: SpasialTask[] = [
  { label: "Kartu ATM", fileHints: ["jumlah_kartu_atm_beredar", "kartu_atm"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["001-Jumlah Kartu"], lsbuCols: ["KARTU_ATM"] },
  { label: "Kartu Debet", fileHints: ["jumlah_kartu_debet_beredar", "kartu_debet"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["001-Jumlah Kartu"], lsbuCols: ["KARTU_ATM_DEBIT"] },
  { label: "Mesin ATM", fileHints: ["jumlah_mesin_atm_beredar", "mesin_atm"], spKey: "lokasimesin", mode: "mesin", lsbuCodes: ["121-Jumlah Mesin ATM"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Vol Tunai", fileHints: ["transaksi_tunai_atm"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["081-Volume transaksi tarik tunai internasional", "082-Volume transaksi tarik tunai domestik"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Vol SetorTunai", fileHints: ["transaksi_setor_tunai_atm", "setor_tunai"], spKey: "lokasitransaksi", mode: "vol" },
  { label: "Vol Belanja", fileHints: ["transaksi_belanja_atm"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["086-Volume transaksi belanja internasional", "087-Volume transaksi belanja domestik"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Vol Pembayaran", fileHints: ["transaksi_pembayaran_atm"], spKey: "lokasitransaksi", mode: "vol" },
  { label: "Vol Interbank", fileHints: ["transfer_interbank_atm", "interbank"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["091-Volume transaksi transfer interbank"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Vol Antarbank", fileHints: ["transfer_antarbank_atm", "antarbank"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["092-Volume transaksi transfer antarbank"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Nom Tunai", fileHints: ["transaksi_tunai_atm"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["101-Nominal transaksi tarik tunai internasional", "102-Nominal transaksi tarik tunai domestik"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Nom Setor Tunai", fileHints: ["transaksi_setor_tunai_atm", "setor_tunai"], spKey: "lokasitransaksi", mode: "nom" },
  { label: "Nom Belanja", fileHints: ["transaksi_belanja_atm"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["106-Nominal transaksi belanja internasional", "107-Nominal transaksi belanja domestik"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Nom Pembayaran", fileHints: ["transaksi_pembayaran_atm"], spKey: "lokasitransaksi", mode: "nom" },
  { label: "Nom Interbank", fileHints: ["transfer_interbank_atm", "interbank"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["111-Nominal transaksi transfer interbank"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
  { label: "Nom Antarbank", fileHints: ["transfer_antarbank_atm", "antarbank"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["112-Nominal transaksi transfer antarbank"], lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"] },
];

export const SPASIAL_UE_TASKS: SpasialTask[] = [
  { label: "Jumlah UE", fileHints: ["jumlah_ue_beredar"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["001-Jumlah Kartu"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "registered", fileHints: ["jumlah_ue_registered", "registered"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["056-Registered"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "unregistered", fileHints: ["unregistered"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["057-Unregistered"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "chipbased", fileHints: ["jumlah_ue_chip", "chip"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["051-Chip based"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "serverbased", fileHints: ["jumlah_ue_server", "server"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["052-Server based"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Dana Float", fileHints: ["jumlah_ue_server", "server", "dana_float"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["070-Dana Float"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Mesin Reader", fileHints: ["reader_ue"], spKey: "lokasimesin", mode: "reader", valueCol: "jumlahreader", lsbuCodes: ["122-Jumlah Mesin Reader Uang Elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Tarik Tunai", fileHints: ["transaksi_tunai_ue"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["098-Volume transaksi tarik tunai uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Tarik Tunai", fileHints: ["transaksi_tunai_ue"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["118-Nominal transaksi tarik tunai uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Belanja", fileHints: ["transaksi_belanja_uang_elektronik", "belanja_uang"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["086-Volume transaksi belanja internasional", "087-Volume transaksi belanja domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Belanja", fileHints: ["transaksi_belanja_uang_elektronik", "belanja_uang"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["106-Nominal transaksi belanja internasional", "107-Nominal transaksi belanja domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Pembayaran", fileHints: ["transaksi_pembayaran_uang_elektronik", "pembayaran_uang"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["088-Volume Transaksi Online Internasional", "089-Volume Transaksi Online Domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Pembayaran", fileHints: ["transaksi_pembayaran_uang_elektronik", "pembayaran_uang"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["108-Nominal Transaksi Online Internasional", "109-Nominal Transaksi Online Domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Initial", fileHints: ["transaksi_initial", "initial"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["096-Volume transaksi Initial"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Initial", fileHints: ["transaksi_initial", "initial"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["116-Nominal transaksi Initial"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Reload", fileHints: ["transaksi_top_up", "top_up", "topup", "reload"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["097-Volume transaksi reload/top up"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Reload", fileHints: ["transaksi_top_up", "top_up", "topup", "reload"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["117-Nominal transaksi reload/top up"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Transfer Antar UE", fileHints: ["transfer_antar_uang_elektronik", "antar_uang"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["093-Volume transaksi transfer antar uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Transfer Antar UE", fileHints: ["transfer_antar_uang_elektronik", "antar_uang"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["113-Nominal transaksi transfer antar uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Redeem", fileHints: ["transaksi_redeem", "redeem", "reedem"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["099-Volume transaksi reedem"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Redeem", fileHints: ["transaksi_redeem", "redeem", "reedem"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["119-Nominal transaksi reedem"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Transfer ke Rekening", fileHints: ["transfer_ue_ke_rekening", "ke_rekening"], spKey: "lokasitransaksi", mode: "vol" },
  { label: "Nom Transfer ke Rekening", fileHints: ["transfer_ue_ke_rekening", "ke_rekening"], spKey: "lokasitransaksi", mode: "nom" },
  { label: "Vol Transfer Pemerintah", fileHints: ["transfer_pemerintah"], spKey: "lokasitransaksi", mode: "vol" },
  { label: "Nom Transfer Pemerintah", fileHints: ["transfer_pemerintah"], spKey: "lokasitransaksi", mode: "nom" },
];

export const SPASIAL_KK_TASKS: SpasialTask[] = [
  { label: "Kartu Kredit", fileHints: ["jumlah_kk_beredar", "kk_beredar"], spKey: "kotakab", mode: "kk_sum" },
  { label: "Outstanding", fileHints: ["nominal_outstanding", "outstanding"], spKey: "kotakab", mode: "col_juta", valueCol: "outstanding" },
  { label: "NPL", fileHints: ["nominal_npl", "npl"], spKey: "kotakab", mode: "col_juta", valueCol: "npl" },
  { label: "Vol Tunai", fileHints: ["transaksi_tunai_kk"], spKey: "lokasitransaksi", mode: "vol" },
  { label: "Nom Tunai", fileHints: ["transaksi_tunai_kk"], spKey: "lokasitransaksi", mode: "nom" },
  { label: "Vol Belanja", fileHints: ["transaksi_belanja_kk"], spKey: "lokasitransaksi", mode: "col_raw", valueCol: "sum(frekuensitransaksi)" },
  { label: "Nom Belanja", fileHints: ["transaksi_belanja_kk"], spKey: "lokasitransaksi", mode: "col_juta", valueCol: "sum(nominaltransaksi)" },
  { label: "Vol Bill Payment", fileHints: ["bill_payment_kk", "bill_payment"], spKey: "lokasitransaksi", mode: "col_raw", valueCol: "sum(frekuensitransaksi)" },
  { label: "Nom Bill Payment", fileHints: ["bill_payment_kk", "bill_payment"], spKey: "lokasitransaksi", mode: "col_juta", valueCol: "sum(nominaltransaksi)" },
];

export function spasialTasksForGroup(group: string): SpasialTask[] | null {
  if (group === "spasial_atm") return SPASIAL_ATM_TASKS;
  if (group === "spasial_ue") return SPASIAL_UE_TASKS;
  if (group === "spasial_kk") return SPASIAL_KK_TASKS;
  return null;
}

export function spasialEnvForGroup(group: string): string {
  if (group === "spasial_atm") return "SHEET_SPASIAL_ATM";
  if (group === "spasial_ue") return "SHEET_SPASIAL_UE";
  if (group === "spasial_kk") return "SHEET_SPASIAL_KK";
  return "";
}

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function cleanKey(val: unknown): string {
  const s = String(val ?? "").trim();
  if (!s || s.toLowerCase() === "n/a" || s.toLowerCase() === "nan") return "n/a";
  const digits = s.replace(/\D/g, "");
  if (!digits) return "n/a";
  return digits.slice(0, 4).padStart(4, "0");
}

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function findFile(
  files: { name: string; rows: Record<string, unknown>[] }[],
  hints: string[]
): { name: string; rows: Record<string, unknown>[] } | null {
  let best: { name: string; rows: Record<string, unknown>[]; score: number } | null = null;
  for (const f of files) {
    const n = normName(f.name);
    let score = 0;
    for (const h of hints) {
      const hn = normName(h);
      if (n.includes(hn)) score += hn.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { ...f, score };
  }
  return best;
}

export function parseXlsxRows(buf: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
  if (!aoa.length) return [];
  const headers = (aoa[0] || []).map((h) => String(h ?? "").trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] || [];
    const obj: Record<string, unknown> = {};
    let empty = true;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      const val = r[c];
      if (val !== "" && val != null) empty = false;
      obj[key] = val;
      obj[key.toLowerCase()] = val;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function pickKeyCol(row: Record<string, unknown>, spKey: string): unknown {
  const want = spKey.toLowerCase().replace(/[\s_]/g, "");
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().replace(/[\s_]/g, "") === want) return row[k];
  }
  return undefined;
}

function pickValCol(row: Record<string, unknown>, colName: string): unknown {
  const want = colName.toLowerCase().replace(/[\s_]/g, "");
  for (const k of Object.keys(row)) {
    if (k.toLowerCase().replace(/[\s_]/g, "") === want) return row[k];
  }
  for (const k of Object.keys(row)) {
    const kl = k.toLowerCase().replace(/[\s_]/g, "");
    if (kl.includes(want) || want.includes(kl)) return row[k];
  }
  return undefined;
}

function aggregateSpatial(
  rows: Record<string, unknown>[],
  task: SpasialTask
): Map<string, number> {
  const map = new Map<string, number>();
  const mesinTypes = ["ACMAC", "ACMAT", "ACMCD", "ACMNT"];

  for (const r of rows) {
    const key = cleanKey(pickKeyCol(r, task.spKey));
    if (key === "n/a") continue;
    let v = 0;

    if (task.mode === "mesin") {
      const jenis = String(r["jenismesin"] ?? r["JENISMESIN"] ?? r["jenis_mesin"] ?? "")
        .toUpperCase()
        .trim();
      if (!mesinTypes.includes(jenis)) continue;
      v = num(r["expr_1"] ?? r["EXPR_1"]);
    } else if (task.mode === "kartu") {
      v = num(r["expr_1"] ?? r["EXPR_1"]) - num(r["expr_2"] ?? r["EXPR_2"]);
    } else if (task.mode === "kk_sum") {
      v = num(r["expr_1"] ?? r["EXPR_1"]) + num(r["expr_2"] ?? r["EXPR_2"]);
    } else if (task.mode === "vol") {
      v = num(r["expr_1"] ?? r["EXPR_1"]);
    } else if (task.mode === "nom") {
      v = num(r["expr_2"] ?? r["EXPR_2"]);
    } else if (task.mode === "col_raw" || task.mode === "col_juta") {
      const col = task.valueCol || "expr_1";
      v = num(pickValCol(r, col) ?? r[col] ?? r["expr_1"]);
    } else if (task.mode === "reader") {
      const col = task.valueCol || "jumlahreader";
      v = num(pickValCol(r, col) ?? r["jumlahreader"] ?? r["expr_1"] ?? r["EXPR_1"]);
    }

    map.set(key, (map.get(key) || 0) + v);
  }
  return map;
}

function aggregateLsbu(lsbuRows: Row[], task: SpasialTask): Map<string, number> {
  const map = new Map<string, number>();
  if (!task.lsbuCodes?.length) return map;
  const codes = new Set(task.lsbuCodes.map((c) => c.trim().toLowerCase().replace(/\s+$/, "")));
  const cols = task.lsbuCols?.length ? task.lsbuCols : ["KARTU_ATM", "KARTU_ATM_DEBIT", "KARTU_ELEKTRONIK"];

  for (const r of lsbuRows) {
    const jd = String(r["JENIS_DATA"] ?? r["jenis_data"] ?? "").trim().toLowerCase().replace(/\s+$/, "");
    const match = codes.has(jd) || [...codes].some((c) => jd.startsWith(c) || c.startsWith(jd));
    if (!match) continue;
    const kota = cleanKey(r["KOTA"] ?? r["kota"] ?? "");
    if (kota === "n/a") continue;
    let sum = 0;
    for (const c of cols) sum += num(r[c] ?? r[c.toLowerCase()]);
    map.set(kota, (map.get(kota) || 0) + sum);
  }
  return map;
}

async function ensureMonthSheet(
  sheetsApi: Awaited<ReturnType<typeof getSheetsClient>>,
  spreadsheetId: string,
  monthLabel: string
): Promise<string> {
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId, includeGridData: false });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "");
  if (titles.includes(monthLabel)) return monthLabel;
  const template =
    titles.find((t) => /maret/i.test(t)) || titles.find((t) => /\d{4}/.test(t)) || titles[0];
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

export async function processSpasialGroup(opts: {
  group: string;
  monthLabel: string;
  dryRun: boolean;
  spatialFiles: { name: string; buf: ArrayBuffer }[];
  lsbuRows: Row[];
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
      results: tasks.map((t) => ({
        job: t.label,
        status: "error",
        reason: `Env ${envKey} belum di-set`,
      })),
      summary: { total: tasks.length, ok: 0, errors: tasks.length },
    };
  }

  const parsed = opts.spatialFiles.map((f) => ({
    name: f.name,
    rows: parseXlsxRows(f.buf),
  }));

  const sheetsApi = await getSheetsClient();
  const sheetName = opts.dryRun
    ? opts.monthLabel
    : await ensureMonthSheet(sheetsApi, spreadsheetId, opts.monthLabel);

  let grid: string[][] = [];
  try {
    const res = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName.replace(/'/g, "''")}'`,
      majorDimension: "ROWS",
    });
    grid = (res.data.values || []) as string[][];
  } catch (e) {
    if (opts.dryRun) {
      return {
        results: [
          {
            job: "(setup)",
            status: "info",
            reason: `Dry-run: sheet '${sheetName}' belum ada. Akan di-copy dari template saat write.`,
          },
          ...tasks.map((t) => {
            const file = findFile(parsed, t.fileHints);
            return {
              job: t.label,
              status: file ? "ok" : "warn",
              file: file?.name || null,
              ids: file ? aggregateSpatial(file.rows, t).size : 0,
              lsbu: t.lsbuCodes?.length ? aggregateLsbu(opts.lsbuRows, t).size : 0,
              mode: "dry-run-spasial",
            };
          }),
        ],
        summary: {
          total: tasks.length,
          ok: tasks.filter((t) => findFile(parsed, t.fileHints)).length,
          errors: 0,
        },
      };
    }
    throw e;
  }

  if (!grid.length) throw new Error(`Sheet '${sheetName}' kosong.`);

  const headers = grid[0].map((h) => String(h ?? ""));
  const headersClean = headers.map((h) => h.toLowerCase().replace(/[\s_\-]/g, ""));
  const keyByRow: string[] = [];
  for (let i = 1; i < grid.length; i++) keyByRow[i] = cleanKey(grid[i]?.[1]);

  const results: Array<Record<string, unknown>> = [];
  let ok = 0;
  let errors = 0;

  for (let ti = 0; ti < tasks.length; ti++) {
    const task = tasks[ti];
    opts.onProgress?.(task.label, ti + 1, tasks.length);
    try {
      const file = findFile(parsed, task.fileHints);
      const spMap = file ? aggregateSpatial(file.rows, task) : new Map<string, number>();
      const lsbuMap = aggregateLsbu(opts.lsbuRows, task);

      const labelClean = task.label.toLowerCase().replace(/[\s_\-]/g, "");
      const colIdx = headersClean.findIndex(
        (h) => h.includes(labelClean) || labelClean.includes(h)
      );
      if (colIdx < 0) {
        results.push({
          job: task.label,
          status: "error",
          reason: `Kolom tidak ditemukan untuk '${task.label}'`,
          headersSample: headers.slice(0, 15),
        });
        errors++;
        continue;
      }

      const finals = new Map<string, number>();
      const keys = new Set([
        ...spMap.keys(),
        ...lsbuMap.keys(),
        ...keyByRow.filter(Boolean),
      ]);
      for (const k of keys) {
        if (!k || k === "n/a") continue;
        let total = (spMap.get(k) || 0) + (lsbuMap.get(k) || 0);
        // Notebook: nom & col_juta → (spatial + LSBU) / 1e6
        if (task.mode === "nom" || task.mode === "col_juta") {
          total = total / 1_000_000;
        }
        finals.set(k, total);
      }

      let written = 0;
      if (!opts.dryRun) {
        const data: { range: string; values: (string | number)[][] }[] = [];
        for (let r = 1; r < grid.length; r++) {
          const k = keyByRow[r];
          if (!k || k === "n/a") continue;
          const val = finals.get(k) ?? 0;
          const cell =
            task.mode === "nom" || task.mode === "col_juta"
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
      } else {
        written = [...finals.values()].filter((v) => v !== 0).length;
      }

      results.push({
        job: task.label,
        status: "ok",
        file: file?.name || null,
        column: headers[colIdx],
        sheet: sheetName,
        written,
        spatialKeys: spMap.size,
        lsbuKeys: lsbuMap.size,
        mode: opts.dryRun ? "dry-run-spasial" : "write-spasial",
      });
      ok++;
    } catch (e) {
      results.push({
        job: task.label,
        status: "error",
        reason: e instanceof Error ? e.message : String(e),
      });
      errors++;
    }
  }

  return { results, summary: { total: tasks.length, ok, errors } };
}
