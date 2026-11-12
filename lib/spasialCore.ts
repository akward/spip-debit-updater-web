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
    fileHints: ["Transaksi_Transfer_Interbank_ATM_Debet_(Spasial)", "Transaksi_Transfer_Interbank"],
    spKey: "lokasitransaksi",
    mode: "vol",
    lsbuCodes: ["084-Volume transaksi transfer interbank", "085-Volume transaksi transfer interbank"],
    lsbuCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"],
  },
  {
    label: "Vol Antarbank",
    fileHints: ["Transaksi_Transfer_Antarbank_ATM_Debet_(Spasial)", "Transaksi_Transfer_Antarbank"],
    spKey: "lokasitransaksi",
    mode: "vol",
  },
  {
    label: "Nom Tunai",
    fileHints: ["Transaksi_Tunai_ATM_Debet_(Spasial)", "Transaksi_Tunai_ATM_Debet"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom SetorTunai",
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
    fileHints: ["Transaksi_Transfer_Interbank_ATM_Debet_(Spasial)", "Transaksi_Transfer_Interbank"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Nom Antarbank",
    fileHints: ["Transaksi_Transfer_Antarbank_ATM_Debet_(Spasial)", "Transaksi_Transfer_Antarbank"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
];

export const SPASIAL_UE_TASKS: SpasialTask[] = [
  {
    label: "Jumlah UE",
    fileHints: ["Jumlah_UE_(Spasial)", "Jumlah_UE", "Jumlah_Uang_Elektronik"],
    spKey: "lokasinasabah",
    mode: "kartu",
    lsbuCodes: ["001-Jumlah Kartu"],
    lsbuCols: ["KARTU_ELEKTRONIK"],
  },
  {
    label: "Registered",
    fileHints: ["Jumlah_UE_Registered_(Spasial)", "Registered"],
    spKey: "lokasinasabah",
    mode: "col_raw",
    valueCol: "expr_1",
  },
  {
    label: "Unregistered",
    fileHints: ["Jumlah_UE_Unregistered_(Spasial)", "Unregistered"],
    spKey: "lokasinasabah",
    mode: "col_raw",
    valueCol: "expr_1",
  },
  {
    label: "Chip Based",
    fileHints: ["Jumlah_UE_Chip_(Spasial)", "Chip"],
    spKey: "lokasinasabah",
    mode: "col_raw",
    valueCol: "expr_1",
  },
  {
    label: "Server Based",
    fileHints: ["Jumlah_UE_Server_(Spasial)", "Server"],
    spKey: "lokasinasabah",
    mode: "col_raw",
    valueCol: "expr_1",
  },
  {
    label: "Dana Float",
    fileHints: ["Dana_Float_(Spasial)", "Dana_Float"],
    spKey: "lokasinasabah",
    mode: "col_juta",
    valueCol: "expr_1",
  },
  {
    label: "Mesin Reader",
    fileHints: ["Jumlah_Reader_(Spasial)", "Reader"],
    spKey: "lokasimesin",
    mode: "reader",
  },
  {
    label: "Vol Belanja",
    fileHints: ["Transaksi_Belanja_UE_(Spasial)", "Belanja_UE"],
    spKey: "lokasitransaksi",
    mode: "vol",
  },
  {
    label: "Nom Belanja",
    fileHints: ["Transaksi_Belanja_UE_(Spasial)", "Belanja_UE"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Vol Pembayaran",
    fileHints: ["Transaksi_Pembayaran_UE_(Spasial)", "Pembayaran_UE"],
    spKey: "lokasitransaksi",
    mode: "vol",
  },
  {
    label: "Nom Pembayaran",
    fileHints: ["Transaksi_Pembayaran_UE_(Spasial)", "Pembayaran_UE"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
  {
    label: "Vol Top Up",
    fileHints: ["Transaksi_Top_Up_UE_(Spasial)", "Top_Up", "Reload"],
    spKey: "lokasitransaksi",
    mode: "vol",
  },
  {
    label: "Nom Top Up",
    fileHints: ["Transaksi_Top_Up_UE_(Spasial)", "Top_Up", "Reload"],
    spKey: "lokasitransaksi",
    mode: "nom",
  },
];

export const SPASIAL_KK_TASKS: SpasialTask[] = [
  {
    label: "Jumlah Kartu",
    fileHints: ["Jumlah_Kartu_Kredit_(Spasial)", "Jumlah_Kartu_Kredit"],
    spKey: "lokasinasabah",
    mode: "kk_sum",
  },
  {
    label: "Outstanding",
    fileHints: ["Outstanding_Kartu_Kredit_(Spasial)", "Outstanding"],
    spKey: "lokasinasabah",
    mode: "col_juta",
    valueCol: "expr_1",
  },
  {
    label: "NPL",
    fileHints: ["NPL_Kartu_Kredit_(Spasial)", "NPL"],
    spKey: "lokasinasabah",
    mode: "col_juta",
    valueCol: "expr_1",
  },
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
  return "SHEET_SPASIAL_ATM";
}

export type Row = Record<string, unknown>;

function normalizeColKey(k: string): string {
  return k.toLowerCase().replace(/[\s_\-\.]+/g, "");
}

export function cleanKey(val: unknown): string {
  if (val === null || val === undefined) return "n/a";
  const s = String(val).replace(/\.0$/, "").trim();
  if (!s || s.toLowerCase() === "nan" || s === "0" || s.toLowerCase() === "none") return "n/a";
  const digits = s.replace(/\D/g, "");
  if (!digits) return "n/a";
  return digits.slice(0, 4).padStart(4, "0");
}

function pickKeyCol(row: Row, preferred: string): unknown {
  const keys = Object.keys(row);
  const pref = preferred.toLowerCase();
  for (const k of keys) {
    if (k.toLowerCase() === pref) return row[k];
  }
  for (const cand of ["lokasinasabah", "lokasitransaksi", "lokasimesin", "lokasi", "kode_kota", "kodekota"]) {
    for (const k of keys) {
      if (k.toLowerCase().replace(/[\s_]+/g, "") === cand.replace(/_/g, "")) return row[k];
    }
  }
  return row[preferred];
}

export function findFile<
  T extends { name: string }
>(files: T[], hints: string[]): T | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  let best: T | undefined;
  let bestScore = 0;
  for (const f of files) {
    const n = norm(f.name);
    for (const h of hints) {
      const hn = norm(h);
      if (!hn) continue;
      if (n.includes(hn)) {
        const score = hn.length * 2 + (n === hn ? 50 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = f;
        }
      }
    }
  }
  return best;
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v ?? "0").replace(/,/g, "").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pickVal(row: Row, names: string[]): number {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.toLowerCase() === n.toLowerCase());
    if (found != null) return num(row[found]);
  }
  for (const n of names) {
    const nn = normalizeColKey(n);
    const found = keys.find((k) => normalizeColKey(k) === nn);
    if (found != null) return num(row[found]);
  }
  return 0;
}

function findExprKey(row: Row, which: 1 | 2): string | null {
  const target = which === 1 ? ["expr_1", "expr1", "volume", "jumlah"] : ["expr_2", "expr2", "nominal", "nilai"];
  const keys = Object.keys(row);
  for (const t of target) {
    const found = keys.find((k) => normalizeColKey(k) === normalizeColKey(t));
    if (found) return found;
  }
  return null;
}

function getExpr(row: Row, which: 1 | 2): number {
  const k = findExprKey(row, which);
  return k ? num(row[k]) : 0;
}

export function aggregateSpatial(rows: Row[], task: SpasialTask): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const key = cleanKey(pickKeyCol(r, task.spKey));
    if (!key) continue;
    let v = 0;
    if (task.mode === "kartu" || task.mode === "mesin" || task.mode === "kk_sum" || task.mode === "reader") {
      const cols = task.valueCols || ["expr_1", "jumlah"];
      if (task.mode === "kartu") {
        // notebook: sum(expr_1) - sum(expr_2) for kartu
        v = getExpr(r, 1) - getExpr(r, 2);
      } else {
        for (const c of cols) v += pickVal(r, [c]);
      }
    } else if (task.mode === "vol" || task.mode === "col_raw") {
      v = pickVal(r, [task.valueCol || "expr_1", "volume", "expr_1"]);
      if (!v) v = getExpr(r, 1);
    } else if (task.mode === "nom" || task.mode === "col_juta") {
      v = pickVal(r, [task.valueCol || "expr_2", "nominal", "expr_2"]);
      if (!v) v = getExpr(r, 2);
      v = v / 1_000_000;
    }
    out[key] = (out[key] || 0) + v;
  }
  return out;
}

export function aggregateLsbu(lsbuRows: Row[], task: SpasialTask): Record<string, number> {
  const out: Record<string, number> = {};
  if (!task.lsbuCodes?.length && !task.lsbuCols?.length) return out;
  const codeSet = new Set((task.lsbuCodes || []).map((c) => c.toUpperCase()));
  const cols = task.lsbuCols || [];

  for (const r of lsbuRows) {
    const jenis = String(
      r.JENIS_LAPORAN || r.jenis_laporan || r.JENIS || r.jenis || r.KODE || r.kode || ""
    )
      .trim()
      .toUpperCase();
    if (codeSet.size) {
      const match = Array.from(codeSet).some((c) => jenis.includes(c) || c.includes(jenis) || jenis.startsWith(c.slice(0, 3)));
      if (!match && cols.length === 0) continue;
      if (!match) {
        // still try cols if jenis partial
      }
    }
    const key = cleanKey(
      r.KODE_KOTA || r.kode_kota || r.LOKASI || r.lokasi || r.SANDI_KOTA || r.sandi_kota
    );
    if (!key) continue;
    let v = 0;
    if (cols.length) {
      for (const c of cols) v += pickVal(r, [c]);
    } else {
      v = pickVal(r, ["JUMLAH", "jumlah", "expr_1", "VOLUME"]);
    }
    if (task.mode === "nom" || task.mode === "col_juta") v = v / 1_000_000;
    out[key] = (out[key] || 0) + v;
  }
  return out;
}

export function finalValues(
  sp: Record<string, number>,
  lsbu: Record<string, number>,
  task: SpasialTask
): Record<string, number> {
  // Nom ATM/Debet: spatial only (no LSBU) per notebook Google Sheet
  if (task.mode === "nom" && (task.spKey === "lokasitransaksi" || !task.lsbuCodes?.length)) {
    // ATM nom: no LSBU
    if (!task.lsbuCodes?.length) return { ...sp };
  }
  const out: Record<string, number> = { ...sp };
  const mergeLsbu = task.lsbuCodes?.length || task.lsbuCols?.length;
  if (!mergeLsbu) return out;
  for (const [k, v] of Object.entries(lsbu)) {
    if (k === "n/a") continue;
    out[k] = (out[k] || 0) + v;
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
