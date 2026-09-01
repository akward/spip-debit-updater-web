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
  ["GOOGLE_CREDENTIALS_JSON", "JSON service account (wajib)"],
  ["SHEET_DEBIT", "Spreadsheet Debit"],
  ["SHEET_UE", "Spreadsheet UE"],
  ["SHEET_KK", "Spreadsheet KK"],
  ["SHEET_ACQUIRER_TRX", "Acquirer transaksi"],
  ["SHEET_FRAUD_BANK", "Fraud per bank"],
  ["SHEET_FRAUD_PENYEBAB", "Fraud per penyebab"],
  ["SHEET_PROP_CHANNEL", "Prop Channel"],
];

type ProcessResponse = {
  ok: boolean;
  error?: string;
  monthLabel?: string;
  dryRun?: boolean;
  storage?: string;
  lsbu?: { name: string; rows: number; note?: string } | null;
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
  const [lsbu, setLsbu] = useState<File | null>(null);
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
      if (lsbu) fd.set("lsbu", lsbu);
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
            Upload CSV (+ LSBU opsional) → update Google Sheets → unduh hasil. Semua di web,
            file tidak disimpan di server.
          </p>
        </div>
        <span className="badge">CSV + LSBU · tidak disimpan</span>
      </header>

      <section className="panel">
        <h2>Privasi & storage</h2>
        <div className="ok">
          CSV dan LSBU <strong>tidak disimpan</strong> di Vercel. Hanya dibaca di memori selama
          request, lalu hasil ditulis ke Google Sheets.
        </div>
      </section>

      <section className="panel">
        <h2>1. Upload & proses</h2>
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
              File CSV (banyak file)
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>

            <label>
              File LSBU (opsional, .xlsx) — untuk Debit: FORMA0302
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setLsbu(e.target.files?.[0] || null)}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 0.85 }}>
              Contoh: <code>LSBU_VW_FORMA0302.xlsx</code> — digabung ke Jumlah Kartu ATM &
              ATM+Debet (filter KOTA = "-").
            </p>

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
            {log.lsbu ? (
              <>
                <br />
                LSBU: <code>{log.lsbu.name}</code> ({log.lsbu.rows} rows)
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
        <h2>2. Download dari Google Spreadsheet</h2>
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
          <div style={{ marginTop: 14 }} className="grid">
            {(sheetList.worksheets || []).map((name) => (
              <article key={name} className="card">
                <h3 style={{ fontSize: 0.95 }}>{name}</h3>
                <p>
                  <a
                    href={`/api/download?group=${encodeURIComponent(dlGroup)}&sheet=${encodeURIComponent(name)}&format=csv`}
                  >
                    Download CSV
                  </a>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>3. Environment Variables</h2>
        <table>
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

      <footer className="footer">SPIP · CSV + LSBU di memori · tidak disimpan di server</footer>
    </main>
  );
}
