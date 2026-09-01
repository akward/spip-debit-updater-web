"use client";

import { useState } from "react";

const GROUPS = [
  { id: "debit", title: "Debit / ATM" },
  { id: "ue", title: "Uang Elektronik" },
  { id: "kk", title: "Kartu Kredit" },
  { id: "acquirer", title: "Acquirer (trx)" },
  { id: "fraud_bank", title: "Fraud per Bank" },
  { id: "fraud_penyebab", title: "Fraud per Penyebab" },
  { id: "prop_channel", title: "Prop Channel" },
];

const ENV_ROWS = [
  ["GOOGLE_CREDENTIALS_JSON", "JSON service account (wajib)", "{\"type\":\"service_account\",...}"],
  ["SHEET_DEBIT", "Spreadsheet Debit", "1P5EQlpQ-EJOuVIUq52Jow1ciH0-vQKLAHT1xuwflKQo"],
  ["SHEET_UE", "Spreadsheet UE", "1fN29bqYn-50zJRLp7pUGbU3p-SOh2aW6UKQgKOYfH_Q"],
  ["SHEET_KK", "Spreadsheet KK", "17Bgbn5ksCbYYDnMpbR8YmvewktN5bb7LxcygbI863Uc"],
  ["SHEET_ACQUIRER_TRX", "Acquirer transaksi", "1dyII_IIERsu6hol9A_H_PxObR-IxWMJ5SslCCL3i4YM"],
  ["SHEET_FRAUD_BANK", "Fraud per bank", "1HhG0BaKGhXVRYWZOEAC7xpu_yZQzYs6QpprS5PgQAos"],
  ["SHEET_FRAUD_PENYEBAB", "Fraud per penyebab", "1-W66gED-CtO2ajbTtFrjXrZsfAP6bMe0-hkOrkxrpAw"],
  ["SHEET_PROP_CHANNEL", "Prop Channel", "1l4byNkuyyTtMmdT7VSMDFB326GX0bqN02mbc3YMWgRE"],
];

type ProcessResponse = {
  ok: boolean;
  error?: string;
  monthLabel?: string;
  dryRun?: boolean;
  storage?: string;
  files?: { name: string; rows: number }[];
  results?: Array<Record<string, unknown>>;
};

type ListResponse = {
  ok: boolean;
  error?: string;
  title?: string;
  worksheets?: string[];
};

export default function HomePage() {
  const [group, setGroup] = useState("debit");
  const [files, setFiles] = useState<FileList | null>(null);
  const [monthLabel, setMonthLabel] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dlGroup, setDlGroup] = useState("debit");
  const [sheetList, setSheetList] = useState<ListResponse | null>(null);
  const [dlLoading, setDlLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLog(null);
    if (!files?.length) {
      setError("Pilih minimal 1 file CSV.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("group", group);
      fd.set("dryRun", dryRun ? "1" : "0");
      if (monthLabel.trim()) fd.set("monthLabel", monthLabel.trim());
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/process", { method: "POST", body: fd });
      const data = (await res.json()) as ProcessResponse;
      if (!res.ok || !data.ok) setError(data.error || "Gagal memproses");
      setLog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadSheets() {
    setDlLoading(true);
    setSheetList(null);
    setError(null);
    try {
      const res = await fetch(`/api/download?group=${encodeURIComponent(dlGroup)}`);
      const data = (await res.json()) as ListResponse;
      setSheetList(data);
      if (!data.ok) setError(data.error || "Gagal list sheet");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDlLoading(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SPIP Debit Updater</h1>
          <p>
            Semua proses di website: upload CSV → update Google Sheets → unduh hasil.
            Tidak perlu menjalankan Python di PC lokal.
          </p>
        </div>
        <span className="badge">100% web · CSV tidak disimpan</span>
      </header>

      <section className="panel">
        <h2>Privasi & storage</h2>
        <div className="ok">
          File CSV <strong>tidak disimpan</strong> di server Vercel (tidak ke disk, Blob, atau database).
          File hanya dibaca di memori selama request, lalu hasil ditulis langsung ke Google Sheets.
          Setelah request selesai, data upload hilang dari server.
        </div>
      </section>

      <section className="panel">
        <h2>1. Upload CSV & proses di web</h2>
        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
            <label>
              Group
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 8 }}
              >
                {GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              File CSV (banyak file — tidak disimpan di server)
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>
            <label>
              Label bulan (opsional)
              <input
                type="text"
                placeholder="Juli 2026"
                value={monthLabel}
                onChange={(e) => setMonthLabel(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 8 }}
              />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry-run (cek mapping, jangan tulis sheet)
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Memproses…" : dryRun ? "Cek mapping" : "Update Google Sheet"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <section className="panel">
          <div className="warn">{error}</div>
        </section>
      )}

      {log && (
        <section className="panel">
          <h2>Hasil proses</h2>
          <p style={{ color: "var(--muted)" }}>
            Bulan: <code>{log.monthLabel}</code> {log.dryRun ? "· dry-run" : "· write"}
            {log.storage ? (
              <>
                <br />
                Storage: <code>{log.storage}</code>
              </>
            ) : null}
          </p>
          {log.files && (
            <div className="cmd">{log.files.map((f) => `${f.name} (${f.rows} rows)`).join("\n")}</div>
          )}
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(log.results || []).map((r, i) => (
                <tr key={i}>
                  <td>{String(r.job)}</td>
                  <td>{String(r.status)}</td>
                  <td>
                    <code style={{ fontSize: 12 }}>
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(r).filter(([k]) => !["job", "status"].includes(k))
                        )
                      )}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="panel">
        <h2>2. Download data dari Google Spreadsheet</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Data hasil update dibaca langsung dari Google Sheets (bukan dari storage website).
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <select
            value={dlGroup}
            onChange={(e) => setDlGroup(e.target.value)}
            style={{ padding: 10, borderRadius: 8 }}
          >
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button className="btn" type="button" onClick={loadSheets} disabled={dlLoading}>
            {dlLoading ? "Memuat…" : "Tampilkan worksheet"}
          </button>
        </div>
        {sheetList?.ok && (
          <div style={{ marginTop: 14 }}>
            <p style={{ color: "var(--muted)" }}>
              Spreadsheet: <strong>{sheetList.title}</strong>
            </p>
            <div className="grid">
              {(sheetList.worksheets || []).map((name) => (
                <article key={name} className="card">
                  <h3 style={{ fontSize: 0.95 }}>{name}</h3>
                  <p>
                    <a
                      href={`/api/download?group=${encodeURIComponent(dlGroup)}&sheet=${encodeURIComponent(name)}&format=csv`}
                    >
                      Download CSV
                    </a>
                    {" · "}
                    <a
                      href={`/api/download?group=${encodeURIComponent(dlGroup)}&sheet=${encodeURIComponent(name)}&format=json`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      JSON
                    </a>
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>3. Environment Variables (sudah Anda set)</h2>
        <div className="ok">
          Setelah env terpasang, seluruh alur berjalan di website. Pastikan spreadsheet di-share ke
          service account (Editor).
        </div>
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {ENV_ROWS.map(([k, d]) => (
              <tr key={k}>
                <td>
                  <code>{k}</code>
                </td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">SPIP · proses di web · CSV tidak disimpan di server</footer>
    </main>
  );
}
