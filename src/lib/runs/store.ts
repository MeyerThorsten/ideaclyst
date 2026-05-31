/**
 * On-disk store for runs. IdeaClyst is local-first: each run is a directory under
 * the data dir (default `.ideaclyst/runs/<runId>/`) containing `run.json` plus the
 * Markdown artifacts. `run.json` is the single source of truth — the orchestrator
 * rewrites it after each step, and the polling API just reads it back. No DB, no
 * in-memory state, so progress survives a server restart.
 */

import { mkdir, readFile, writeFile, readdir, stat, rename, access } from "node:fs/promises";
import { join } from "node:path";

import { Run, RunOutputs, CreateRunInput, emptyOutputs } from "./types";
import { makeRunId } from "../utils";

/** Write atomically: write to a temp file in the same dir, then rename over the
 * target. A crash mid-write leaves the previous file intact (rename is atomic on
 * the same filesystem), so the source-of-truth JSON can never be truncated. */
async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function runsDir(): string {
  return join(process.cwd(), dataDir(), "runs");
}

export function runDir(runId: string): string {
  return join(runsDir(), runId);
}

function runJsonPath(runId: string): string {
  return join(runDir(runId), "run.json");
}

/** Write an arbitrary Markdown artifact into a run's directory. */
export async function writeRunFile(
  runId: string,
  filename: string,
  contents: string,
): Promise<void> {
  await mkdir(runDir(runId), { recursive: true });
  await writeFileAtomic(join(runDir(runId), filename), contents);
}

async function persist(run: Run): Promise<void> {
  await mkdir(runDir(run.id), { recursive: true });
  await writeFileAtomic(runJsonPath(run.id), JSON.stringify(run, null, 2));
}

export async function createRun(input: CreateRunInput): Promise<Run> {
  const now = new Date().toISOString();
  // Collision-resistant id; never reuse an existing run directory.
  let id = makeRunId(input.title);
  for (let i = 0; i < 5 && (await pathExists(runJsonPath(id))); i++) {
    id = makeRunId(input.title);
  }
  const run: Run = {
    id,
    title: input.title.trim(),
    idea: input.idea.trim(),
    targetCustomer: input.targetCustomer?.trim() || undefined,
    constraints: input.constraints?.trim() || undefined,
    preferredStack: input.preferredStack?.trim() || undefined,
    competitorUrls: input.competitorUrls?.trim() || undefined,
    includeResearch: input.includeResearch !== false,
    goal: input.goal,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    metrics: {
      agentCalls: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
    },
    outputs: emptyOutputs(),
  };

  await persist(run);

  // Human-readable snapshot of the brief alongside the JSON.
  const ideaMd = [
    `# ${run.title}`,
    "",
    `**Goal:** ${run.goal}`,
    run.targetCustomer ? `**Target customer:** ${run.targetCustomer}` : "",
    run.constraints ? `**Constraints:** ${run.constraints}` : "",
    run.preferredStack ? `**Preferred stack:** ${run.preferredStack}` : "",
    "",
    "## Idea",
    "",
    run.idea,
    "",
  ]
    .filter((l) => l !== "")
    .join("\n");
  await writeRunFile(id, "IDEA.md", ideaMd + "\n");

  return run;
}

export async function getRun(runId: string): Promise<Run | null> {
  let raw: string;
  try {
    raw = await readFile(runJsonPath(runId), "utf8");
  } catch (err) {
    // Distinguish a genuinely missing run from a read error (logged, not silent).
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[ideaclyst] failed to read run ${runId}:`, err);
    }
    return null;
  }
  try {
    return JSON.parse(raw) as Run;
  } catch (err) {
    console.error(`[ideaclyst] corrupted run.json for ${runId} (treating as missing):`, err);
    return null;
  }
}

/**
 * Read-merge-write a run. Always bumps `updatedAt`. Throws if the run is missing
 * so callers don't silently lose updates.
 */
export async function updateRun(
  runId: string,
  patch: Partial<Omit<Run, "id" | "createdAt" | "outputs">> & {
    outputs?: Partial<RunOutputs>;
  },
): Promise<Run> {
  const current = await getRun(runId);
  if (!current) throw new Error(`Run not found: ${runId}`);
  const next: Run = {
    ...current,
    ...patch,
    outputs: { ...current.outputs, ...(patch.outputs ?? {}) },
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await persist(next);
  return next;
}

/** All runs, newest first (ids are timestamp-prefixed, so reverse-sort works). */
export async function listRuns(): Promise<Run[]> {
  let entries: string[];
  try {
    entries = await readdir(runsDir());
  } catch {
    return [];
  }

  const runs: Run[] = [];
  for (const name of entries) {
    try {
      const s = await stat(runDir(name));
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    const run = await getRun(name);
    if (run) runs.push(run);
  }

  runs.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  return runs;
}
