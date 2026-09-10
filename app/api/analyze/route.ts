import { NextRequest, NextResponse } from "next/server";
import { analyzeDebitSpreadsheet } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const group = String(body.group || "debit").toLowerCase();
    const dryRun = body.dryRun === true || body.dryRun === "1";

    if (group !== "debit") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Analisa anomali sementara hanya untuk group debit. Group lain menyusul.",
        },
        { status: 400 }
      );
    }

    const result = await analyzeDebitSpreadsheet({ dryRun });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
