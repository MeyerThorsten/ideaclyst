/**
 * Settings endpoint.
 *   GET  → effective settings + stored settings (so the form shows what's saved vs env-forced)
 *   PUT  → persist { roadmapSource, dataDir?, baseUrl? }
 *   POST → { action: "test" } → resolve the source and try listProjects(); returns count + names
 */

import { NextResponse } from "next/server";

import { readStoredSettings, writeStoredSettings, resolveSettings, type RoadmapSource } from "@/lib/settings/store";
import { getSource } from "@/lib/threlmark/source";

export async function GET() {
  const [stored, effective] = await Promise.all([readStoredSettings(), resolveSettings()]);
  return NextResponse.json({ stored, effective });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const roadmapSource: RoadmapSource = b.roadmapSource === "rest" ? "rest" : "disk";
  const saved = await writeStoredSettings({
    roadmapSource,
    dataDir: typeof b.dataDir === "string" ? b.dataDir : undefined,
    baseUrl: typeof b.baseUrl === "string" ? b.baseUrl : undefined,
  });
  return NextResponse.json({ stored: saved });
}

export async function POST() {
  const source = await getSource();
  const projects = await source.listProjects();
  return NextResponse.json({
    ok: projects.length > 0,
    count: projects.length,
    names: projects.map((p) => p.name).slice(0, 20),
  });
}
