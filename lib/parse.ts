import Papa from "papaparse";

export type Row = Record<string, string>;

/**
 * Normalisasi id pelapor / kolom No:
 * - jika numerik dan < 9 digit → pad leading zero jadi 9 digit (sesuai CSV)
 * - kode fraud (CP, PL, …) dan non-numerik dibiarkan apa adanya
 */
export function normalizeId(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).replace(/\.0$/, "").trim();
  if (!s || s === "Total") return s;
  // pure digits only → pad to 9
  if (/^\d+$/.test(s)) {
    if (s.length < 9) s = s.padStart(9, "0");
    return s;
  }
  // scientific / float-like "123456789.0" already stripped; mixed leave as-is
  return s;
}

export function parseCsvText(text: string): Row[] {
  let parsed = Papa.parse<Row>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if ((parsed.meta.fields?.length || 0) <= 1) {
    parsed = Papa.parse<Row>(text, {
      header: true,
      delimiter: ",",
      skipEmptyLines: true,
      dynamicTyping: false,
    });
  }
  return (parsed.data || []).filter((r) => Object.keys(r).length > 0);
}

function pick(row: Row, names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== "") return row[found];
  }
  for (const n of names) {
    const found = keys.find((k) => k.trim().toLowerCase().includes(n.toLowerCase()));
    if (found && row[found] !== undefined && row[found] !== "") return row[found];
  }
  return undefined;
}

export function buildValueMap(
  rows: Row[],
  valueColumn: string,
  divideBy: number,
  keyColumn?: string
): Map<string, number> {
  const map = new Map<string, number>();
  const keyNames = keyColumn
    ? [keyColumn, "jenisfraud", "JENIS_FRAUD", "No"]
    : ["idpelapor", "SANDI_PELAPOR", "No", "id"];

  for (const row of rows) {
    const idRaw = pick(row, keyNames);
    if (!idRaw) continue;
    const id = normalizeId(idRaw);
    if (!id || id === "Total") continue;

    let valRaw: string | undefined;
    if (valueColumn === "jumlah") {
      valRaw = pick(row, ["jumlah"]) || pick(row, ["expr_1"]) || undefined;
      if (!valRaw) {
        const a = Number(pick(row, ["jumlah_kartu"]) || 0);
        const b = Number(pick(row, ["jumlah_kartu_ditutup"]) || 0);
        valRaw = String(a - b);
      }
    } else {
      valRaw = pick(row, [
        valueColumn,
        valueColumn.toUpperCase(),
        "sum(frekuensitransaksi)",
        "sum(nominaltransaksi)",
      ]);
    }
    const num = Number(String(valRaw ?? "0").replace(/,/g, ""));
    if (!Number.isFinite(num)) continue;
    const v = num / divideBy;
    map.set(id, (map.get(id) || 0) + v);
  }
  return map;
}

export function matchFile(filename: string, hints: string[]): boolean {
  const n = filename.toLowerCase().replace(/\\/g, "/").split("/").pop() || "";
  return hints.some((h) => n.includes(h.toLowerCase()));
}

/** Lookup nilai di map dengan normalisasi 9-digit */
export function lookupId(map: Map<string, number>, rawKey: string): number {
  const key = normalizeId(rawKey);
  if (map.has(key)) return map.get(key)!;
  // fallback tanpa pad / numeric strip
  const bare = String(rawKey).replace(/\.0$/, "").trim();
  if (map.has(bare)) return map.get(bare)!;
  if (/^\d+$/.test(bare) && map.has(String(Number(bare)))) {
    return map.get(String(Number(bare)))!;
  }
  return 0;
}
