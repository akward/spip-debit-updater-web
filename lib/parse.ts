import Papa from "papaparse";

export type Row = Record<string, string>;

export function normalizeId(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).replace(/\.0$/, "").trim();
  if (!s || s === "Total") return s;
  if (/^\d+$/.test(s)) {
    if (s.length < 9) s = s.padStart(9, "0");
    return s;
  }
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
    const found = keys.find((k) =>
      k.trim().toLowerCase().includes(n.toLowerCase())
    );
    if (found && row[found] !== undefined && row[found] !== "") return row[found];
  }
  return undefined;
}

export function buildValueMap(
  rows: Row[],
  valueColumn: string,
  divideBy: number,
  keyColumn?: string,
  filterJenis?: string,
  filterMesin?: string[]
): Map<string, number> {
  const map = new Map<string, number>();
  const keyNames = keyColumn
    ? [keyColumn, "jenisfraud", "JENIS_FRAUD", "No"]
    : ["idpelapor", "SANDI_PELAPOR", "No", "id"];

  const vc = valueColumn.toLowerCase();
  const isVolume =
    vc === "expr_1" ||
    vc.includes("vol") ||
    vc.includes("frekuensi") ||
    vc === "jumlah";
  const isNominal =
    vc === "expr_2" || vc.includes("nom") || vc.includes("nilai");

  const mesinSet =
    filterMesin && filterMesin.length
      ? new Set(filterMesin.map((m) => m.trim().toUpperCase()))
      : null;

  for (const row of rows) {
    if (filterJenis) {
      const jt = (
        pick(row, ["jenistransaksi", "JENIS_TRANSAKSI", "jenis"]) || ""
      ).trim();
      if (jt !== filterJenis) continue;
    }

    // Filter jenismesin (Acquirer Internasional / On Us / Off Us)
    if (mesinSet) {
      const jm = (
        pick(row, ["jenismesin", "JENIS_MESIN", "jenis_mesin"]) || ""
      )
        .trim()
        .toUpperCase();
      if (!mesinSet.has(jm)) continue;
    }

    const idRaw = pick(row, keyNames);
    if (!idRaw) continue;
    const id = normalizeId(idRaw);
    if (!id || id === "Total") continue;

    let valRaw: string | undefined;
    // Prefer exact pivoted column (vol_inter, nom_ue, …) if present
    const exact = pick(row, [
      valueColumn,
      valueColumn.toLowerCase(),
      valueColumn.toUpperCase(),
    ]);
    if (valueColumn === "jumlah") {
      valRaw = exact || pick(row, ["jumlah"]) || pick(row, ["expr_1"]) || undefined;
      if (!valRaw) {
        const a = Number(pick(row, ["jumlah_kartu"]) || 0);
        const b = Number(pick(row, ["jumlah_kartu_ditutup"]) || 0);
        valRaw = String(a - b);
      }
    } else if (exact !== undefined) {
      valRaw = exact;
    } else if (isNominal) {
      // Raw CSV: after jenismesin filter use expr_2
      valRaw = pick(row, [
        "expr_2",
        "sum(nominaltransaksi)",
        "nominaltransaksi",
        "NILAI_TRANSAKSI",
        "jumlah_merchant",
        "JUMLAH_MERCHANT",
      ]);
    } else if (isVolume) {
      valRaw = pick(row, [
        "expr_1",
        "sum(frekuensitransaksi)",
        "frekuensitransaksi",
        "VOLUME_TRANSAKSI",
        "jumlah_mesin",
        "JUMLAH_MESIN",
      ]);
    } else {
      valRaw = pick(row, [
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

function basename(filename: string): string {
  return filename.toLowerCase().replace(/\\/g, "/").split("/").pop() || "";
}

export function matchFile(filename: string, hints: string[]): boolean {
  const n = basename(filename);
  return hints.some((h) => n.includes(h.toLowerCase()));
}

export function findBestFile<
  T extends { name: string }
>(files: T[], hints: string[]): T | undefined {
  let best: T | undefined;
  let bestScore = 0;
  for (const f of files) {
    const n = basename(f.name);
    for (const h of hints) {
      const hl = h.toLowerCase();
      if (!n.includes(hl)) continue;
      const stem = n.replace(/\.csv$/i, "").replace(/\.xlsx$/i, "");
      let score = hl.length * 2;
      if (stem === hl || stem.endsWith(hl) || stem.startsWith(hl)) score += 80;
      // Prefer longer/more specific hints
      if (hl.includes("internasional") && n.includes("internasional")) score += 100;
      if (hl.includes("internasional") && !n.includes("internasional")) score -= 200;
      if (hl.includes("on_us") && n.includes("on_us") && !n.includes("off")) score += 40;
      if (hl.includes("off_us") && n.includes("off_us") && !n.includes("internasional")) score += 40;
      // EDC / Merchant machine files
      if (hl.includes("uang_elektronik") && n.includes("uang_elektronik")) score += 120;
      if (hl.includes("uang_elektronik") && !n.includes("uang_elektronik")) score -= 250;
      if (hl.includes("gabungan") && n.includes("gabungan")) score += 120;
      if (hl.includes("gabungan") && !n.includes("gabungan")) score -= 250;
      if (hl.includes("kartu_debet") && n.includes("debet")) score += 80;
      if (hl.includes("kartu_kredit") && n.includes("kredit")) score += 80;
      if (hl.includes("merchant") && n.includes("merchant")) score += 30;
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
  }
  return bestScore > 0 ? best : undefined;
}

export function lookupId(map: Map<string, number>, rawKey: string): number {
  const key = normalizeId(rawKey);
  if (map.has(key)) return map.get(key)!;
  const bare = String(rawKey).replace(/\.0$/, "").trim();
  if (map.has(bare)) return map.get(bare)!;
  if (/^\d+$/.test(bare) && map.has(String(Number(bare)))) {
    return map.get(String(Number(bare)))!;
  }
  return 0;
}
