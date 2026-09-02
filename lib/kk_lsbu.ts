import type { Row } from "./parse";
import { normalizeId } from "./parse";

function pick(row: Row, names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return undefined;
}

function idOf(row: Row): string {
  return normalizeId(pick(row, ["SANDI_PELAPOR", "idpelapor"]) || "");
}

function num(row: Row, cols: string[]): number {
  const v = Number(String(pick(row, cols) || "0").replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

/** FORMA0301: sum satu atau banyak kolom per SANDI_PELAPOR */
export function mergeLsbuKkField(
  lsbuRows: Row[],
  map: Map<string, number>,
  valueCols: string[],
  divideBy = 1
): number {
  let added = 0;
  for (const row of lsbuRows) {
    const id = idOf(row);
    if (!id) continue;
    let v = 0;
    for (const c of valueCols) v += num(row, [c]);
    v = v / divideBy;
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

/** Mapping job KK → kolom FORMA0301 (notebook KK Antasena) */
export const KK_LSBU_MAP: {
  jobName: string;
  cols: string[];
  divideBy: number;
  label: string;
}[] = [
  { jobName: "Jumlah Kartu", cols: ["JUMLAH_KARTU"], divideBy: 1, label: "JUMLAH_KARTU" },
  { jobName: "Jumlah Account", cols: ["JUMLAH_ACCOUNT"], divideBy: 1, label: "JUMLAH_ACCOUNT" },
  {
    jobName: "Nilai Outstanding",
    cols: [
      "CURRENT_NOMINAL_OUTSTANDING",
      "X_DAY_NOMINAL_OUTSTANDING",
      "NOMINAL_OUTSTANDING_30_DPD",
      "NOMINAL_OUTSTANDING_60_DPD",
      "NOMINAL_OUTSTANDING_90_DPD",
      "NOMINAL_OUTSTANDING_120_DPD",
      "NOMINAL_OUTSTANDING_150_DPD",
      "NOMINAL_OUTSTANDING_180_DPD",
    ],
    divideBy: 1_000_000,
    label: "SUM OUTSTANDING",
  },
  {
    jobName: "Nilai NPL",
    cols: [
      "NOMINAL_OUTSTANDING_90_DPD",
      "NOMINAL_OUTSTANDING_120_DPD",
      "NOMINAL_OUTSTANDING_150_DPD",
      "NOMINAL_OUTSTANDING_180_DPD",
    ],
    divideBy: 1_000_000,
    label: "SUM NPL 90-180",
  },
];
