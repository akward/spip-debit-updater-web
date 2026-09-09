/**
 * Browser + server safe Spasial aggregation (no Node-only APIs).
 * Used by client pre-parse and server fallback.
 *
 * Key mapping = notebook Spasial UE + KK Google Sheet:
 *   blank / "" / "0" / nan → "n/a" (also aliased as "0000")
 *   else first-4 digits zfill (LSBU: str[:4].zfill(4))
 * Instrumen/txn: spatial + LSBU; blank lokasi = spatial saja (tanpa LSBU)
 * Nom ATM/Debet (Google Sheet): sum(expr_2) / 1_000_000 TANPA LSBU
 * Nom UE: (sum(expr_2) + LSBU) / 1_000_000
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
  {
    label: "Kartu ATM",
    fileHints: ["Jumlah_Kartu_ATM_Beredar_(Spasial)", "Jumlah_Kartu_ATM_Beredar", "Kartu_ATM_Beredar"],
    spKey: "lokasinasabah",
    mode: "kartu",
    lsbuCodes: ["001-Jumlah Kartu"],
    lsbuCols: ["KARTU_ATM"],
  },
  {
    label: "Kartu Debet",
    fileHints: ["Jumlah_Kartu_Debet_Beredar_(Spasial)", "Jumlah_Kartu_Debet_Beredar", "Kartu_Debet_Beredar", "Kartu_Debit_Beredar"],
    spKey: "lokasinasabah",
    mode: "kartu",
    lsbuCodes: ["001-Jumlah Kartu"],
    lsbuCols: ["KARTU_ATM_DEBIT"],
  },
  {
    label: "Mesin ATM",
    fileHints: ["Jumlah_Mesin_ATM_Beredar_(Spasial)", "Jumlah_Mesin_ATM_Beredar", "Jumlah_Mesin_ATM", "mesin_atm"],
    spKey: "lokasimesin",
    mode: "mesin",
    lsbuCodes: ["121-Jumlah Mesin ATM"],
    lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"],
  },
  {
    label: "Vol Tunai",
    fileHints: ["Transaksi_Tunai_ATM_Debet_(Spasial)", "Transaksi_Tunai_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "vol",
    lsbuCodes: [
      "081-Volume transaksi tarik tunai internasional",
      "082-Volume transaksi tarik tunai domestik",
    ],
    lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"],
  },
  {
    label: "Vol SetorTunai",
    fileHints: ["Transaksi_Setor_Tunai_ATM_Debet_(Spasial)", "Transaksi_Setor_Tunai_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "vol",
  },
  {
    label: "Vol Belanja",
    fileHints: ["Transaksi_Belanja_ATM_Debet_(Spasial)", "Transaksi_Belanja_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "vol",
    lsbuCodes: [
      "086-Volume transaksi belanja internasional",
      "087-Volume transaksi belanja domestik",
    ],
    lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"],
  },
  {
    label: "Vol Pembayaran",
    fileHints: ["Transaksi_Pembayaran_ATM_Debet_(Spasial)", "Transaksi_Pembayaran_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "vol",
  },
  {
    label: "Vol Interbank",
    fileHints: ["Transaksi_Transfer_Interbank_ATM_Debet_(Spasial)", "Transfer_Interbank_ATM_Debet", "Transfer_Interbank"],
    spKey: "lokasitransaksi",
    mode: "vol",
    lsbuCodes: [
      "084-Volume transaksi transfer dana antar bank internasional",
      "085-Volume transaksi transfer dana antar bank domestik",
    ],
    lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"],
  },
  {
    label: "Vol Antarbank",
    fileHints: ["Transaksi_Transfer_Antarbank_ATM_Debet_(Spasial)", "Transfer_Antarbank_ATM_Debet", "Transfer_Antarbank"],
    spKey: "lokasitransaksi",
    mode: "vol",
    lsbuCodes: ["083-Volume transaksi transfer dana intra bank"],
    lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"],
  },
  {
    label: "Nom Tunai",
    fileHints: ["Transaksi_Tunai_ATM_Debet_(Spasial)", "Transaksi_Tunai_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom Setor Tunai",
    fileHints: ["Transaksi_Setor_Tunai_ATM_Debet_(Spasial)", "Transaksi_Setor_Tunai_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom Belanja",
    fileHints: ["Transaksi_Belanja_ATM_Debet_(Spasial)", "Transaksi_Belanja_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom Pembayaran",
    fileHints: ["Transaksi_Pembayaran_ATM_Debet_(Spasial)", "Transaksi_Pembayaran_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom Interbank",
    fileHints: ["Transaksi_Transfer_Interbank_ATM_Debet_(Spasial)", "Transfer_Interbank_ATM_Debet", "Transfer_Interbank"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom Antarbank",
    fileHints: ["Transaksi_Transfer_Antarbank_ATM_Debet_(Spasial)", "Transfer_Antarbank_ATM_Debet", "Transfer_Antarbank"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
];

export const SPASIAL_UE_TASKS: SpasialTask[] = [
  { label: "Jumlah UE", fileHints: ["Jumlah_UE_Beredar_(Spasial)", "jumlah_ue_beredar", "jumlah_ue"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["001-Jumlah Kartu"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "registered", fileHints: ["Jumlah_UE_Registered", "registered_beredar", "registered"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["056-Registered"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "unregistered", fileHints: ["Unregistered", "unregister"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["057-Unregistered"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "chipbased", fileHints: ["Jumlah_UE_Chip", "chip_beredar", "chip"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["051-Chip based"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "serverbased", fileHints: ["Jumlah_UE_Server", "server_beredar", "serverbased"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["052-Server based"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Dana Float", fileHints: ["Dana_Float", "dana_float", "float"], spKey: "lokasinasabah", mode: "kartu", lsbuCodes: ["070-Dana Float"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Mesin Reader", fileHints: ["Reader_UE", "reader"], spKey: "lokasimesin", mode: "reader", valueCols: ["jumlahreader", "expr_1"], lsbuCodes: ["122-Jumlah Mesin Reader Uang Elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Tarik Tunai", fileHints: ["Transaksi_Tunai_Uang_Elektronik", "Transaksi_Tunai_UE", "tunai"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["098-Volume transaksi tarik tunai uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Belanja", fileHints: ["Transaksi_Belanja_Uang_Elektronik", "belanja"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["086-Volume transaksi belanja internasional", "087-Volume transaksi belanja domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Pembayaran", fileHints: ["Transaksi_Pembayaran_Uang_Elektronik", "pembayaran"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["088-Volume Transaksi Online Internasional", "089-Volume Transaksi Online Domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Initial", fileHints: ["Transaksi_initial", "initial"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["096-Volume transaksi Initial"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Reload", fileHints: ["Transaksi_Top_UP", "reload", "top_up", "topup"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["097-Volume transaksi reload/top up"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Transfer Antar UE", fileHints: ["Transfer_Antar_Uang_Elektronik", "transfer_antar", "transfer_UE"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["093-Volume transaksi transfer antar uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Redeem", fileHints: ["Transaksi_Redeem", "reedem", "redeem"], spKey: "lokasitransaksi", mode: "vol", lsbuCodes: ["099-Volume transaksi reedem"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Transfer ke Rekening", fileHints: ["Transfer_UE_ke_Rekening", "transfer_ke_rekening"], spKey: "lokasitransaksi", mode: "vol", lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Vol Transfer Pemerintah", fileHints: ["Transfer_Pemerintah_ke_UE", "transfer_pemerintah"], spKey: "lokasitransaksi", mode: "vol", lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Tarik Tunai", fileHints: ["Transaksi_Tunai_Uang_Elektronik", "Transaksi_Tunai_UE", "tunai"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["118-Nominal transaksi tarik tunai uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Belanja", fileHints: ["Transaksi_Belanja_Uang_Elektronik", "belanja"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["106-Nominal transaksi belanja internasional", "107-Nominal transaksi belanja domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Pembayaran", fileHints: ["Transaksi_Pembayaran_Uang_Elektronik", "pembayaran"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["108-Nominal Transaksi Online Internasional", "109-Nominal Transaksi Online Domestik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Initial", fileHints: ["Transaksi_initial", "initial"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["116-Nominal transaksi Initial"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Reload", fileHints: ["Transaksi_Top_UP", "reload", "top_up", "topup"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["117-Nominal transaksi reload/top up"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Transfer Antar UE", fileHints: ["Transfer_Antar_Uang_Elektronik", "transfer_antar", "transfer_UE"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["113-Nominal transaksi transfer antar uang elektronik"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Redeem", fileHints: ["Transaksi_Redeem", "reedem", "redeem"], spKey: "lokasitransaksi", mode: "nom", lsbuCodes: ["119-Nominal transaksi reedem"], lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Transfer ke Rekening", fileHints: ["Transfer_UE_ke_Rekening", "transfer_ke_rekening"], spKey: "lokasitransaksi", mode: "nom", lsbuCols: ["KARTU_ELEKTRONIK"] },
  { label: "Nom Transfer Pemerintah", fileHints: ["Transfer_Pemerintah_ke_UE", "transfer_pemerintah"], spKey: "lokasitransaksi", mode: "nom", lsbuCols: ["KARTU_ELEKTRONIK"] },
];

export const SPASIAL_KK_TASKS: SpasialTask[] = [
  { label: "Jumlah Kartu", fileHints: ["jumlah_kartu", "kartu_kredit", "Jumlah_KK_Beredar"], spKey: "kotakab", mode: "kk_sum", valueCols: ["sum(frekuensitransaksi)", "expr_1"] },
  { label: "Outstanding", fileHints: ["outstanding", "Nominal_Outstanding"], spKey: "kotakab", mode: "col_juta", valueCols: ["outstanding", "expr_1", "expr_2"] },
  { label: "NPL", fileHints: ["npl", "Nominal_NPL"], spKey: "kotakab", mode: "col_juta", valueCols: ["npl", "expr_1", "expr_2"] },
];

export function spasialTasksForGroup(group: string): SpasialTask[] | null {
  if (group === "spasial_atm" || group === "spasial_debet") return SPASIAL_ATM_TASKS;
  if (group === "spasial_ue") return SPASIAL_UE_TASKS;
  if (group === "spasial_kk") return SPASIAL_KK_TASKS;
  return null;
}

export function spasialEnvForGroup(group: string): string {
  if (group === "spasial_atm" || group === "spasial_debet") return "SHEET_SPASIAL_ATM";
  if (group === "spasial_ue") return "SHEET_SPASIAL_UE";
  if (group === "spasial_kk") return "SHEET_SPASIAL_KK";
  return "SHEET_SPASIAL";
}

export type Row = Record<string, unknown>;

export function cleanKey(val: unknown): string {
  const s = String(val ?? "").trim().toLowerCase();
  if (!s || s === "n/a" || s === "nan" || s === "0" || s === "-" || s.includes("n/a")) {
    return "n/a";
  }
  const beforeDot = String(val ?? "").trim().split(".")[0];
  let digits = beforeDot.replace(/\D/g, "");
  if (!digits) digits = s.replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits)) return "n/a";
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
  let best: { name: string; rows: Row[] } | null = null;
  let bestScore = 0;
  for (const f of files) {
    const n = normName(f.name);
    let score = 0;
    for (const h of hints) {
      const hn = normName(h);
      if (n.includes(hn)) score += hn.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

function pickKeyCol(row: Row, spKey: string): unknown {
  const candidates = [spKey, "lokasinasabah", "kota", "lokasitransaksi", "lokasimesin", "kotakab", "kodekota", "idkota"];
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

function findExprKey(row: Row, which: 1 | 2): string | null {
  const want = `expr${which}`;
  for (const k of Object.keys(row)) {
    if (normalizeColKey(k) === want) return k;
  }
  for (const k of Object.keys(row)) {
    const n = normalizeColKey(k);
    if (n.includes(`expr${which}`) || n === `e${which}` || n === `x${which}`) return k;
  }
  return null;
}

function getExpr(row: Row, which: 1 | 2): number {
  const k = findExprKey(row, which);
  if (k) return num(row[k]);
  const aliases =
    which === 1
      ? ["expr_1", "EXPR_1", "expr1", "Expr_1", "nilai1", "jumlah"]
      : ["expr_2", "EXPR_2", "expr2", "Expr_2", "nilai2"];
  for (const a of aliases) {
    if (a in row) return num(row[a]);
  }
  return 0;
}

function resolveValue(row: Row, task: SpasialTask): number {
  const candidates = [...(task.valueCols || []), ...(task.valueCol ? [task.valueCol] : [])];
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

export function aggregateSpatial(rows: Row[], task: SpasialTask): Record<string, number> {
  const map: Record<string, number> = {};
  const mesinTypes = ["ACMAC", "ACMAT", "ACMCD", "ACMNT"];

  if (task.mode === "kartu" || task.mode === "kk_sum") {
    const e1: Record<string, number> = {};
    const e2: Record<string, number> = {};
    for (const r of rows) {
      const key = cleanKey(pickKeyCol(r, task.spKey));
      e1[key] = (e1[key] || 0) + getExpr(r, 1);
      e2[key] = (e2[key] || 0) + getExpr(r, 2);
    }
    for (const k of new Set([...Object.keys(e1), ...Object.keys(e2)])) {
      map[k] =
        task.mode === "kartu"
          ? (e1[k] || 0) - (e2[k] || 0)
          : (e1[k] || 0) + (e2[k] || 0);
    }
    return map;
  }

  for (const r of rows) {
    const key = cleanKey(pickKeyCol(r, task.spKey));
    let v = 0;
    if (task.mode === "mesin") {
      const jenisRaw = r["jenismesin"] ?? r["JENISMESIN"] ?? r["jenis_mesin"];
      if (jenisRaw != null && String(jenisRaw).trim() !== "") {
        const jenis = String(jenisRaw).toUpperCase().replace(/\s+/g, "").trim();
        if (!(mesinTypes.includes(jenis) || jenis.startsWith("ACM"))) continue;
        v = getExpr(r, 1);
      } else {
        const jumlah = r["jumlah"] ?? r["Jumlah"] ?? r["JUMLAH"] ?? r["jumlah_sp"];
        if (jumlah !== undefined && jumlah !== null && jumlah !== "") {
          v = num(jumlah);
        } else {
          v = 0;
          let foundAcm = false;
          for (const [k, val] of Object.entries(r)) {
            const ku = k.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (mesinTypes.includes(ku) || ku.startsWith("ACM")) {
              v += num(val);
              foundAcm = true;
            }
          }
          if (!foundAcm) v = getExpr(r, 1);
        }
      }
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
  const codes = task.lsbuCodes.map((c) => c.trim().toLowerCase().replace(/\s+/g, " "));
  const cols = task.lsbuCols?.length ? task.lsbuCols : ["KARTU_ELEKTRONIK"];

  for (const r of lsbuRows) {
    const jd = String(r["JENIS_DATA"] ?? r["jenis_data"] ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    let match = codes.some((c) => jd === c || jd.startsWith(c) || c.startsWith(jd));
    if (!match) {
      for (const c of codes) {
        const m = /^(\d{3})-(.*)$/.exec(c);
        if (!m) continue;
        if (!jd.startsWith(m[1])) continue;
        const keywords = m[2].split(/\s+/).filter((w) => w.length > 3);
        if (keywords.some((w) => jd.includes(w))) {
          match = true;
          break;
        }
      }
    }
    if (!match) continue;
    const kota = cleanKey(r["KOTA"] ?? r["kota"] ?? "");
    if (!kota || kota === "n/a") continue;
    let sum = 0;
    for (const c of cols) {
      const v = r[c] ?? r[c.toLowerCase()] ?? r[c.toUpperCase()];
      if (v !== undefined && v !== null && v !== "") {
        sum += num(v);
      } else {
        const want = c.toLowerCase().replace(/[\s_]/g, "");
        for (const [k, val] of Object.entries(r)) {
          if (k.toLowerCase().replace(/[\s_]/g, "") === want) {
            sum += num(val);
            break;
          }
        }
      }
    }
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
  const isBlankKey = (k: string) => k === "n/a" || k === "0000";

  for (const k of keys) {
    if (!k) continue;
    let total = isBlankKey(k) ? (sp[k] || 0) : (sp[k] || 0) + (lsbu[k] || 0);
    if (task.mode === "nom" || task.mode === "col_juta") total = total / 1_000_000;
    out[k] = total;
  }

  const blankSp = (sp["n/a"] ?? 0) + (sp["0000"] ?? 0);
  let blank = blankSp;
  if (task.mode === "nom" || task.mode === "col_juta") blank = blank / 1_000_000;
  if (blank !== 0 || "n/a" in sp || "0000" in sp) {
    out["n/a"] = blank;
    out["0000"] = blank;
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
  blankKeyValue?: number;
  blankRowCount?: number;
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

    let blankRowCount = 0;
    if (file) {
      for (const r of file.rows) {
        const raw = pickKeyCol(r, task.spKey);
        const s = String(raw ?? "").trim();
        if (!s || s.toLowerCase() === "n/a" || s.toLowerCase() === "nan") blankRowCount++;
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
      sampleKeys: Object.keys(sp).slice(0, 8),
      blankKeyValue: (sp["n/a"] ?? 0) + (sp["0000"] ?? 0),
      blankRowCount,
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
