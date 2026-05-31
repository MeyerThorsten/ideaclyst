/**
 * IdeaClyst app settings, persisted to .ideaclyst/settings.json. Currently only the
 * Threlmark roadmap source. Resolution precedence so env always wins:
 *   source:  IDEACLYST_ROADMAP_SOURCE > settings.roadmapSource > "disk"
 *   dataDir: IDEACLYST_ROADMAP_DIR | THRELMARK_DATA_DIR > settings.dataDir > ~/.threlmark (in paths)
 *   baseUrl: IDEACLYST_THRELMARK_API > settings.baseUrl > undefined (no code default; UI placeholder only)
 */

import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";

export type RoadmapSource = "disk" | "rest";

export interface Settings {
  roadmapSource: RoadmapSource;
  dataDir?: string; // disk root override
  baseUrl?: string; // REST base URL
}

const DEFAULTS: Settings = { roadmapSource: "disk" };

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}
function settingsPath(): string {
  return join(process.cwd(), dataDir(), "settings.json");
}

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

/** Raw stored settings (no env overlay) — used by the Settings page editor. */
export async function readStoredSettings(): Promise<Settings> {
  try {
    const raw = JSON.parse(await readFile(settingsPath(), "utf8")) as Partial<Settings>;
    return {
      roadmapSource: raw.roadmapSource === "rest" ? "rest" : "disk",
      dataDir: typeof raw.dataDir === "string" ? raw.dataDir : undefined,
      baseUrl: typeof raw.baseUrl === "string" ? raw.baseUrl : undefined,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function writeStoredSettings(next: Settings): Promise<Settings> {
  await mkdir(join(process.cwd(), dataDir()), { recursive: true });
  const clean: Settings = {
    roadmapSource: next.roadmapSource === "rest" ? "rest" : "disk",
    dataDir: next.dataDir?.trim() || undefined,
    baseUrl: next.baseUrl?.trim() || undefined,
  };
  await writeFileAtomic(settingsPath(), JSON.stringify(clean, null, 2));
  return clean;
}

/** Effective settings = stored overlaid with env overrides. */
export async function resolveSettings(): Promise<Settings> {
  const stored = await readStoredSettings();
  const envSource = (process.env.IDEACLYST_ROADMAP_SOURCE || "").toLowerCase();
  const roadmapSource: RoadmapSource =
    envSource === "rest" ? "rest" : envSource === "disk" ? "disk" : stored.roadmapSource;
  return {
    roadmapSource,
    dataDir: stored.dataDir,
    baseUrl: process.env.IDEACLYST_THRELMARK_API || stored.baseUrl,
  };
}
