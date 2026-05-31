import { ResearchSource } from "../research/types";

function sourceText(source: ResearchSource): string {
  return `${source.sourceName || ""} ${source.title || ""} ${source.summary || ""}`;
}

export function isSyntheticSource(source: ResearchSource): boolean {
  return !/^https?:\/\//i.test(source.url) || /\b(mock|offline)\b/i.test(sourceText(source));
}

export function sourceConfidence(source: ResearchSource): number {
  if (isSyntheticSource(source)) return 10;
  const typeBonus: Record<string, number> = {
    pricing: 20,
    competitor: 18,
    review: 16,
    launch: 14,
    forum: 12,
    community: 12,
    code: 10,
    docs: 10,
    search: 6,
  };
  const detail = Math.min(24, Math.floor((source.summary || "").length / 80));
  return Math.min(95, 45 + (typeBonus[source.sourceType || "search"] || 6) + detail);
}

export function confidenceLabel(score: number): string {
  if (score >= 75) return "strong";
  if (score >= 50) return "directional";
  if (score >= 25) return "weak";
  return "synthetic/offline";
}

export function freshnessLabel(dateLike?: string): string {
  if (!dateLike) return "retrieval date unknown";
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return "retrieval date unknown";
  const ageDays = Math.max(0, Math.round((Date.now() - time) / 86_400_000));
  if (ageDays <= 1) return "fresh today";
  if (ageDays <= 90) return `${ageDays} days old`;
  return `stale: ${ageDays} days old`;
}
