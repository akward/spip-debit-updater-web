# SPIP Debit Updater Web

Web app: **upload CSV → proses → update Google Sheets**.

## Fitur
- Upload banyak CSV sekaligus
- Dry-run (cek mapping tanpa menulis)
- Update kolom bulan di Google Sheet (group **debit**)

## Setup Vercel env
```
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
SHEET_DEBIT=1P5EQlpQ-EJOuVIUq52Jow1ciH0-vQKLAHT1xuwflKQo
```

Share sheet ke `client_email` service account.

## Local
```bash
npm install
npm run dev
```
