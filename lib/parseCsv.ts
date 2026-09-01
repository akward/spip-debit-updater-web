import Papa from "papaparse";

export type RowMap = Record<string, string | number>;

export function parseCsvText(text: string): RowMap[] {
  let result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "",
  });
  if (result.meta.fields && result.meta.fields.length <= 1) {
    result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
    });
  }
  const rows: RowMap[] = [];
  for (const r of result.data) {
    const out: RowMap = {};
    for (const [k, v] of Object.entries(r)) {
      const key = String(k).trim().toLowerCase();
      const num = Number(String(v).replace(/,/g, ""));
      out[key] = Number.isFinite(num) && String(v).trim() !== "" ? num : String(v ?? "").trim();
    }
    rows.push(out);
  }
  return rows;
}

export function normalizeKartuAtm(rows: RowMap[]): RowMap[] {
  return rows.map((r) => {
    const jk = Number(r["jumlah_kartu"] ?? 0) || 0;
    const jt = Number(r["jumlah_kartu_ditutup"] ?? 0) || 0;
    return { ...r, jumlah: jk - jt };
  });
}

export function normalizeKartuDebit(rows: RowMap[]): RowMap[] {
  return rows.map((r) => ({
    ...r,
    jumlah: Number(r["expr_1"] ?? r["jumlah"] ?? 0) || 0,
  }));
}

export function valueById(
  rows: RowMap[],
  valueColumn: string,
  divideBy: number
): Map<number, number> {
  const m = new Map<number, number>();
  const col = valueColumn.toLowerCase();
  for (const r of rows) {
    const id = Number(r["idpelapor"] ?? r["sandi_pelapor"] ?? r["no"]);
    if (!Number.isFinite(id)) continue;
    const raw = Number(r[col] ?? 0) || 0;
    const prev = m.get(id) ?? 0;
    m.set(id, prev + raw / divideBy);
  }
  return m;
}
