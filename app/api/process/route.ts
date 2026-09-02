import { NextRequest, NextResponse } from "next/server";
import { previousMonthLabel } from "@/lib/months";
import {
  parseCsvText,
  buildValueMap,
  matchFile,
  findBestFile,
  type Row,
} from "@/lib/parse";
import { updateMonthColumn } from "@/lib/sheets";
import { updateMesinAtmMatrix, updateEdcMatrix } from "@/lib/matrix";
import { GROUPS } from "@/lib/tasks";
import {
  parseLsbuXlsx,
  mergeLsbuDebit,
  mergeLsbuKk,
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

export const runtime = "nodejs";
export const maxDuration = 300;

function basename(name: string): string {
  return name.toLowerCase().replace(/\\/g, "/").split("/").pop() || "";
}

/** Pilih CSV untuk job UE transfer agar tidak saling tabrak */
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
  // Vol/Nom Transfer (antar UE) — ada "transfer" tapi BUKAN rekening/pemerintah
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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const group = String(form.get("group") || "debit");
    const dryRun = String(form.get("dryRun") || "0") === "1";
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

    const lsbuFiles = [
      ...form.getAll("lsbu"),
      ...form.getAll("lsbu2"),
    ].filter((f) => f instanceof File && f.size > 0) as File[];

    const lsbuBundles: { name: string; kind: LsbuKind; rows: Row[] }[] = [];
    for (const f of lsbuFiles) {
      const buf = await f.arrayBuffer();
      const rows = parseLsbuXlsx(buf);
      const kind = detectLsbuKind(f.name, rows);
      lsbuBundles.push({ name: f.name, kind, rows });
    }
    const lsbuByKind = (k: LsbuKind) =>
      lsbuBundles.filter((b) => b.kind === k).flatMap((b) => b.rows);

    const parsed: { name: string; rows: Row[] }[] = [];
    for (const f of files) {
      parsed.push({ name: f.name, rows: parseCsvText(await f.text()) });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const job of jobs) {
      try {
        let file =
          group === "ue" &&
          (job.name.includes("Transfer") || job.name.includes("transfer"))
            ? pickUeTransferFile(parsed, job.name) ||
              findBestFile(parsed, job.fileHints)
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
            job.keyColumn
          );
        }

        // ========== LSBU merges ==========

        if (group === "debit") {
          const r0302 = lsbuByKind("forma0302");
          if (r0302.length) {
            if (job.valueColumn === "jumlah") {
              if (job.name.includes("ATM+Debet")) {
                const m = mergeLsbuDebit(r0302, { kartuDebit: map });
                if (m.addedDebit)
                  results.push({
                    job: `${job.name} [LSBU 0302]`,
                    status: "info",
                    reason: `+${m.addedDebit} KARTU_ATM_DEBIT`,
                  });
              } else if (job.name.includes("Kartu ATM")) {
                const m = mergeLsbuDebit(r0302, { kartuAtm: map });
                if (m.addedAtm)
                  results.push({
                    job: `${job.name} [LSBU 0302]`,
                    status: "info",
                    reason: `+${m.addedAtm} KARTU_ATM`,
                  });
              }
            }

            for (const rule of DEBIT_TRX_LSBU) {
              if (rule.match.some((m) => job.name === m)) {
                const n = mergeLsbuDebitTrx(
                  r0302,
                  map,
                  rule.jenis,
                  rule.valueCol,
                  rule.divideBy
                );
                if (n)
                  results.push({
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
                results.push({
                  job: `${job.name} [LSBU 121]`,
                  status: "info",
                  reason: `+${extra.length} id dari 121-Jumlah Mesin ATM`,
                });
              }
            }
          }
        }

        // UE — hanya exact job name (hindari "Vol Transfer" menempel ke "Vol Transfer Rek")
        if (group === "ue") {
          const r0302 = lsbuByKind("forma0302");
          if (r0302.length) {
            for (const rule of UE_LSBU_MAP) {
              if (!rule.match.some((m) => job.name === m)) continue;
              const n = mergeLsbuUeByJenis(
                r0302,
                map,
                rule.jenis,
                rule.valueCol,
                rule.divideBy
              );
              if (n)
                results.push({
                  job: `${job.name} [LSBU 0302]`,
                  status: "info",
                  reason: `+${n} ${rule.jenis[0]}`,
                });
              break;
            }
          }
        }

        if (group === "kk" && job.name.includes("Jumlah Kartu")) {
          const r = lsbuByKind("forma0301");
          if (r.length) {
            const n = mergeLsbuKk(r, map);
            if (n)
              results.push({
                job: `${job.name} [LSBU 0301]`,
                status: "info",
                reason: `+${n} JUMLAH_KARTU`,
              });
          }
        }

        if (group === "acquirer") {
          const r0304 = lsbuByKind("forma0304");
          if (r0304.length && file) {
            for (const rule of ACQUIRER_LSBU_JENIS) {
              if (
                (rule.hints.includes("debet") && job.name.includes("Debet")) ||
                (rule.hints.includes("kredit") && job.name.includes("Kredit")) ||
                (rule.hints.includes("ue") && job.name === "EDC UE") ||
                (rule.hints.includes("gabungan") && job.name.includes("Gabungan"))
              ) {
                const tmp = new Map<string, number>();
                const n = mergeLsbuAcquirer(r0304, rule.jenis, tmp, "JUMLAH_MESIN");
                if (n) {
                  const extra: Row[] = [...tmp.entries()].map(([id, v]) => ({
                    idpelapor: id,
                    statusmesin: "OL",
                    expr_1: String(v),
                  }));
                  matrixRows = [...(matrixRows || []), ...extra];
                  results.push({
                    job: `${job.name} [LSBU 0304]`,
                    status: "info",
                    reason: `+${n} ${rule.jenis}`,
                  });
                }
              }
            }
          }

          const r0303 = lsbuByKind("forma0303");
          if (r0303.length) {
            for (const rule of ACQUIRER_0303_MAP) {
              if (rule.match.some((m) => job.name === m)) {
                const n = mergeLsbuForma0303(
                  r0303,
                  map,
                  rule.transaksi,
                  rule.field,
                  rule.divideBy
                );
                if (n)
                  results.push({
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
                job.valueColumn === "expr_2"
                  ? "NOMINAL_FRAUD_ACTUAL"
                  : "VOLUME_FRAUD_ACTUAL";
              const n = mergeLsbuFraudBank(r, map, card, field, job.divideBy);
              if (n)
                results.push({
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
                job.valueColumn === "expr_2"
                  ? "NOMINAL_FRAUD_ACTUAL"
                  : "VOLUME_FRAUD_ACTUAL";
              const n = mergeLsbuFraudPenyebab(r, map, card, field, job.divideBy);
              if (n)
                results.push({
                  job: `${job.name} [LSBU 0306 map]`,
                  status: "info",
                  reason: `+${n} → CP/PL/HD/TD/FA/X (${card})`,
                });
            }
          }
        }

        const spreadsheetId = process.env[job.spreadsheetEnv];
        if (!spreadsheetId) {
          results.push({
            job: job.name,
            status: "error",
            reason: `Env ${job.spreadsheetEnv} belum di-set`,
            ids: map.size,
            source,
          });
          continue;
        }

        if (dryRun) {
          results.push({
            job: job.name,
            status:
              source === "none" && !map.size ? "dry-run-copy-previous" : "dry-run",
            sheet: job.sheetName,
            kind: job.kind || "column",
            file: file?.name || null,
            ids: map.size,
            monthLabel,
            source,
            sample: [...map.entries()].slice(0, 3),
          });
          continue;
        }

        if (job.kind === "matrix-atm") {
          if (!matrixRows?.length) {
            results.push({
              job: job.name,
              status: "skip-matrix-no-data",
              reason: "Butuh CSV mesin_atm dan/atau LSBU 121",
            });
            continue;
          }
          const out = await updateMesinAtmMatrix({
            spreadsheetId,
            sheetName: job.sheetName,
            monthLabel,
            rows: matrixRows,
          });
          results.push({
            job: job.name,
            status: "ok",
            sheet: job.sheetName,
            file: file?.name || null,
            ...out,
          });
          continue;
        }

        if (job.kind === "matrix-edc") {
          if (!matrixRows?.length) {
            results.push({
              job: job.name,
              status: "skip-matrix-no-data",
              reason: "Butuh CSV EDC dan/atau LSBU 0304",
            });
            continue;
          }
          const out = await updateEdcMatrix({
            spreadsheetId,
            sheetName: job.sheetName,
            monthLabel,
            rows: matrixRows,
            valueField: job.valueColumn,
          });
          results.push({
            job: job.name,
            status: "ok",
            sheet: job.sheetName,
            file: file?.name || null,
            ...out,
          });
          continue;
        }

        const out = await updateMonthColumn({
          spreadsheetId,
          sheetName: job.sheetName,
          monthLabel,
          valuesById: map,
          copyIfEmpty: true,
        });
        results.push({
          job: job.name,
          status: out.mode === "write" ? "ok" : out.mode,
          sheet: job.sheetName,
          file: file?.name || null,
          ids: map.size,
          monthLabel,
          source,
          ...out,
        });
      } catch (e) {
        results.push({
          job: job.name,
          status: "error",
          sheet: job.sheetName,
          reason: e instanceof Error ? e.message : String(e),
        });
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
