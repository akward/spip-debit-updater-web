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
  // File Spasial UE header: idpelapor | lokasinasabah | expr_1 | expr_2
  // Notebook: groupby lokasinasabah -> jumlah = sum(expr_1) - sum(expr_2) + LSBU
  { label: "Jumlah UE", fileHints: ["jumlah_ue_beredar", "jumlah_ue", "jumlahue"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["001-Jumlah Kartu"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "registered", fileHints: ["jumlah_ue_registered", "registered"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["056-Registered"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "unregistered", fileHints: ["unregistered", "jumlah_ue_beredar_unregistered"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["057-Unregistered"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "chipbased", fileHints: ["jumlah_ue_chip", "chip"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["051-Chip based"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "serverbased", fileHints: ["jumlah_ue_server", "server"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["052-Server based"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Dana Float", fileHints: ["jumlah_ue_server", "server", "dana_float"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["070-Dana Float"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Mesin Reader", fileHints: ["reader_ue", "reader"], spKey: "lokasimesin", mode: "reader", valueCol: "jumlahreader", valueCols: ["jumlahreader", "expr_1"], lsbuCodes: ["122-Jumlah Mesin Reader Uang Elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
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

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function findFile(
  files: { name: string; rows: Row[] }[],
  hints: string[]
): { name: string; rows: Row[] } | null {
  let best: { name: string; rows: Row[]; score: number } | null = null;
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

function pickKeyCol(row: Row, spKey: string): unknown {
  const candidates = [
    spKey,
    "lokasinasabah",
    "kota",
    "lokasitransaksi",
    "lokasimesin",
    "kotakab",
    "kodekota",
    "idkota",
  ];
  const seen = new Set<string>();
  for (const cand of candidates) {
    const want = cand.toLowerCase().replace(/[\s_]/g, "");
    if (!want || seen.has(want)) continue;
    seen.add(want);
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().replace(/[\s_]/g, "") === want) return row[k];
    }
  }
  return undefined;
}

function normalizeColKey(s: string): string {
  return s.toLowerCase().replace(/[\s_\-()]/g, "");
}

function pickValCol(row: Row, colName: string): unknown {
  const want = normalizeColKey(colName);
  for (const k of Object.keys(row)) {
    if (normalizeColKey(k) === want) return row[k];
  }
  let best: { k: string; score: number } | null = null;
  for (const k of Object.keys(row)) {
    const kl = normalizeColKey(k);
    if (!kl || kl.startsWith("col")) continue;
    if (kl.includes(want) || want.includes(kl)) {
      const score = Math.min(kl.length, want.length);
      if (!best || score > best.score) best = { k, score };
    }
  }
  return best ? row[best.k] : undefined;
}

/** Find column key for expr_1 / expr_2. Matches expr_1, EXPR_1, expr1, expr 1, etc. */
function findExprKey(row: Row, which: 1 | 2): string | null {
  const want = which === 1 ? "expr1" : "expr2";
  for (const k of Object.keys(row)) {
    if (normalizeColKey(k) === want) return k;
  }
  const re = which === 1 ? /^expr[\s_\-]?1$/i : /^expr[\s_\-]?2$/i;
  for (const k of Object.keys(row)) {
    if (re.test(String(k).trim())) return k;
  }
  return null;
}

/** Read expr_1 or expr_2 value from row (0 if missing). */
function getExpr(row: Row, which: 1 | 2): number {
  const key = findExprKey(row, which);
  if (key == null) return 0;
  const v = row[key];
  if (v === undefined || v === null || v === "") return 0;
  return num(v);
}

function resolveValue(row: Row, task: SpasialTask): number {
  const candidates = [
    ...(task.valueCols || []),
    ...(task.valueCol ? [task.valueCol] : []),
  ];
  const seen = new Set<string>();
  for (const c of candidates) {
    const n = c.toLowerCase();
    if (seen.has(n)) continue;
    seen.add(n);
    const raw = pickValCol(row, c);
    if (raw !== undefined && raw !== null && raw !== "") return num(raw);
  }
  if (task.mode === "col_raw" || task.mode === "vol") return getExpr(row, 1);
  if (task.mode === "col_juta" || task.mode === "nom") return getExpr(row, 2);
  return 0;
}

/**
 * Aggregate spatial rows.
 * Notebook parity for mode kartu:
 *   groupby(lokasinasabah) -> sum(expr_1) - sum(expr_2)
 */
export function aggregateSpatial(rows: Row[], task: SpasialTask): Record<string, number> {
  const map: Record<string, number> = {};
  const mesinTypes = ["ACMAC", "ACMAT", "ACMCD", "ACMNT"];

  // Notebook-style for kartu / kk_sum: accumulate e1 & e2 separately, then combine
  if (task.mode === "kartu" || task.mode === "kk_sum") {
    const e1: Record<string, number> = {};
    const e2: Record<string, number> = {};
    for (const r of rows) {
      const key = cleanKey(pickKeyCol(r, task.spKey));
      if (key === "n/a") continue;
      e1[key] = (e1[key] || 0) + getExpr(r, 1);
      e2[key] = (e2[key] || 0) + getExpr(r, 2);
    }
    const keys = new Set([...Object.keys(e1), ...Object.keys(e2)]);
    for (const k of keys) {
      map[k] =
        task.mode === "kartu"
          ? (e1[k] || 0) - (e2[k] || 0)
          : (e1[k] || 0) + (e2[k] || 0);
    }
    return map;
  }

  for (const r of rows) {
    const key = cleanKey(pickKeyCol(r, task.spKey));
    if (key === "n/a") continue;
    let v = 0;

    if (task.mode === "mesin") {
      const jenis = String(r["jenismesin"] ?? r["JENISMESIN"] ?? r["jenis_mesin"] ?? "")
        .toUpperCase()
        .trim();
      if (!mesinTypes.includes(jenis)) continue;
      v = getExpr(r, 1);
    } else if (task.mode === "vol") {
      v = getExpr(r, 1);
    } else if (task.mode === "nom") {
      v = getExpr(r, 2);
    } else if (task.mode === "col_raw" || task.mode === "col_juta") {
      v = resolveValue(r, task);
    } else if (task.mode === "reader") {
      v = resolveValue(r, {
        ...task,
        valueCols: [...(task.valueCols || []), "jumlahreader", "expr_1"],
      });
    }

    map[key] = (map[key] || 0) + v;
  }
  return map;
}

export function aggregateLsbu(lsbuRows: Row[], task: SpasialTask): Record<string, number> {
  const map: Record<string, number> = {};
  if (!task.lsbuCodes?.length) return map;
  const codes = new Set(task.lsbuCodes.map((c) => c.trim().toLowerCase().replace(/\s+$/, "")));
  const cols = task.lsbuCols?.length
    ? task.lsbuCols
    : ["KARTU_ATM", "KARTU_ATM_DEBIT", "KARTU_ELEKTRONIK"];

  for (const r of lsbuRows) {
    const jd = String(r["JENIS_DATA"] ?? r["jenis_data"] ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+$/, "");
    const match =
      codes.has(jd) || [...codes].some((c) => jd.startsWith(c) || c.startsWith(jd));
    if (!match) continue;
    const kota = cleanKey(r["KOTA"] ?? r["kota"] ?? "");
    if (kota === "n/a") continue;
    let sum = 0;
    for (const c of cols) sum += num(r[c] ?? r[c.toLowerCase()]);
    map[kota] = (map[kota] || 0) + sum;
  }
  return map;
}

export function finalValues(
  sp: Record<string, number>,
  lsbu: Record<string, number>,
  task: SpasialTask
): Record<string, number> {
  const keys = new Set([...Object.keys(sp), ...Object.keys(lsbu)]);
  const out: Record<string, number> = {};
  for (const k of keys) {
    if (!k || k === "n/a") continue;
    let total = (sp[k] || 0) + (lsbu[k] || 0);
    if (task.mode === "nom" || task.mode === "col_juta") {
      total = total / 1_000_000;
    }
    out[k] = total;
  }
  return out;
}

export type PrecomputedTask = {
  label: string;
  mode: SpasialMode;
  file: string | null;
  values: Record<string, number>;
  spatialKeys: number;
  lsbuKeys: number;
  sumExpr1?: number;
  sumExpr2?: number;
  exprCols?: string[];
  sampleKeys?: string[];
};

export function buildPrecomputed(
  group: string,
  spatialFiles: { name: string; rows: Row[] }[],
  lsbuRows: Row[]
): PrecomputedTask[] {
  const tasks = spasialTasksForGroup(group);
  if (!tasks) return [];
  return tasks.map((task) => {
    const file = findFile(spatialFiles, task.fileHints);
    const sp = file ? aggregateSpatial(file.rows, task) : {};
    const lsbu = aggregateLsbu(lsbuRows, task);
    const values = finalValues(sp, lsbu, task);

    let sumExpr1 = 0;
    let sumExpr2 = 0;
    const exprCols: string[] = [];
    if (file && file.rows.length) {
      const sample = file.rows[0];
      const k1 = findExprKey(sample, 1);
      const k2 = findExprKey(sample, 2);
      if (k1) exprCols.push(k1);
      if (k2) exprCols.push(k2);
      for (const r of file.rows) {
        sumExpr1 += getExpr(r, 1);
        sumExpr2 += getExpr(r, 2);
      }
    }

    return {
      label: task.label,
      mode: task.mode,
      file: file?.name || null,
      values,
      spatialKeys: Object.keys(sp).length,
      lsbuKeys: Object.keys(lsbu).length,
      sumExpr1,
      sumExpr2,
      exprCols,
      sampleKeys: Object.keys(sp).slice(0, 5),
    };
  });
}

export function rowsFromAoa(aoa: unknown[][]): Row[] {
  if (!aoa.length) return [];
  const headers = (aoa[0] || []).map((h) => String(h ?? "").trim());
  const rows: Row[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] || [];
    const obj: Row = {};
    let empty = true;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      const val = r[c];
      if (val !== "" && val != null) empty = false;
      obj[key] = val;
      obj[key.toLowerCase()] = val;
      const nk = normalizeColKey(key);
      if (nk && nk !== key.toLowerCase()) obj[nk] = val;
      if (nk === "expr1") {
        obj["expr_1"] = val;
        obj["EXPR_1"] = val;
      } else if (nk === "expr2") {
        obj["expr_2"] = val;
        obj["EXPR_2"] = val;
      }
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}
