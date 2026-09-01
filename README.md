# SPIP Debit Updater Web

Web app: **upload CSV → proses → update Google Sheets** (group Debit).

## Env (Vercel)

| Name | Value |
|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Isi penuh credentials.json (JSON string) |
| `SPREADSHEET_IDS_JSON` | `{"debit":"1P5EQlpQ-EJOuVIUq52Jow1ciH0-vQKLAHT1xuwflKQo"}` |

Share spreadsheet ke `client_email` service account (role Editor).

## Alur

1. Upload CSV ATM (multi-file)
2. Klik **Proses CSV**
3. Klik **Update Google Sheets** (antrean per task di browser)

## Local

```bash
npm i
npm run dev
```
