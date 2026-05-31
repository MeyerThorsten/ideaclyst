import { listDiscoveries } from "./store";
import { getFounderProfile } from "../profile/store";
import { FounderProfile } from "../profile/types";

export interface DiscoverySuggestion {
  id: string;
  label: string;
  domain: string;
  constraints: string;
  rationale: string;
}

function fromProfile(profile: FounderProfile | null): DiscoverySuggestion[] {
  if (!profile) {
    return [
      {
        id: "default-b2b",
        label: "B2B workflow pain",
        domain: "AI workflow automation for small B2B teams",
        constraints: "Prioritize problems with visible public complaints, paid alternatives, and low-integration MVPs.",
        rationale: "Fallback suggestion when no profile exists; starts with source-rich commercial pains.",
      },
      {
        id: "default-devtools",
        label: "Developer tools",
        domain: "developer productivity tools for small teams",
        constraints: "Inspect GitHub, Hacker News, Reddit, docs, and pricing pages before proposing candidates.",
        rationale: "Developer-tool markets tend to have inspectable public evidence and fast MVP paths.",
      },
    ];
  }

  const markets = profile.preferredMarkets.length ? profile.preferredMarkets : ["B2B SaaS operations", "AI-assisted workflows"];
  return markets.slice(0, 4).map((market, index) => ({
    id: `profile-${index}`,
    label: market,
    domain: market,
    constraints: [
      profile.domainAccess ? `Use my domain access: ${profile.domainAccess}` : "",
      profile.skills.length ? `Favor wedges using: ${profile.skills.join(", ")}` : "",
      profile.avoidedMarkets.length ? `Avoid: ${profile.avoidedMarkets.join(", ")}` : "",
      `Fit ${profile.weeklyHours} hours/week, ${profile.capital} capital, ${profile.riskTolerance} risk tolerance.`,
    ].filter(Boolean).join(" "),
    rationale: "Suggested from your founder profile so discovery starts near markets you can actually reach.",
  }));
}

export async function discoverySuggestions(): Promise<DiscoverySuggestion[]> {
  const [profile, discoveries] = await Promise.all([getFounderProfile(), listDiscoveries()]);
  const recentMarkets = discoveries
    .map((discovery) => discovery.domain)
    .filter(Boolean)
    .slice(0, 4)
    .map((domain, index) => ({
      id: `recent-${index}`,
      label: `Extend ${domain}`,
      domain,
      constraints: "Look for adjacent pains and source lanes that were missing in the last discovery.",
      rationale: "Recent local discovery; useful for rerunning with sharper constraints.",
    }));
  const seen = new Set<string>();
  return [...fromProfile(profile), ...recentMarkets].filter((suggestion) => {
    const key = suggestion.domain.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}
