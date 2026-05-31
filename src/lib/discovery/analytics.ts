import { listDiscoveries } from "./store";
import { ResearchSource } from "../research/types";

export interface SourceLaneStat {
  lane: string;
  sourceCount: number;
  candidateCount: number;
  averageCandidateScore: number;
  lastSeenAt: string;
  reason: string;
}

function lanes(sources: ResearchSource[]): string[] {
  return Array.from(new Set(
    sources
      .map((source) => source.sourceName || source.sourceType || "Unknown lane")
      .filter(Boolean),
  ));
}

export async function sourceLanePerformance(): Promise<SourceLaneStat[]> {
  const discoveries = await listDiscoveries();
  const stats = new Map<string, SourceLaneStat>();
  for (const discovery of discoveries) {
    const sourceLanes = lanes(Array.isArray(discovery.sources) ? discovery.sources : []);
    const candidates = Array.isArray(discovery.candidates) ? discovery.candidates : [];
    for (const lane of sourceLanes.length ? sourceLanes : ["No source lane"]) {
      const current = stats.get(lane) || {
        lane,
        sourceCount: 0,
        candidateCount: 0,
        averageCandidateScore: 0,
        lastSeenAt: discovery.updatedAt,
        reason: "",
      };
      const laneSources = (discovery.sources || []).filter((source) => (source.sourceName || source.sourceType || "Unknown lane") === lane);
      const scoreSum = candidates.reduce((sum, candidate) => sum + (candidate.confidence?.overall || 0), 0);
      const totalCandidates = current.candidateCount + candidates.length;
      current.sourceCount += laneSources.length || 0;
      current.averageCandidateScore = totalCandidates
        ? Math.round(((current.averageCandidateScore * current.candidateCount) + scoreSum) / totalCandidates)
        : 0;
      current.candidateCount = totalCandidates;
      current.lastSeenAt = current.lastSeenAt > discovery.updatedAt ? current.lastSeenAt : discovery.updatedAt;
      current.reason = `${lane} has produced ${current.sourceCount} source artifacts and ${current.candidateCount} candidates locally.`;
      stats.set(lane, current);
    }
  }
  return Array.from(stats.values())
    .sort((a, b) => b.averageCandidateScore - a.averageCandidateScore || b.sourceCount - a.sourceCount)
    .slice(0, 12);
}
