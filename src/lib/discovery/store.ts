/**
 * On-disk store for discoveries — mirrors runs/store.ts. Each discovery is a
 * directory under <dataDir>/discoveries/<id>/ with discovery.json (source of
 * truth) plus a human-readable CANDIDATES.md.
 */

import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { Discovery, CreateDiscoveryInput } from "./types";
import { makeRunId } from "../utils";

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function discoveriesDir(): string {
  return join(process.cwd(), dataDir(), "discoveries");
}

export function discoveryDir(id: string): string {
  return join(discoveriesDir(), id);
}

function jsonPath(id: string): string {
  return join(discoveryDir(id), "discovery.json");
}

export async function writeDiscoveryFile(
  id: string,
  filename: string,
  contents: string,
): Promise<void> {
  await mkdir(discoveryDir(id), { recursive: true });
  await writeFile(join(discoveryDir(id), filename), contents, "utf8");
}

async function persist(d: Discovery): Promise<void> {
  await mkdir(discoveryDir(d.id), { recursive: true });
  await writeFile(jsonPath(d.id), JSON.stringify(d, null, 2), "utf8");
}

export async function createDiscovery(input: CreateDiscoveryInput): Promise<Discovery> {
  const now = new Date().toISOString();
  const id = makeRunId(input.domain);
  const d: Discovery = {
    id,
    domain: input.domain.trim(),
    goal: input.goal,
    capacity: input.capacity,
    constraints: input.constraints?.trim() || undefined,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    marketRead: "",
    candidates: [],
    scoutNotes: "",
  };
  await persist(d);
  return d;
}

export async function getDiscovery(id: string): Promise<Discovery | null> {
  try {
    const raw = await readFile(jsonPath(id), "utf8");
    return JSON.parse(raw) as Discovery;
  } catch {
    return null;
  }
}

export async function updateDiscovery(
  id: string,
  patch: Partial<Omit<Discovery, "id" | "createdAt">>,
): Promise<Discovery> {
  const current = await getDiscovery(id);
  if (!current) throw new Error(`Discovery not found: ${id}`);
  const next: Discovery = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await persist(next);
  return next;
}

export async function listDiscoveries(): Promise<Discovery[]> {
  let entries: string[];
  try {
    entries = await readdir(discoveriesDir());
  } catch {
    return [];
  }
  const out: Discovery[] = [];
  for (const name of entries) {
    try {
      const s = await stat(discoveryDir(name));
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    const d = await getDiscovery(name);
    if (d) out.push(d);
  }
  out.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  return out;
}
