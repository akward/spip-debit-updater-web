const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Label kolom bulan = bulan sistem - 1 (sama seperti CLI). */
export function previousMonthLabel(d = new Date()): string {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() - 1);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
