import { NextRequest, NextResponse } from "next/server";
import { previousMonthLabel } from "@/lib/months";
import { parseCsvText, buildValueMap, matchFile } from "@/lib/parse";
import { updateMonthColumn } from "@/lib/sheets";
import { GROUPS } from "@/lib/tasks";
import { parseLsbuXlsx, mergeLsbuDebit } from "@/lib/lsbu";

export const runtime = "nodejs";
export const maxDuration = 60;

/** CSV + LSBU hanya di memori — tidak ke disk/Blob/DB. */
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
        {
          ok: false,
          error: `Group tidak didukung: ${group}. Tersedia: ${Object.keys(GROUPS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    if (!files.length) {
      return NextResponse.json(
        { ok: false, error: "Upload minimal 1 file CSV." },
        { status: 400 }
      );
    }

    const lsbuFile = form.get("lsbu");
    let lsbuInfo: Record<string, unknown> | null = null;
    let lsbuRows: ReturnType<typeof parseLsbuXlsx> | null = null;
    if (lsbuFile instanceof File && lsbuFile.size > 0) {
      const buf = await lsbuFile.arrayBuffer();
      lsbuRows = parseLsbuXlsx(buf);
      lsbuInfo = {
        name: lsbuFile.name,
        rows: lsbuRows.length,
        note: "diproses di memori, tidak disimpan",
      };
    }

    const parsed: { name: string; rows: ReturnType<typeof parseCsvText> }[] = [];
    for (const f of files) {
      const text = await f.text();
      parsed.push({ name: f.name, rows: parseCsvText(text) });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const job of jobs) {
      const file = parsed.find((p) => matchFile(p.name, job.fileHints));
      if (!file) {
        results.push({
          job: job.name,
          status: "skip",
          reason: `Tidak ada CSV yang cocok: ${job.fileHints.join(", ")}`,
        });
        continue;
      }

      const map = buildValueMap(file.rows, job.valueColumn, job.divideBy);

      // Merge LSBU into jumlah kartu jobs (debit)
      if (group === "debit" && lsbuRows && job.valueColumn === "jumlah") {
        if (matchFile(file.name, ["kartu_atm", "jumlah_kartu_atm"])) {
          const m = mergeLsbuDebit(lsbuRows, { kartuAtm: map });
          results.push({
            job: job.name + " [LSBU]",
            status: "info",
            reason: `LSBU merge kartu ATM: +${m.addedAtm} baris`,
          });
        }
        if (
          matchFile(file.name, ["kartu_debit", "jumlah_kartu_debet", "kartu_debet"])
        ) {
          const m = mergeLsbuDebit(lsbuRows, { kartuDebit: map });
          results.push({
            job: job.name + " [LSBU]",
            status: "info",
            reason: `LSBU merge kartu Debit: +${m.addedDebit} baris`,
          });
        }
      }

      const spreadsheetId = process.env[job.spreadsheetEnv];
      if (!spreadsheetId) {
        results.push({
          job: job.name,
          status: "error",
          reason: `Env ${job.spreadsheetEnv} belum di-set`,
          file: file.name,
          ids: map.size,
        });
        continue;
      }

      if (dryRun) {
        results.push({
          job: job.name,
          status: "dry-run",
          sheet: job.sheetName,
          file: file.name,
          ids: map.size,
          monthLabel,
          sample: [...map.entries()].slice(0, 5),
        });
        continue;
      }

      try {
        const out = await updateMonthColumn({
          spreadsheetId,
          sheetName: job.sheetName,
          monthLabel,
          valuesById: map,
        });
        results.push({
          job: job.name,
          status: "ok",
          sheet: job.sheetName,
          file: file.name,
          ids: map.size,
          monthLabel,
          ...out,
        });
      } catch (e) {
        results.push({
          job: job.name,
          status: "error",
          sheet: job.sheetName,
          file: file.name,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      group,
      monthLabel,
      dryRun,
      storage: "none — CSV/LSBU hanya di memori selama request",
      lsbu: lsbuInfo,
      files: parsed.map((p) => ({ name: p.name, rows: p.rows.length })),
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
