/**
 * On-disk store for roadmap analyses — mirrors discovery/store.ts. Each analysis is
 * a directory under <dataDir>/roadmap/<id>/ with analysis.json (source of truth).
 */

import { mkdir, readFile, writeFile, readdir, stat, rename, access } from "node:fs/promises";
import { join } from "node:path";

import { RoadmapAnalysis, CreateAnalysisInput } from "./types";
import { makeRunId } from "../utils";

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}
async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}
function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}
function rootDir(): string {
  return join(process.cwd(), dataDir(), "roadmap");
}
export function analysisDir(id: string): string {
  return join(rootDir(), id);
}
function jsonPath(id: string): string {
  return join(analysisDir(id), "analysis.json");
}

async function persist(a: RoadmapAnalysis): Promise<void> {
  await mkdir(analysisDir(a.id), { recursive: true });
  await writeFileAtomic(jsonPath(a.id), JSON.stringify(a, null, 2));
}

export async function createAnalysis(
  input: CreateAnalysisInput,
  projectName: string,
): Promise<RoadmapAnalysis> {
  const now = new Date().toISOString();
  let id = makeRunId(input.projectId);
  for (let i = 0; i < 5 && (await pathExists(jsonPath(id))); i++) id = makeRunId(input.projectId);
  const a: RoadmapAnalysis = {
    id,
    projectId: input.projectId,
    projectName,
    perKind: input.perKind,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    gapSummary: "",
    lanes: {
      feature: { notes: "", suggestions: [] },
      spinoff: { notes: "", suggestions: [] },
      service: { notes: "", suggestions: [] },
    },
  };
  await persist(a);
  return a;
}

export async function getAnalysis(id: string): Promise<RoadmapAnalysis | null> {
  let raw: string;
  try {
    raw = await readFile(jsonPath(id), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[ideaclyst] failed to read analysis ${id}:`, err);
    }
    return null;
  }
  try {
    return JSON.parse(raw) as RoadmapAnalysis;
  } catch (err) {
    console.error(`[ideaclyst] corrupted analysis.json for ${id} (treating as missing):`, err);
    return null;
  }
}

export async function updateAnalysis(
  id: string,
  patch: Partial<Omit<RoadmapAnalysis, "id" | "createdAt">>,
): Promise<RoadmapAnalysis> {
  const current = await getAnalysis(id);
  if (!current) throw new Error(`Analysis not found: ${id}`);
  const next: RoadmapAnalysis = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await persist(next);
  return next;
}

export async function listAnalyses(): Promise<RoadmapAnalysis[]> {
  let entries: string[];
  try {
    entries = await readdir(rootDir());
  } catch {
    return [];
  }
  const out: RoadmapAnalysis[] = [];
  for (const name of entries) {
    try {
      if (!(await stat(analysisDir(name))).isDirectory()) continue;
    } catch {
      continue;
    }
    const a = await getAnalysis(name);
    if (a) out.push(a);
  }
  out.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  return out;
}
