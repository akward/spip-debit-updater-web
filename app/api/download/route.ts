import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSheetsClient, exportSpreadsheetXlsx } from "@/lib/sheets";
import { GROUPS } from "@/lib/tasks";

export const runtime = "nodejs";
export const maxDuration = 60;

function spreadsheetIdForGroup(
  group: string,
  book?: string | null
): string | undefined {
  if (group === "spasial_atm") return process.env.SHEET_SPASIAL_ATM || undefined;
  if (group === "spasial_ue") return process.env.SHEET_SPASIAL_UE || undefined;
  if (group === "spasial_kk") return process.env.SHEET_SPASIAL_KK || undefined;

  if (group === "acquirer") {
    const b = (book || "").toLowerCase().trim();
    if (b === "tahun" || b === "edc" || b === "matrix") {
      return (
        process.env.SHEET_ACQUIRER_EDC ||
        process.env.SHEET_ACQUIRER_TAHUN ||
        undefined
      );
    }
    if (b === "transaksi" || b === "trx" || b === "transaction") {
      return process.env.SHEET_ACQUIRER_TRX || undefined;
    }
    return (
      process.env.SHEET_ACQUIRER_TRX ||
      process.env.SHEET_ACQUIRER_EDC ||
      process.env.SHEET_ACQUIRER_TAHUN ||
      undefined
    );
  }

  const jobs = GROUPS[group];
  if (!jobs?.length) return undefined;
  return process.env[jobs[0].spreadsheetEnv];
}

export async function GET(req: NextRequest) {
  try {
    const group = req.nextUrl.searchParams.get("group") || "debit";
    const format = (req.nextUrl.searchParams.get("format") || "").toLowerCase();
    const sheet = req.nextUrl.searchParams.get("sheet");
    const book = req.nextUrl.searchParams.get("book");

    const spreadsheetId = spreadsheetIdForGroup(group, book);
    if (!spreadsheetId) {
      const hint =
        group === "acquirer"
          ? " Set SHEET_ACQUIRER_EDC (atau SHEET_ACQUIRER_TAHUN) dan SHEET_ACQUIRER_TRX."
          : group.startsWith("spasial_")
            ? " Set SHEET_SPASIAL_ATM / SHEET_SPASIAL_UE / SHEET_SPASIAL_KK."
            : "";
      return NextResponse.json(
        {
          ok: false,
          error: `Env spreadsheet untuk group '${group}'${book ? ` book=${book}` : ""} belum di-set.${hint}`,
        },
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

    const bookSuffix = book ? `_${book}` : "";

    if (!format && !sheet) {
      return NextResponse.json({
        ok: true,
        group,
        book: book || null,
        spreadsheetId,
        title: bookTitle,
        worksheets: titles,
        downloadUrl: `/api/download?group=${encodeURIComponent(group)}${
          book ? `&book=${encodeURIComponent(book)}` : ""
        }&format=xlsx`,
      });
    }

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
      const csv = rows
        .map((r) => r.map((c) => escape(String(c ?? ""))).join(","))
        .join("\n");
      const safeName = sheet.replace(/[^\w\-]+/g, "_") || "sheet";
      return new NextResponse("\uFEFF" + csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${group}${bookSuffix}_${safeName}.csv"`,
        },
      });
    }

    // Debit (pilot): full-fidelity export via Drive (borders, colors, merges)
    if (group === "debit" && (format === "xlsx" || format === "" || format === "full")) {
      const { buffer, title } = await exportSpreadsheetXlsx(spreadsheetId);
      const filename = `${group}${bookSuffix}_${title
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 40)}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Export-Mode": "drive-full",
        },
      });
    }

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
        XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
      } catch {
        const ws = XLSX.utils.aoa_to_sheet([["(gagal baca tab)", title]]);
        XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
      }
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const filename = `${group}${bookSuffix}_${bookTitle
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 40)}.xlsx`;

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
