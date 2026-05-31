import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { LibraryItem, LibraryItemInput, LibraryState, LibraryItemType } from "./types";

const ITEM_TYPES: LibraryItemType[] = ["candidate", "report", "run"];

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function libraryDir(): string {
  return join(process.cwd(), dataDir(), "library");
}

function libraryJsonPath(): string {
  return join(libraryDir(), "library.json");
}

function libraryMarkdownPath(): string {
  return join(libraryDir(), "LIBRARY.md");
}

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function cleanString(value: unknown, fallback = "", max = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanString(item, "", 48)).filter(Boolean))).slice(0, 12);
}

function isSafeHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("..");
}

function cleanMetadata(value: unknown): Record<string, string | number | boolean | null> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value).slice(0, 24)) {
    if (typeof entry === "string") out[key] = entry.slice(0, 500);
    else if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
    else if (typeof entry === "boolean" || entry === null) out[key] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeItem(input: LibraryItemInput, previous?: LibraryItem): LibraryItem {
  const now = new Date().toISOString();
  const type = ITEM_TYPES.includes(input.type) ? input.type : "candidate";
  const href = cleanString(input.href, previous?.href || "/", 500);
  return {
    id: cleanString(input.id, previous?.id || "", 600),
    type,
    title: cleanString(input.title, previous?.title || "Untitled", 180) || "Untitled",
    description: cleanString(input.description, previous?.description || "", 1200),
    href: isSafeHref(href) ? href : previous?.href || "/",
    savedAt: previous?.savedAt || now,
    updatedAt: now,
    sourceId: cleanString(input.sourceId, previous?.sourceId || "", 180) || undefined,
    parentId: cleanString(input.parentId, previous?.parentId || "", 180) || undefined,
    score: typeof input.score === "number" && Number.isFinite(input.score) ? Math.max(0, Math.min(100, Math.round(input.score))) : previous?.score,
    tags: cleanTags(input.tags ?? previous?.tags),
    metadata: cleanMetadata(input.metadata ?? previous?.metadata),
  };
}

function emptyLibrary(): LibraryState {
  return { updatedAt: new Date().toISOString(), items: [] };
}

function libraryMarkdown(state: LibraryState): string {
  const lines = [
    "# IdeaClyst Library",
    "",
    `Updated: ${state.updatedAt}`,
    "",
    ...state.items.map((item) => [
      `## ${item.title}`,
      "",
      `- Type: ${item.type}`,
      `- Link: ${item.href}`,
      item.score !== undefined ? `- Score: ${item.score}` : "",
      item.tags.length ? `- Tags: ${item.tags.join(", ")}` : "",
      item.description ? `- Notes: ${item.description}` : "",
      "",
    ].filter(Boolean).join("\n")),
  ];
  return lines.join("\n");
}

async function persist(state: LibraryState): Promise<void> {
  await mkdir(libraryDir(), { recursive: true });
  await writeFileAtomic(libraryJsonPath(), JSON.stringify(state, null, 2));
  await writeFileAtomic(libraryMarkdownPath(), libraryMarkdown(state));
}

export async function getLibrary(): Promise<LibraryState> {
  let raw: string;
  try {
    raw = await readFile(libraryJsonPath(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[ideaclyst] failed to read library:", err);
    }
    return emptyLibrary();
  }
  try {
    const parsed = JSON.parse(raw) as LibraryState;
    const items = Array.isArray(parsed.items) ? parsed.items.map((item) => normalizeItem(item)) : [];
    return { updatedAt: parsed.updatedAt || new Date().toISOString(), items };
  } catch (err) {
    console.error("[ideaclyst] corrupted library.json (treating as empty):", err);
    return emptyLibrary();
  }
}

export async function getLibraryItem(id: string): Promise<LibraryItem | null> {
  const library = await getLibrary();
  return library.items.find((item) => item.id === id) ?? null;
}

export async function upsertLibraryItem(input: LibraryItemInput): Promise<LibraryItem> {
  const library = await getLibrary();
  const existing = library.items.find((item) => item.id === input.id);
  const nextItem = normalizeItem(input, existing);
  if (!nextItem.id) throw new Error("Library item id is required");
  const next: LibraryState = {
    updatedAt: new Date().toISOString(),
    items: [nextItem, ...library.items.filter((item) => item.id !== nextItem.id)],
  };
  await persist(next);
  return nextItem;
}

export async function removeLibraryItem(id: string): Promise<void> {
  const library = await getLibrary();
  const next: LibraryState = {
    updatedAt: new Date().toISOString(),
    items: library.items.filter((item) => item.id !== id),
  };
  await persist(next);
}
