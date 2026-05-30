/**
 * Promote a discovered candidate into a full council run.
 *   POST { candidateId } → maps the candidate to a run brief, creates + fires a
 *   council run, returns { runId }.
 */

import { NextResponse } from "next/server";

import { getDiscovery } from "@/lib/discovery/store";
import { createRun } from "@/lib/runs/store";
import { startRun } from "@/lib/orchestrator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const candidateId = typeof (body as Record<string, unknown>).candidateId === "string"
    ? (body as Record<string, unknown>).candidateId as string
    : "";

  const discovery = await getDiscovery(id);
  if (!discovery) {
    return NextResponse.json({ error: "Discovery not found" }, { status: 404 });
  }
  const candidate = discovery.candidates.find((c) => c.id === candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  const reportContext = candidate.report
    ? [
        `Idea report thesis: ${candidate.report.oneLine}`,
        `Founder fit: ${candidate.report.founderFit.score}/10 - ${candidate.report.founderFit.nextMove}`,
        `Core offer: ${candidate.report.valueLadder.find((stage) => stage.stage === "core")?.offer}`,
        `Roast verdict: ${candidate.report.roast.verdict}`,
      ]
    : [];

  const run = await createRun({
    title: candidate.title,
    idea: candidate.idea,
    targetCustomer: candidate.targetCustomer,
    constraints: [
      discovery.constraints,
      candidate.fit ? `Fit: ${candidate.fit}` : "",
      candidate.risk ? `Risk: ${candidate.risk}` : "",
      ...reportContext,
    ].filter(Boolean).join("\n"),
    goal: "validate",
  });
  void startRun(run.id);

  return NextResponse.json({ runId: run.id }, { status: 201 });
}
