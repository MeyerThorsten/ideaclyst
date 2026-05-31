/**
 * READ-ONLY disk reads of Threlmark projects. Tolerant: a missing/corrupt file is
 * skipped or defaulted, never thrown. Never writes anything (writer.ts does that).
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  boardPath, itemsDir, projectDir, projectJsonPath, projectsRoot, resolveDataRoot,
} from "./paths";
import { buildGapMap } from "./gaps";
import { withPriority } from "./priority";
import { toThrelmarkCategory } from "./categories";
import {
  THRELMARK_LANES,
  type ProjectRead, type ProjectSummary, type ThrelmarkBoard,
  type ThrelmarkItem, type ThrelmarkItemView, type ThrelmarkProject, type ThrelmarkStatus,
} from "./types";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[ideaclyst] failed to read ${path}:`, err);
    }
    return null;
  }
}

function clamp(n: unknown, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(5, Math.max(1, v));
}

function toStatus(v: unknown): ThrelmarkStatus {
  return (THRELMARK_LANES as readonly string[]).includes(v as string) ? (v as ThrelmarkStatus) : "idea";
}

function normalizeItem(raw: Record<string, unknown>, projectId: string, id: string): ThrelmarkItem {
  return {
    schemaVersion: typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1,
    id,
    projectId,
    title: typeof raw.title === "string" ? raw.title : "Untitled",
    category: toThrelmarkCategory(raw.category),
    status: toStatus(raw.status),
    impact: clamp(raw.impact, 4),
    evidence: clamp(raw.evidence, 3),
    fit: clamp(raw.fit, 4),
    effort: clamp(raw.effort, 3),
    description: typeof raw.description === "string" ? raw.description : "",
    files: typeof raw.files === "string" ? raw.files : "",
    acceptance: Array.isArray(raw.acceptance) ? raw.acceptance.filter((x): x is string => typeof x === "string") : [],
    source: typeof raw.source === "string" ? raw.source : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
  };
}

export async function listProjectsFromDisk(settingsDataDir?: string): Promise<ProjectSummary[]> {
  const root = resolveDataRoot(settingsDataDir);
  let names: string[];
  try {
    names = await readdir(projectsRoot(root));
  } catch {
    return [];
  }
  const out: ProjectSummary[] = [];
  for (const id of names) {
    try {
      if (!(await stat(projectDir(root, id))).isDirectory()) continue;
    } catch {
      continue;
    }
    const project = await readJson<ThrelmarkProject>(projectJsonPath(root, id));
    if (!project) continue;
    let itemCount = 0;
    let doneCount = 0;
    try {
      const files = (await readdir(itemsDir(root, id))).filter((f) => f.endsWith(".json"));
      itemCount = files.length;
      for (const f of files) {
        const it = await readJson<Record<string, unknown>>(join(itemsDir(root, id), f));
        if (it && it.status === "done") doneCount++;
      }
    } catch {
      /* no items dir yet */
    }
    out.push({
      id: project.id || id,
      name: project.name || id,
      itemCount,
      doneCount,
      openCount: itemCount - doneCount,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readProjectFromDisk(
  id: string,
  settingsDataDir?: string,
): Promise<ProjectRead | null> {
  const root = resolveDataRoot(settingsDataDir);
  const project = await readJson<ThrelmarkProject>(projectJsonPath(root, id));
  if (!project) return null;

  const items: ThrelmarkItemView[] = [];
  try {
    const files = (await readdir(itemsDir(root, id))).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const raw = await readJson<Record<string, unknown>>(join(itemsDir(root, id), f));
      if (!raw) continue;
      const itemId = typeof raw.id === "string" ? raw.id : f.replace(/\.json$/, "");
      items.push(withPriority(normalizeItem(raw, id, itemId)));
    }
  } catch {
    /* no items dir */
  }
  items.sort((a, b) => b.priority - a.priority);

  const board =
    (await readJson<ThrelmarkBoard>(boardPath(root, id))) ??
    ({ lanes: { idea: [], ranked: [], development: [], done: [] } } as ThrelmarkBoard);

  return { project: { ...project, id: project.id || id }, items, board, gapMap: buildGapMap(items) };
}
