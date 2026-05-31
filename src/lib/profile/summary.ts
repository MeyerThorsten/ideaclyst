import { FounderProfile } from "./types";

const STAGE_LABELS: Record<FounderProfile["builderStage"], string> = {
  exploring: "exploring ideas",
  validating: "validating a wedge",
  building: "building an MVP",
  scaling: "scaling an existing product",
};

const CAPITAL_LABELS: Record<FounderProfile["capital"], string> = {
  none: "no outside budget",
  small: "a small validation budget",
  moderate: "a moderate build budget",
  significant: "meaningful capital for build or distribution",
};

export function hasFounderProfile(profile: FounderProfile | null): profile is FounderProfile {
  if (!profile) return false;
  return Boolean(
    profile.domainAccess.trim() ||
      profile.skills.length ||
      profile.preferredMarkets.length ||
      profile.avoidedMarkets.length ||
      profile.unfairAdvantages.trim() ||
      profile.notes.trim(),
  );
}

export function profileToDiscoveryContext(profile: FounderProfile | null): string {
  if (!hasFounderProfile(profile)) return "";
  const lines = [
    `Founder stage: ${STAGE_LABELS[profile.builderStage]}; ${profile.weeklyHours} hours/week; ${profile.riskTolerance} risk tolerance; ${profile.salesComfort} sales comfort; ${CAPITAL_LABELS[profile.capital]}.`,
    profile.domainAccess ? `Domain access: ${profile.domainAccess}` : "",
    profile.skills.length ? `Skills: ${profile.skills.join(", ")}` : "",
    profile.preferredMarkets.length ? `Preferred markets: ${profile.preferredMarkets.join(", ")}` : "",
    profile.avoidedMarkets.length ? `Avoid: ${profile.avoidedMarkets.join(", ")}` : "",
    profile.unfairAdvantages ? `Unfair advantages: ${profile.unfairAdvantages}` : "",
    profile.notes ? `Notes: ${profile.notes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function profileFitNotes(profile: FounderProfile | null): string[] {
  if (!hasFounderProfile(profile)) return [];
  const notes = [
    `${STAGE_LABELS[profile.builderStage]} with ${profile.weeklyHours} hours/week available.`,
    `Risk tolerance is ${profile.riskTolerance}; sales comfort is ${profile.salesComfort}; capital is ${profile.capital}.`,
  ];
  if (profile.domainAccess) notes.push(`Buyer access: ${profile.domainAccess}`);
  if (profile.skills.length) notes.push(`Relevant skills: ${profile.skills.join(", ")}`);
  if (profile.preferredMarkets.length) notes.push(`Preferred markets: ${profile.preferredMarkets.join(", ")}`);
  if (profile.avoidedMarkets.length) notes.push(`Avoided markets: ${profile.avoidedMarkets.join(", ")}`);
  if (profile.unfairAdvantages) notes.push(`Unfair advantages: ${profile.unfairAdvantages}`);
  return notes;
}
