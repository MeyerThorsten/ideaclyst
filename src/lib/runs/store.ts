/**
 * On-disk store for runs. IdeaClyst is local-first: each run is a directory under
 * the data dir (default `.ideaclyst/runs/<runId>/`) containing `run.json` plus the
 * Markdown artifacts. `run.json` is the single source of truth — the orchestrator
 * rewrites it after each step, and the polling API just reads it back. No DB, no
 * in-memory state, so progress survives a server restart.
 */

import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { Run, RunOutputs, CreateRunInput, emptyOutputs } from "./types";
import { makeRunId } from "../utils";

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
  await writeFile(join(runDir(runId), filename), contents, "utf8");
}

async function persist(run: Run): Promise<void> {
  await mkdir(runDir(run.id), { recursive: true });
  await writeFile(runJsonPath(run.id), JSON.stringify(run, null, 2), "utf8");
}

export async function createRun(input: CreateRunInput): Promise<Run> {
  const now = new Date().toISOString();
  const id = makeRunId(input.title);
  const run: Run = {
    id,
    title: input.title.trim(),
    idea: input.idea.trim(),
    targetCustomer: input.targetCustomer?.trim() || undefined,
    constraints: input.constraints?.trim() || undefined,
    preferredStack: input.preferredStack?.trim() || undefined,
    competitorUrls: input.competitorUrls?.trim() || undefined,
    goal: input.goal,
    status: "queued",
    createdAt: now,
    updatedAt: now,
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
  try {
    const raw = await readFile(runJsonPath(runId), "utf8");
    return JSON.parse(raw) as Run;
  } catch {
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
