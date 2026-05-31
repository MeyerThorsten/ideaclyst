import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { listDiscoveries } from "../discovery/store";

export interface MarketInsight {
  id: string;
  market: string;
  href: string;
  underservedAudiences: string[];
  repeatedPainPoints: string[];
  moneySignals: string[];
  solutionGaps: string[];
  sourceConfidence: number;
  sourceUrls: string[];
  updatedAt: string;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function firstSentences(text?: string, max = 4): string[] {
  return (text || "")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 30)
    .slice(0, max);
}

export async function refreshMarketInsights(): Promise<MarketInsight[]> {
  const discoveries = await listDiscoveries();
  const insights = discoveries.map((discovery) => {
    const sources = Array.isArray(discovery.sources) ? discovery.sources.filter((source) => /^https?:\/\//i.test(source.url)) : [];
    const candidates = Array.isArray(discovery.candidates) ? discovery.candidates : [];
    return {
      id: discovery.id,
      market: discovery.domain,
      href: `/discover/${discovery.id}`,
      underservedAudiences: candidates.map((candidate) => candidate.targetCustomer).filter(Boolean).slice(0, 5) as string[],
      repeatedPainPoints: [
        ...candidates.map((candidate) => candidate.signal).filter(Boolean),
        ...firstSentences(discovery.marketRead || discovery.scoutNotes, 3),
      ].slice(0, 6) as string[],
      moneySignals: candidates
        .filter((candidate) => candidate.commercial === "strong" || candidate.commercial === "medium")
        .map((candidate) => `${candidate.title}: ${candidate.commercial} commercial clarity`)
        .slice(0, 5),
      solutionGaps: firstSentences(discovery.opportunityMap || discovery.marketRead, 5),
      sourceConfidence: Math.min(100, sources.length * 12 + candidates.length * 5),
      sourceUrls: Array.from(new Set(sources.map((source) => source.url))).slice(0, 8),
      updatedAt: discovery.updatedAt,
    } satisfies MarketInsight;
  });
  const dir = join(process.cwd(), dataDir(), "insights");
  await mkdir(dir, { recursive: true });
  await writeAtomic(join(dir, "market-insights.json"), JSON.stringify({ generatedAt: new Date().toISOString(), insights }, null, 2));
  await writeAtomic(join(dir, "MARKET_INSIGHTS.md"), [
    "# Market Insight Library",
    "",
    ...insights.map((insight) => [
      `## ${insight.market}`,
      "",
      `- Source confidence: ${insight.sourceConfidence}/100`,
      `- Sources: ${insight.sourceUrls.join(", ") || "No public source URLs"}`,
      "",
      "### Repeated pains",
      ...insight.repeatedPainPoints.map((item) => `- ${item}`),
      "",
    ].join("\n")),
  ].join("\n"));
  return insights;
}
