import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { listDiscoveries } from "../discovery/store";
import { Discovery } from "../discovery/types";
import { KeywordInsight, ResearchSource } from "../research/types";
import { slugify } from "../utils";
import { TrendCandidateRef, TrendConfidence, TrendRadarState, TrendSignal } from "./types";

interface TrendDraft {
  term: string;
  market: string;
  summaries: string[];
  growthNotes: string[];
  sourceUrls: Set<string>;
  sourceNames: Set<string>;
  candidateIdeas: Map<string, TrendCandidateRef>;
  firstSeenAt: string;
  updatedAt: string;
  evidenceScore: number;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function trendsDir(): string {
  return join(process.cwd(), dataDir(), "trends");
}

function trendsJsonPath(): string {
  return join(trendsDir(), "trends.json");
}

function trendsMarkdownPath(): string {
  return join(trendsDir(), "TRENDS.md");
}

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function firstSentence(text?: string): string {
  if (!text) return "Signal gathered from local discovery data.";
  const clean = text.replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
  return clean.split(/(?<=[.!?])\s+/)[0]?.slice(0, 240) || "Signal gathered from local discovery data.";
}

function confidence(score: number): TrendConfidence {
  if (score >= 70) return "strong";
  if (score >= 40) return "directional";
  return "weak";
}

function validSources(sources: ResearchSource[]): ResearchSource[] {
  return sources.filter((source): source is ResearchSource => Boolean(source) && typeof source === "object");
}

function sourceText(source: ResearchSource): string {
  return `${source.sourceName || ""} ${source.title || ""} ${source.summary || ""}`;
}

function isRealSource(source: ResearchSource): boolean {
  return /^https?:\/\//i.test(source.url) && !/\b(mock|offline)\b/i.test(sourceText(source));
}

function realSources(sources: ResearchSource[]): ResearchSource[] {
  return validSources(sources).filter(isRealSource);
}

function publicSourceUrls(sources: ResearchSource[]): string[] {
  return Array.from(new Set(realSources(sources).map((source) => source.url))).slice(0, 8);
}

function communities(sources: ResearchSource[]): string[] {
  const names = realSources(sources)
    .filter((source) => ["forum", "community", "launch", "review"].includes(source.sourceType || ""))
    .map((source) => source.sourceName || source.title || source.url);
  return Array.from(new Set(names.filter((name): name is string => typeof name === "string" && Boolean(name)))).slice(0, 6);
}

function scoreFromSources(sources: ResearchSource[]): number {
  const publicCount = publicSourceUrls(sources).length;
  const cleanSources = realSources(sources);
  const laneTypes = new Set(cleanSources.map((source) => source.sourceType).filter(Boolean)).size;
  return Math.min(60, publicCount * 8 + laneTypes * 6 + cleanSources.length * 3);
}

function discoverySources(discovery: Discovery): ResearchSource[] {
  return Array.isArray(discovery.sources) ? discovery.sources : [];
}

function discoveryCandidates(discovery: Discovery) {
  return Array.isArray(discovery.candidates) ? discovery.candidates : [];
}

function hasSourceBackedKeywords(candidate: Discovery["candidates"][number]): boolean {
  const source = candidate.report?.keywordAnalysis.source || "";
  return /\bkeyword snapshot\b/i.test(source);
}

function addDraft(drafts: Map<string, TrendDraft>, term: string, discovery: Discovery): TrendDraft {
  const key = slugify(term);
  const existing = drafts.get(key);
  if (existing) {
    existing.updatedAt = discovery.updatedAt;
    return existing;
  }
  const draft: TrendDraft = {
    term,
    market: discovery.domain,
    summaries: [],
    growthNotes: [],
    sourceUrls: new Set(),
    sourceNames: new Set(),
    candidateIdeas: new Map(),
    firstSeenAt: discovery.createdAt,
    updatedAt: discovery.updatedAt,
    evidenceScore: 0,
  };
  drafts.set(key, draft);
  return draft;
}

function addKeywordSignal(drafts: Map<string, TrendDraft>, discovery: Discovery, keyword: KeywordInsight, candidateId: string, candidateTitle: string, candidateScore?: number) {
  const sources = discoverySources(discovery);
  const draft = addDraft(drafts, keyword.keyword, discovery);
  draft.summaries.push(`${keyword.keyword} appears in the ${discovery.domain} report keyword map.`);
  draft.growthNotes.push(`${keyword.growth} growth, ${keyword.volume} volume, ${keyword.competition} competition.`);
  draft.evidenceScore += keyword.competition === "low" ? 10 : keyword.competition === "medium" ? 7 : 4;
  draft.candidateIdeas.set(candidateId, {
    id: candidateId,
    title: candidateTitle,
    href: `/discover/${discovery.id}/ideas/${candidateId}`,
    score: candidateScore,
  });
  for (const url of publicSourceUrls(sources)) draft.sourceUrls.add(url);
  for (const name of communities(sources)) draft.sourceNames.add(name);
}

function buildSignals(discoveries: Discovery[]): TrendSignal[] {
  const drafts = new Map<string, TrendDraft>();
  for (const discovery of discoveries) {
    const sources = realSources(discoverySources(discovery));
    if (!sources.length) continue;
    const candidates = discoveryCandidates(discovery);
    const sourceScore = scoreFromSources(sources);
    const domainDraft = addDraft(drafts, discovery.domain, discovery);
    domainDraft.summaries.push(firstSentence(discovery.marketRead || discovery.opportunityMap || discovery.scoutNotes));
    domainDraft.growthNotes.push(`${candidates.length} candidate ideas and ${sources.length} real source lanes captured.`);
    domainDraft.evidenceScore += sourceScore + candidates.length * 5;
    for (const url of publicSourceUrls(sources)) domainDraft.sourceUrls.add(url);
    for (const name of communities(sources)) domainDraft.sourceNames.add(name);

    for (const candidate of candidates) {
      const score = candidate.confidence?.overall;
      domainDraft.candidateIdeas.set(candidate.id, {
        id: candidate.id,
        title: candidate.title,
        href: `/discover/${discovery.id}/ideas/${candidate.id}`,
        score,
      });
      if (hasSourceBackedKeywords(candidate)) {
        const keywordGroups = [
          ...(candidate.report?.keywordAnalysis.fastestGrowing || []),
          ...(candidate.report?.keywordAnalysis.mostRelevant || []),
        ];
        for (const keyword of keywordGroups.slice(0, 6)) {
          addKeywordSignal(drafts, discovery, keyword, candidate.id, candidate.title, score);
        }
      }
    }
  }

  return Array.from(drafts.entries())
    .map(([id, draft]) => {
      const sourceCount = draft.sourceUrls.size;
      const confidenceScore = Math.min(100, Math.round(draft.evidenceScore + sourceCount * 4 + draft.candidateIdeas.size * 5));
      return {
        id,
        term: draft.term,
        market: draft.market,
        summary: draft.summaries[0] || "Signal gathered from local discovery data.",
        growthNote: draft.growthNotes[0] || "No growth note yet.",
        confidence: confidence(confidenceScore),
        confidenceScore,
        sourceCount,
        sourceUrls: Array.from(draft.sourceUrls).slice(0, 8),
        relatedCommunities: Array.from(draft.sourceNames).slice(0, 6),
        candidateIdeas: Array.from(draft.candidateIdeas.values()).slice(0, 6),
        firstSeenAt: draft.firstSeenAt,
        updatedAt: draft.updatedAt,
      } satisfies TrendSignal;
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore || a.term.localeCompare(b.term))
    .slice(0, 80);
}

function markdown(state: TrendRadarState): string {
  return [
    "# Trend Radar",
    "",
    `Generated: ${state.generatedAt}`,
    "",
    ...state.signals.map((signal) => [
      `## ${signal.term}`,
      "",
      `- Market: ${signal.market}`,
      `- Confidence: ${signal.confidence} (${signal.confidenceScore}/100)`,
      `- Growth note: ${signal.growthNote}`,
      `- Sources: ${signal.sourceUrls.length ? signal.sourceUrls.join(", ") : "No public source URLs yet"}`,
      `- Candidate ideas: ${signal.candidateIdeas.map((candidate) => candidate.title).join(", ") || "None yet"}`,
      "",
      signal.summary,
      "",
    ].join("\n")),
  ].join("\n");
}

async function persist(state: TrendRadarState): Promise<void> {
  await mkdir(trendsDir(), { recursive: true });
  await writeFileAtomic(trendsJsonPath(), JSON.stringify(state, null, 2));
  await writeFileAtomic(trendsMarkdownPath(), markdown(state));
}

export async function refreshTrendRadar(): Promise<TrendRadarState> {
  const discoveries = await listDiscoveries();
  const state: TrendRadarState = {
    generatedAt: new Date().toISOString(),
    signals: buildSignals(discoveries),
  };
  await persist(state);
  return state;
}

export async function getTrendRadar(): Promise<TrendRadarState> {
  try {
    const raw = await readFile(trendsJsonPath(), "utf8");
    const parsed = JSON.parse(raw) as TrendRadarState;
    if (Array.isArray(parsed.signals)) return parsed;
  } catch {
    return refreshTrendRadar();
  }
  return refreshTrendRadar();
}
