export type SheetJob = {
  name: string;
  sheetName: string;
  fileHints: string[];
  valueColumn: string;
  divideBy: number;
  spreadsheetEnv: string;
};

export const DEBIT_JOBS: SheetJob[] = [
  { name: "Jumlah Kartu ATM", sheetName: "Jumlah Kartu ATM", fileHints: ["kartu_atm", "jumlah_kartu_atm"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Jumlah Kartu ATM+Debet", sheetName: "Jumlah Kartu ATM+Debet", fileHints: ["kartu_debit", "jumlah_kartu_debet", "kartu_debet"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Belanja", sheetName: "Volume Transaksi Belanja", fileHints: ["belanja", "transaksi_belanja"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Belanja", sheetName: "Nominal Transaksi Belanja", fileHints: ["belanja", "transaksi_belanja"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Pembayaran", sheetName: "Volume Transaksi Pembayaran", fileHints: ["pembayaran"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Pembayaran", sheetName: "Nominal Transaksi Pembayaran", fileHints: ["pembayaran"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Transfer", sheetName: "Volume Transaksi Transfer", fileHints: ["interbank", "transfer_interbank"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Transfer", sheetName: "Nominal Transaksi Transfer", fileHints: ["interbank", "transfer_interbank"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Transfer (2)", sheetName: "Volume Transaksi Transfer (2)", fileHints: ["antarbank", "transfer_antarbank"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Transfer (2)", sheetName: "Nominal Transaksi Transfer (2)", fileHints: ["antarbank", "transfer_antarbank"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Tunai", sheetName: "Volume Transaksi Tunai", fileHints: ["tarik_tunai", "tarik"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Tunai", sheetName: "Nominal Transaksi Tunai", fileHints: ["tarik_tunai", "tarik"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Setor Tunai", sheetName: "Volume Transaksi Setor Tunai", fileHints: ["setor", "stor_tunai"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Setor Tunai", sheetName: "Nominal Transaksi Setor Tunai", fileHints: ["setor", "stor_tunai"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Volume Transaksi Reversal", sheetName: "Volume Transaksi Reversal", fileHints: ["reversal"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: "SHEET_DEBIT" },
  { name: "Nominal Transaksi Reversal", sheetName: "Nominal Transaksi Reversal", fileHints: ["reversal"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: "SHEET_DEBIT" },
];

export const GROUPS: Record<string, SheetJob[]> = {
  debit: DEBIT_JOBS,
};
