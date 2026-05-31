/**
 * Roadmap intelligence collection endpoint.
 *   GET  → { projects } from the configured source (for the picker)
 *   POST → { projectId, perKind } → create a queued analysis, fire startAnalysis (not awaited), return { id }
 */

import { NextResponse } from "next/server";

import { getSource } from "@/lib/threlmark/source";
import { createAnalysis } from "@/lib/roadmap/store";
import { startAnalysis } from "@/lib/roadmap/orchestrator";

export async function GET() {
  const source = await getSource();
  const projects = await source.listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const projectId = typeof b.projectId === "string" ? b.projectId.trim() : "";
  const perKindRaw = typeof b.perKind === "number" ? b.perKind : Number(b.perKind);
  const perKind = Number.isFinite(perKindRaw) ? Math.min(6, Math.max(1, Math.round(perKindRaw))) : 3;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const source = await getSource();
  const read = await source.readProject(projectId);
  if (!read) {
    return NextResponse.json({ error: `Project "${projectId}" not found at the configured source.` }, { status: 404 });
  }

  const analysis = await createAnalysis({ projectId, perKind }, read.project.name);
  void startAnalysis(analysis.id);
  return NextResponse.json({ id: analysis.id }, { status: 201 });
}
