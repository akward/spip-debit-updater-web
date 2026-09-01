import { NextRequest, NextResponse } from "next/server";
import { previousMonthLabel } from "@/lib/months";
import { parseCsvText, buildValueMap, matchFile } from "@/lib/parse";
import { updateMonthColumn } from "@/lib/sheets";
import { GROUPS } from "@/lib/tasks";

export const runtime = "nodejs";
export const maxDuration = 60;

/** CSV hanya di memori selama request — tidak ke disk/Blob/DB. */
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
      storage: "none — CSV hanya di memori selama request",
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
