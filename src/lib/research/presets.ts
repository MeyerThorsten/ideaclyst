export interface ResearchPreset {
  id: string;
  label: string;
  notes: string;
}

export const RESEARCH_PRESETS: ResearchPreset[] = [
  {
    id: "b2b-saas",
    label: "B2B SaaS",
    notes: "Prioritize buyer budget, workflow pain, implementation ecosystems, review/pricing pages, and direct outreach channels.",
  },
  {
    id: "developer-tool",
    label: "Developer tool",
    notes: "Prioritize GitHub, docs, Hacker News, integration pain, API gaps, and bottom-up adoption signals.",
  },
  {
    id: "consumer-app",
    label: "Consumer app",
    notes: "Prioritize Reddit/community pain, habit frequency, retention loops, and cheap validation channels.",
  },
  {
    id: "compliance-heavy",
    label: "Compliance-heavy",
    notes: "Prioritize risk review, buyer trust, regulated workflows, data minimization, and high-friction procurement.",
  },
  {
    id: "local-services",
    label: "Local services",
    notes: "Prioritize service businesses, manual workarounds, phone/email workflows, and concierge-first validation.",
  },
];
