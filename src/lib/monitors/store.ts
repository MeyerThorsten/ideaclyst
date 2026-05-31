import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { listDiscoveries } from "../discovery/store";
import { listRuns, runDir } from "../runs/store";
import { DossierEntry, ResearchSource } from "../research/types";

export interface MonitorSnapshot {
  id: string;
  target: string;
  url: string;
  category: "competitor" | "trend";
  capturedAt: string;
  baseline: string;
}

export interface MonitorDiff {
  target: string;
  url: string;
  category: "competitor" | "trend";
  previousAt?: string;
  currentAt: string;
  change: string;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function monitorsDir(): string {
  return join(process.cwd(), dataDir(), "monitors");
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

async function readRunDossier(runId: string): Promise<DossierEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(join(runDir(runId), "RESEARCH_DOSSIER.json"), "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fromSource(source: ResearchSource, category: "competitor" | "trend"): MonitorSnapshot {
  return {
    id: `${category}:${source.url}`,
    target: source.title || source.sourceName || source.url,
    url: source.url,
    category,
    capturedAt: new Date().toISOString(),
    baseline: [source.sourceName, source.summary].filter(Boolean).join(" — ").slice(0, 700),
  };
}

async function priorSnapshots(): Promise<MonitorSnapshot[]> {
  try {
    const names = (await readdir(monitorsDir())).filter((name) => name.endsWith(".json")).sort().reverse();
    for (const name of names) {
      const parsed = JSON.parse(await readFile(join(monitorsDir(), name), "utf8")) as { snapshots?: MonitorSnapshot[] };
      if (Array.isArray(parsed.snapshots)) return parsed.snapshots;
    }
  } catch {
    return [];
  }
  return [];
}

export async function refreshMonitorSnapshots(): Promise<{ snapshots: MonitorSnapshot[]; diffs: MonitorDiff[] }> {
  const [discoveries, runs, previous] = await Promise.all([listDiscoveries(), listRuns(), priorSnapshots()]);
  const snapshots: MonitorSnapshot[] = [];
  for (const discovery of discoveries) {
    for (const source of Array.isArray(discovery.sources) ? discovery.sources : []) {
      if (!/^https?:\/\//i.test(source.url)) continue;
      const category = ["competitor", "pricing", "review", "launch"].includes(source.sourceType || "") ? "competitor" : "trend";
      snapshots.push(fromSource(source, category));
    }
  }
  for (const run of runs) {
    for (const entry of await readRunDossier(run.id)) {
      if (!/^https?:\/\//i.test(entry.url)) continue;
      snapshots.push({
        id: `competitor:${entry.url}`,
        target: entry.title || entry.url,
        url: entry.url,
        category: ["competitor", "pricing", "review"].includes(entry.sourceType) ? "competitor" : "trend",
        capturedAt: new Date().toISOString(),
        baseline: entry.summary.slice(0, 700),
      });
    }
  }
  const deduped = Array.from(new Map(snapshots.map((snapshot) => [snapshot.url, snapshot])).values()).slice(0, 120);
  const previousByUrl = new Map(previous.map((snapshot) => [snapshot.url, snapshot]));
  const diffs = deduped.map((snapshot) => {
    const old = previousByUrl.get(snapshot.url);
    return {
      target: snapshot.target,
      url: snapshot.url,
      category: snapshot.category,
      previousAt: old?.capturedAt,
      currentAt: snapshot.capturedAt,
      change: !old
        ? "New monitor target."
        : old.baseline === snapshot.baseline
          ? "No material local baseline change."
          : "Baseline text changed; inspect positioning, proof, pricing, or feature claims.",
    } satisfies MonitorDiff;
  });
  await mkdir(monitorsDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeAtomic(join(monitorsDir(), `${stamp}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), snapshots: deduped, diffs }, null, 2));
  await writeAtomic(join(monitorsDir(), "MONITOR_DIFFS.md"), [
    "# Competitor and Trend Monitor",
    "",
    ...diffs.map((diff) => `- **${diff.target}** (${diff.category}) — ${diff.change} ${diff.url}`),
    "",
  ].join("\n"));
  return { snapshots: deduped, diffs };
}
