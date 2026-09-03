import { NextRequest, NextResponse } from "next/server";
import { previousMonthLabel } from "@/lib/months";
import {
  parseCsvText,
  buildValueMap,
  findBestFile,
  type Row,
} from "@/lib/parse";
import { updateMonthColumn } from "@/lib/sheets";
import { updateMesinAtmMatrix, updateEdcMatrix } from "@/lib/matrix";
import { GROUPS, type SheetJob } from "@/lib/tasks";
import {
  parseLsbuXlsx,
  mergeLsbuDebit,
  mergeLsbuKkSumCols,
  KK_LSBU_MAP,
  mergeLsbuAcquirer,
  detectLsbuKind,
  ACQUIRER_LSBU_JENIS,
  mergeLsbuUeByJenis,
  mergeLsbuFraudBank,
  mergeLsbuFraudPenyebab,
  mergeLsbuForma0303,
  mergeLsbuDebitTrx,
  lsbuMesinAtmRows,
  DEBIT_TRX_LSBU,
  UE_LSBU_MAP,
  ACQUIRER_0303_MAP,
  type LsbuKind,
} from "@/lib/lsbu";

const ENV_ALIASES: Record<string, string[]> = {
  SHEET_ACQUIRER_EDC: [
    "SHEET_ACQUIRER_TAHUN",
    "SHEET_ACQUIRER",
    "SHEET_ACQUIRER_MESIN",
    "SHEET_ACQUIRER_EDC",
  ],
  SHEET_ACQUIRER_TRX: [
    "SHEET_ACQUIRER_TRX",
    "SHEET_ACQUIRER_TRANSAKSI",
    "SHEET_ACQUIRER",
  ],
};

function resolveSpreadsheetId(primaryEnv: string): string | undefined {
  const keys = [primaryEnv, ...(ENV_ALIASES[primaryEnv] || [])];
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const v = process.env[k]?.trim();
    if (v) return v;
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|Quota exceeded|rate limit|Write requests per minute/i.test(msg);
}

function basename(name: string): string {
  return name.toLowerCase().replace(/\\/g, "/").split("/").pop() || "";
}

function pickUeTransferFile(
  parsed: { name: string; rows: Row[] }[],
  jobName: string
): { name: string; rows: Row[] } | undefined {
  const n = jobName.toLowerCase();
  if (n.includes("pemerintah")) {
    return parsed.find((p) => {
      const b = basename(p.name);
      return b.includes("pemerintah") || b.includes("transfer_pem");
    });
  }
  if (n.includes("rek")) {
    return parsed.find((p) => {
      const b = basename(p.name);
      return (
        b.includes("rekening") ||
        b.includes("transfer_rek") ||
        (b.includes("rek") && b.includes("transfer"))
      );
    });
  }
  if (n === "vol transfer" || n === "nom transfer") {
    return parsed.find((p) => {
      const b = basename(p.name);
      if (!b.includes("transfer")) return false;
      if (b.includes("rekening") || b.includes("transfer_rek")) return false;
      if (b.includes("pemerintah") || b.includes("transfer_pem")) return false;
      return true;
    });
  }
  return undefined;
}

async function processOneJob(opts: {
  job: SheetJob;
  group: string;
  dryRun: boolean;
  monthLabel: string;
  parsed: { name: string; rows: Row[] }[];
  lsbuByKind: (k: LsbuKind) => Row[];
}): Promise<Record<string, unknown>[]> {
  const { job, group, dryRun, monthLabel, parsed, lsbuByKind } = opts;
  const outRows: Record<string, unknown>[] = [];

  let file =
    group === "ue" && job.name.toLowerCase().includes("transfer")
      ? pickUeTransferFile(parsed, job.name) || findBestFile(parsed, job.fileHints)
      : findBestFile(parsed, job.fileHints);

  let map = new Map<string, number>();
  let source: "csv" | "none" = "none";
  let matrixRows: Row[] | null = file ? file.rows : null;

  if (file) {
    source = "csv";
    map = buildValueMap(
      file.rows,
      job.valueColumn,
      job.divideBy,
      job.keyColumn,
      job.filterJenis,
      job.filterMesin
    );
  }

  if (group === "debit") {
    const r0302 = lsbuByKind("forma0302");
    if (r0302.length) {
      if (job.valueColumn === "jumlah") {
        if (job.name.includes("ATM+Debet")) {
          const m = mergeLsbuDebit(r0302, { kartuDebit: map });
          if (m.addedDebit)
            outRows.push({
              job: `${job.name} [LSBU 0302]`,
              status: "info",
              reason: `+${m.addedDebit} KARTU_ATM_DEBIT`,
            });
        } else if (job.name.includes("Kartu ATM")) {
          const m = mergeLsbuDebit(r0302, { kartuAtm: map });
          if (m.addedAtm)
            outRows.push({
              job: `${job.name} [LSBU 0302]`,
              status: "info",
              reason: `+${m.addedAtm} KARTU_ATM`,
            });
        }
      }
      for (const rule of DEBIT_TRX_LSBU) {
        if (rule.match.some((m) => job.name === m)) {
          const n = mergeLsbuDebitTrx(r0302, map, rule.jenis, rule.valueCol, rule.divideBy);
          if (n)
            outRows.push({
              job: `${job.name} [LSBU 0302]`,
              status: "info",
              reason: `+${n} ${rule.jenis.join("|")}`,
            });
        }
      }
      if (job.kind === "matrix-atm") {
        const extra = lsbuMesinAtmRows(r0302);
        if (extra.length) {
          matrixRows = [...(matrixRows || []), ...extra];
          outRows.push({
            job: `${job.name} [LSBU 121]`,
            status: "info",
            reason: `+${extra.length} id dari 121`,
          });
        }
      }
    }
  }

  if (group === "ue") {
    const r0302 = lsbuByKind("forma0302");
    if (r0302.length) {
      for (const rule of UE_LSBU_MAP) {
        if (!rule.match.some((m) => job.name === m)) continue;
        const n = mergeLsbuUeByJenis(r0302, map, rule.jenis, rule.valueCol, rule.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0302]`,
            status: "info",
            reason: `+${n} ${rule.jenis[0]}`,
          });
        break;
      }
    }
  }

  if (group === "kk") {
    const r = lsbuByKind("forma0301");
    if (r.length) {
      for (const rule of KK_LSBU_MAP) {
        if (job.name !== rule.match) continue;
        const n = mergeLsbuKkSumCols(r, map, rule.cols, rule.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0301]`,
            status: "info",
            reason: `+${n} ${rule.label}`,
          });
        break;
      }
    }
  }

  if (group === "acquirer") {
    const r0304 = lsbuByKind("forma0304");
    if (r0304.length && (file || job.kind === "matrix-edc")) {
      const isMerchant = job.name.startsWith("Merchant");
      const isEdcMatrix = job.kind === "matrix-edc";
      for (const rule of ACQUIRER_LSBU_JENIS) {
        const matchJob =
          (rule.hints.includes("debet") && job.name.includes("Debet")) ||
          (rule.hints.includes("kredit") && job.name.includes("Kredit")) ||
          (rule.hints.includes("ue") &&
            (job.name === "EDC UE" ||
              job.name === "Merchant UE" ||
              job.sheetName.includes("Uang Elektronik"))) ||
          (rule.hints.includes("gabungan") && job.name.includes("Gabungan"));
        if (!matchJob || !isEdcMatrix) continue;
        const field = isMerchant ? "JUMLAH_MERCHANT" : "JUMLAH_MESIN";
        const tmp = new Map<string, number>();
        const n = mergeLsbuAcquirer(r0304, rule.jenis, tmp, field);
        if (n) {
          const extra: Row[] = [...tmp.entries()].map(([id, v]) => ({
            idpelapor: id,
            statusmesin: "OL",
            expr_1: isMerchant ? "0" : String(v),
            expr_2: isMerchant ? String(v) : "0",
          }));
          matrixRows = [...(matrixRows || []), ...extra];
          outRows.push({
            job: `${job.name} [LSBU 0304]`,
            status: "info",
            reason: `+${n} ${rule.jenis} (${field})`,
          });
        }
      }
    }
    const r0303 = lsbuByKind("forma0303");
    if (r0303.length) {
      for (const rule of ACQUIRER_0303_MAP) {
        if (rule.match.some((m) => job.name === m)) {
          const n = mergeLsbuForma0303(r0303, map, rule.transaksi, rule.field, rule.divideBy);
          if (n)
            outRows.push({
              job: `${job.name} [LSBU 0303]`,
              status: "info",
              reason: `+${n} ${rule.transaksi}`,
            });
        }
      }
    }
  }

  if (group === "fraud_bank") {
    const r = lsbuByKind("forma0306");
    if (r.length) {
      const card = job.name.includes("Kredit")
        ? "100-Kartu Kredit"
        : job.name.includes("Debet") || job.name.includes("ATM")
          ? "200-Kartu ATM dan Debet"
          : job.name.includes("UE")
            ? "500-Uang Elektronik"
            : "";
      if (card) {
        const field =
          job.valueColumn === "expr_2" ? "NOMINAL_FRAUD_ACTUAL" : "VOLUME_FRAUD_ACTUAL";
        const n = mergeLsbuFraudBank(r, map, card, field, job.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0306]`,
            status: "info",
            reason: `+${n} ${card}`,
          });
      }
    }
  }

  if (group === "fraud_penyebab") {
    const r = lsbuByKind("forma0306");
    if (r.length) {
      const card = job.name.includes("Kredit")
        ? "100-Kartu Kredit"
        : job.name.includes("Debet") || job.name.includes("ATM")
          ? "200-Kartu ATM dan Debet"
          : job.name.includes("UE")
            ? "500-Uang Elektronik"
            : "";
      if (card) {
        const field =
          job.valueColumn === "expr_2" ? "NOMINAL_FRAUD_ACTUAL" : "VOLUME_FRAUD_ACTUAL";
        const n = mergeLsbuFraudPenyebab(r, map, card, field, job.divideBy);
        if (n)
          outRows.push({
            job: `${job.name} [LSBU 0306 map]`,
            status: "info",
            reason: `+${n} CP/PL/HD/TD/FA/X`,
          });
      }
    }
  }

  const spreadsheetId = resolveSpreadsheetId(job.spreadsheetEnv);
  if (!spreadsheetId) {
    const tried = ENV_ALIASES[job.spreadsheetEnv]
      ? [job.spreadsheetEnv, ...ENV_ALIASES[job.spreadsheetEnv]]
      : [job.spreadsheetEnv];
    outRows.push({
      job: job.name,
      status: "error",
      reason: `Env ${tried.join(" / ")} belum di-set`,
      ids: map.size,
      source,
    });
    return outRows;
  }

  if (dryRun) {
    outRows.push({
      job: job.name,
      status: source === "none" && !map.size ? "dry-run-copy-previous" : "dry-run",
      sheet: job.sheetName,
      kind: job.kind || "column",
      file: file?.name || null,
      ids: map.size,
      monthLabel,
      source,
      filterJenis: job.filterJenis || null,
      filterMesin: job.filterMesin || null,
      sample: [...map.entries()].slice(0, 3),
    });
    return outRows;
  }

  if (job.kind === "matrix-atm") {
    if (!matrixRows?.length) {
      outRows.push({
        job: job.name,
        status: "skip-matrix-no-data",
        reason: "Butuh CSV mesin_atm dan/atau LSBU 121",
      });
      return outRows;
    }
    const out = await updateMesinAtmMatrix({
      spreadsheetId,
      sheetName: job.sheetName,
      monthLabel,
      rows: matrixRows,
    });
    outRows.push({
      job: job.name,
      status: "ok",
      sheet: job.sheetName,
      file: file?.name || null,
      ...out,
    });
    return outRows;
  }

  if (job.kind === "matrix-edc") {
    if (!matrixRows?.length) {
      outRows.push({
        job: job.name,
        status: "skip-matrix-no-data",
        reason: "Butuh CSV EDC dan/atau LSBU 0304",
      });
      return outRows;
    }
    const out = await updateEdcMatrix({
      spreadsheetId,
      sheetName: job.sheetName,
      monthLabel,
      rows: matrixRows,
      valueField: job.valueColumn,
    });
    outRows.push({
      job: job.name,
      status: "ok",
      sheet: job.sheetName,
      file: file?.name || null,
      ...out,
    });
    return outRows;
  }

  const out = await updateMonthColumn({
    spreadsheetId,
    sheetName: job.sheetName,
    monthLabel,
    valuesById: map,
    copyIfEmpty: true,
  });
  outRows.push({
    job: job.name,
    status: out.mode === "write" ? "ok" : out.mode,
    sheet: job.sheetName,
    file: file?.name || null,
    ids: map.size,
    monthLabel,
    source,
    ...out,
  });
  return outRows;
}

export async function runProcess(req: NextRequest) {
  try {
    const form = await req.formData();
    const group = String(form.get("group") || "debit");
    const dryRun = String(form.get("dryRun") || "0") === "1";
    const wantStream = String(form.get("stream") || "1") === "1";
    const monthOverride = form.get("monthLabel");
    const monthLabel =
      (monthOverride && String(monthOverride).trim()) || previousMonthLabel();

    const jobs = GROUPS[group];
    if (!jobs) {
      return NextResponse.json(
        { ok: false, error: `Group tidak didukung: ${group}` },
        { status: 400 }
      );
    }

    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    const lsbuFiles = [...form.getAll("lsbu"), ...form.getAll("lsbu2")].filter(
      (f) => f instanceof File && f.size > 0
    ) as File[];

    const lsbuBundles: { name: string; kind: LsbuKind; rows: Row[] }[] = [];
    for (const f of lsbuFiles) {
      const buf = await f.arrayBuffer();
      const rows = parseLsbuXlsx(buf);
      lsbuBundles.push({ name: f.name, kind: detectLsbuKind(f.name, rows), rows });
    }
    const lsbuByKind = (k: LsbuKind) =>
      lsbuBundles.filter((b) => b.kind === k).flatMap((b) => b.rows);

    const parsed: { name: string; rows: Row[] }[] = [];
    for (const f of files) {
      parsed.push({ name: f.name, rows: parseCsvText(await f.text()) });
    }

    if (wantStream && !dryRun) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          };
          try {
            send({
              type: "start",
              group,
              monthLabel,
              dryRun,
              totalJobs: jobs.length,
              files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
              lsbu: lsbuBundles.map((b) => ({
                name: b.name,
                kind: b.kind,
                rows: b.rows.length,
              })),
            });

            const results: Record<string, unknown>[] = [];
            const gapMs = group === "acquirer" ? 1500 : 800;
            for (let i = 0; i < jobs.length; i++) {
              const job = jobs[i];
              if (i > 0) await sleep(gapMs);
              send({
                type: "progress",
                index: i + 1,
                total: jobs.length,
                job: job.name,
                message: `Menulis ${job.sheetName}…`,
              });
              let lastErr: unknown;
              let done = false;
              for (let attempt = 0; attempt < 4 && !done; attempt++) {
                try {
                  if (attempt > 0) {
                    send({
                      type: "progress",
                      index: i + 1,
                      total: jobs.length,
                      job: job.name,
                      message: `Retry ${attempt} (quota)… tunggu ${attempt * 20}s`,
                    });
                    await sleep(attempt * 20_000);
                  }
                  const rows = await processOneJob({
                    job,
                    group,
                    dryRun,
                    monthLabel,
                    parsed,
                    lsbuByKind,
                  });
                  let hitQuota = false;
                  for (const r of rows) {
                    const reason = String((r as { reason?: string }).reason || "");
                    if (
                      (r as { status?: string }).status === "error" &&
                      isQuotaError(reason)
                    ) {
                      lastErr = new Error(reason);
                      hitQuota = true;
                      break;
                    }
                    results.push(r);
                    send({ type: "job", index: i + 1, total: jobs.length, ...r });
                  }
                  if (hitQuota && attempt < 3) continue;
                  if (hitQuota) {
                    results.push({
                      job: job.name,
                      status: "error",
                      sheet: job.sheetName,
                      reason: String(lastErr),
                    });
                    send({
                      type: "job",
                      index: i + 1,
                      total: jobs.length,
                      job: job.name,
                      status: "error",
                      sheet: job.sheetName,
                      reason: String(lastErr),
                    });
                  }
                  done = true;
                } catch (e) {
                  lastErr = e;
                  if (!isQuotaError(e) || attempt === 3) {
                    const err = {
                      job: job.name,
                      status: "error",
                      sheet: job.sheetName,
                      reason: e instanceof Error ? e.message : String(e),
                    };
                    results.push(err);
                    send({ type: "job", index: i + 1, total: jobs.length, ...err });
                    done = true;
                  }
                }
              }
            }

            const errors = results.filter((r) => r.status === "error").length;
            send({
              type: "done",
              ok: true,
              group,
              monthLabel,
              dryRun,
              storage: "none — CSV/LSBU hanya memori",
              lsbu: lsbuBundles.map((b) => ({
                name: b.name,
                kind: b.kind,
                rows: b.rows.length,
              })),
              files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
              summary: {
                total: results.length,
                errors,
                ok: results.filter(
                  (r) => r.status === "ok" || r.status === "copy-previous"
                ).length,
              },
              results,
            });
          } catch (e) {
            send({
              type: "error",
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const results: Record<string, unknown>[] = [];
    const gapMs = group === "acquirer" ? 1500 : 800;
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (i > 0 && !dryRun) await sleep(gapMs);
      let pushed = false;
      for (let attempt = 0; attempt < 4 && !pushed; attempt++) {
        try {
          if (attempt > 0) await sleep(attempt * 20_000);
          const rows = await processOneJob({
            job,
            group,
            dryRun,
            monthLabel,
            parsed,
            lsbuByKind,
          });
          const quotaRow = rows.find(
            (r) =>
              r.status === "error" && isQuotaError(String(r.reason || ""))
          );
          if (quotaRow && attempt < 3) continue;
          results.push(...rows);
          pushed = true;
        } catch (e) {
          if (isQuotaError(e) && attempt < 3) continue;
          results.push({
            job: job.name,
            status: "error",
            sheet: job.sheetName,
            reason: e instanceof Error ? e.message : String(e),
          });
          pushed = true;
        }
      }
    }

    const errors = results.filter((r) => r.status === "error").length;
    return NextResponse.json({
      ok: true,
      group,
      monthLabel,
      dryRun,
      storage: "none — CSV/LSBU hanya memori",
      lsbu: lsbuBundles.map((b) => ({
        name: b.name,
        kind: b.kind,
        rows: b.rows.length,
      })),
      files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
      summary: {
        total: results.length,
        errors,
        ok: results.filter(
          (r) => r.status === "ok" || r.status === "copy-previous"
        ).length,
      },
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
