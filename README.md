# SPIP Debit Updater Web

Dashboard dokumentasi untuk alur **Debit Updater** (CSV → Excel → Google Sheets).

## Batasan penting

Vercel **tidak** menjalankan job penuh ke folder `D:\Pengolahan Data\`.  
Eksekusi tetap di PC:

```bash
python main.py --prepare-only
python main.py
```

## Develop lokal

```bash
npm install
npm run dev
```

## Deploy

Terhubung ke repo GitHub; Vercel auto-deploy pada push ke branch utama.
