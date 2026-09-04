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
    lsbuNote:
      "JUMLAH_KARTU · JUMLAH_ACCOUNT · Outstanding (sum CURRENT+X_DAY+30..180 DPD) · NPL (sum 90..180 DPD) ÷1e6",
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

function handleSseEvent(
  evt: Record<string, unknown>,
  rows: Array<Record<string, unknown>>,
  setProgress: (s: string) => void,
  setLiveRows: (r: Array<Record<string, unknown>>) => void,
  setLog: (l: ProcessResponse) => void,
  setError: (e: string) => void
) {
  if (evt.type === "progress") {
    setProgress(`${evt.index}/${evt.total}: ${String(evt.message || evt.job)}`);
  } else if (evt.type === "job") {
    const rest = { ...evt };
    delete rest.type;
    delete rest.index;
    delete rest.total;
    rows.push(rest);
    setLiveRows([...rows]);
    setProgress(
      `${evt.index}/${evt.total}: ${String(rest.job)} → ${String(rest.status)}`
    );
  } else if (evt.type === "done") {
    setLog(evt as unknown as ProcessResponse);
    setProgress("Selesai");
  } else if (evt.type === "error") {
    setError(String(evt.error || "Gagal"));
  } else if (evt.type === "start") {
    setProgress(`Mulai ${evt.totalJobs} job…`);
  }
}

async function consumeSse(
  res: Response,
  setProgress: (s: string) => void,
  setLiveRows: (r: Array<Record<string, unknown>>) => void,
  setLog: (l: ProcessResponse) => void,
  setError: (e: string) => void
) {
  if (!res.body) throw new Error("Tidak ada body stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const rows: Array<Record<string, unknown>> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      for (const rawLine of part.split("\n")) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as Record<string, unknown>;
          handleSseEvent(evt, rows, setProgress, setLiveRows, setLog, setError);
        } catch {
          /* partial */
        }
      }
    }
  }
  for (const rawLine of buffer.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    try {
      const evt = JSON.parse(payload) as Record<string, unknown>;
      handleSseEvent(evt, rows, setProgress, setLiveRows, setLog, setError);
    } catch {
      /* ignore */
    }
  }
}

export default function HomePage() {
  const [group, setGroup] = useState("debit");
  const [files, setFiles] = useState<FileList | null>(null);
  const [lsbuFiles, setLsbuFiles] = useState<FileList | null>(null);
  const [monthLabel, setMonthLabel] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [liveRows, setLiveRows] = useState<Array<Record<string, unknown>>>([]);
  const [log, setLog] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupMeta = GROUPS.find((g) => g.id === group);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLog(null);
    setLiveRows([]);
    setProgress(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("group", group);
      fd.set("dryRun", dryRun ? "1" : "0");
      fd.set("stream", dryRun ? "0" : "1");
      if (monthLabel.trim()) fd.set("monthLabel", monthLabel.trim());
      if (files?.length) Array.from(files).forEach((f) => fd.append("files", f));
      if (lsbuFiles?.length)
        Array.from(lsbuFiles).forEach((f) => fd.append("lsbu", f));

      const res = await fetch("/api/process", {
        method: "POST",
        body: fd,
        headers: { Accept: "text/event-stream, application/json" },
      });

      const ctype = (res.headers.get("content-type") || "").toLowerCase();
      const useStream =
        !dryRun ||
        ctype.includes("event-stream") ||
        ctype.includes("text/event-stream");

      if (useStream && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const first = await reader.read();
        const firstText = decoder.decode(first.value || new Uint8Array(), {
          stream: true,
        });

        if (firstText.trimStart().startsWith("{")) {
          let rest = firstText;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            rest += decoder.decode(value, { stream: true });
          }
          const data = JSON.parse(rest) as ProcessResponse;
          if (!res.ok || data.ok === false)
            setError(data.error || "Gagal memproses");
          setLog(data);
        } else {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(firstText));
              (async () => {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    controller.enqueue(value);
                  }
                } finally {
                  controller.close();
                }
              })();
            },
          });
          await consumeSse(
            new Response(stream),
            setProgress,
            setLiveRows,
            setLog,
            setError
          );
        }
      } else {
        const text = await res.text();
        if (text.trimStart().startsWith("data:")) {
          const stream = new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode(text));
              c.close();
            },
          });
          await consumeSse(
            new Response(stream),
            setProgress,
            setLiveRows,
            setLog,
            setError
          );
        } else {
          const data = JSON.parse(text) as ProcessResponse;
          if (!res.ok || data.ok === false)
            setError(data.error || "Gagal memproses");
          setLog(data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const displayRows = log?.results?.length ? log.results : liveRows;

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>SPIP Debit Updater</h1>
          <p>Update data laporan SPIP ke Google Spreadsheet dari file CSV dan LSBU.</p>
        </div>
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
        <h2>Upload & proses</h2>
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
              {loading
                ? dryRun
                  ? "Memeriksa…"
                  : "Menulis ke Google Sheet…"
                : dryRun
                  ? "Cek mapping"
                  : "Update Google Sheet"}
            </button>

            {loading && progress && (
              <div className="ok" style={{ fontSize: 0.95 }}>
                <strong>Progres:</strong> {progress}
                <br />
                <span style={{ color: "var(--muted)", fontSize: 0.85 }}>
                  Write mode lebih lama (API Sheets per sheet). Jangan tutup tab.
                </span>
              </div>
            )}
          </div>
        </form>
      </section>

      {error && (
        <section className="panel">
          <div className="warn">{error}</div>
        </section>
      )}

      {(log || liveRows.length > 0) && (
        <section className="panel">
          <h2>Hasil proses</h2>
          <p style={{ color: "var(--muted)" }}>
            {log ? (
              <>
                Bulan: <code>{log.monthLabel}</code>{" "}
                {log.dryRun ? "· dry-run" : "· write"}
                {log.summary ? (
                  <>
                    {" · "}
ok/copy: {log.summary.ok}/{log.summary.total} · error:{" "}
                    {log.summary.errors}
                  </>
                ) : null}
              </>
            ) : (
              <>Sedang berjalan… ({liveRows.length} baris hasil)</>
            )}
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
              {displayRows.map((r, i) => (
                <tr key={i}>
                  <td>{String(r.job)}</td>
                  <td>{String(r.status)}</td>
                  <td>
                    <code style={{ fontSize: 12 }}>
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(r).filter(
                            ([k]) => !["job", "status"].includes(k)
                          )
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
        <h2>Download file SPIP</h2>
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
                    Unduh {g.title}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">SPIP Debit Updater</footer>
    </main>
  );
}
