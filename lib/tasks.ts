export type SheetJob = {
  name: string;
  sheetName: string;
  fileHints: string[];
  valueColumn: string;
  divideBy: number;
  spreadsheetEnv: string;
  kind?: "column" | "matrix-atm" | "matrix-edc";
  keyColumn?: string;
  filterJenis?: string;
  /** Filter baris raw CSV berdasarkan jenismesin (Acquirer) */
  filterMesin?: string[];
};

const D = "SHEET_DEBIT";
const U = "SHEET_UE";
const K = "SHEET_KK";
/** Transaksi Vol/Nom (On Us / Off Us / Internasional / ATM / UE) — notebook: 1dyII_… */
const AT = "SHEET_ACQUIRER_TRX";
/** Jumlah mesin EDC + Merchant matrix — notebook: 1Tl5nb_… */
const AE = "SHEET_ACQUIRER_EDC";
const FB = "SHEET_FRAUD_BANK";
const FP = "SHEET_FRAUD_PENYEBAB";
const P = "SHEET_PROP_CHANNEL";

export const DEBIT_JOBS: SheetJob[] = [
  { name: "Jumlah Kartu ATM", sheetName: "Jumlah Kartu ATM", fileHints: ["kartu_atm", "jumlah_kartu_atm"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: D },
  { name: "Jumlah Kartu ATM+Debet", sheetName: "Jumlah Kartu ATM+Debet", fileHints: ["kartu_debit", "jumlah_kartu_debet", "kartu_debet"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: D },
  { name: "Jumlah Mesin ATM", sheetName: "Jumlah Mesin ATM", fileHints: ["mesin_atm", "jumlah_mesin_atm"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D, kind: "matrix-atm" },
  { name: "Volume Transaksi Tunai", sheetName: "Volume Transaksi Tunai", fileHints: ["tarik_tunai"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Tunai", sheetName: "Nominal Transaksi Tunai", fileHints: ["tarik_tunai"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
  { name: "Volume Transaksi Setor Tunai", sheetName: "Volume Transaksi Setor Tunai", fileHints: ["setor", "stor_tunai"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Setor Tunai", sheetName: "Nominal Transaksi Setor Tunai", fileHints: ["setor", "stor_tunai"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
  { name: "Volume Transaksi Belanja", sheetName: "Volume Transaksi Belanja", fileHints: ["belanja", "transaksi_belanja"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Belanja", sheetName: "Nominal Transaksi Belanja", fileHints: ["belanja", "transaksi_belanja"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
  { name: "Volume Transaksi Pembayaran", sheetName: "Volume Transaksi Pembayaran", fileHints: ["pembayaran"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Pembayaran", sheetName: "Nominal Transaksi Pembayaran", fileHints: ["pembayaran"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
  { name: "Volume Transaksi Transfer", sheetName: "Volume Transaksi Transfer", fileHints: ["interbank", "transfer_interbank"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Transfer", sheetName: "Nominal Transaksi Transfer", fileHints: ["interbank", "transfer_interbank"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
  { name: "Volume Transaksi Transfer (2)", sheetName: "Volume Transaksi Transfer (2)", fileHints: ["antarbank", "transfer_antarbank"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Transfer (2)", sheetName: "Nominal Transaksi Transfer (2)", fileHints: ["antarbank", "transfer_antarbank"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
  { name: "Volume Transaksi Reversal", sheetName: "Volume Transaksi Reversal", fileHints: ["reversal"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: D },
  { name: "Nominal Transaksi Reversal", sheetName: "Nominal Transaksi Reversal", fileHints: ["reversal"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: D },
];

export const UE_JOBS: SheetJob[] = [
  { name: "Jumlah Kartu", sheetName: "Jumlah Kartu", fileHints: ["jumlah_ue", "jumlahue"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: U },
  { name: "Chip Based", sheetName: "Chip Based", fileHints: ["chip_base", "chipbased"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: U },
  { name: "Server Based", sheetName: "Server Based", fileHints: ["server_base", "serverbased"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: U },
  { name: "Registered", sheetName: "Registered", fileHints: ["registered"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: U },
  { name: "Unregistered", sheetName: "Unregistered", fileHints: ["unregistered"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: U },
  { name: "Dana Float", sheetName: "Dana Float", fileHints: ["dana_float", "danafloat"], valueColumn: "jumlah", divideBy: 1, spreadsheetEnv: U },
  { name: "Jumlah Reader", sheetName: "Jumlah Reader", fileHints: ["jumlah_reader"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Volume Belanja", sheetName: "Volume", fileHints: ["belanja"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nilai Belanja", sheetName: "Nilai", fileHints: ["belanja"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Pembayaran", sheetName: "Vol Pembayaran", fileHints: ["pembayaran"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Pembayaran", sheetName: "Nom Pembayaran", fileHints: ["pembayaran"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Initial", sheetName: "Vol Initial", fileHints: ["initial"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Initial", sheetName: "Nom Initial", fileHints: ["initial"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Top Up", sheetName: "Vol Top Up", fileHints: ["topup", "top_up"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Top Up", sheetName: "Nom Top Up", fileHints: ["topup", "top_up"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Transfer", sheetName: "Vol Transfer", fileHints: ["transfer.xlsx", "transfer.csv", "/transfer.", "ue_transfer", "transaksi_transfer"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Transfer", sheetName: "Nom Transfer", fileHints: ["transfer.xlsx", "transfer.csv", "/transfer.", "ue_transfer", "transaksi_transfer"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Transfer Rek", sheetName: "Vol Transfer Rek", fileHints: ["transfer_rekening", "transfer_rek", "rekening"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Transfer Rek", sheetName: "Nom Transfer Rek", fileHints: ["transfer_rekening", "transfer_rek", "rekening"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Transfer Pemerintah", sheetName: "Vol Transfer Pemerintah", fileHints: ["transfer_pemerintah", "transfer_pem", "pemerintah"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Transfer Pemerintah", sheetName: "Nom Transfer Pemerintah", fileHints: ["transfer_pemerintah", "transfer_pem", "pemerintah"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Tunai", sheetName: "Vol Tunai", fileHints: ["tunai"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Tunai", sheetName: "Nom Tunai", fileHints: ["tunai"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Redeem", sheetName: "Vol Redeem", fileHints: ["reedem", "redeem"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Redeem", sheetName: "Nom Redeem", fileHints: ["reedem", "redeem"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
  { name: "Vol Reversal", sheetName: "Vol Reversal", fileHints: ["reversal"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: U },
  { name: "Nom Reversal", sheetName: "Nom Reversal", fileHints: ["reversal"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: U },
];

export const KK_JOBS: SheetJob[] = [
  { name: "Jumlah Kartu", sheetName: "Jumlah Kartu", fileHints: ["jumlah_kartu_kredit", "jumlah_kartu"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: K },
  { name: "Jumlah Account", sheetName: "Jumlah Account", fileHints: ["jumlah_account", "account"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: K },
  { name: "Nilai Outstanding", sheetName: "Nilai Outstanding", fileHints: ["outstanding"], valueColumn: "expr_1", divideBy: 1_000_000, spreadsheetEnv: K },
  { name: "Nilai NPL", sheetName: "Nilai NPL", fileHints: ["npl"], valueColumn: "expr_1", divideBy: 1_000_000, spreadsheetEnv: K },
  { name: "Volume Tunai", sheetName: "Volume Tunai", fileHints: ["transaksi_tunai", "tunai"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: K },
  { name: "Nilai Tunai", sheetName: "Nilai Tunai", fileHints: ["transaksi_tunai", "tunai"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: K },
  { name: "Volume Belanja", sheetName: "Volume Belanja", fileHints: ["transaksi_belanja", "belanja"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: K, filterJenis: "BL" },
  { name: "Nilai Belanja", sheetName: "Nilai Belanja", fileHints: ["transaksi_belanja", "belanja"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: K, filterJenis: "BL" },
  { name: "Volume Bill Payment", sheetName: "Volume Bill Payment", fileHints: ["transaksi_belanja", "belanja", "bill"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: K, filterJenis: "BY" },
  { name: "Nilai Bill Payment", sheetName: "Nilai Bill Payment", fileHints: ["transaksi_belanja", "belanja", "bill"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: K, filterJenis: "BY" },
  { name: "Volume Reversal", sheetName: "Volume Reversal", fileHints: ["reversal"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: K },
  { name: "Nilai Reversal", sheetName: "Nilai Reversal", fileHints: ["reversal"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: K },
];

/**
 * Acquirer.ipynb — 26 sheet.
 * Raw CSV (Infra_-_Transaksi_EDC_*.csv) difilter jenismesin lalu sum expr_1/expr_2.
 */
export const ACQUIRER_JOBS: SheetJob[] = [
  // ===== SHEET_ACQUIRER_TAHUN / EDC matrix =====
  { name: "EDC Debet", sheetName: "EDC Debet", fileHints: ["merchant_kartu_debet", "mesin_edc_dan_merchant_kartu_debet", "edc_debet", "kartu_debet"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "EDC Kredit", sheetName: "EDC Kredit", fileHints: ["merchant_kartu_kredit", "mesin_edc_dan_merchant_kartu_kredit", "edc_kredit", "kartu_kredit"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "EDC UE", sheetName: "EDC Uang Elektronik", fileHints: ["jumlah_mesin_edc_dan_merchant_uang_elektronik", "mesin_edc_dan_merchant_uang_elektronik", "merchant_uang_elektronik", "uang_elektronik"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "EDC Gabungan", sheetName: "EDC Gabungan", fileHints: ["jumlah_mesin_edc_dan_merchant_gabungan", "mesin_edc_dan_merchant_gabungan", "merchant_gabungan", "edc_gabungan"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "Merchant Debet", sheetName: "Merchant Debet", fileHints: ["merchant_kartu_debet", "mesin_edc_dan_merchant_kartu_debet", "edc_debet", "kartu_debet"], valueColumn: "expr_2", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "Merchant Kredit", sheetName: "Merchant Kredit", fileHints: ["merchant_kartu_kredit", "mesin_edc_dan_merchant_kartu_kredit", "edc_kredit", "kartu_kredit"], valueColumn: "expr_2", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "Merchant UE", sheetName: "Merchant Uang Elektronik", fileHints: ["jumlah_mesin_edc_dan_merchant_uang_elektronik", "mesin_edc_dan_merchant_uang_elektronik", "merchant_uang_elektronik", "uang_elektronik"], valueColumn: "expr_2", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },
  { name: "Merchant Gabungan", sheetName: "Merchant Gabungan", fileHints: ["jumlah_mesin_edc_dan_merchant_gabungan", "mesin_edc_dan_merchant_gabungan", "merchant_gabungan", "edc_gabungan"], valueColumn: "expr_2", divideBy: 1, spreadsheetEnv: AE, kind: "matrix-edc" },

  // ===== SHEET_ACQUIRER_TRX — jenismesin filter (Acquirer.ipynb) =====
  // Vol/Nom Internasional → ADCGB only (user + notebook intent)
  { name: "Vol Internasional", sheetName: "Vol Internasional", fileHints: ["off_us_internasional", "internasional"], valueColumn: "vol_inter", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["ADCGB"] },
  { name: "Nom Internasional", sheetName: "Nom Internasional", fileHints: ["off_us_internasional", "internasional"], valueColumn: "nom_inter", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["ADCGB"] },

  // On Us / Off Us EDC → ADCAD + ADCGB + ADCKK + ADCUE (cell 36/41)
  { name: "Vol On Us", sheetName: "Vol On Us", fileHints: ["edc_on_us", "on_us", "onus"], valueColumn: "vol_onus", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["ADCAD", "ADCGB", "ADCKK", "ADCUE"] },
  { name: "Nom On US", sheetName: "Nom On US", fileHints: ["edc_on_us", "on_us", "onus"], valueColumn: "nom_onus", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["ADCAD", "ADCGB", "ADCKK", "ADCUE"] },
  { name: "Vol Off Us", sheetName: "Vol Off Us", fileHints: ["edc_off_us", "off_us", "offus"], valueColumn: "vol_offus", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["ADCAD", "ADCGB", "ADCKK", "ADCUE"] },
  { name: "Nom Off Us", sheetName: "Nom Off Us", fileHints: ["edc_off_us", "off_us", "offus"], valueColumn: "nom_offus", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["ADCAD", "ADCGB", "ADCKK", "ADCUE"] },

  // ATM — Internasional: ACMAT+ACMAC; On/Off Us: +ACMCD+ACMNT
  { name: "Vol Internasional ATM", sheetName: "Vol Internasional ATM", fileHints: ["off_us_internasional", "internasional"], valueColumn: "vol_atm", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["ACMAT", "ACMAC"] },
  { name: "Nom Internasional ATM", sheetName: "Nom Internasional ATM", fileHints: ["off_us_internasional", "internasional"], valueColumn: "nom_atm", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["ACMAT", "ACMAC"] },
  { name: "Vol On Us ATM", sheetName: "Vol On Us ATM", fileHints: ["edc_on_us", "on_us", "onus"], valueColumn: "vol_atm", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["ACMAT", "ACMAC", "ACMCD", "ACMNT"] },
  { name: "Nom On US ATM", sheetName: "Nom On US ATM", fileHints: ["edc_on_us", "on_us", "onus"], valueColumn: "nom_atm", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["ACMAT", "ACMAC", "ACMCD", "ACMNT"] },
  { name: "Vol Off Us ATM", sheetName: "Vol Off Us ATM", fileHints: ["edc_off_us", "off_us", "offus"], valueColumn: "vol_atm", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["ACMAT", "ACMAC", "ACMCD", "ACMNT"] },
  { name: "Nom Off Us ATM", sheetName: "Nom Off Us ATM", fileHints: ["edc_off_us", "off_us", "offus"], valueColumn: "nom_atm", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["ACMAT", "ACMAC", "ACMCD", "ACMNT"] },

  // UE — semua sheet UE: jenismesin RUE (cell 22/26/28/59)
  { name: "Vol Internasional UE", sheetName: "Vol Internasional UE", fileHints: ["off_us_internasional", "internasional"], valueColumn: "vol_ue", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["RUE"] },
  { name: "Nom Internasional UE", sheetName: "Nom Internasional UE", fileHints: ["off_us_internasional", "internasional"], valueColumn: "nom_ue", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["RUE"] },
  { name: "Vol On Us UE", sheetName: "Vol On Us UE", fileHints: ["edc_on_us", "on_us", "onus"], valueColumn: "vol_ue", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["RUE"] },
  { name: "Nom On US UE", sheetName: "Nom On US UE", fileHints: ["edc_on_us", "on_us", "onus"], valueColumn: "nom_ue", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["RUE"] },
  { name: "Vol Off Us UE", sheetName: "Vol Off Us UE", fileHints: ["edc_off_us", "off_us", "offus"], valueColumn: "vol_ue", divideBy: 1, spreadsheetEnv: AT, filterMesin: ["RUE"] },
  { name: "Nom Off Us UE", sheetName: "Nom Off Us UE", fileHints: ["edc_off_us", "off_us", "offus"], valueColumn: "nom_ue", divideBy: 1_000_000, spreadsheetEnv: AT, filterMesin: ["RUE"] },
];

export const FRAUD_BANK_JOBS: SheetJob[] = [
  { name: "Vol Act Kartu Kredit", sheetName: "Vol Act Kartu Kredit", fileHints: ["fraud_kk", "kk"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: FB },
  { name: "Nom Act Kartu Kredit", sheetName: "Nom Act Kartu Kredit", fileHints: ["fraud_kk", "kk"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: FB },
  { name: "Vol Act Kartu Debet", sheetName: "Vol Act Kartu Debet", fileHints: ["fraud_atm", "atm", "debet"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: FB },
  { name: "Nom Act Kartu Debet", sheetName: "Nom Act Kartu Debet", fileHints: ["fraud_atm", "atm", "debet"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: FB },
  { name: "Vol Act UE", sheetName: "Vol Act UE", fileHints: ["fraud_ue", "ue"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: FB },
  { name: "Nom Act UE", sheetName: "Nom Act UE", fileHints: ["fraud_ue", "ue"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: FB },
];

export const FRAUD_PENYEBAB_JOBS: SheetJob[] = [
  { name: "Vol Act Kartu Kredit", sheetName: "Vol Act Kartu Kredit", fileHints: ["fraud_kk", "kk"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: FP, keyColumn: "jenisfraud" },
  { name: "Nom Act Kartu Kredit", sheetName: "Nom Act Kartu Kredit", fileHints: ["fraud_kk", "kk"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: FP, keyColumn: "jenisfraud" },
  { name: "Vol Act Kartu Debet", sheetName: "Vol Act Kartu Debet", fileHints: ["fraud_atm", "atm"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: FP, keyColumn: "jenisfraud" },
  { name: "Nom Act Kartu Debet", sheetName: "Nom Act Kartu Debet", fileHints: ["fraud_atm", "atm"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: FP, keyColumn: "jenisfraud" },
  { name: "Vol Act UE", sheetName: "Vol Act UE", fileHints: ["fraud_ue", "ue"], valueColumn: "expr_1", divideBy: 1, spreadsheetEnv: FP, keyColumn: "jenisfraud" },
  { name: "Nom Act UE", sheetName: "Nom Act UE", fileHints: ["fraud_ue", "ue"], valueColumn: "expr_2", divideBy: 1_000_000, spreadsheetEnv: FP, keyColumn: "jenisfraud" },
];

function propJobs(prefix: string, sheetPrefix: string, filePrefix: string): SheetJob[] {
  const kinds: [string, string, string][] = [
    ["Interbank", "Interbank", "interbank"],
    ["Antarbank", "Antarbank", "intrabank"],
    ["Pembayaran", "Pembayaran", "pembayaran"],
    ["Belanja", "Belanja", "belanja"],
    ["VA", "VA", "va"],
    ["Reversal", "Reversal", "reversal"],
    ["Tarik Tunai", "Tarik Tunai", "tarik"],
    ["Setor Tunai", "Setor Tunai", "setor"],
  ];
  const out: SheetJob[] = [];
  for (const [label, , filePart] of kinds) {
    out.push({
      name: `${prefix} Vol ${label}`,
      sheetName: `${sheetPrefix} Vol ${label}`,
      fileHints: [`${filePrefix}_${filePart}`, `${filePrefix}${filePart}`],
      valueColumn: "expr_1",
      divideBy: 1,
      spreadsheetEnv: P,
    });
    out.push({
      name: `${prefix} Nom ${label}`,
      sheetName: `${sheetPrefix} Nom ${label}`,
      fileHints: [`${filePrefix}_${filePart}`, `${filePrefix}${filePart}`],
      valueColumn: "expr_2",
      divideBy: 1_000_000,
      spreadsheetEnv: P,
    });
  }
  return out;
}

export const PROP_JOBS: SheetJob[] = [
  ...propJobs("Phone", "Phone", "p"),
  ...propJobs("Mobile", "Mobile", "m"),
  ...propJobs("Internet", "Internet", "i"),
];

export const GROUPS: Record<string, SheetJob[]> = {
  debit: DEBIT_JOBS,
  ue: UE_JOBS,
  kk: KK_JOBS,
  acquirer: ACQUIRER_JOBS,
  fraud_bank: FRAUD_BANK_JOBS,
  fraud_penyebab: FRAUD_PENYEBAB_JOBS,
  prop_channel: PROP_JOBS,
};
