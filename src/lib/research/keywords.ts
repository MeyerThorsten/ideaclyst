import { DiscoveryBrief, IdeaCandidate, KeywordAnalysis, KeywordInsight } from "./types";

interface KeywordSnapshotEntry {
  keyword: string;
  volume?: string | number;
  growth?: string | number;
  competition?: KeywordInsight["competition"];
  relevance?: number;
}

function envValue(name: string): string {
  if (typeof process === "undefined") return "";
  return process.env[name] || "";
}

function seedFor(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function words(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !["the", "and", "for", "with", "that", "this", "from"].includes(w)),
    ),
  );
}

function offlineKeyword(keyword: string, base: number): KeywordInsight {
  const seed = seedFor(keyword) + base;
  const volume = seed % 3 === 0 ? `${((seed % 90) + 10).toFixed(0)}.0K` : `${((seed % 900) + 100).toFixed(0)}`;
  const growth = seed % 4 === 0 ? `+${(seed % 400) + 20}%` : seed % 5 === 0 ? "flat" : `+${(seed % 90) + 5}%`;
  const competition: KeywordInsight["competition"] = seed % 5 === 0 ? "high" : seed % 3 === 0 ? "medium" : "low";
  return { keyword, volume, growth, competition };
}

function parseSnapshot(): KeywordSnapshotEntry[] {
  const raw = envValue("IDEACLYST_KEYWORD_SNAPSHOT_JSON");
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is KeywordSnapshotEntry => {
        return Boolean(entry) && typeof entry === "object" && typeof (entry as KeywordSnapshotEntry).keyword === "string";
      })
      .slice(0, 200);
  } catch {
    return [];
  }
}

function normalizeSnapshot(entry: KeywordSnapshotEntry): KeywordInsight {
  const competition = entry.competition && ["low", "medium", "high"].includes(entry.competition)
    ? entry.competition
    : "medium";
  return {
    keyword: entry.keyword.trim(),
    volume: entry.volume === undefined ? "unknown" : String(entry.volume),
    growth: entry.growth === undefined ? "unknown" : String(entry.growth),
    competition,
  };
}

function relevantSnapshotTerms(topicWords: string[]): KeywordInsight[] {
  const topicSet = new Set(topicWords);
  return parseSnapshot()
    .map((entry) => ({ entry, ws: words(entry.keyword) }))
    .map(({ entry, ws }) => ({
      entry,
      relevance: (entry.relevance ?? 0) + ws.filter((word) => topicSet.has(word)).length,
    }))
    .filter(({ relevance }) => relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8)
    .map(({ entry }) => normalizeSnapshot(entry));
}

function baseTerms(brief: DiscoveryBrief, candidate: IdeaCandidate): string[] {
  const ws = words(`${brief.domain} ${candidate.title} ${candidate.targetCustomer || ""}`).slice(0, 8);
  const baseTopic = ws.slice(0, 3).join(" ") || brief.domain;
  return [
    `${baseTopic} software`,
    `${baseTopic} template`,
    `${baseTopic} automation`,
    `${baseTopic} compliance`,
    `${baseTopic} alternatives`,
    `${baseTopic} dashboard`,
    `${baseTopic} workflow`,
    `${baseTopic} pricing`,
  ];
}

export function keywordAnalysisFor(candidate: IdeaCandidate, brief: DiscoveryBrief): KeywordAnalysis {
  const topicWords = words(`${brief.domain} ${candidate.title} ${candidate.targetCustomer || ""}`);
  const snapshot = relevantSnapshotTerms(topicWords);
  const offline = baseTerms(brief, candidate).map((term, i) => offlineKeyword(term, i * 17));
  const combined = [...snapshot, ...offline.filter((term) => !snapshot.some((s) => s.keyword.toLowerCase() === term.keyword.toLowerCase()))];
  const source = snapshot.length ? "keyword snapshot + offline estimate" : "offline estimate";
  const freshness = snapshot.length
    ? envValue("IDEACLYST_KEYWORD_SNAPSHOT_FRESHNESS") || "provided snapshot"
    : "generated during report build";
  return {
    summary:
      snapshot.length
        ? `Keyword map combines an optional keyword snapshot with deterministic fallback estimates. Source: ${source}; freshness: ${freshness}.`
        : `Directional keyword map derived from the discovered topic. Source: ${source}; freshness: ${freshness}. Validate volumes with a real keyword tool before treating them as market facts.`,
    fastestGrowing: combined.slice(0, 3),
    highestVolume: combined.slice(3, 6),
    mostRelevant: [combined[0], combined[2], combined[6]].filter((item): item is KeywordInsight => Boolean(item)),
    source,
    freshness,
  };
}
