/**
 * Browser + server safe Spasial aggregation (no Node-only APIs).
 * Used by app/page.tsx (client precompute) and lib/spasial.ts (server).
 */

export type SpasialMode =
  | "long"
  | "wide"
  | "kartu_atm"
  | "kartu_debet"
  | "ue_jumlah"
  | "ue_blank"
  | "kk";

export type SpasialTask = {
  name: string;
  sheetName: string;
  fileHints: string[];
  mode: SpasialMode;
  /** LSBU forma0302 jenis codes (optional) */
  lsbuJenis?: string[];
  /** Column names in spatial file for value */
  valueCols?: string[];
  divideBy?: number;
};

export const SPASIAL_ATM_TASKS: SpasialTask[] = [
  {
    name: "Kartu ATM",
    sheetName: "Kartu ATM",
    fileHints: ["kartu_atm", "spasial_kartu_atm"],
    mode: "kartu_atm",
    lsbuJenis: ["KARTU_ATM"],
  },
  {
    name: "Kartu Debet",
    sheetName: "Kartu Debet",
    fileHints: ["kartu_debet", "spasial_kartu_debet", "kartu_debit"],
    mode: "kartu_debet",
    lsbuJenis: ["KARTU_ATM_DEBIT", "KARTU_DEBIT"],
  },
  {
    name: "Mesin ATM",
    sheetName: "Mesin ATM",
    fileHints: ["mesin_atm", "spasial_mesin"],
    mode: "long",
    valueCols: ["expr_1", "jumlah"],
  },
  {
    name: "Vol Tunai",
    sheetName: "Vol Tunai",
    fileHints: ["tunai", "tarik"],
    mode: "long",
    valueCols: ["expr_1", "volume"],
  },
  {
    name: "Nom Tunai",
    sheetName: "Nom Tunai",
    fileHints: ["tunai", "tarik"],
    mode: "long",
    valueCols: ["expr_2", "nominal"],
    divideBy: 1_000_000,
  },
  {
    name: "Vol Belanja",
    sheetName: "Vol Belanja",
    fileHints: ["belanja"],
    mode: "long",
    valueCols: ["expr_1", "volume"],
  },
  {
    name: "Nom Belanja",
    sheetName: "Nom Belanja",
    fileHints: ["belanja"],
    mode: "long",
    valueCols: ["expr_2", "nominal"],
    divideBy: 1_000_000,
  },
  {
    name: "Vol Interbank",
    sheetName: "Vol Interbank",
    fileHints: ["interbank"],
    mode: "long",
    valueCols: ["expr_1", "volume"],
  },
  {
    name: "Nom Interbank",
    sheetName: "Nom Interbank",
    fileHints: ["interbank"],
    mode: "long",
    valueCols: ["expr_2", "nominal"],
    divideBy: 1_000_000,
  },
  {
    name: "Vol Antarbank",
    sheetName: "Vol Antarbank",
    fileHints: ["antarbank"],
    mode: "long",
    valueCols: ["expr_1", "volume"],
  },
  {
    name: "Nom Antarbank",
    sheetName: "Nom Antarbank",
    fileHints: ["antarbank"],
    mode: "long",
    valueCols: ["expr_2", "nominal"],
    divideBy: 1_000_000,
  },
];

export const SPASIAL_UE_TASKS: SpasialTask[] = [
  {
    name: "Jumlah UE",
    sheetName: "Jumlah UE",
    fileHints: ["jumlah_ue", "ue_jumlah"],
    mode: "ue_jumlah",
    lsbuJenis: ["KARTU_ELEKTRONIK"],
  },
  {
    name: "Vol Belanja",
    sheetName: "Vol Belanja",
    fileHints: ["belanja"],
    mode: "ue_blank",
    valueCols: ["expr_1"],
  },
  {
    name: "Nom Belanja",
    sheetName: "Nom Belanja",
    fileHints: ["belanja"],
    mode: "ue_blank",
    valueCols: ["expr_2"],
    divideBy: 1_000_000,
  },
  {
    name: "Vol Topup",
    sheetName: "Vol Topup",
    fileHints: ["topup", "top_up"],
    mode: "ue_blank",
    valueCols: ["expr_1"],
  },
  {
    name: "Nom Topup",
    sheetName: "Nom Topup",
    fileHints: ["topup", "top_up"],
    mode: "ue_blank",
    valueCols: ["expr_2"],
    divideBy: 1_000_000,
  },
];

export const SPASIAL_KK_TASKS: SpasialTask[] = [
  {
    name: "Jumlah Kartu",
    sheetName: "Jumlah Kartu",
    fileHints: ["jumlah_kartu", "kk"],
    mode: "kk",
    valueCols: ["expr_1", "jumlah"],
  },
  {
    name: "Outstanding",
    sheetName: "Outstanding",
    fileHints: ["outstanding"],
    mode: "kk",
    valueCols: ["expr_1"],
    divideBy: 1_000_000,
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
  const s = String(val ?? "").replace(/\.0$/, "").trim();
  if (!s) return "";
  // first 4 digits = kode kota (notebook)
  const m = s.match(/(\d{4})/);
  return m ? m[1] : s;
}

export function findFile(
  files: { name: string; rows: Row[] }[],
  hints: string[]
): { name: string; rows: Row[] } | undefined {
  const lower = (n: string) => n.toLowerCase().replace(/\\/g, "/");
  let best: { name: string; rows: Row[] } | undefined;
  let bestScore = 0;
  for (const f of files) {
    const n = lower(f.name);
    for (const h of hints) {
      const hl = h.toLowerCase();
      if (!n.includes(hl)) continue;
      const score = hl.length + (n.includes(hl) ? 10 : 0);
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

export function aggregateSpatial(rows: Row[], task: SpasialTask): Record<string, number> {
  const out: Record<string, number> = {};
  const divide = task.divideBy || 1;
  const cols = task.valueCols || ["expr_1"];

  for (const r of rows) {
    const key = cleanKey(r.lokasi || r.kode_kota || r.kota || r.id || r.No);
    if (!key || key.length < 4) continue;

    let v = 0;
    for (const c of cols) {
      const found = Object.keys(r).find((k) => k.toLowerCase() === c.toLowerCase());
      if (found) v += num(r[found]);
    }
    // wide: sum numeric cols except key
    if (task.mode === "wide") {
      for (const [k, val] of Object.entries(r)) {
        if (/lokasi|kota|kode|id|no/i.test(k)) continue;
        v += num(val);
      }
    }
    out[key] = (out[key] || 0) + v / divide;
  }
  return out;
}

export function aggregateLsbu(lsbuRows: Row[], task: SpasialTask): Record<string, number> {
  const out: Record<string, number> = {};
  if (!task.lsbuJenis?.length) return out;
  const jenisSet = new Set(task.lsbuJenis.map((j) => j.toUpperCase()));
  const divide = task.divideBy || 1;

  for (const r of lsbuRows) {
    const jenis = String(r.JENIS_KARTU || r.jenis || r.JENIS || "")
      .trim()
      .toUpperCase();
    if (!jenisSet.has(jenis) && !task.lsbuJenis.some((j) => jenis.includes(j.toUpperCase()))) {
      continue;
    }
    const key = cleanKey(
      r.KODE_KOTA || r.kode_kota || r.LOKASI || r.lokasi || r.SANDI_KOTA
    );
    if (!key) continue;
    const v =
      num(r.JUMLAH || r.jumlah || r.expr_1 || r.VOLUME || r.volume) / divide;
    out[key] = (out[key] || 0) + v;
  }
  return out;
}

export function finalValues(
  spatial: Record<string, number>,
  lsbu: Record<string, number>,
  mode: SpasialMode
): Record<string, number> {
  const out: Record<string, number> = { ...spatial };
  // blank lokasi modes: do NOT add LSBU on top of spatial zeros differently
  if (mode === "ue_blank") {
    return out;
  }
  for (const [k, v] of Object.entries(lsbu)) {
    out[k] = (out[k] || 0) + v;
  }
  return out;
}

export type PrecomputedTask = {
  name: string;
  sheetName: string;
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
    const values = finalValues(spatial, lsbu, task.mode);
    // omit zeros to keep payload small
    const compact: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v) compact[k] = v;
    }
    result.push({ name: task.name, sheetName: task.sheetName, values: compact });
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
