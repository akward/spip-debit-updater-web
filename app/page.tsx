"use client";

import { useState } from "react";

/** Group + file LSBU yang dipakai (sesuai prepare CLI) */
const GROUPS = [
  {
    id: "debit",
    title: "Debit / ATM",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote: "Merge ke Jumlah Kartu ATM & ATM+Debet (JENIS_DATA 001, KOTA -)",
  },
  {
    id: "ue",
    title: "Uang Elektronik",
    lsbu: null,
    lsbuNote: "Tidak memakai file LSBU (hanya CSV folder UE)",
  },
  {
    id: "kk",
    title: "Kartu Kredit",
    lsbu: null,
    lsbuNote: "Tidak memakai file LSBU (hanya CSV folder KK)",
  },
  {
    id: "acquirer",
    title: "Acquirer",
    lsbu: "LSBU_VW_FORMA0304.xlsx",
    lsbuNote: "Merge ke data EDC/Merchant (JENIS_MESIN POS Debit/Kredit/UE/Gabungan)",
  },
  {
    id: "fraud_bank",
    title: "Fraud per Bank",
    lsbu: null,
    lsbuNote: "Tidak memakai file LSBU (hanya CSV fraud per bank)",
  },
  {
    id: "fraud_penyebab",
    title: "Fraud per Penyebab",
    lsbu: null,
    lsbuNote: "Tidak memakai file LSBU (hanya CSV fraud per penyebab)",
  },
  {
    id: "prop_channel",
    title: "Prop Channel",
    lsbu: null,
    lsbuNote: "Tidak memakai LSBU (sumber: Delivery Channel / CSV prop chanel)",
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

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SPIP Debit Updater</h1>
          <p>
            Upload CSV + LSBU → update Google Sheets → unduh <strong>satu file per laporan</strong>{" "}
            (ATM, UE, Fraud, …). File upload tidak disimpan di server.
          </p>
        </div>
        <span className="badge">1 file = 1 spreadsheet</span>
      </header>

      <section className="panel">
        <h2>Panduan file LSBU per group</h2>
        <table>
          <thead>
            <tr>
              <th>Group / laporan</th>
              <th>File LSBU yang dipakai</th>
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
                    {g.lsbu ? ` (LSBU: ${g.lsbu})` : ""}
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
              File LSBU (.xlsx) — opsional
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
                  Group <strong>{groupMeta.title}</strong> → unggah{" "}
                  <code>{groupMeta.lsbu}</code>
                  <br />
                  {groupMeta.lsbuNote}
                </>
              ) : (
                <>
                  Group <strong>{groupMeta?.title}</strong> tidak memakai LSBU. Kolom upload LSBU boleh
                  dikosongkan.
                </>
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
          Satu tombol = <strong>satu file Excel (.xlsx)</strong> berisi seluruh isi spreadsheet group
          tersebut (bukan per tab). Contoh: Debit/ATM, UE, Fraud per Bank, …
        </p>
        <table>
          <thead>
            <tr>
              <th>Laporan</th>
              <th>Unduh file</th>
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

      <footer className="footer">SPIP · unduh per file spreadsheet · LSBU per group jelas</footer>
    </main>
  );
}
