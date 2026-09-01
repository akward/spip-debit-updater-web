import * as XLSX from "xlsx";
import type { Row } from "./parse";

export function parseLsbuXlsx(buf: ArrayBuffer): Row[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) {
      out[String(k).trim()] = v == null ? "" : String(v);
    }
    return out;
  });
}

function pick(row: Row, names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase());
    if (found && row[found] !== "") return row[found];
  }
  return undefined;
}

export type LsbuKind =
  | "forma0301"
  | "forma0302"
  | "forma0303"
  | "forma0304"
  | "forma0306"
  | "unknown";

export function detectLsbuKind(filename: string, rows: Row[]): LsbuKind {
  const n = filename.toLowerCase();
  if (n.includes("0301")) return "forma0301";
  if (n.includes("0302")) return "forma0302";
  if (n.includes("0303")) return "forma0303";
  if (n.includes("0304")) return "forma0304";
  if (n.includes("0306")) return "forma0306";
  if (rows[0] && pick(rows[0], ["JENIS_DATA"])) return "forma0302";
  if (rows[0] && pick(rows[0], ["JENIS_MESIN"])) return "forma0304";
  if (rows[0] && pick(rows[0], ["JUMLAH_KARTU"])) return "forma0301";
  if (rows[0] && pick(rows[0], ["VOLUME_FRAUD_ACTUAL"])) return "forma0306";
  return "unknown";
}

/** Debit FORMA0302 → KARTU_ATM / KARTU_ATM_DEBIT */
export function mergeLsbuDebit(
  lsbuRows: Row[],
  maps: { kartuAtm?: Map<string, number>; kartuDebit?: Map<string, number> }
): { addedAtm: number; addedDebit: number } {
  let addedAtm = 0;
  let addedDebit = 0;
  for (const row of lsbuRows) {
    const jenis = (pick(row, ["JENIS_DATA", "jenis_data"]) || "").trim();
    const kota = (pick(row, ["KOTA", "kota"]) || "").trim();
    if (kota !== "-" && kota !== "") continue;
    if (!jenis.includes("001-Jumlah Kartu") && !jenis.startsWith("001")) continue;
    const id = (pick(row, ["SANDI_PELAPOR", "idpelapor"]) || "")
      .replace(/\.0$/, "")
      .trim();
    if (!id) continue;
    if (maps.kartuAtm) {
      const v = Number(String(pick(row, ["KARTU_ATM"]) || "0").replace(/,/g, ""));
      if (Number.isFinite(v) && v !== 0) {
        maps.kartuAtm.set(id, (maps.kartuAtm.get(id) || 0) + v);
        addedAtm++;
      }
    }
    if (maps.kartuDebit) {
      const v = Number(String(pick(row, ["KARTU_ATM_DEBIT"]) || "0").replace(/,/g, ""));
      if (Number.isFinite(v) && v !== 0) {
        maps.kartuDebit.set(id, (maps.kartuDebit.get(id) || 0) + v);
        addedDebit++;
      }
    }
  }
  return { addedAtm, addedDebit };
}

/**
 * UE FORMA0302 → KARTU_ELEKTRONIK (notebook UE_google sheet.ipynb)
 * filter: JENIS_DATA 001-Jumlah Kartu, KOTA -
 */
export function mergeLsbuUe(lsbuRows: Row[], map: Map<string, number>): number {
  let added = 0;
  for (const row of lsbuRows) {
    const jenis = (pick(row, ["JENIS_DATA", "jenis_data"]) || "").trim();
    const kota = (pick(row, ["KOTA", "kota"]) || "").trim();
    if (kota !== "-" && kota !== "") continue;
    if (!jenis.includes("001-Jumlah Kartu") && !jenis.startsWith("001")) continue;
    const id = (pick(row, ["SANDI_PELAPOR", "idpelapor"]) || "")
      .replace(/\.0$/, "")
      .trim();
    if (!id) continue;
    const v = Number(String(pick(row, ["KARTU_ELEKTRONIK"]) || "0").replace(/,/g, ""));
    if (Number.isFinite(v) && v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

/** KK FORMA0301 → JUMLAH_KARTU (notebook KK Antasena) */
export function mergeLsbuKk(lsbuRows: Row[], map: Map<string, number>): number {
  let added = 0;
  for (const row of lsbuRows) {
    const id = (pick(row, ["SANDI_PELAPOR", "idpelapor"]) || "")
      .replace(/\.0$/, "")
      .trim();
    if (!id) continue;
    const v = Number(String(pick(row, ["JUMLAH_KARTU"]) || "0").replace(/,/g, ""));
    if (Number.isFinite(v) && v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export function mergeLsbuAcquirer(
  lsbuRows: Row[],
  targetJenis: string,
  map: Map<string, number>,
  valueField: string = "JUMLAH_MESIN"
): number {
  let added = 0;
  for (const row of lsbuRows) {
    const jenis = (pick(row, ["JENIS_MESIN", "jenis_mesin"]) || "").trim();
    const kota = (pick(row, ["KOTA", "kota"]) || "").trim();
    if (kota !== "-" && kota !== "") continue;
    if (jenis !== targetJenis && !jenis.includes(targetJenis)) continue;
    const id = (pick(row, ["SANDI_PELAPOR", "idpelapor"]) || "")
      .replace(/\.0$/, "")
      .trim();
    if (!id) continue;
    const v = Number(String(pick(row, [valueField]) || "0").replace(/,/g, ""));
    if (Number.isFinite(v) && v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export const ACQUIRER_LSBU_JENIS: { hints: string[]; jenis: string }[] = [
  { hints: ["debet", "debit"], jenis: "02-Point Of Sale Kartu Debit" },
  { hints: ["kredit"], jenis: "01-Point Of Sale Kartu Kredit" },
  { hints: ["ue"], jenis: "03-Point Of Sale Uang Elektronik" },
  { hints: ["gabungan"], jenis: "09-Point Of Sale Gabungan" },
];
