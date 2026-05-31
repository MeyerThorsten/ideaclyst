/**
 * Send selected suggestions to Threlmark's Inbox.
 *   POST { suggestionIds: string[], targetProjectId?: string }
 * Writes one flat suggestion file per id into the (target or analyzed) project's
 * suggestions/ folder, marks each as sent in the analysis, returns { sent: [...] }.
 */

import { NextResponse } from "next/server";

import { getAnalysis, updateAnalysis } from "@/lib/roadmap/store";
import { getSource } from "@/lib/threlmark/source";
import { toSuggestionFile } from "@/lib/roadmap/orchestrator";
import type { RoadmapAnalysis, RoadmapSuggestion } from "@/lib/roadmap/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const ids = Array.isArray(b.suggestionIds) ? b.suggestionIds.filter((x): x is string => typeof x === "string") : [];
  const targetProjectId = typeof b.targetProjectId === "string" && b.targetProjectId.trim() ? b.targetProjectId.trim() : "";

  const analysis = await getAnalysis(id);
  if (!analysis) return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  if (ids.length === 0) return NextResponse.json({ error: "No suggestions selected" }, { status: 400 });

  const allLaneKeys: (keyof RoadmapAnalysis["lanes"])[] = ["feature", "spinoff", "service"];
  const findById = (sid: string): { laneKey: keyof RoadmapAnalysis["lanes"]; s: RoadmapSuggestion } | null => {
    for (const k of allLaneKeys) {
      const s = analysis.lanes[k].suggestions.find((x) => x.id === sid);
      if (s) return { laneKey: k, s };
    }
    return null;
  };

  const source = await getSource();
  const generatedAt = new Date().toISOString();
  // Write to the analyzed project unless a target is chosen; targetProjectId stays
  // inside the file so Threlmark can cross-promote on accept.
  const destProjectId = targetProjectId || analysis.projectId;

  const sent: { id: string; sentSuggestionId: string }[] = [];
  const failed: { id: string; error: string }[] = [];
  const lanes = structuredClone(analysis.lanes) as RoadmapAnalysis["lanes"];

  for (const sid of ids) {
    const hit = findById(sid);
    if (!hit) {
      failed.push({ id: sid, error: "Suggestion not found in this analysis" });
      continue;
    }
    try {
      const file = toSuggestionFile(hit.s, targetProjectId || undefined, generatedAt);
      const sentSuggestionId = await source.writeSuggestion(destProjectId, file);
      const laneArr = lanes[hit.laneKey].suggestions;
      const idx = laneArr.findIndex((x) => x.id === sid);
      if (idx >= 0) {
        laneArr[idx] = { ...laneArr[idx], sentSuggestionId, sentTargetProjectId: destProjectId };
      }
      sent.push({ id: sid, sentSuggestionId });
    } catch (err) {
      failed.push({ id: sid, error: err instanceof Error ? err.message : "Failed to write suggestion" });
    }
  }

  // Always persist whatever did succeed so written files are never orphaned.
  await updateAnalysis(id, { lanes });

  const status = failed.length === 0 ? 200 : sent.length === 0 ? 500 : 207;
  return NextResponse.json({ sent, failed, destProjectId }, { status });
}
