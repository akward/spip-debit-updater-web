import * as XLSX from "xlsx";
import type { Row } from "./parse";

/** Parse LSBU .xlsx from in-memory ArrayBuffer (tidak disimpan ke disk). */
export function parseLsbuXlsx(buf: ArrayBuffer): Row[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
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

/**
 * Merge LSBU FORMA0302 into debit value maps (in-memory).
 * kartu_atm ← KARTU_ATM, kartu_debit ← KARTU_ATM_DEBIT
 * filter: JENIS_DATA 001-Jumlah Kartu, KOTA = -
 */
export function mergeLsbuDebit(
  lsbuRows: Row[],
  maps: {
    kartuAtm?: Map<string, number>;
    kartuDebit?: Map<string, number>;
  }
): { addedAtm: number; addedDebit: number } {
  let addedAtm = 0;
  let addedDebit = 0;

  for (const row of lsbuRows) {
    const jenis = (pick(row, ["JENIS_DATA", "jenis_data"]) || "").trim();
    const kota = (pick(row, ["KOTA", "kota"]) || "").trim();
    if (kota !== "-" && kota !== "") continue;
    if (!jenis.includes("001-Jumlah Kartu") && !jenis.startsWith("001")) continue;

    const id = (pick(row, ["SANDI_PELAPOR", "idpelapor", "sandi_pelapor"]) || "")
      .replace(/\.0$/, "")
      .trim();
    if (!id) continue;

    if (maps.kartuAtm) {
      const v = Number(
        String(pick(row, ["KARTU_ATM", "kartu_atm"]) || "0").replace(/,/g, "")
      );
      if (Number.isFinite(v) && v !== 0) {
        maps.kartuAtm.set(id, (maps.kartuAtm.get(id) || 0) + v);
        addedAtm++;
      }
    }
    if (maps.kartuDebit) {
      const v = Number(
        String(pick(row, ["KARTU_ATM_DEBIT", "kartu_atm_debit"]) || "0").replace(
          /,/g,
          ""
        )
      );
      if (Number.isFinite(v) && v !== 0) {
        maps.kartuDebit.set(id, (maps.kartuDebit.get(id) || 0) + v);
        addedDebit++;
      }
    }
  }

  return { addedAtm, addedDebit };
}
