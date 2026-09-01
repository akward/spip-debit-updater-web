import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "spip-debit-updater-web",
    note: "Dashboard only. Full prepare/update runs on local Windows with local paths.",
    time: new Date().toISOString(),
  });
}
