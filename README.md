# SPIP Debit Updater Web

Upload CSV → update Google Sheets untuk **semua group**, lalu **download** hasil dari spreadsheet.

## Groups
- debit, ue, kk, acquirer, fraud_bank, fraud_penyebab, prop_channel

## Environment Variables
Lihat `.env.example` dan tabel di halaman web.

## API
- `POST /api/process` — multipart: group, dryRun, monthLabel, files[]
- `GET /api/download?group=debit` — list worksheet
- `GET /api/download?group=debit&sheet=Jumlah%20Kartu%20ATM&format=csv` — unduh CSV

## Catatan
- Matrix mesin ATM / EDC multi-kolom & LSBU merge: tetap CLI Python lokal
- Timeout Vercel ~60s: proses per group
