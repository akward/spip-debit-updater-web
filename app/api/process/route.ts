import { NextRequest, NextResponse } from "next/server";
import { previousMonthLabel } from "@/lib/months";
import { parseCsvText, buildValueMap, matchFile } from "@/lib/parse";
import { updateMonthColumn } from "@/lib/sheets";
import { GROUPS } from "@/lib/tasks";
import {
  parseLsbuXlsx,
  mergeLsbuDebit,
  mergeLsbuUe,
  mergeLsbuKk,
  mergeLsbuAcquirer,
  detectLsbuKind,
  ACQUIRER_LSBU_JENIS,
  mergeLsbuUeByJenis,
  mergeLsbuFraudBank,
} from "@/lib/lsbu";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    // Allow zero CSV: all jobs will copy previous month (CLI parity)

    const lsbuFile = form.get("lsbu");
    let lsbuInfo: Record<string, unknown> | null = null;
    let lsbuRows: ReturnType<typeof parseLsbuXlsx> | null = null;
    let lsbuKind: ReturnType<typeof detectLsbuKind> = "unknown";
    if (lsbuFile instanceof File && lsbuFile.size > 0) {
      const buf = await lsbuFile.arrayBuffer();
      lsbuRows = parseLsbuXlsx(buf);
      lsbuKind = detectLsbuKind(lsbuFile.name, lsbuRows);
      lsbuInfo = {
        name: lsbuFile.name,
        rows: lsbuRows.length,
        kind: lsbuKind,
        note: "memori saja, tidak disimpan",
      };
    }

    const parsed: { name: string; rows: ReturnType<typeof parseCsvText> }[] = [];
    for (const f of files) {
      parsed.push({ name: f.name, rows: parseCsvText(await f.text()) });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const job of jobs) {
      try {
        const file = parsed.find((p) => matchFile(p.name, job.fileHints));
        let map = new Map<string, number>();
        let source: "csv" | "none" = "none";

        if (file) {
          source = "csv";
          map = buildValueMap(file.rows, job.valueColumn, job.divideBy);
        }

        // ---- LSBU merges (in-memory) ----
        if (lsbuRows) {
          if (group === "debit" && lsbuKind === "forma0302" && job.valueColumn === "jumlah") {
            if (file && matchFile(file.name, ["kartu_atm", "jumlah_kartu_atm"])) {
              const m = mergeLsbuDebit(lsbuRows, { kartuAtm: map });
              results.push({
                job: `${job.name} [LSBU]`,
                status: "info",
                reason: `+${m.addedAtm} KARTU_ATM`,
              });
            }
            if (
              file &&
              matchFile(file.name, ["kartu_debit", "jumlah_kartu_debet", "kartu_debet"])
            ) {
              const m = mergeLsbuDebit(lsbuRows, { kartuDebit: map });
              results.push({
                job: `${job.name} [LSBU]`,
                status: "info",
                reason: `+${m.addedDebit} KARTU_ATM_DEBIT`,
              });
            }
          }

          if (group === "ue" && lsbuKind === "forma0302") {
            // Jumlah Kartu / jenis UE
            if (matchFile(job.name, ["Jumlah Kartu"]) || matchFile(job.sheetName, ["Jumlah Kartu"])) {
              const n = mergeLsbuUe(lsbuRows, map);
              if (n) results.push({ job: `${job.name} [LSBU]`, status: "info", reason: `+${n} KARTU_ELEKTRONIK` });
            }
            const jenisMap: Record<string, string> = {
              "Chip Based": "051-Chip based",
              "Server Based": "052-Server based",
              Registered: "056-Registered",
              Unregistered: "057-Unregistered",
            };
            for (const [namePart, jenis] of Object.entries(jenisMap)) {
              if (job.name.includes(namePart) || job.sheetName.includes(namePart)) {
                const n = mergeLsbuUeByJenis(lsbuRows, map, jenis);
                if (n)
                  results.push({
                    job: `${job.name} [LSBU]`,
                    status: "info",
                    reason: `+${n} ${jenis}`,
                  });
              }
            }
          }

          if (group === "kk" && lsbuKind === "forma0301") {
            if (
              matchFile(job.name, ["Jumlah Kartu"]) ||
              (file && matchFile(file.name, ["jumlah_kartu"]))
            ) {
              const n = mergeLsbuKk(lsbuRows, map);
              if (n)
                results.push({
                  job: `${job.name} [LSBU]`,
                  status: "info",
                  reason: `+${n} JUMLAH_KARTU`,
                });
            }
          }

          if (group === "acquirer" && lsbuKind === "forma0304" && file) {
            for (const rule of ACQUIRER_LSBU_JENIS) {
              if (matchFile(file.name, rule.hints)) {
                const n = mergeLsbuAcquirer(lsbuRows, rule.jenis, map, "JUMLAH_MESIN");
                if (n)
                  results.push({
                    job: `${job.name} [LSBU]`,
                    status: "info",
                    reason: `+${n} ${rule.jenis}`,
                  });
              }
            }
          }

          if ((group === "fraud_bank" || group === "fraud_penyebab") && lsbuKind === "forma0306") {
            const card =
              job.name.includes("Kredit")
                ? "100-Kartu Kredit"
                : job.name.includes("Debet") || job.name.includes("ATM")
                  ? "200-Kartu ATM dan Debet"
                  : job.name.includes("UE")
                    ? "500-Uang Elektronik"
                    : "";
            if (card) {
              const field = job.valueColumn === "expr_2" ? "NOMINAL_FRAUD_ACTUAL" : "VOLUME_FRAUD_ACTUAL";
              const n = mergeLsbuFraudBank(lsbuRows, map, card, field, job.divideBy);
              if (n)
                results.push({
                  job: `${job.name} [LSBU 0306]`,
                  status: "info",
                  reason: `+${n} ${card}`,
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
            status: source === "none" ? "dry-run-copy-previous" : "dry-run",
            sheet: job.sheetName,
            file: file?.name || null,
            ids: map.size,
            monthLabel,
            source,
            sample: [...map.entries()].slice(0, 3),
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
        // Jangan hentikan seluruh batch — lanjut job berikutnya (CLI-like)
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
      lsbu: lsbuInfo,
      files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
      summary: {
        total: results.length,
        errors,
        ok: results.filter((r) => r.status === "ok" || r.status === "copy-previous").length,
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
