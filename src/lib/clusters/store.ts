import { listCandidateRefs } from "../discovery/candidates";
import { candidateSearchText } from "../report-tools/generators";

export interface IdeaCluster {
  id: string;
  label: string;
  reason: string;
  items: { title: string; href: string; market: string; score?: number }[];
}

const CLUSTER_RULES = [
  ["B2B workflow automation", /\b(b2b|saas|workflow|ops|crm|sales|support|onboarding)\b/i],
  ["AI-assisted operations", /\b(ai|agent|automation|llm|model|assistant)\b/i],
  ["Validation and growth", /\b(waitlist|pricing|outreach|funnel|lead|traffic|launch)\b/i],
  ["Developer and technical tools", /\b(api|github|developer|code|integration|devtool)\b/i],
  ["Consumer and creator tools", /\b(creator|content|video|social|consumer|community)\b/i],
] as const;

export async function listIdeaClusters(): Promise<IdeaCluster[]> {
  const refs = await listCandidateRefs();
  return CLUSTER_RULES.map(([label, rule]) => {
    const items = refs
      .filter((ref) => rule.test(candidateSearchText(ref.candidate)))
      .map((ref) => ({
        title: ref.candidate.title,
        href: ref.href,
        market: ref.discovery.domain,
        score: ref.candidate.confidence?.overall,
      }));
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label,
      reason: `Grouped by buyer, pain, source language, and technical wedge matching ${rule}.`,
      items,
    };
  }).filter((cluster) => cluster.items.length);
}
