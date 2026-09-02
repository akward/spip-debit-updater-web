import { NextRequest } from "next/server";
import { runProcess } from "@/lib/runProcess";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  return runProcess(req);
}
