import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ResearchSourceType } from "./types";

export interface SourceLaneTemplate {
  id: string;
  label: string;
  queryTemplate: string;
  sourceType: ResearchSourceType;
  cap: number;
  riskLabel: "low" | "medium" | "high";
  enabled: boolean;
}

const DEFAULT_LANES: SourceLaneTemplate[] = [
  { id: "general-pain", label: "General pain", queryTemplate: "{domain} problems people complain about", sourceType: "search", cap: 3, riskLabel: "low", enabled: true },
  { id: "hacker-news", label: "Hacker News", queryTemplate: "site:news.ycombinator.com {domain} problem OR frustrating OR \"wish there was\"", sourceType: "forum", cap: 3, riskLabel: "low", enabled: true },
  { id: "reddit", label: "Reddit", queryTemplate: "site:reddit.com {domain} \"how do I\" OR \"I wish\" OR frustrating", sourceType: "forum", cap: 3, riskLabel: "medium", enabled: true },
  { id: "product-hunt", label: "Product Hunt", queryTemplate: "site:producthunt.com {domain} launch app tool", sourceType: "launch", cap: 3, riskLabel: "low", enabled: true },
  { id: "github", label: "GitHub", queryTemplate: "site:github.com {domain} tool library template", sourceType: "code", cap: 3, riskLabel: "low", enabled: true },
  { id: "pricing", label: "Pricing and reviews", queryTemplate: "{domain} pricing reviews alternatives market demand", sourceType: "review", cap: 3, riskLabel: "medium", enabled: true },
];

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function lanesDir(): string {
  return join(process.cwd(), dataDir(), "research");
}

function lanesPath(): string {
  return join(lanesDir(), "source-lanes.json");
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function normalizeLane(input: Partial<SourceLaneTemplate>, fallback: SourceLaneTemplate): SourceLaneTemplate {
  const query = typeof input.queryTemplate === "string" && input.queryTemplate.includes("{domain}")
    ? input.queryTemplate.slice(0, 220)
    : fallback.queryTemplate;
  return {
    id: fallback.id,
    label: typeof input.label === "string" && input.label.trim() ? input.label.trim().slice(0, 80) : fallback.label,
    queryTemplate: query,
    sourceType: fallback.sourceType,
    cap: Math.max(1, Math.min(8, Number(input.cap) || fallback.cap)),
    riskLabel: input.riskLabel === "high" || input.riskLabel === "medium" || input.riskLabel === "low" ? input.riskLabel : fallback.riskLabel,
    enabled: input.enabled !== false,
  };
}

export async function listSourceLanes(): Promise<SourceLaneTemplate[]> {
  try {
    const parsed = JSON.parse(await readFile(lanesPath(), "utf8")) as { lanes?: Partial<SourceLaneTemplate>[] };
    const byId = new Map((parsed.lanes || []).map((lane) => [lane.id, lane]));
    return DEFAULT_LANES.map((lane) => normalizeLane(byId.get(lane.id) || {}, lane));
  } catch {
    return DEFAULT_LANES;
  }
}

export async function saveSourceLanes(lanes: Partial<SourceLaneTemplate>[]): Promise<SourceLaneTemplate[]> {
  const byId = new Map(lanes.map((lane) => [lane.id, lane]));
  const next = DEFAULT_LANES.map((lane) => normalizeLane(byId.get(lane.id) || {}, lane));
  await mkdir(lanesDir(), { recursive: true });
  await writeAtomic(lanesPath(), JSON.stringify({ updatedAt: new Date().toISOString(), lanes: next }, null, 2));
  return next;
}

export function renderLaneQuery(lane: SourceLaneTemplate, domain: string): string {
  return lane.queryTemplate.replaceAll("{domain}", domain).replace(/\s+/g, " ").trim();
}
