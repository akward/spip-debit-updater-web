import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSheetsClient } from "@/lib/sheets";
import { GROUPS } from "@/lib/tasks";

export const runtime = "nodejs";
export const maxDuration = 60;

function spreadsheetIdForGroup(group: string): string | undefined {
  const jobs = GROUPS[group];
  if (!jobs?.length) return undefined;
  return process.env[jobs[0].spreadsheetEnv];
}

/**
 * GET /api/download?group=debit&format=xlsx
 * → satu file Excel berisi SEMUA tab di spreadsheet group tersebut
 *
 * GET /api/download?group=debit  (tanpa format)
 * → metadata (judul + daftar tab)
 */
export async function GET(req: NextRequest) {
  try {
    const group = req.nextUrl.searchParams.get("group") || "debit";
    const format = (req.nextUrl.searchParams.get("format") || "").toLowerCase();
    const sheet = req.nextUrl.searchParams.get("sheet");

    const spreadsheetId = spreadsheetIdForGroup(group);
    if (!spreadsheetId) {
      return NextResponse.json(
        { ok: false, error: `Env spreadsheet untuk group '${group}' belum di-set.` },
        { status: 400 }
      );
    }

    const sheetsApi = await getSheetsClient();

    const meta = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      includeGridData: false,
    });
    const bookTitle = meta.data.properties?.title || group;
    const titles: string[] = [];
    for (const s of meta.data.sheets || []) {
      const t = (s.properties?.title || "").trim();
      if (t) titles.push(t);
    }

    // Metadata only
    if (!format && !sheet) {
      return NextResponse.json({
        ok: true,
        group,
        spreadsheetId,
        title: bookTitle,
        worksheets: titles,
        downloadUrl: `/api/download?group=${encodeURIComponent(group)}&format=xlsx`,
      });
    }

    // Single tab CSV (optional legacy)
    if (sheet && format !== "xlsx") {
      const safeSheet = sheet.replace(/'/g, "''");
      const res = await sheetsApi.spreadsheets.values.get({
        spreadsheetId,
        range: `'${safeSheet}'`,
        majorDimension: "ROWS",
      });
      const rows = res.data.values || [];
      const escape = (c: string) =>
        /[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
      const csv = rows.map((r) => r.map((c) => escape(String(c ?? ""))).join(",")).join("\n");
      const safeName = sheet.replace(/[^\w\-]+/g, "_") || "sheet";
      return new NextResponse("\uFEFF" + csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${group}_${safeName}.csv"`,
        },
      });
    }

    // Whole spreadsheet → one XLSX file
    const wb = XLSX.utils.book_new();
    const tabs = titles.length
      ? titles
      : [...new Set((GROUPS[group] || []).map((j) => j.sheetName))];

    for (const title of tabs) {
      const safe = title.replace(/'/g, "''");
      try {
        const res = await sheetsApi.spreadsheets.values.get({
          spreadsheetId,
          range: `'${safe}'`,
          majorDimension: "ROWS",
        });
        const rows = (res.data.values || []) as string[][];
        const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [["(kosong)"]]);
        // sheet name max 31 chars
        const short = title.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, short);
      } catch {
        const ws = XLSX.utils.aoa_to_sheet([["(gagal baca tab)", title]]);
        XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
      }
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const filename = `${group}_${bookTitle.replace(/[^\w\-]+/g, "_").slice(0, 40)}.xlsx`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
