const GROUPS = [
  { id: "debit", title: "Debit / ATM", desc: "Kartu, mesin, belanja, transfer, tarik/setor tunai", cmd: "python main.py --prepare -g debit" },
  { id: "ue", title: "Uang Elektronik", desc: "Jumlah UE, belanja, topup, transfer, redeem", cmd: "python main.py --prepare -g ue" },
  { id: "kk", title: "Kartu Kredit", desc: "Jumlah kartu, outstanding, NPL, transaksi", cmd: "python main.py --prepare -g kk" },
  { id: "acquirer", title: "Acquirer", desc: "EDC/Merchant matrix + OnUs/OffUs/Internasional", cmd: "python main.py --prepare -g acquirer" },
  { id: "prop_channel", title: "Prop Channel", desc: "Phone / Mobile / Internet dari Delivery Channel.xlsx", cmd: "python main.py --prepare -g prop_channel" },
  { id: "fraud_bank", title: "Fraud per Bank", desc: "Fraud KK, ATM, UE per bank", cmd: "python main.py --prepare -g fraud_bank" },
  { id: "fraud_penyebab", title: "Fraud per Penyebab", desc: "Fraud per jenis penyebab", cmd: "python main.py --prepare -g fraud_penyebab" },
];

export default function HomePage() {
  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SPIP Debit Updater</h1>
          <p>
            Panel dokumentasi & kontrol alur update Google Sheets SPIP
            (Debit, UE, KK, Acquirer, Prop Channel, Fraud).
          </p>
        </div>
        <span className="badge">Web dashboard · job tetap di PC lokal</span>
      </header>

      <section className="panel">
        <h2>Penting tentang arsitektur</h2>
        <div className="warn">
          Vercel <strong>tidak bisa</strong> membaca folder lokal
          <code> D:\Pengolahan Data\ </code> atau menjalankan 80+ task Google Sheets
          dalam satu request (timeout serverless).
          <br />
          Dashboard ini membantu memilih group & perintah. Eksekusi penuh tetap di PC:
          <code> python main.py --prepare -g …</code>
        </div>
        <div className="ok" style={{ marginTop: 12 }}>
          Alur yang benar: <strong>prepare CSV→Excel</strong> dulu, baru{" "}
          <strong>update Google Sheet</strong>. Kalau Excel belum ada, sistem akan
          menyalin angka bulan sebelumnya.
        </div>
      </section>

      <h2 style={{ marginBottom: 8 }}>Group laporan</h2>
      <div className="grid">
        {GROUPS.map((g) => (
          <article key={g.id} className="card">
            <h3>{g.title}</h3>
            <p>{g.desc}</p>
            <p style={{ marginTop: 10 }}>
              <code>{g.cmd}</code>
            </p>
          </article>
        ))}
      </div>

      <section className="panel">
        <h2>Perintah cepat di PC</h2>
        <ol className="steps">
          <li>
            Pastikan <code>config.yaml</code> → <code>paths.month</code> sesuai folder CSV
            (mis. <code>Juli</code>).
          </li>
          <li>Siapkan semua Excel dari CSV:</li>
        </ol>
        <div className="cmd">cd D:\Pengolahan Data\SPIP Python\debit_updater
python main.py --prepare-only</div>
        <ol className="steps" start={3}>
          <li>Update Google Sheet (semua group):</li>
        </ol>
        <div className="cmd">python main.py</div>
        <ol className="steps" start={4}>
          <li>Atau satu group (contoh debit):</li>
        </ol>
        <div className="cmd">python main.py --prepare -g debit</div>
      </section>

      <section className="panel">
        <h2>Checklist sebelum update</h2>
        <table>
          <thead>
            <tr>
              <th>Cek</th>
              <th>Lokasi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CSV sumber bulan berjalan</td>
              <td>
                <code>D:\Pengolahan Data\2026\[bulan]\ATM | UE | KK | infra | Kanal | Fraud</code>
              </td>
            </tr>
            <tr>
              <td>Hasil prepare Excel</td>
              <td>
                <code>D:\Pengolahan Data\xlsx\debit | UE | KK | Acquirer | …</code>
              </td>
            </tr>
            <tr>
              <td>Credentials Google</td>
              <td>
                <code>D:\google\credential\credentials.json</code> + share sheet ke service account
              </td>
            </tr>
            <tr>
              <td>Log prepare</td>
              <td>
                Harus ada baris <code>OK</code>, bukan <code>FAIL</code> / <code>MISS</code>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Repo & CLI package</h2>
        <p style={{ color: "var(--muted)", marginTop: 0, lineHeight: 1.55 }}>
          Kode CLI Python (prepare + update) ada di package lokal. Dashboard web ini
          terpisah sebagai dokumentasi operasional.
        </p>
        <div className="btn-row">
          <a className="btn primary" href="https://github.com/akward/spip-debit-updater-web" target="_blank" rel="noreferrer">
            Buka GitHub
          </a>
          <a className="btn" href="/api/health">
            Health API
          </a>
        </div>
      </section>

      <footer className="footer">
        SPIP Debit Updater Web · Next.js on Vercel · Job data tetap di mesin lokal
      </footer>
    </main>
  );
}
