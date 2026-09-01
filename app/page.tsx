"use client";

import { useState } from "react";

const GROUPS = [
  { id: "debit", title: "Debit / ATM", note: "Upload CSV dari folder ATM" },
];

type ProcessResponse = {
  ok: boolean;
  error?: string;
  monthLabel?: string;
  dryRun?: boolean;
  files?: { name: string; rows: number }[];
  results?: Array<Record<string, unknown>>;
};

export default function HomePage() {
  const [group, setGroup] = useState("debit");
  const [files, setFiles] = useState<FileList | null>(null);
  const [monthLabel, setMonthLabel] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!res.ok || !data.ok) {
        setError(data.error || "Gagal memproses");
      }
      setLog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SPIP Debit Updater</h1>
          <p>
            Upload CSV → proses otomatis → update Google Sheets.
            Mode dry-run disarankan dulu sebelum menulis ke sheet.
          </p>
        </div>
        <span className="badge">Web + upload CSV</span>
      </header>

      <section className="panel">
        <h2>1. Upload & proses</h2>
        <form onSubmit={onSubmit}>
          <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
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
              File CSV (bisa banyak)
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>

            <label>
              Label bulan (opsional, default = bulan sistem − 1)
              <input
                type="text"
                placeholder="contoh: Juli 2026"
                value={monthLabel}
                onChange={(e) => setMonthLabel(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 8 }}
              />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry-run (jangan tulis ke Google Sheet, hanya cek mapping)
            </label>

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Memproses…" : dryRun ? "Cek mapping (dry-run)" : "Proses & update Sheet"}
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
          <h2>Hasil</h2>
          <p style={{ color: "var(--muted)" }}>
            Bulan: <code>{log.monthLabel}</code>
            {log.dryRun ? " · dry-run" : " · write"}
          </p>
          {log.files && (
            <div className="cmd">
              {log.files.map((f) => `${f.name} (${f.rows} rows)`).join("\n")}
            </div>
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
        <h2>2. Environment Vercel (wajib untuk write)</h2>
        <div className="warn">
          Di Vercel Project → Settings → Environment Variables, set:
          <div className="cmd">GOOGLE_CREDENTIALS_JSON={"{"} ... JSON service account ... {"}"}
SHEET_DEBIT=1P5EQlpQ-EJOuVIUq52Jow1ciH0-vQKLAHT1xuwflKQo</div>
          Share spreadsheet Google ke email <code>client_email</code> service account (Editor).
        </div>
        <div className="ok" style={{ marginTop: 12 }}>
          Tanpa env di atas, dry-run tetap bisa dipakai untuk cek apakah CSV ter-mapping.
        </div>
      </section>

      <section className="panel">
        <h2>Batasan</h2>
        <ul className="steps">
          <li>Group web saat ini: <strong>debit</strong> (UE/KK bisa ditambah pola sama).</li>
          <li>Timeout Vercel Hobby ~60 detik — proses per group.</li>
          <li>Mesin ATM matrix & LSBU merge belum di web (tetap CLI lokal).</li>
        </ul>
      </section>

      <footer className="footer">
        SPIP Debit Updater Web · upload CSV · Google Sheets API
      </footer>
    </main>
  );
}
