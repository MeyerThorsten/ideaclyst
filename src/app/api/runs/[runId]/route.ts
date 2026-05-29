/**
 * Single-run endpoint. The run page polls this while status is queued/running.
 */

import { NextResponse } from "next/server";

import { getRun } from "@/lib/runs/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
