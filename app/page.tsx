"use client";

import { useState } from "react";

const GROUPS = [
  {
    id: "debit",
    title: "Debit / ATM",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote:
      "JENIS_DATA 001-Jumlah Kartu → KARTU_ATM / KARTU_ATM_DEBIT; transaksi (KOTA = -)",
  },
  {
    id: "ue",
    title: "Uang Elektronik",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote:
      "KARTU_ELEKTRONIK · 001-Jumlah Kartu, 051-Chip, 052-Server, 056-Registered, 057-Unregistered",
  },
  {
    id: "kk",
    title: "Kartu Kredit",
    lsbu: "LSBU_VW_FORMA0301.xlsx",
    lsbuNote: "SANDI_PELAPOR + JUMLAH_KARTU → Jumlah Kartu",
  },
  {
    id: "acquirer",
    title: "Acquirer",
    lsbu: "LSBU_VW_FORMA0304.xlsx",
    lsbuNote: "FORMA0304 POS Debit/Kredit/UE/Gabungan (KOTA=-)",
  },
  {
    id: "fraud_bank",
    title: "Fraud per Bank",
    lsbu: "LSBU_VW_FORMA0306.xlsx",
    lsbuNote: "JENIS_KARTU + VOLUME/NOMINAL_FRAUD_ACTUAL",
  },
  {
    id: "fraud_penyebab",
    title: "Fraud per Penyebab",
    lsbu: "LSBU_VW_FORMA0306.xlsx",
    lsbuNote: "FORMA0306 per JENIS_FRAUD → kode CP/PL/HD/TD/FA/X",
  },
  {
    id: "prop_channel",
    title: "Prop Channel",
    lsbu: null,
    lsbuNote: "Tanpa LSBU (CSV Prop Channel)",
  },
];

const ENV_ROWS = [
  ["GOOGLE_CREDENTIALS_JSON", "JSON service account (wajib)"],
  ["SHEET_DEBIT", "File Google: Debit / ATM"],
  ["SHEET_UE", "File Google: Uang Elektronik"],
  ["SHEET_KK", "File Google: Kartu Kredit"],
  ["SHEET_ACQUIRER_TRX", "File Google: Acquirer"],
  ["SHEET_FRAUD_BANK", "File Google: Fraud per Bank"],
  ["SHEET_FRAUD_PENYEBAB", "File Google: Fraud per Penyebab"],
  ["SHEET_PROP_CHANNEL", "File Google: Prop Channel"],
];

type ProcessResponse = {
  ok: boolean;
  error?: string;
  monthLabel?: string;
  dryRun?: boolean;
  storage?: string;
  lsbu?: { name: string; rows: number; kind?: string } | null;
  files?: { name: string; rows: number }[];
  summary?: { total: number; errors: number; ok: number };
  results?: Array<Record<string, unknown>>;
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

  const groupMeta = GROUPS.find((g) => g.id === group);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLog(null);
    // CSV boleh kosong → copy bulan sebelumnya (sama CLI)
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("group", group);
      fd.set("dryRun", dryRun ? "1" : "0");
      if (monthLabel.trim()) fd.set("monthLabel", monthLabel.trim());
      if (files?.length) Array.from(files).forEach((f) => fd.append("files", f));
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

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SPIP Debit Updater</h1>
          <p>
            Setara CLI: CSV + LSBU → Google Sheets. Tanpa CSV = copy bulan sebelumnya. Error per
            job tidak menghentikan batch. Upload tidak disimpan di server.
          </p>
        </div>
        <span className="badge">CLI parity · copy-previous · continue-on-error</span>
      </header>

      <section className="panel">
        <h2>Panduan file LSBU per group</h2>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>File LSBU</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g.id}>
                <td>
                  <strong>{g.title}</strong>
                </td>
                <td>
                  {g.lsbu ? (
                    <code>{g.lsbu}</code>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>Tidak ada</span>
                  )}
                </td>
                <td style={{ fontSize: 0.9 }}>{g.lsbuNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
                    {g.lsbu ? ` · ${g.lsbu.replace("LSBU_VW_", "").replace(".xlsx", "")}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              File CSV (opsional — kosong = copy bulan sebelumnya)
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>

            <label>
              File LSBU (.xlsx)
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setLsbu(e.target.files?.[0] || null)}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>
            <div className={groupMeta?.lsbu ? "ok" : "warn"} style={{ fontSize: 0.9 }}>
              {groupMeta?.lsbu ? (
                <>
                  Group <strong>{groupMeta.title}</strong> → <code>{groupMeta.lsbu}</code>
                  <br />
                  {groupMeta.lsbuNote}
                </>
              ) : (
                <>Group ini tanpa LSBU.</>
              )}
            </div>

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
              Dry-run
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
            {log.summary ? (
              <>
                {" · "}
                ok/copy: {log.summary.ok}/{log.summary.total} · error: {log.summary.errors}
              </>
            ) : null}
            {log.lsbu ? (
              <>
                <br />
                LSBU: <code>{log.lsbu.name}</code> ({log.lsbu.rows} rows
                {log.lsbu.kind ? `, ${log.lsbu.kind}` : ""})
              </>
            ) : null}
          </p>
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
        <h2>2. Download file Google Spreadsheet</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Satu tombol = satu file Excel (.xlsx) seluruh spreadsheet group.
        </p>
        <table>
          <thead>
            <tr>
              <th>Laporan</th>
              <th>Unduh</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g.id}>
                <td>
                  <strong>{g.title}</strong>
                </td>
                <td>
                  <a
                    className="btn primary"
                    href={`/api/download?group=${encodeURIComponent(g.id)}&format=xlsx`}
                    style={{ display: "inline-block", textDecoration: "none" }}
                  >
                    Download {g.title}.xlsx
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      <footer className="footer">
        SPIP · copy bulan sebelumnya jika CSV kosong · error tidak menghentikan batch
      </footer>
    </main>
  );
}
