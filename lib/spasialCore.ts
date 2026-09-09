/**
 * Browser + server safe Spasial aggregation (no Node-only APIs).
 * Used by client pre-parse and server fallback.
 */
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
  valueCols?: string[];
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
  { label: "Kartu Kredit", fileHints: ["jumlah_kk_beredar", "jumlah_kk", "kk_beredar"], spKey: "kotakab", mode: "kk_sum" },
  { label: "Outstanding", fileHints: ["nominal_outstanding", "outstanding"], spKey: "kotakab", mode: "col_juta", valueCol: "outstanding", valueCols: ["outstanding", "expr_1", "expr_2"] },
  { label: "NPL", fileHints: ["nominal_npl", "npl"], spKey: "kotakab", mode: "col_juta", valueCol: "npl", valueCols: ["npl", "expr_1", "expr_2"] },
  { label: "Vol Tunai", fileHints: ["transaksi_tunai_kk", "tunai_kk"], spKey: "lokasitransaksi", mode: "vol" },
  { label: "Nom Tunai", fileHints: ["transaksi_tunai_kk", "tunai_kk"], spKey: "lokasitransaksi", mode: "nom" },
  { label: "Vol Belanja", fileHints: ["transaksi_belanja_kk", "belanja_kk"], spKey: "lokasitransaksi", mode: "col_raw", valueCol: "sum(frekuensitransaksi)", valueCols: ["sum(frekuensitransaksi)", "frekuensitransaksi", "expr_1", "volume"] },
  { label: "Nom Belanja", fileHints: ["transaksi_belanja_kk", "belanja_kk"], spKey: "lokasitransaksi", mode: "col_juta", valueCol: "sum(nominaltransaksi)", valueCols: ["sum(nominaltransaksi)", "nominaltransaksi", "expr_2", "nominal"] },
  { label: "Vol Bill Payment", fileHints: ["bill_payment_kk", "bill_payment", "transaksi_bill"], spKey: "lokasitransaksi", mode: "col_raw", valueCol: "sum(frekuensitransaksi)", valueCols: ["sum(frekuensitransaksi)", "frekuensitransaksi", "expr_1", "volume"] },
  { label: "Nom Bill Payment", fileHints: ["bill_payment_kk", "bill_payment", "transaksi_bill"], spKey: "lokasitransaksi", mode: "col_juta", valueCol: "sum(nominaltransaksi)", valueCols: ["sum(nominaltransaksi)", "nominaltransaksi", "expr_2", "nominal"] },
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

export type Row = Record<string, unknown>;

export function cleanKey(val: unknown): string {
  if (val == null) return "n/a";
  const s = String(val).trim();
  if (!s) return "n/a";
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(0, 4).padStart(4, "0");
  if (digits.length > 0) return digits.padStart(4, "0");
  return "n/a";
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function pickValCol(row: Row, valueCol?: string, valueCols?: string[]): string | null {
  const candidates = [
    ...(valueCols || []),
    ...(valueCol ? [valueCol] : []),
    "expr_1",
    "expr_2",
    "sum(frekuensitransaksi)",
    "sum(nominaltransaksi)",
    "frekuensitransaksi",
    "nominaltransaksi",
    "volume",
    "nominal",
    "jumlah",
    "jumlahreader",
    "outstanding",
    "npl",
  ];
  const keys = Object.keys(row);
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const hit = lowerMap.get(c.toLowerCase());
    if (hit != null) return hit;
  }
  for (const c of candidates) {
    const cl = c.toLowerCase().replace(/[\s_\-()]/g, "");
    for (const k of keys) {
      const kl = k.toLowerCase().replace(/[\s_\-()]/g, "");
      if (kl.includes(cl) || cl.includes(kl)) return k;
    }
  }
  return null;
}

export function resolveValue(row: Row, mode: SpasialMode, valueCol?: string, valueCols?: string[]): number {
  if (mode === "kartu" || mode === "kk_sum" || mode === "mesin") {
    const col = pickValCol(row, valueCol, valueCols) || pickValCol(row, "jumlah", ["jumlah", "expr_1", "expr_2"]);
    return col ? toNum(row[col]) : 0;
  }
  if (mode === "reader") {
    const col = pickValCol(row, valueCol || "jumlahreader", valueCols);
    return col ? toNum(row[col]) : 0;
  }
  if (mode === "vol" || mode === "col_raw") {
    const col = pickValCol(row, valueCol, valueCols);
    return col ? toNum(row[col]) : 0;
  }
  if (mode === "nom" || mode === "col_juta") {
    const col = pickValCol(row, valueCol, valueCols);
    const n = col ? toNum(row[col]) : 0;
    return n / 1e6;
  }
  return 0;
}

export function aggregateSpatial(
  rows: Row[],
  spKey: string,
  mode: SpasialMode,
  valueCol?: string,
  valueCols?: string[]
): Map<string, number> {
  const map = new Map<string, number>();
  const keyCandidates = [spKey, "kotakab", "lokasinasabah", "lokasitransaksi", "lokasimesin", "kodekota", "kota"];
  for (const row of rows) {
    let keyRaw: unknown = null;
    const lowerMap = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
    for (const c of keyCandidates) {
      const hit = lowerMap.get(c.toLowerCase());
      if (hit != null && row[hit] != null && String(row[hit]).trim()) {
        keyRaw = row[hit];
        break;
      }
    }
    const k = cleanKey(keyRaw);
    if (k === "n/a") continue;
    const v = resolveValue(row, mode, valueCol, valueCols);
    map.set(k, (map.get(k) || 0) + v);
  }
  return map;
}

export function aggregateLsbu(
  rows: Row[],
  codes: string[],
  cols: string[]
): Map<string, number> {
  const map = new Map<string, number>();
  const codeSet = new Set(codes.map((c) => c.toLowerCase()));
  for (const row of rows) {
    const jenis = String(row["JENIS_DATA"] ?? row["jenis_data"] ?? "").toLowerCase();
    if (!codeSet.has(jenis) && ![...codeSet].some((c) => jenis.includes(c.split("-")[0]))) continue;
    const kota = cleanKey(row["KODE_KOTA"] ?? row["kode_kota"] ?? row["KOTA"] ?? row["kota"]);
    if (kota === "n/a") continue;
    let sum = 0;
    for (const col of cols) {
      const lowerMap = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
      const hit = lowerMap.get(col.toLowerCase());
      if (hit) sum += toNum(row[hit]);
    }
    map.set(kota, (map.get(kota) || 0) + sum);
  }
  return map;
}

export function finalValues(
  spatial: Map<string, number>,
  lsbu: Map<string, number> | null
): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set([...spatial.keys(), ...(lsbu ? lsbu.keys() : [])]);
  for (const k of keys) {
    const s = spatial.get(k) || 0;
    const l = lsbu ? lsbu.get(k) || 0 : 0;
    out[k] = s + l;
  }
  return out;
}

export type PrecomputedTask = {
  label: string;
  file: string | null;
  mode: SpasialMode;
  spatialKeys: number;
  lsbuKeys: number;
  values: Record<string, number>;
};

function matchFile(name: string, hints: string[]): boolean {
  const n = name.toLowerCase().replace(/[\s_\-]/g, "");
  return hints.some((h) => n.includes(h.toLowerCase().replace(/[\s_\-]/g, "")));
}

export function buildPrecomputed(
  group: string,
  spatialParsed: { name: string; rows: Row[] }[],
  lsbuRows: Row[]
): PrecomputedTask[] {
  const tasks = spasialTasksForGroup(group);
  if (!tasks) return [];
  const out: PrecomputedTask[] = [];
  for (const task of tasks) {
    const matched = spatialParsed.find((p) => matchFile(p.name, task.fileHints));
    const spatialMap = matched
      ? aggregateSpatial(matched.rows, task.spKey, task.mode, task.valueCol, task.valueCols)
      : new Map<string, number>();
    let lsbuMap: Map<string, number> | null = null;
    if (task.lsbuCodes && task.lsbuCols && lsbuRows.length) {
      lsbuMap = aggregateLsbu(lsbuRows, task.lsbuCodes, task.lsbuCols);
    }
    const values = finalValues(spatialMap, lsbuMap);
    out.push({
      label: task.label,
      file: matched?.name || null,
      mode: task.mode,
      spatialKeys: spatialMap.size,
      lsbuKeys: lsbuMap ? lsbuMap.size : 0,
      values,
    });
  }
  return out;
}

export function rowsFromAoa(aoa: unknown[][]): Row[] {
  if (!aoa.length) return [];
  const headers = aoa[0].map((h) => String(h ?? "").trim());
  const rows: Row[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const obj: Row = {};
    let empty = true;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      const val = row[c];
      if (val != null && String(val).trim() !== "") empty = false;
      obj[key] = val;
      obj[key.toLowerCase()] = val;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}
