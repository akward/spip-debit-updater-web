import * as XLSX from "xlsx";
import type { Row } from "./parse";
import { normalizeId } from "./parse";

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
  if (rows[0] && pick(rows[0], ["VOLUME_FRAUD_ACTUAL"])) return "forma0306";
  if (rows[0] && pick(rows[0], ["JENIS_MESIN"]) && pick(rows[0], ["JUMLAH_MESIN"]))
    return "forma0304";
  if (rows[0] && pick(rows[0], ["TRANSAKSI"]) && pick(rows[0], ["VOLUME_TRANSAKSI"]))
    return "forma0303";
  if (rows[0] && pick(rows[0], ["JUMLAH_KARTU"])) return "forma0301";
  if (rows[0] && pick(rows[0], ["JENIS_DATA"])) return "forma0302";
  return "unknown";
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

export function mergeLsbuDebit(
  lsbuRows: Row[],
  maps: { kartuAtm?: Map<string, number>; kartuDebit?: Map<string, number> }
): { addedAtm: number; addedDebit: number } {
  let addedAtm = 0;
  let addedDebit = 0;
  for (const row of lsbuRows) {
    if (!kotaOk(row)) continue;
    const jenis = (pick(row, ["JENIS_DATA"]) || "").trim();
    if (jenis !== "001-Jumlah Kartu" && !jenis.startsWith("001")) continue;
    const id = idOf(row);
    if (!id) continue;
    if (maps.kartuAtm) {
      const v = num(row, ["KARTU_ATM"]);
      if (v !== 0) {
        maps.kartuAtm.set(id, (maps.kartuAtm.get(id) || 0) + v);
        addedAtm++;
      }
    }
    if (maps.kartuDebit) {
      const v = num(row, ["KARTU_ATM_DEBIT"]);
      if (v !== 0) {
        maps.kartuDebit.set(id, (maps.kartuDebit.get(id) || 0) + v);
        addedDebit++;
      }
    }
  }
  return { addedAtm, addedDebit };
}

export function lsbuMesinAtmRows(lsbuRows: Row[]): Row[] {
  const byId = new Map<string, number>();
  for (const row of lsbuRows) {
    if (!kotaOk(row)) continue;
    const jenis = (pick(row, ["JENIS_DATA"]) || "").trim();
    if (jenis !== "121-Jumlah Mesin ATM" && !jenis.includes("121-Jumlah Mesin")) continue;
    const id = idOf(row);
    if (!id) continue;
    const v = num(row, ["KARTU_ATM"]) + num(row, ["KARTU_ATM_DEBIT"]);
    if (v === 0) continue;
    byId.set(id, (byId.get(id) || 0) + v);
  }
  const out: Row[] = [];
  for (const [id, v] of byId) {
    out.push({ idpelapor: id, jenismesin: "ACMAT", expr_1: String(v) });
  }
  return out;
}

export function mergeLsbuDebitTrx(
  lsbuRows: Row[],
  map: Map<string, number>,
  jenisList: string[],
  valueCol: string,
  divideBy = 1
): number {
  let added = 0;
  for (const row of lsbuRows) {
    if (!kotaOk(row)) continue;
    const jenis = (pick(row, ["JENIS_DATA"]) || "").trim();
    if (!jenisList.includes(jenis)) continue;
    const id = idOf(row);
    if (!id) continue;
    const v =
      num(row, [valueCol, "VOLUME_TRANSAKSI", "NILAI_TRANSAKSI", "KARTU_ATM"]) /
      divideBy;
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export const DEBIT_TRX_LSBU: {
  match: string[];
  jenis: string[];
  valueCol: string;
  divideBy: number;
}[] = [
  { match: ["Volume Transaksi Tunai"], jenis: ["082-Volume transaksi tarik tunai domestik"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nominal Transaksi Tunai"], jenis: ["102-Nominal transaksi tarik tunai domestik"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Volume Transaksi Belanja"], jenis: ["087-Volume transaksi belanja domestik"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nominal Transaksi Belanja"], jenis: ["107-Nominal transaksi belanja domestik"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Volume Transaksi Transfer"], jenis: ["091-Volume transaksi transfer interbank"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nominal Transaksi Transfer"], jenis: ["111-Nominal transaksi transfer interbank"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Volume Transaksi Transfer (2)"], jenis: ["092-Volume transaksi transfer antarbank"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nominal Transaksi Transfer (2)"], jenis: ["112-Nominal transaksi transfer antarbank"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
];

export function mergeLsbuUe(lsbuRows: Row[], map: Map<string, number>): number {
  return mergeLsbuUeByJenis(lsbuRows, map, ["001-Jumlah Kartu"]);
}

export function mergeLsbuUeByJenis(
  lsbuRows: Row[],
  map: Map<string, number>,
  jenisFilters: string | string[],
  valueCol: string = "KARTU_ELEKTRONIK",
  divideBy = 1
): number {
  const list = Array.isArray(jenisFilters) ? jenisFilters : [jenisFilters];
  let added = 0;
  for (const row of lsbuRows) {
    if (!kotaOk(row)) continue;
    const jenis = (pick(row, ["JENIS_DATA"]) || "").trim();
    if (!list.includes(jenis)) continue;
    const id = idOf(row);
    if (!id) continue;
    const v =
      num(row, [valueCol, "KARTU_ELEKTRONIK", "VOLUME_TRANSAKSI", "NILAI_TRANSAKSI"]) /
      divideBy;
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export const UE_LSBU_MAP: {
  match: string[];
  jenis: string[];
  valueCol: string;
  divideBy: number;
}[] = [
  { match: ["Jumlah Kartu"], jenis: ["001-Jumlah Kartu"], valueCol: "KARTU_ELEKTRONIK", divideBy: 1 },
  { match: ["Chip Based"], jenis: ["051-Chip based"], valueCol: "KARTU_ELEKTRONIK", divideBy: 1 },
  { match: ["Server Based"], jenis: ["052-Server based"], valueCol: "KARTU_ELEKTRONIK", divideBy: 1 },
  { match: ["Registered"], jenis: ["056-Registered"], valueCol: "KARTU_ELEKTRONIK", divideBy: 1 },
  { match: ["Unregistered"], jenis: ["057-Unregistered"], valueCol: "KARTU_ELEKTRONIK", divideBy: 1 },
  { match: ["Dana Float"], jenis: ["070-Dana Float"], valueCol: "KARTU_ELEKTRONIK", divideBy: 1 },
  {
    match: ["Jumlah Reader"],
    jenis: ["122-Jumlah Mesin Reader Uang Elektronik ", "122-Jumlah Mesin Reader Uang Elektronik"],
    valueCol: "KARTU_ELEKTRONIK",
    divideBy: 1,
  },
  {
    match: ["Volume Belanja", "Volume"],
    jenis: ["086-Volume transaksi belanja internasional", "087-Volume transaksi belanja domestik"],
    valueCol: "VOLUME_TRANSAKSI",
    divideBy: 1,
  },
  {
    match: ["Nilai Belanja", "Nilai"],
    jenis: ["106-Nominal transaksi belanja internasional", "107-Nominal transaksi belanja domestik"],
    valueCol: "NILAI_TRANSAKSI",
    divideBy: 1_000_000,
  },
  { match: ["Vol Initial"], jenis: ["096-Volume transaksi Initial (isi pertama kali)"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Initial"], jenis: ["116-Nominal transaksi Initial (isi pertama kali)"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Vol Top Up"], jenis: ["097-Volume transaksi reload/top up"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Top Up"], jenis: ["117-Nominal transaksi reload/top up"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Vol Transfer"], jenis: ["093-Volume transaksi transfer antar uang elektronik"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Transfer"], jenis: ["113-Nominal transaksi transfer antar uang elektronik"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Vol Tunai"], jenis: ["098-Volume transaksi tarik tunai uang elektronik"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Tunai"], jenis: ["118-Nominal transaksi tarik tunai uang elektronik"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Vol Redeem"], jenis: ["099-Volume transaksi reedem"], valueCol: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Redeem"], jenis: ["119-Nominal transaksi reedem"], valueCol: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
];

export function mergeLsbuKk(lsbuRows: Row[], map: Map<string, number>): number {
  let added = 0;
  for (const row of lsbuRows) {
    const id = idOf(row);
    if (!id) continue;
    const v = num(row, ["JUMLAH_KARTU"]);
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export function mergeLsbuKkAccount(lsbuRows: Row[], map: Map<string, number>): number {
  let added = 0;
  for (const row of lsbuRows) {
    const id = idOf(row);
    if (!id) continue;
    const v = num(row, ["JUMLAH_ACCOUNT"]);
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

/** Generic: sum several FORMA0301 columns per SANDI_PELAPOR, then ÷ divideBy */
export function mergeLsbuKkSumCols(
  lsbuRows: Row[],
  map: Map<string, number>,
  cols: string[],
  divideBy = 1
): number {
  let added = 0;
  for (const row of lsbuRows) {
    const id = idOf(row);
    if (!id) continue;
    let sum = 0;
    for (const c of cols) sum += num(row, [c]);
    const v = sum / divideBy;
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

const KK_OUTSTANDING_COLS = [
  "CURRENT_NOMINAL_OUTSTANDING",
  "X_DAY_NOMINAL_OUTSTANDING",
  "NOMINAL_OUTSTANDING_30_DPD",
  "NOMINAL_OUTSTANDING_60_DPD",
  "NOMINAL_OUTSTANDING_90_DPD",
  "NOMINAL_OUTSTANDING_120_DPD",
  "NOMINAL_OUTSTANDING_150_DPD",
  "NOMINAL_OUTSTANDING_180_DPD",
];

export function mergeLsbuKkOutstanding(
  lsbuRows: Row[],
  map: Map<string, number>,
  divideBy = 1_000_000
): number {
  return mergeLsbuKkSumCols(lsbuRows, map, KK_OUTSTANDING_COLS, divideBy);
}

const KK_NPL_COLS = [
  "NOMINAL_OUTSTANDING_90_DPD",
  "NOMINAL_OUTSTANDING_120_DPD",
  "NOMINAL_OUTSTANDING_150_DPD",
  "NOMINAL_OUTSTANDING_180_DPD",
];

export function mergeLsbuKkNpl(
  lsbuRows: Row[],
  map: Map<string, number>,
  divideBy = 1_000_000
): number {
  return mergeLsbuKkSumCols(lsbuRows, map, KK_NPL_COLS, divideBy);
}

/**
 * KK FORMA0301 — semua sheet (notebook):
 * - Kartu / Account: single column
 * - Outstanding / NPL: sum DPD columns
 * - Tunai / Belanja: domestik + internasional
 * - Reversal: tidak ada di notebook (CSV only)
 */
export const KK_LSBU_MAP: {
  match: string;
  cols: string[];
  divideBy: number;
  label: string;
}[] = [
  { match: "Jumlah Kartu", cols: ["JUMLAH_KARTU"], divideBy: 1, label: "JUMLAH_KARTU" },
  { match: "Jumlah Account", cols: ["JUMLAH_ACCOUNT"], divideBy: 1, label: "JUMLAH_ACCOUNT" },
  {
    match: "Nilai Outstanding",
    cols: KK_OUTSTANDING_COLS,
    divideBy: 1_000_000,
    label: "SUM outstanding",
  },
  {
    match: "Nilai NPL",
    cols: KK_NPL_COLS,
    divideBy: 1_000_000,
    label: "SUM NPL 90-180 DPD",
  },
  {
    match: "Volume Tunai",
    cols: ["VOLUME_TUNAI_DOMESTIK", "VOLUME_TUNAI_INTERNASIONAL"],
    divideBy: 1,
    label: "VOLUME_TUNAI dom+intl",
  },
  {
    match: "Nilai Tunai",
    cols: ["NILAI_TUNAI_DOMESTIK", "NILAI_TUNAI_INTERNASIONAL"],
    divideBy: 1_000_000,
    label: "NILAI_TUNAI dom+intl",
  },
  {
    match: "Volume Belanja",
    cols: ["VOLUME_BELANJA_DOMESTIK", "VOLUME_BELANJA_INTERNASIONAL"],
    divideBy: 1,
    label: "VOLUME_BELANJA dom+intl",
  },
  {
    match: "Nilai Belanja",
    cols: ["NILAI_BELANJA_DOMESTIK", "NILAI_BELANJA_INTERNASIONAL"],
    divideBy: 1_000_000,
    label: "NILAI_BELANJA dom+intl",
  },
];

export function mergeLsbuAcquirer(
  lsbuRows: Row[],
  targetJenis: string,
  map: Map<string, number>,
  valueField: string = "JUMLAH_MESIN"
): number {
  let added = 0;
  for (const row of lsbuRows) {
    if (!kotaOk(row)) continue;
    const jenis = (pick(row, ["JENIS_MESIN"]) || "").trim();
    if (jenis !== targetJenis && !jenis.includes(targetJenis)) continue;
    const id = idOf(row);
    if (!id) continue;
    const v = num(row, [valueField]);
    if (v !== 0) {
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

export function mergeLsbuForma0303(
  lsbuRows: Row[],
  map: Map<string, number>,
  transaksi: string,
  valueField: "VOLUME_TRANSAKSI" | "NILAI_TRANSAKSI",
  divideBy = 1
): number {
  let added = 0;
  for (const row of lsbuRows) {
    const trx = (pick(row, ["TRANSAKSI"]) || "").trim();
    if (trx !== transaksi) continue;
    const id = idOf(row);
    if (!id) continue;
    const v = num(row, [valueField]) / divideBy;
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export const ACQUIRER_0303_MAP: {
  match: string[];
  transaksi: string;
  field: "VOLUME_TRANSAKSI" | "NILAI_TRANSAKSI";
  divideBy: number;
}[] = [
  { match: ["Vol Internasional"], transaksi: "51-Internasional (interchange)", field: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Internasional"], transaksi: "51-Internasional (interchange)", field: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
  { match: ["Vol Off Us"], transaksi: "52-Domestik (interchange)", field: "VOLUME_TRANSAKSI", divideBy: 1 },
  { match: ["Nom Off Us"], transaksi: "52-Domestik (interchange)", field: "NILAI_TRANSAKSI", divideBy: 1_000_000 },
];

export function mergeLsbuFraudBank(
  lsbuRows: Row[],
  map: Map<string, number>,
  jenisKartu: string,
  valueField: string,
  divideBy: number = 1
): number {
  let added = 0;
  for (const row of lsbuRows) {
    const jk = (pick(row, ["JENIS_KARTU"]) || "").trim();
    if (jk !== jenisKartu) {
      const key = jenisKartu.toLowerCase();
      if (
        !jk
          .toLowerCase()
          .includes(
            key.includes("kredit")
              ? "kredit"
              : key.includes("elektronik")
                ? "elektronik"
                : key.includes("atm") || key.includes("debet")
                  ? "atm"
                  : "___"
          )
      )
        continue;
    }
    const id = idOf(row);
    if (!id) continue;
    const v = num(row, [valueField]) / divideBy;
    if (v !== 0) {
      map.set(id, (map.get(id) || 0) + v);
      added++;
    }
  }
  return added;
}

export const FRAUD_PENYEBAB_MAP: Record<string, string> = {
  "50-Transaksi tanpa menggunakan kartu/Card not present": "CP",
  "10-Kartu palsu": "PL",
  "20-Kartu yang hilang dan atau dicuri": "HD",
  "30-Kartu tidak diterima pemegang kartu": "TD",
  "40-Fraud Aplikasi": "FA",
  "99-Lainnya": "X",
};

export function mergeLsbuFraudPenyebab(
  lsbuRows: Row[],
  map: Map<string, number>,
  jenisKartu: string,
  valueField: "VOLUME_FRAUD_ACTUAL" | "NOMINAL_FRAUD_ACTUAL",
  divideBy: number
): number {
  let added = 0;
  for (const row of lsbuRows) {
    const jk = (pick(row, ["JENIS_KARTU"]) || "").trim();
    if (jk !== jenisKartu) continue;
    const jf = (pick(row, ["JENIS_FRAUD"]) || "").trim();
    const code = FRAUD_PENYEBAB_MAP[jf];
    if (!code) continue;
    const v = num(row, [valueField]) / divideBy;
    if (v !== 0) {
      map.set(code, (map.get(code) || 0) + v);
      added++;
    }
  }
  return added;
}
