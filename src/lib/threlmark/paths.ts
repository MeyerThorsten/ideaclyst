/**
 * On-disk layout for the Threlmark hub IdeaClyst reads. Precedence for the data
 * root: IDEACLYST_ROADMAP_DIR > THRELMARK_DATA_DIR > settings.dataDir > ~/.threlmark.
 * Settings are passed in (not read here) to keep this module pure/sync.
 */

import { homedir } from "node:os";
import { join } from "node:path";

export function resolveDataRoot(settingsDataDir?: string): string {
  const env = process.env.IDEACLYST_ROADMAP_DIR || process.env.THRELMARK_DATA_DIR;
  if (env && env.trim()) return env.trim();
  if (settingsDataDir && settingsDataDir.trim()) return settingsDataDir.trim();
  return join(homedir(), ".threlmark");
}

export const projectsRoot = (root: string) => join(root, "projects");
export const projectDir = (root: string, id: string) => join(projectsRoot(root), id);
export const projectJsonPath = (root: string, id: string) =>
  join(projectDir(root, id), "project.json");
export const boardPath = (root: string, id: string) => join(projectDir(root, id), "board.json");
export const itemsDir = (root: string, id: string) => join(projectDir(root, id), "items");
export const suggestionsDir = (root: string, id: string) =>
  join(projectDir(root, id), "suggestions");
export const suggestionPath = (root: string, id: string, sugId: string) =>
  join(suggestionsDir(root, id), `${sugId}.json`);
