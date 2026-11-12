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
    fileHints: ["Jumlah_Mesin_ATM_(Spasial)", "Jumlah_Mesin_ATM", "Mesin_ATM"],
    spKey: "lokasimesin",
    mode: "mesin",
    valueCols: ["expr_1", "jumlah"],
    lsbuCodes: ["121-Jumlah Mesin"],
    lsbuCols: ["JUMLAH_MESIN"],
  },
  {
    label: "Vol Tunai",
    fileHints: ["Transaksi_Tunai_(Spasial)", "Tunai"],
    spKey: "lokasimesin",
    mode: "vol",
    valueCol: "expr_1",
  },
  {
    label: "Nom Tunai",
    fileHints: ["Transaksi_Tunai_(Spasial)", "Tunai"],
    spKey: "lokasimesin",
    mode: "nom",
    valueCol: "expr_2",
  },
  {
    label: "Vol Belanja",
    fileHints: ["Transaksi_Belanja_(Spasial)", "Belanja"],
    spKey: "lokasimesin",
    mode: "vol",
    valueCol: "expr_1",
  },
  {
    label: "Nom Belanja",
    fileHints: ["Transaksi_Belanja_(Spasial)", "Belanja"],
    spKey: "lokasimesin",
    mode: "nom",
    valueCol: "expr_2",
  },
  {
    label: "Vol Interbank",
    fileHints: ["Transaksi_Interbank_(Spasial)", "Interbank"],
    spKey: "lokasimesin",
    mode: "vol",
    valueCol: "expr_1",
  },
  {
    label: "Nom Interbank",
    fileHints: ["Transaksi_Interbank_(Spasial)", "Interbank"],
    spKey: "lokasimesin",
    mode: "nom",
    valueCol: "expr_2",
  },
  {
    label: "Vol Antarbank",
    fileHints: ["Transaksi_Antarbank_(Spasial)", "Antarbank"],
    spKey: "lokasimesin",
    mode: "vol",
    valueCol: "expr_1",
  },
  {
    label: "Nom Antarbank",
    fileHints: ["Transaksi_Antarbank_(Spasial)", "Antarbank"],
    spKey: "lokasimesin",
    mode: "nom",
    valueCol: "expr_2",
  },
];

export const SPASIAL_UE_TASKS: SpasialTask[] = [
  {
    label: "Jumlah UE",
    fileHints: ["Jumlah_UE_(Spasial)", "Jumlah_UE", "UE_Jumlah"],
    spKey: "lokasinasabah",
    mode: "kartu",
    lsbuCodes: ["001-Jumlah Kartu"],
    lsbuCols: ["KARTU_ELEKTRONIK"],
  },
  {
    label: "Vol Belanja",
    fileHints: ["Belanja_(Spasial)", "Belanja"],
    spKey: "lokasinasabah",
    mode: "vol",
    valueCol: "expr_1",
  },
  {
    label: "Nom Belanja",
    fileHints: ["Belanja_(Spasial)", "Belanja"],
    spKey: "lokasinasabah",
    mode: "nom",
    valueCol: "expr_2",
  },
  {
    label: "Vol Top Up",
    fileHints: ["Top_Up_(Spasial)", "Topup", "Top_Up"],
    spKey: "lokasinasabah",
    mode: "vol",
    valueCol: "expr_1",
  },
  {
    label: "Nom Top Up",
    fileHints: ["Top_Up_(Spasial)", "Topup", "Top_Up"],
    spKey: "lokasinasabah",
    mode: "nom",
    valueCol: "expr_2",
  },
];

export const SPASIAL_KK_TASKS: SpasialTask[] = [
  {
    label: "Jumlah Kartu",
    fileHints: ["Jumlah_Kartu_(Spasial)", "Jumlah_Kartu"],
    spKey: "lokasinasabah",
    mode: "kk_sum",
    valueCols: ["expr_1", "jumlah"],
  },
  {
    label: "Outstanding",
    fileHints: ["Outstanding_(Spasial)", "Outstanding"],
    spKey: "lokasinasabah",
    mode: "col_juta",
    valueCol: "expr_1",
  },
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
  return "SHEET_SPASIAL_ATM";
}

export type Row = Record<string, unknown>;

export function cleanKey(val: unknown): string {
  if (val === null || val === undefined) return "n/a";
  const s = String(val).replace(/\.0$/, "").trim().toLowerCase();
  if (!s || s === "nan" || s === "0" || s === "none" || s === "null") return "n/a";
  const digits = s.replace(/\D/g, "");
  if (!digits) return "n/a";
  return digits.slice(0, 4).padStart(4, "0");
}

export function findFile<
  T extends { name: string }
>(files: T[], hints: string[]): T | undefined {
  const lower = (n: string) => n.toLowerCase().replace(/\\/g, "/");
  let best: T | undefined;
  let bestScore = 0;
  for (const f of files) {
    const n = lower(f.name);
    for (const h of hints) {
      const hl = h.toLowerCase();
      if (!n.includes(hl)) continue;
      const score = hl.length * 2 + (n.includes(hl) ? 20 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
  }
  return bestScore > 0 ? best : undefined;
}

function num(v: unknown): number {
  const n = Number(String(v ?? "0").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pickVal(row: Row, names: string[]): number {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.toLowerCase() === n.toLowerCase());
    if (found != null) return num(row[found]);
  }
  for (const n of names) {
    const found = keys.find((k) => k.toLowerCase().includes(n.toLowerCase()));
    if (found != null) return num(row[found]);
  }
  return 0;
}

export function aggregateSpatial(rows: Row[], task: SpasialTask): Record<string, number> {
  const out: Record<string, number> = {};
  const keyNames = [task.spKey, "lokasi", "lokasinasabah", "lokasimesin", "kode_kota", "kota"];

  for (const r of rows) {
    let rawKey: unknown;
    for (const kn of keyNames) {
      const found = Object.keys(r).find((k) => k.toLowerCase() === kn.toLowerCase());
      if (found != null && r[found] != null && String(r[found]).trim() !== "") {
        rawKey = r[found];
        break;
      }
    }
    const key = cleanKey(rawKey);
    if (!key) continue;

    let v = 0;
    if (task.mode === "kartu" || task.mode === "mesin" || task.mode === "kk_sum") {
      const cols = task.valueCols || ["expr_1", "jumlah"];
      for (const c of cols) v += pickVal(r, [c]);
    } else if (task.mode === "vol" || task.mode === "col_raw") {
      v = pickVal(r, [task.valueCol || "expr_1", "volume", "expr_1"]);
    } else if (task.mode === "nom" || task.mode === "col_juta") {
      v = pickVal(r, [task.valueCol || "expr_2", "nominal", "expr_2"]);
      if (task.mode === "nom" || task.mode === "col_juta") v = v / 1_000_000;
    } else if (task.mode === "reader") {
      v = pickVal(r, ["expr_1", "jumlah"]);
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
      r.JENIS_LAPORAN || r.jenis_laporan || r.JENIS || r.jenis || r.KODE || ""
    )
      .trim()
      .toUpperCase();
    if (codeSet.size && !Array.from(codeSet).some((c) => jenis.includes(c) || c.includes(jenis))) {
      // still allow col-based if codes empty match fails but cols exist
      if (!cols.length) continue;
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
  const out: Record<string, number> = { ...sp };
  // blank lokasi / spatial-only modes: skip LSBU merge for pure spatial blanks handled by cleanKey
  const mergeLsbu = task.lsbuCodes?.length || task.lsbuCols?.length;
  if (!mergeLsbu) return out;
  // Nom ATM style without LSBU: mode nom without lsbu fields already returned
  for (const [k, v] of Object.entries(lsbu)) {
    if (k === "n/a") continue; // blank lokasi: spatial only
    out[k] = (out[k] || 0) + v;
  }
  return out;
}

export type PrecomputedTask = {
  name: string;
  sheetName?: string;
  label?: string;
  values: Record<string, number>;
};

export function buildPrecomputed(
  group: string,
  spatialFiles: { name: string; rows: Row[] }[],
  lsbuRows: Row[]
): PrecomputedTask[] {
  const tasks = spasialTasksForGroup(group);
  if (!tasks) return [];
  const result: PrecomputedTask[] = [];
  for (const task of tasks) {
    const file = findFile(spatialFiles, task.fileHints);
    const spatial = file ? aggregateSpatial(file.rows, task) : {};
    const lsbu = aggregateLsbu(lsbuRows, task);
    const values = finalValues(spatial, lsbu, task);
    const compact: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v) compact[k] = v;
    }
    result.push({
      name: task.label,
      label: task.label,
      sheetName: task.label,
      values: compact,
    });
  }
  return result;
}

export function rowsFromAoa(aoa: unknown[][]): Row[] {
  if (!aoa.length) return [];
  const headers = (aoa[0] || []).map((h) => String(h ?? "").trim());
  const rows: Row[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const obj: Row = {};
    let empty = true;
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      if (!h) continue;
      const v = row[j];
      if (v !== undefined && v !== null && String(v).trim() !== "") empty = false;
      obj[h] = v as unknown;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}
