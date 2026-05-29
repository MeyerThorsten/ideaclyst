/**
 * Runs collection endpoint.
 *   GET  → list all runs (newest first)
 *   POST → validate the idea brief, create a queued run, then fire the council in
 *          the background (NOT awaited) and return { runId } immediately. The
 *          client redirects to the run page and polls for progress.
 */

import { NextResponse } from "next/server";

import { createRun, listRuns } from "@/lib/runs/store";
import { startRun } from "@/lib/orchestrator";
import { CreateRunInput, RUN_GOALS, RunGoal } from "@/lib/runs/types";

export async function GET() {
  const runs = await listRuns();
  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const idea = typeof b.idea === "string" ? b.idea.trim() : "";
  const goal = (typeof b.goal === "string" ? b.goal : "") as RunGoal;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!idea || idea.length < 10) {
    return NextResponse.json(
      { error: "Describe the idea in at least a sentence (10+ characters)" },
      { status: 400 },
    );
  }
  if (!RUN_GOALS.includes(goal)) {
    return NextResponse.json(
      { error: `Goal must be one of: ${RUN_GOALS.join(", ")}` },
      { status: 400 },
    );
  }

  const input: CreateRunInput = {
    title,
    idea,
    goal,
    targetCustomer: typeof b.targetCustomer === "string" ? b.targetCustomer : undefined,
    constraints: typeof b.constraints === "string" ? b.constraints : undefined,
    preferredStack: typeof b.preferredStack === "string" ? b.preferredStack : undefined,
  };

  const run = await createRun(input);

  // Fire-and-forget: kick off the council without blocking the response.
  void startRun(run.id);

  return NextResponse.json({ runId: run.id }, { status: 201 });
}
