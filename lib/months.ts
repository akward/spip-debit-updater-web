const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Label kolom bulan = bulan sistem - 1 (sama seperti CLI). */
export function previousMonthLabel(d = new Date()): string {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() - 1);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** Label satu bulan sebelum `label` ("Juli 2026" → "Juni 2026"). */
export function monthBefore(label: string): string | null {
  const m = label.trim().match(/^(\S+)\s+(\d{4})$/);
  if (!m) return null;
  const idx = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  if (idx < 0) return null;
  let year = Number(m[2]);
  let mi = idx - 1;
  if (mi < 0) {
    mi = 11;
    year -= 1;
  }
  return `${MONTHS[mi]} ${year}`;
}

export function isMonthHeader(h: string): boolean {
  return MONTHS.some((m) => h.includes(m));
}
