import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/sheets";
import { GROUPS } from "@/lib/tasks";

export const runtime = "nodejs";
export const maxDuration = 60;

function spreadsheetIdForGroup(group: string): string | undefined {
  const jobs = GROUPS[group];
  if (!jobs?.length) return undefined;
  return process.env[jobs[0].spreadsheetEnv];
}

export async function GET(req: NextRequest) {
  try {
    const group = req.nextUrl.searchParams.get("group") || "debit";
    const sheet = req.nextUrl.searchParams.get("sheet");
    const format = (req.nextUrl.searchParams.get("format") || "csv").toLowerCase();

    const spreadsheetId = spreadsheetIdForGroup(group);
    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: `Env spreadsheet untuk group '${group}' belum di-set.` },
        { status: 400 }
      );
    }

    const sheetsApi = await getSheetsClient();

    if (!sheet) {
      const meta = await sheetsApi.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
      });

      const titles: string[] = [];
      for (const s of meta.data.sheets || []) {
        const t = (s.properties?.title || "").trim();
        if (t) titles.push(t);
      }

      const knownJobs = [...new Set((GROUPS[group] || []).map((j) => j.sheetName))];

      // Prefer real tabs from Google; if empty, fall back to known job names
      const worksheets = titles.length > 0 ? titles : knownJobs;

      return NextResponse.json({
        ok: true,
        group,
        spreadsheetId,
        title: meta.data.properties?.title || group,
        worksheets,
        knownJobs,
        source: titles.length > 0 ? "google" : "fallback-jobs",
      });
    }

    const safeSheet = sheet.replace(/'/g, "''");
    const res = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: `'${safeSheet}'`,
      majorDimension: "ROWS",
    });
    const rows = res.data.values || [];

    if (format === "json") {
      return NextResponse.json({ ok: true, group, sheet, rows });
    }

    const escape = (c: string) => {
      if (/[",\n\r]/.test(c)) return `"${c.replace(/"/g, '""')}"`;
      return c;
    };
    const csv = rows
      .map((r) => r.map((c) => escape(String(c ?? ""))).join(","))
      .join("\n");
    const safeName = sheet.replace(/[^\w\-]+/g, "_") || "sheet";
    return new NextResponse("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${group}_${safeName}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
