"use client";

import { useState } from "react";

const GROUPS = [
  {
    id: "debit",
    title: "Debit / ATM",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote:
      "001-Jumlah Kartu (KARTU_ATM/DEBIT) · 121-Jumlah Mesin ATM · 082/102 tarik · 087/107 belanja · 091/111 interbank · 092/112 antarbank",
  },
  {
    id: "ue",
    title: "Uang Elektronik",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote:
      "001/051/052/056/057/070/122 · Initial 096/116 · Topup 097/117 · Transfer 093/113 · Tunai 098/118 · Redeem 099/119 · Belanja 086+087 / 106+107",
  },
  {
    id: "kk",
    title: "Kartu Kredit",
    lsbu: "LSBU_VW_FORMA0301.xlsx",
    lsbuNote: "SANDI_PELAPOR + JUMLAH_KARTU",
  },
  {
    id: "acquirer",
    title: "Acquirer",
    lsbu: "LSBU_VW_FORMA0304.xlsx + LSBU_VW_FORMA0303.xlsx",
    lsbuNote:
      "0304: POS Debit/Kredit/UE/Gabungan · 0303: 51-Internasional & 52-Domestik interchange (upload keduanya)",
  },
  {
    id: "fraud_bank",
    title: "Fraud per Bank",
    lsbu: "LSBU_VW_FORMA0306.xlsx",
    lsbuNote: "JENIS_KARTU 100/200/500 → VOLUME/NOMINAL_FRAUD_ACTUAL per idpelapor",
  },
  {
    id: "fraud_penyebab",
    title: "Fraud per Penyebab",
    lsbu: "LSBU_VW_FORMA0306.xlsx",
    lsbuNote:
      "JENIS_FRAUD → CP/PL/HD/TD/FA/X (50→CP, 10→PL, 20→HD, 30→TD, 40→FA, 99→X)",
  },
  {
    id: "prop_channel",
    title: "Prop Channel",
    lsbu: null,
    lsbuNote: "Tanpa LSBU",
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
  lsbu?: Array<{ name: string; rows: number; kind?: string }> | null;
  files?: { name: string; rows: number }[];
  summary?: { total: number; errors: number; ok: number };
  results?: Array<Record<string, unknown>>;
};

export default function HomePage() {
  const [group, setGroup] = useState("debit");
  const [files, setFiles] = useState<FileList | null>(null);
  const [lsbuFiles, setLsbuFiles] = useState<FileList | null>(null);
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
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("group", group);
      fd.set("dryRun", dryRun ? "1" : "0");
      if (monthLabel.trim()) fd.set("monthLabel", monthLabel.trim());
      if (files?.length) Array.from(files).forEach((f) => fd.append("files", f));
      if (lsbuFiles?.length)
        Array.from(lsbuFiles).forEach((f) => fd.append("lsbu", f));
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
            Mapping LSBU mengikuti notebook. Multi-file LSBU (mis. 0304+0303). Tanpa CSV =
            copy bulan sebelumnya.
          </p>
        </div>
        <span className="badge">notebook parity</span>
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
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                {GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
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
              File LSBU (.xlsx) — bisa lebih dari satu (Acquirer: 0304 + 0303)
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={(e) => setLsbuFiles(e.target.files)}
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
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  padding: 10,
                  borderRadius: 8,
                }}
              />
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
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
            {Array.isArray(log.lsbu) && log.lsbu.length ? (
              <>
                <br />
                LSBU:{" "}
                {log.lsbu.map((l, i) => (
                  <span key={i}>
                    {i > 0 ? ", " : ""}
                    <code>{l.name}</code> ({l.rows}
                    {l.kind ? `, ${l.kind}` : ""})
                  </span>
                ))}
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

      <footer className="footer">SPIP · LSBU mapping = notebook</footer>
    </main>
  );
}
