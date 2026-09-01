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
        {
          ok: false,
          error: `Spreadsheet ID tidak ditemukan untuk group '${group}'. Set env sesuai group.`,
        },
        { status: 400 }
      );
    }

    const sheets = await getSheetsClient();

    if (!sheet) {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title,sheets.properties.title",
      });
      const titles =
        meta.data.sheets?.map((s) => s.properties?.title || "").filter(Boolean) ||
        [];
      const jobs = GROUPS[group] || [];
      const jobSheets = [...new Set(jobs.map((j) => j.sheetName))];
      return NextResponse.json({
        ok: true,
        group,
        spreadsheetId,
        title: meta.data.properties?.title,
        worksheets: titles,
        knownJobs: jobSheets,
        downloadHint:
          "Gunakan ?group=debit&sheet=Jumlah%20Kartu%20ATM&format=csv",
      });
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheet}'`,
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
    const safeName = sheet.replace(/[^\w\-]+/g, "_");
    return new NextResponse(csv, {
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
