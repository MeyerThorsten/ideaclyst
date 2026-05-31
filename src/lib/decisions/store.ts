import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type DecisionType = "promoted" | "parked" | "killed" | "validated" | "note";

export interface DecisionEntry {
  id: string;
  type: DecisionType;
  title: string;
  href?: string;
  evidence: string;
  rationale: string;
  createdAt: string;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function decisionsDir(): string {
  return join(process.cwd(), dataDir(), "decisions");
}

function decisionsPath(): string {
  return join(decisionsDir(), "decisions.json");
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

export async function listDecisions(): Promise<DecisionEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(decisionsPath(), "utf8")) as { decisions?: DecisionEntry[] };
    return Array.isArray(parsed.decisions) ? parsed.decisions : [];
  } catch {
    return [];
  }
}

export async function addDecision(input: Omit<DecisionEntry, "id" | "createdAt">): Promise<DecisionEntry> {
  const current = await listDecisions();
  const entry: DecisionEntry = {
    ...input,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...current].slice(0, 500);
  await mkdir(decisionsDir(), { recursive: true });
  await writeAtomic(decisionsPath(), JSON.stringify({ updatedAt: new Date().toISOString(), decisions: next }, null, 2));
  await writeAtomic(join(decisionsDir(), "DECISIONS.md"), [
    "# Founder Decision Log",
    "",
    ...next.map((decision) => [
      `## ${decision.title}`,
      "",
      `- Type: ${decision.type}`,
      `- Date: ${decision.createdAt}`,
      decision.href ? `- Link: ${decision.href}` : "",
      `- Evidence: ${decision.evidence}`,
      "",
      decision.rationale,
      "",
    ].filter(Boolean).join("\n")),
  ].join("\n"));
  return entry;
}
