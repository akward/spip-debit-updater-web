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

function kotaOk(row: Row): boolean {
  const kota = (pick(row, ["KOTA", "kota"]) || "").trim();
  return kota === "-" || kota === "";
}

function idOf(row: Row): string {
  return normalizeId(pick(row, ["SANDI_PELAPOR", "idpelapor"]) || "");
}

function num(row: Row, cols: string[]): number {
  const v = Number(String(pick(row, cols) || "0").replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

/** Notebook debit: KARTU_ATM + KARTU_ATM_DEBIT (or debit-only for belanja). */
export function mergeLsbuDebitTrx(
  lsbuRows: Row[],
  map: Map<string, number>,
  jenisList: string[],
  valueCols: string | string[],
  divideBy = 1
): number {
  const cols = Array.isArray(valueCols) ? valueCols : [valueCols];
  let added = 0;
  for (const row of lsbuRows) {
    if (!kotaOk(row)) continue;
    const jenis = (pick(row, ["JENIS_DATA"]) || "").trim();
    if (!jenisList.includes(jenis)) continue;
    const id = idOf(row);
    if (!id) continue;
    let raw = 0;
    for (const col of cols) raw += num(row, [col]);
    if (raw === 0) {
      raw = num(row, ["VOLUME_TRANSAKSI", "NILAI_TRANSAKSI", "KARTU_ATM", "KARTU_ATM_DEBIT"]);
    }
    const v = raw / divideBy;
    if (v === 0) continue;
    const cur = map.get(id);
    if (cur === undefined || cur === 0) {
      map.set(id, v);
      added++;
    }
  }
  return added;
}

export const DEBIT_TRX_LSBU: {
  match: string[];
  jenis: string[];
  valueCols: string[];
  divideBy: number;
}[] = [
  { match: ["Volume Transaksi Tunai"], jenis: ["082-Volume transaksi tarik tunai domestik"], valueCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"], divideBy: 1 },
  { match: ["Nominal Transaksi Tunai"], jenis: ["102-Nominal transaksi tarik tunai domestik"], valueCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"], divideBy: 1_000_000 },
  { match: ["Volume Transaksi Belanja"], jenis: ["087-Volume transaksi belanja domestik"], valueCols: ["KARTU_ATM_DEBIT"], divideBy: 1 },
  { match: ["Nominal Transaksi Belanja"], jenis: ["107-Nominal transaksi belanja domestik"], valueCols: ["KARTU_ATM_DEBIT"], divideBy: 1_000_000 },
  { match: ["Volume Transaksi Transfer"], jenis: ["091-Volume transaksi transfer interbank"], valueCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"], divideBy: 1 },
  { match: ["Nominal Transaksi Transfer"], jenis: ["111-Nominal transaksi transfer interbank"], valueCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"], divideBy: 1_000_000 },
  { match: ["Volume Transaksi Transfer (2)"], jenis: ["092-Volume transaksi transfer antarbank"], valueCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"], divideBy: 1 },
  { match: ["Nominal Transaksi Transfer (2)"], jenis: ["112-Nominal transaksi transfer antarbank"], valueCols: ["KARTU_ATM", "KARTU_ATM_DEBIT"], divideBy: 1_000_000 },
];
