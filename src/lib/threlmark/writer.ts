/**
 * Writes ONLY into projects/<id>/suggestions/. The single place IdeaClyst mutates
 * Threlmark data. Atomic (temp + rename); collision-free id; never overwrites.
 */

import { mkdir, writeFile, rename } from "node:fs/promises";

import { resolveDataRoot, suggestionsDir, suggestionPath } from "./paths";
import { makeRunId } from "../utils";
import type { ThrelmarkSuggestionFile } from "./types";

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

/**
 * A project id must be a single safe path segment — never empty, never a path
 * traversal — so a writer can never escape the Threlmark projects/ tree.
 */
function assertSafeProjectId(projectId: string): void {
  if (!projectId || projectId === "." || projectId === ".." || /[\\/]/.test(projectId) || projectId.includes("..")) {
    throw new Error(`Unsafe project id: ${JSON.stringify(projectId)}`);
  }
}

/** Returns the suggestion id (filename without .json). */
export async function writeSuggestionToDisk(
  projectId: string,
  suggestion: ThrelmarkSuggestionFile,
  settingsDataDir?: string,
): Promise<string> {
  assertSafeProjectId(projectId);
  const root = resolveDataRoot(settingsDataDir);
  const dir = suggestionsDir(root, projectId);
  await mkdir(dir, { recursive: true });
  const sugId = makeRunId(suggestion.title);
  // makeRunId already carries a ms timestamp + random suffix → effectively unique.
  await writeFileAtomic(suggestionPath(root, projectId, sugId), JSON.stringify(suggestion, null, 2));
  return sugId;
}
