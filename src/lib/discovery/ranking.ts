import { FounderProfile } from "../profile/types";
import { Discovery, IdeaCandidate } from "./types";

function includesAny(text: string, values: string[]): string[] {
  const lower = text.toLowerCase();
  return values.filter((value) => value && lower.includes(value.toLowerCase()));
}

function candidateText(candidate: IdeaCandidate, discovery: Discovery): string {
  return [
    discovery.domain,
    candidate.title,
    candidate.idea,
    candidate.targetCustomer,
    candidate.signal,
    candidate.risk,
    candidate.fit,
  ].filter(Boolean).join(" ");
}

export function rankCandidateForProfile(
  discovery: Discovery,
  candidate: IdeaCandidate,
  profile: FounderProfile | null,
): IdeaCandidate {
  const reasons: string[] = [];
  let score = candidate.confidence?.overall ?? 50;
  const text = candidateText(candidate, discovery);

  if (!profile) {
    reasons.push("No founder profile yet; ranked by general opportunity confidence.");
    return { ...candidate, forYou: { score, reasons } };
  }

  const preferred = includesAny(text, profile.preferredMarkets);
  const avoided = includesAny(text, profile.avoidedMarkets);
  const skills = includesAny(text, profile.skills);

  if (preferred.length) {
    score += 12;
    reasons.push(`Matches preferred market: ${preferred.slice(0, 2).join(", ")}.`);
  }
  if (skills.length) {
    score += 8;
    reasons.push(`Uses your stated skills: ${skills.slice(0, 3).join(", ")}.`);
  }
  if (profile.domainAccess && includesAny(text, profile.domainAccess.split(/[\n,.;]+/)).length) {
    score += 8;
    reasons.push("Touches a domain where you said you have buyer access.");
  }
  if (candidate.buildEffort === "low" && profile.weeklyHours < 12) {
    score += 8;
    reasons.push("Low build effort fits your available weekly hours.");
  }
  if (candidate.commercial === "strong" && profile.salesComfort !== "low") {
    score += 6;
    reasons.push("Commercial path fits your sales comfort better than a portfolio-only idea.");
  }
  if (avoided.length) {
    score -= 18;
    reasons.push(`Penalized because it overlaps avoided market language: ${avoided.slice(0, 2).join(", ")}.`);
  }
  if (!reasons.length) {
    reasons.push("No strong personal profile match; ranked by evidence and build fit.");
  }

  return {
    ...candidate,
    forYou: {
      score: Math.max(1, Math.min(100, Math.round(score))),
      reasons: reasons.slice(0, 4),
    },
  };
}

export function rankDiscoveryForProfile(discovery: Discovery, profile: FounderProfile | null): Discovery {
  const candidates = [...(Array.isArray(discovery.candidates) ? discovery.candidates : [])]
    .map((candidate) => rankCandidateForProfile(discovery, candidate, profile))
    .sort((a, b) => (b.forYou?.score || 0) - (a.forYou?.score || 0));
  return { ...discovery, candidates };
}
