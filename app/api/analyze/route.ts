import { NextRequest, NextResponse } from "next/server";
import { analyzeGroupSpreadsheet, isAnalyzeGroup } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const group = String(body.group || "debit").toLowerCase();
    const dryRun = body.dryRun === true || body.dryRun === "1";

    if (group.startsWith("spasial_")) {
      return NextResponse.json(
        { ok: false, error: "Analisa anomali tidak diterapkan untuk Spasial" },
        { status: 400 }
      );
    }
    if (!isAnalyzeGroup(group)) {
      return NextResponse.json(
        { ok: false, error: `Group tidak didukung untuk analisa: ${group}` },
        { status: 400 }
      );
    }

    const result = await analyzeGroupSpreadsheet({ group, dryRun });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
