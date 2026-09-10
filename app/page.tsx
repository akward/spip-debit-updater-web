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
  {
    id: "spasial_atm",
    title: "Spasial ATM",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote:
      "File Spasial (.xlsx) per metrik + LSBU 0302 · baris=kode kota 4 digit · sheet=bulan",
  },
  {
    id: "spasial_ue",
    title: "Spasial UE",
    lsbu: "LSBU_VW_FORMA0302.xlsx",
    lsbuNote:
      "File Spasial UE (.xlsx) + LSBU 0302 · KARTU_ELEKTRONIK · sheet=bulan",
  },
  {
    id: "spasial_kk",
    title: "Spasial KK",
    lsbu: null,
    lsbuNote: "File Spasial KK (.xlsx) · tanpa LSBU (sesuai notebook)",
  },
];

const DOWNLOAD_ITEMS: { id: string; title: string; href: string }[] = [
  { id: "debit", title: "Debit / ATM (format lengkap)", href: "/api/download?group=debit&format=xlsx" },
  { id: "ue", title: "Uang Elektronik (format lengkap)", href: "/api/download?group=ue&format=xlsx" },
  { id: "kk", title: "Kartu Kredit (format lengkap)", href: "/api/download?group=kk&format=xlsx" },
  {
    id: "acquirer_tahun",
    title: "Acquirer Tahun (format lengkap)",
    href: "/api/download?group=acquirer&book=tahun&format=xlsx",
  },
  {
    id: "acquirer_transaksi",
    title: "Acquirer Transaksi (format lengkap)",
    href: "/api/download?group=acquirer&book=transaksi&format=xlsx",
  },
  { id: "fraud_bank", title: "Fraud per Bank (format lengkap)", href: "/api/download?group=fraud_bank&format=xlsx" },
  {
    id: "fraud_penyebab",
    title: "Fraud per Penyebab (format lengkap)",
    href: "/api/download?group=fraud_penyebab&format=xlsx",
  },
  { id: "prop_channel", title: "Prop Channel (format lengkap)", href: "/api/download?group=prop_channel&format=xlsx" },
  { id: "spasial_atm", title: "Spasial ATM (format lengkap)", href: "/api/download?group=spasial_atm&format=xlsx" },
  { id: "spasial_ue", title: "Spasial UE (format lengkap)", href: "/api/download?group=spasial_ue&format=xlsx" },
  { id: "spasial_kk", title: "Spasial KK (format lengkap)", href: "/api/download?group=spasial_kk&format=xlsx" },
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
  const [spatialFiles, setSpatialFiles] = useState<FileList | null>(null);
  const [monthLabel, setMonthLabel] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [liveRows, setLiveRows] = useState<Array<Record<string, unknown>>>([]);
  const [log, setLog] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupMeta = GROUPS.find((g) => g.id === group);

  async function postProcess(fd: FormData): Promise<ProcessResponse> {
    const res = await fetch("/api/process", {
      method: "POST",
      body: fd,
      headers: { Accept: "text/event-stream, application/json" },
    });
    if (res.status === 413) {
      throw new Error("FUNCTION_PAYLOAD_TOO_LARGE");
    }
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok && !ctype.includes("json") && !ctype.includes("event-stream")) {
      const t = await res.text();
      if (/FUNCTION_PAYLOAD_TOO_LARGE|payload too large|413/i.test(t)) {
        throw new Error("FUNCTION_PAYLOAD_TOO_LARGE");
      }
      throw new Error(t.slice(0, 300) || `HTTP ${res.status}`);
    }
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
          throw new Error(data.error || "Gagal memproses");
        return data;
      }

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
      let finalLog: ProcessResponse | null = null;
      await consumeSse(
        new Response(stream),
        setProgress,
        setLiveRows,
        (l) => {
          finalLog = l;
          setLog(l);
        },
        setError
      );
      if (!finalLog) throw new Error("Tidak ada hasil dari stream");
      return finalLog;
    }

    const text = await res.text();
    if (text.trimStart().startsWith("data:")) {
      let finalLog: ProcessResponse | null = null;
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(new TextEncoder().encode(text));
          ctrl.close();
        },
      });
      await consumeSse(
        new Response(stream),
        setProgress,
        setLiveRows,
        (l) => {
          finalLog = l;
          setLog(l);
        },
        setError
      );
      if (!finalLog) throw new Error("Tidak ada hasil dari stream");
      return finalLog;
    }
    const data = JSON.parse(text) as ProcessResponse;
    if (!res.ok || data.ok === false)
      throw new Error(data.error || "Gagal memproses");
    return data;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLog(null);
    setLiveRows([]);
    setProgress(null);
    setLoading(true);
    try {
      const isSpasial = group.startsWith("spasial_");
      const spatialList = spatialFiles ? Array.from(spatialFiles) : [];
      const lsbuList = lsbuFiles ? Array.from(lsbuFiles) : [];
      const csvList = files ? Array.from(files) : [];

      if (isSpasial) {
        setProgress("Memuat library xlsx…");
        const XLSX = await import("xlsx");
        const {
          rowsFromAoa,
          buildPrecomputed,
        } = await import("@/lib/spasialCore");

        async function fileToRows(f: File) {
          const buf = await f.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array", cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: "",
          }) as unknown[][];
          return rowsFromAoa(aoa);
        }

        setProgress(`Membaca ${spatialList.length} file Spasial di browser…`);
        const spatialParsed: { name: string; rows: Record<string, unknown>[] }[] =
          [];
        for (let fi = 0; fi < spatialList.length; fi++) {
          const f = spatialList[fi];
          setProgress(
            `Membaca Spasial ${fi + 1}/${spatialList.length}: ${f.name}`
          );
          spatialParsed.push({ name: f.name, rows: await fileToRows(f) });
        }

        const lsbuRows: Record<string, unknown>[] = [];
        for (let li = 0; li < lsbuList.length; li++) {
          const f = lsbuList[li];
          setProgress(`Membaca LSBU ${li + 1}/${lsbuList.length}: ${f.name}`);
          lsbuRows.push(...(await fileToRows(f)));
        }

        setProgress("Mengagregasi data…");
        const precomputed = buildPrecomputed(group, spatialParsed, lsbuRows);

        const fd = new FormData();
        fd.set("group", group);
        fd.set("dryRun", dryRun ? "1" : "0");
        fd.set("stream", dryRun ? "0" : "1");
        if (monthLabel.trim()) fd.set("monthLabel", monthLabel.trim());
        fd.set("spasialPrecomputed", JSON.stringify(precomputed));

        setProgress(
          `Mengirim hasil agregasi (${(JSON.stringify(precomputed).length / 1000).toFixed(0)} KB)…`
        );
        const data = await postProcess(fd);
        setLog(data);
        setProgress("Selesai");
        return;
      }

      const fd = new FormData();
      fd.set("group", group);
      fd.set("dryRun", dryRun ? "1" : "0");
      fd.set("stream", dryRun ? "0" : "1");
      if (monthLabel.trim()) fd.set("monthLabel", monthLabel.trim());
      csvList.forEach((f) => fd.append("files", f));
      lsbuList.forEach((f) => fd.append("lsbu", f));
      spatialList.forEach((f) => fd.append("spatial", f));

      const data = await postProcess(fd);
      setLog(data);
      setProgress("Selesai");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/FUNCTION_PAYLOAD_TOO_LARGE|413|payload too large/i.test(msg)) {
        setError(
          "Upload terlalu besar (batas Vercel ~4.5 MB). " +
            "Untuk Spasial UE: unggah file bertahap, atau kurangi ukuran LSBU/xlsx."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const displayRows = log?.results?.length ? log.results : liveRows;

  return (
    <main className="container">
      <header className="header">
        <div>
          <p className="header-eyebrow">SPIP · Data ops</p>
          <h1>Aplikasi Update SPIP</h1>
          <p>Unggah file sumber, jalankan dry-run atau proses, lalu tinjau hasil per job.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>Panduan file LSBU</h2>
          <p className="panel-hint">Per group proses</p>
        </div>
        <div className="table-wrap">
          <table className="guide-table">
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
                  <td>{g.title}</td>
                  <td>
                    {g.lsbu ? (
                      <code>{g.lsbu}</code>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>Tidak ada</span>
                    )}
                  </td>
                  <td>{g.lsbuNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Upload & proses</h2>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Group</span>
              <select
                className="control"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                {GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">File CSV</span>
              <input
                className="control"
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={(e) => setFiles(e.target.files)}
              />
              <p className="field-note">Opsional — kosong = salin bulan sebelumnya</p>
            </label>

            <label className="field">
              <span className="field-label">File LSBU (.xlsx)</span>
              <input
                className="control"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={(e) => setLsbuFiles(e.target.files)}
              />
              <p className="field-note">Bisa lebih dari satu (Acquirer: 0304 + 0303)</p>
            </label>

            <label className="field">
              <span className="field-label">File Spasial (.xlsx)</span>
              <input
                className="control"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                onChange={(e) => setSpatialFiles(e.target.files)}
              />
              <p className="field-note">{groupMeta?.lsbuNote}</p>
            </label>

            <label className="field">
              <span className="field-label">Label bulan</span>
              <input
                className="control"
                type="text"
                value={monthLabel}
                onChange={(e) => setMonthLabel(e.target.value)}
                placeholder="Kosong = bulan sebelumnya (contoh: Maret 2026)"
              />
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span>Dry-run (simulasi saja, tidak menulis data)</span>
            </label>

            <div className="btn-row">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Memproses…" : dryRun ? "Jalankan dry-run" : "Proses & tulis"}
              </button>
            </div>
          </div>
        </form>

        {progress && (
          <p className="status status-progress">
            <strong>Progress:</strong> {progress}
          </p>
        )}
        {error && (
          <p className="status status-error">
            <strong>Error:</strong> {error}
          </p>
        )}
      </section>

      {displayRows.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h2>Hasil</h2>
          </div>
          {log?.summary && (
            <div className="summary-row">
              <span className="chip chip-muted">Total {log.summary.total}</span>
              <span className="chip chip-ok">OK {log.summary.ok}</span>
              <span className={`chip ${log.summary.errors ? "chip-err" : "chip-muted"}`}>
                Error {log.summary.errors}
              </span>
              {log.monthLabel ? (
                <span className="chip chip-muted">Bulan: {log.monthLabel}</span>
              ) : null}
              {log.dryRun ? (
                <span className="chip chip-muted">dry-run</span>
              ) : null}
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, i) => {
                  const st = String(r.status ?? "");
                  const stClass =
                    st === "ok" || st === "copy-previous"
                      ? "status-ok-text"
                      : st === "error"
                        ? "status-error-text"
                        : "";
                  return (
                    <tr key={i}>
                      <td>{String(r.job ?? "")}</td>
                      <td className={`status-cell ${stClass}`}>{st}</td>
                      <td className="detail-mono">
                        {r.file ? `file=${String(r.file)} ` : ""}
                        {r.spatialKeys != null
                          ? `spatial=${String(r.spatialKeys)} `
                          : ""}
                        {r.lsbuKeys != null ? `lsbu=${String(r.lsbuKeys)} ` : ""}
                        {r.reason ? String(r.reason) : ""}
                        {r.column ? `col=${String(r.column)} ` : ""}
                        {r.written != null ? `written=${String(r.written)}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Download Excel (format lengkap)</h2>
        </div>
        <ul className="download-list">
          {DOWNLOAD_ITEMS.map((d) => (
            <li key={d.id}>
              <a href={d.href}>{d.title}</a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">Aplikasi Update SPIP</footer>
    </main>
  );
}
