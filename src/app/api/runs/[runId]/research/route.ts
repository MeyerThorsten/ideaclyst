/**
 * Refresh only the surfagent-backed research artifacts for an existing run.
 * This intentionally does not rerun the full Claude+Codex council.
 */

import { NextResponse } from "next/server";

import { queueRunResearchRefresh } from "@/lib/orchestrator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const run = await queueRunResearchRefresh(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run }, { status: 202 });
}
