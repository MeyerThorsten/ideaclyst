/**
 * Deterministic research artifact builders. The live surfagent path gives us raw
 * pages; this module turns those pages into durable, structured founder tools so
 * research is inspectable instead of trapped inside one synthesized memo.
 */

import { Run } from "../runs/types";
import {
  CandidateConfidence,
  CompetitorProfile,
  CompetitorWatchItem,
  DossierEntry,
  DiscoveryBrief,
  DistributionChannel,
  IdeaCandidate,
  OpportunityZone,
  ResearchSource,
  ResearchSourceType,
  ResearchTimelineEvent,
  ResearchToolkit,
  ScopeNegotiation,
  ValidationExperiment,
} from "./types";

const PAIN_WORDS = [
  "problem",
  "pain",
  "manual",
  "frustrating",
  "complain",
  "slow",
  "expensive",
  "hard",
  "wish",
  "workaround",
  "spreadsheet",
];

const PRICING_WORDS = ["pricing", "price", "paid", "plan", "free", "trial", "seat", "subscription"];

const FEATURE_WORDS = [
  "automation",
  "dashboard",
  "analytics",
  "integration",
  "api",
  "workflow",
  "report",
  "collaboration",
  "import",
  "export",
];

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function titleFromUrl(url: string): string {
  const h = host(url);
  return h === url ? url : h.split(".")[0].replace(/[-_]+/g, " ");
}

export function classifySource(source: ResearchSource): ResearchSourceType {
  if (source.sourceType) return source.sourceType;
  const haystack = `${source.url} ${source.title}`.toLowerCase();
  if (haystack.includes("github.com")) return "code";
  if (haystack.includes("reddit.com") || haystack.includes("news.ycombinator.com")) return "forum";
  if (haystack.includes("producthunt.com") || haystack.includes("launch")) return "launch";
  if (haystack.includes("g2.com") || haystack.includes("capterra") || haystack.includes("review")) return "review";
  if (haystack.includes("pricing") || haystack.includes("/price")) return "pricing";
  if (haystack.includes("docs.") || haystack.includes("/docs")) return "docs";
  return source.kind === "serp" ? "search" : "community";
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24)
    .slice(0, 12);
}

function pickSignals(text: string, words: string[], fallback: string): string[] {
  const hits = sentences(text).filter((s) => {
    const lower = s.toLowerCase();
    return words.some((word) => lower.includes(word));
  });
  return (hits.length ? hits : [fallback]).slice(0, 3);
}

function featureSignals(text: string): string[] {
  const lower = text.toLowerCase();
  const found = FEATURE_WORDS.filter((word) => lower.includes(word));
  return found.length ? found.slice(0, 5) : ["core workflow", "onboarding", "reporting"];
}

function competitorsMentioned(text: string): string[] {
  const candidates = Array.from(text.matchAll(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/g))
    .map((m) => m[1])
    .filter((name) => !["The", "This", "That", "And", "But", "For", "With"].includes(name));
  return Array.from(new Set(candidates)).slice(0, 5);
}

function sourceConfidence(type: ResearchSourceType, summary: string): number {
  const base: Record<ResearchSourceType, number> = {
    competitor: 5,
    pricing: 5,
    review: 4,
    forum: 4,
    launch: 4,
    code: 3,
    docs: 3,
    community: 3,
    search: 2,
  };
  const evidenceBoost = Math.min(1, Math.floor(summary.length / 600));
  return Math.min(5, base[type] + evidenceBoost);
}

export function mockSourcesForRun(run: Run, competitorUrls: string[]): ResearchSource[] {
  const customer = run.targetCustomer || "target customers";
  const general: ResearchSource[] = [
    {
      url: "mock://market/pain-signals",
      title: `${run.title} market pain scan`,
      summary: `${customer} describe manual workarounds, recurring setup friction, spreadsheet-driven operations, and a desire for a faster first win around ${run.idea}.`,
      kind: "page",
      sourceType: "community",
      sourceName: "Offline market scan",
    },
    {
      url: "mock://market/launch-patterns",
      title: `${run.title} launch pattern scan`,
      summary: `Adjacent tools compete on broad dashboards, integrations, and automation. Pricing often moves from free trials to seat-based subscriptions once a team workflow is proven.`,
      kind: "page",
      sourceType: "launch",
      sourceName: "Offline launch scan",
    },
  ];
  const competitors = competitorUrls.map((url) => ({
    url,
    title: `${titleFromUrl(url)} competitor page`,
    summary:
      "Competitor positions around a broad value proposition with pricing, integrations, feature breadth, social proof, and likely onboarding friction. The opening is a narrower wedge with a faster first win.",
    kind: "page" as const,
    sourceType: "competitor" as const,
    sourceName: "Founder supplied competitor",
  }));
  return [...general, ...competitors];
}

export function buildResearchToolkit(
  run: Run,
  inputSources: ResearchSource[],
  opts: { competitorUrls?: string[]; note?: string; findings?: string } = {},
): ResearchToolkit {
  const generatedAt = new Date().toISOString();
  const sources = inputSources.length ? inputSources : mockSourcesForRun(run, opts.competitorUrls ?? []);
  const dossier: DossierEntry[] = sources.map((source, i) => {
    const type = classifySource(source);
    return {
      id: `S${i + 1}`,
      url: source.url,
      title: source.title || source.url,
      sourceType: type,
      sourceName: source.sourceName,
      retrievedAt: generatedAt,
      summary: source.summary || "(no extractable summary)",
      extractedClaims: sentences(source.summary).slice(0, 3),
      painSignals: pickSignals(
        source.summary,
        PAIN_WORDS,
        "Treat this as weak evidence until repeated by another source.",
      ),
      pricingSignals: pickSignals(
        source.summary,
        PRICING_WORDS,
        "No direct pricing signal found; validate willingness to pay separately.",
      ),
      competitorsMentioned: competitorsMentioned(source.summary),
      confidence: sourceConfidence(type, source.summary),
    };
  });

  const competitorSources = sources.filter((s) => classifySource(s) === "competitor");
  const competitorMatrix = buildCompetitorProfiles(competitorSources, opts.competitorUrls ?? []);
  const timeline = buildTimeline(sources, opts.note);
  const opportunityMap = buildOpportunityMap(run, dossier, competitorMatrix);
  const distributionChannels = buildDistributionChannels(dossier, run);
  const validationExperiments = buildValidationExperiments(run, dossier, distributionChannels);
  const killCriteria = buildKillCriteria(run, dossier, competitorMatrix);
  const scopeNegotiation = buildScopeNegotiation(run, dossier);
  const watchlist = buildWatchlist(competitorMatrix);
  const founderBrief = renderFounderBrief(run, {
    dossier,
    competitorMatrix,
    opportunityMap,
    distributionChannels,
    validationExperiments,
    killCriteria,
    scopeNegotiation,
  });

  return {
    generatedAt,
    timeline,
    dossier,
    competitorMatrix,
    opportunityMap,
    distributionChannels,
    validationExperiments,
    killCriteria,
    scopeNegotiation,
    founderBrief,
    watchlist,
  };
}

function buildTimeline(sources: ResearchSource[], note?: string): ResearchTimelineEvent[] {
  const now = new Date().toISOString();
  const events: ResearchTimelineEvent[] = [
    {
      at: now,
      label: "Research started",
      detail: "Created a research pass for the idea brief and optional competitors.",
      status: "done",
    },
    {
      at: now,
      label: "Sources collected",
      detail: `${sources.length} source${sources.length === 1 ? "" : "s"} were available for analysis.`,
      status: sources.length ? "done" : "partial",
    },
  ];
  const types = Array.from(new Set(sources.map(classifySource)));
  if (types.length) {
    events.push({
      at: now,
      label: "Sources classified",
      detail: `Classified source lanes: ${types.join(", ")}.`,
      status: "done",
    });
  }
  if (note) {
    events.push({ at: now, label: "Research note", detail: note, status: "partial" });
  }
  events.push({
    at: now,
    label: "Toolkit generated",
    detail: "Built dossier, matrix, opportunity map, validation tests, distribution plan, and founder brief.",
    status: "done",
  });
  return events;
}

function buildCompetitorProfiles(sources: ResearchSource[], competitorUrls: string[]): CompetitorProfile[] {
  const fromSources = sources.map((source) => {
    const summary = source.summary || "";
    return {
      name: source.title && source.title !== source.url ? source.title.slice(0, 80) : titleFromUrl(source.url),
      url: source.url,
      positioning: sentences(summary)[0] || "Broad category promise; inspect page copy for exact positioning.",
      targetCustomer: pickSignals(summary, ["team", "founder", "developer", "operator", "customer"], "Likely teams already feeling the workflow pain.")[0],
      pricingSignal: pickSignals(summary, PRICING_WORDS, "No pricing signal detected.").join(" "),
      featureSignals: featureSignals(summary),
      strengths: [
        "Existing page and messaging to learn from.",
        summary.length > 500 ? "Enough page content to infer feature and proof signals." : "Known alternative for buyer comparison.",
      ],
      weaknesses: [
        "Likely broader than the narrow first wedge.",
        "May require onboarding or switching effort before value appears.",
      ],
      differentiationOpening: "Win with a smaller promise, faster setup, and a clearer first-win workflow.",
      landingPageCritique:
        "Audit the above-the-fold promise, proof density, pricing clarity, and whether the page makes the buyer's next action obvious.",
    };
  });
  const missing = competitorUrls
    .filter((url) => !fromSources.some((profile) => profile.url === url))
    .map((url) => ({
      name: titleFromUrl(url),
      url,
      positioning: "Founder supplied competitor; page content was not available in this pass.",
      targetCustomer: "Validate directly from the landing page before positioning against it.",
      pricingSignal: "No pricing signal captured.",
      featureSignals: ["positioning", "pricing", "proof"],
      strengths: ["Known competitor supplied by the founder."],
      weaknesses: ["No readable page evidence captured yet."],
      differentiationOpening: "Rerun live research or inspect manually to identify a precise wedge.",
      landingPageCritique: "Not enough readable evidence captured; rerun research or inspect the page.",
    }));
  if (fromSources.length || missing.length) return [...fromSources, ...missing];
  return [
    {
      name: "Manual status quo",
      url: "manual://status-quo",
      positioning: "The buyer keeps using spreadsheets, generic tools, and ad hoc process.",
      targetCustomer: "Teams with repeated workflow pain but no dedicated tool yet.",
      pricingSignal: "Implicit cost is lost time, mistakes, and delayed decisions.",
      featureSignals: ["spreadsheet", "manual process", "generic SaaS"],
      strengths: ["Already adopted and free to keep using."],
      weaknesses: ["Slow, brittle, and hard to scale across a team."],
      differentiationOpening: "Make the first win faster than the manual workaround.",
      landingPageCritique: "Status quo has no landing page, so conversion depends on making pain obvious.",
    },
  ];
}

function buildOpportunityMap(
  run: Run,
  dossier: DossierEntry[],
  competitors: CompetitorProfile[],
): OpportunityZone[] {
  const subject = run.title || "the idea";
  const painCount = dossier.reduce((sum, d) => sum + d.painSignals.length, 0);
  const competitionCount = competitors.length;
  return [
    {
      quadrant: "high-pain-low-competition",
      label: "Sharp wedge",
      description: "Repeated pain with few direct alternatives. This is the preferred first release zone.",
      opportunities: [
        `Turn the most repeated ${subject} workaround into a guided first-win flow.`,
        "Package setup relief as the product wedge instead of competing on broad feature breadth.",
      ],
    },
    {
      quadrant: "high-pain-high-competition",
      label: "Crowded but validated",
      description: "Pain is visible, but competitors or the status quo are already credible.",
      opportunities: [
        competitionCount > 1
          ? "Differentiate on narrow buyer, faster setup, and clearer proof."
          : "Use the manual status quo as the primary competitor until direct alternatives are validated.",
        "Avoid broad platform language; speak to one urgent job.",
      ],
    },
    {
      quadrant: "low-pain-low-competition",
      label: "Explore carefully",
      description: "Evidence is thin. Useful for portfolio or learning goals, risky for commercial bets.",
      opportunities: [
        painCount > 2
          ? "Find a narrower audience where the captured pain appears weekly."
          : "Run interviews before writing production code.",
      ],
    },
    {
      quadrant: "low-pain-high-competition",
      label: "Likely skip",
      description: "The market may be noisy without urgent demand for another tool.",
      opportunities: [
        "Only enter if you have distribution or a unique data advantage.",
        "Use this zone as the idea graveyard unless new evidence changes the picture.",
      ],
    },
  ];
}

function buildDistributionChannels(dossier: DossierEntry[], run: Run): DistributionChannel[] {
  const byType = (type: ResearchSourceType) => dossier.find((d) => d.sourceType === type);
  const forum = byType("forum") || byType("community");
  const launch = byType("launch");
  const code = byType("code") || byType("docs");
  const customer = run.targetCustomer || "the target customer";
  return [
    {
      channel: "Community pain posts",
      whyItFits: `${customer} already describe the problem in public channels when pain is active.`,
      firstMove: "Publish a short problem teardown and ask for examples of current workarounds.",
      evidenceUrl: forum?.url,
    },
    {
      channel: "Launch directories and founder communities",
      whyItFits: "Useful for testing whether the wedge is legible without sales help.",
      firstMove: "Launch a single-purpose demo with a before/after first-win claim.",
      evidenceUrl: launch?.url,
    },
    {
      channel: "Integration or developer ecosystem",
      whyItFits: "If the product touches an existing workflow, integration search can find early adopters.",
      firstMove: "Ship one integration guide or template before building a marketplace of integrations.",
      evidenceUrl: code?.url,
    },
  ];
}

function buildValidationExperiments(
  run: Run,
  dossier: DossierEntry[],
  channels: DistributionChannel[],
): ValidationExperiment[] {
  const customer = run.targetCustomer || "target customers";
  const evidence = dossier[0];
  return [
    {
      name: "Problem resonance test",
      audience: customer,
      channel: channels[0]?.channel || "Community pain posts",
      script: `Post the exact painful workflow behind "${run.title}" and ask how people solve it today.`,
      successMetric: "10+ qualified replies or 5+ calls booked within 7 days.",
      evidenceUrl: evidence?.url,
    },
    {
      name: "First-win demo test",
      audience: customer,
      channel: channels[1]?.channel || "Launch directories",
      script: "Show a clickable demo that delivers one narrow before/after outcome without account setup.",
      successMetric: "25% of visitors complete the demo path and request access.",
      evidenceUrl: channels[1]?.evidenceUrl,
    },
    {
      name: "Willingness-to-pay test",
      audience: customer,
      channel: "Direct outreach from evidence sources",
      script: "Offer a paid concierge setup for the wedge and track who accepts price before automation exists.",
      successMetric: "3+ paid pilots or signed letters of intent.",
      evidenceUrl: evidence?.url,
    },
  ];
}

function buildKillCriteria(
  run: Run,
  dossier: DossierEntry[],
  competitors: CompetitorProfile[],
): string[] {
  return [
    `Kill or reshape "${run.title}" if interviews cannot find a weekly or higher-frequency pain.`,
    "Kill if buyers say the manual workaround is annoying but not worth budget or switching effort.",
    competitors.length > 2
      ? "Kill the broad version if direct competitors already own the same wedge with strong proof."
      : "Do not kill solely because the market looks quiet; first verify whether the problem is hidden in private workflows.",
    dossier.length < 2
      ? "Treat this as low-confidence until at least two independent sources confirm the demand signal."
      : "Continue only if the strongest source signals repeat across more than one channel.",
  ];
}

function buildScopeNegotiation(run: Run, dossier: DossierEntry[]): ScopeNegotiation {
  const customer = run.targetCustomer || "the first customer";
  return {
    mustHave: [
      `One guided flow that gives ${customer} a visible first win.`,
      "Persistence for the core object and enough history to prove repeat use.",
      "A short onboarding path that avoids broad configuration.",
    ],
    wedgeOnly: [
      "One input source or integration.",
      "One output format that maps directly to the buyer's pain.",
      "Manual admin backstops where automation is not yet validated.",
    ],
    defer: [
      "Team collaboration beyond the minimum owner/user model.",
      "Marketplace integrations.",
      "Advanced analytics that are not required for the first validation test.",
    ],
    dangerousScopeCreep: [
      "Trying to match competitor feature breadth before validating the wedge.",
      dossier.some((d) => d.sourceType === "code" || d.sourceType === "docs")
        ? "Building developer-platform depth before a user-facing job is clear."
        : "Adding infrastructure complexity before there is evidence of repeat usage.",
    ],
  };
}

function buildWatchlist(competitors: CompetitorProfile[]): CompetitorWatchItem[] {
  return competitors
    .filter((c) => c.url.startsWith("http"))
    .map((c) => ({
      target: c.name,
      url: c.url,
      watchFor: ["pricing changes", "new positioning", "feature launches", "customer proof", "onboarding friction"],
      baseline: c.positioning,
    }));
}

function renderFounderBrief(
  run: Run,
  data: {
    dossier: DossierEntry[];
    competitorMatrix: CompetitorProfile[];
    opportunityMap: OpportunityZone[];
    distributionChannels: DistributionChannel[];
    validationExperiments: ValidationExperiment[];
    killCriteria: string[];
    scopeNegotiation: ScopeNegotiation;
  },
): string {
  const strongest = data.dossier.slice().sort((a, b) => b.confidence - a.confidence)[0];
  return [
    `# Founder brief - ${run.title}`,
    "",
    "## One-line thesis",
    `${run.title} should focus on a narrow first-win workflow for ${run.targetCustomer || "the target customer"} before expanding into a broader platform.`,
    "",
    "## Evidence",
    strongest
      ? `Strongest current source: [${strongest.title}](${strongest.url}) with confidence ${strongest.confidence}/5.`
      : "No live source was available; treat this as an offline hypothesis.",
    "",
    "## Competitive opening",
    data.competitorMatrix[0]?.differentiationOpening || "Beat the manual status quo with speed and specificity.",
    "",
    "## First distribution moves",
    ...data.distributionChannels.map((c) => `- **${c.channel}:** ${c.firstMove}`),
    "",
    "## Validation plan",
    ...data.validationExperiments.map((e) => `- **${e.name}:** ${e.successMetric}`),
    "",
    "## Build sequence",
    ...data.scopeNegotiation.mustHave.map((item, i) => `${i + 1}. ${item}`),
    "",
    "## Kill criteria",
    ...data.killCriteria.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function renderResearchToolkitMarkdown(toolkit: ResearchToolkit): string {
  return [
    "# Research toolkit",
    "",
    `Generated: ${toolkit.generatedAt}`,
    "",
    renderTimelineMarkdown(toolkit.timeline),
    "",
    renderDossierMarkdown(toolkit.dossier),
    "",
    renderCompetitorMatrixMarkdown(toolkit.competitorMatrix),
    "",
    renderOpportunityMapMarkdown(toolkit.opportunityMap),
    "",
    renderValidationExperimentsMarkdown(toolkit.validationExperiments),
    "",
    renderDistributionPlanMarkdown(toolkit.distributionChannels),
    "",
    renderIdeaGraveyardMarkdown(toolkit.killCriteria),
    "",
    renderScopeNegotiationMarkdown(toolkit.scopeNegotiation),
    "",
    renderLandingPageCriticMarkdown(toolkit.competitorMatrix),
    "",
    renderCompetitorWatchMarkdown(toolkit.watchlist),
  ].join("\n");
}

export function renderDossierJson(toolkit: ResearchToolkit): string {
  return JSON.stringify(
    {
      generatedAt: toolkit.generatedAt,
      timeline: toolkit.timeline,
      dossier: toolkit.dossier,
      competitorMatrix: toolkit.competitorMatrix,
      opportunityMap: toolkit.opportunityMap,
      distributionChannels: toolkit.distributionChannels,
      validationExperiments: toolkit.validationExperiments,
      killCriteria: toolkit.killCriteria,
      scopeNegotiation: toolkit.scopeNegotiation,
      watchlist: toolkit.watchlist,
    },
    null,
    2,
  );
}

export function renderTimelineMarkdown(events: ResearchTimelineEvent[]): string {
  return [
    "## Research timeline",
    ...events.map((event) => `- **${event.status}: ${event.label}** - ${event.detail}`),
  ].join("\n");
}

export function renderDossierMarkdown(dossier: DossierEntry[]): string {
  return [
    "## Dossier highlights",
    ...dossier.slice(0, 6).map((entry) => {
      return `- **${entry.id} ${entry.title}** (${entry.sourceType}, confidence ${entry.confidence}/5): ${entry.painSignals[0] || entry.summary}`;
    }),
  ].join("\n");
}

export function renderCompetitorMatrixMarkdown(matrix: CompetitorProfile[]): string {
  return [
    "## Competitor comparison matrix",
    "| Competitor | Positioning | Pricing signal | Weakness | Opening |",
    "|---|---|---|---|---|",
    ...matrix.map((c) => {
      return `| ${c.name} | ${cleanCell(c.positioning)} | ${cleanCell(c.pricingSignal)} | ${cleanCell(c.weaknesses[0])} | ${cleanCell(c.differentiationOpening)} |`;
    }),
  ].join("\n");
}

export function renderOpportunityMapMarkdown(map: OpportunityZone[]): string {
  return [
    "## Opportunity map",
    ...map.map((zone) => [
      `### ${zone.label}`,
      zone.description,
      ...zone.opportunities.map((o) => `- ${o}`),
      "",
    ].join("\n")),
  ].join("\n");
}

export function renderValidationExperimentsMarkdown(experiments: ValidationExperiment[]): string {
  return [
    "## Validation experiment generator",
    ...experiments.map((e) => [
      `### ${e.name}`,
      `- **Audience:** ${e.audience}`,
      `- **Channel:** ${e.channel}`,
      `- **Script:** ${e.script}`,
      `- **Success metric:** ${e.successMetric}`,
      e.evidenceUrl ? `- **Evidence:** ${e.evidenceUrl}` : "",
      "",
    ].filter(Boolean).join("\n")),
  ].join("\n");
}

export function renderDistributionPlanMarkdown(channels: DistributionChannel[]): string {
  return [
    "## Distribution finder",
    ...channels.map((c) => [
      `### ${c.channel}`,
      c.whyItFits,
      `- **First move:** ${c.firstMove}`,
      c.evidenceUrl ? `- **Evidence:** ${c.evidenceUrl}` : "",
      "",
    ].filter(Boolean).join("\n")),
  ].join("\n");
}

export function renderIdeaGraveyardMarkdown(killCriteria: string[]): string {
  return ["## Idea graveyard / kill criteria", ...killCriteria.map((item) => `- ${item}`)].join("\n");
}

export function renderScopeNegotiationMarkdown(scope: ScopeNegotiation): string {
  return [
    "## MVP scope negotiator",
    "### Must have",
    ...scope.mustHave.map((i) => `- ${i}`),
    "",
    "### Wedge only",
    ...scope.wedgeOnly.map((i) => `- ${i}`),
    "",
    "### Defer",
    ...scope.defer.map((i) => `- ${i}`),
    "",
    "### Dangerous scope creep",
    ...scope.dangerousScopeCreep.map((i) => `- ${i}`),
  ].join("\n");
}

export function renderLandingPageCriticMarkdown(matrix: CompetitorProfile[]): string {
  return [
    "## Landing page critic",
    ...matrix.map((c) => [
      `### ${c.name}`,
      `- **URL:** ${c.url}`,
      `- **Positioning:** ${c.positioning}`,
      `- **Critique:** ${c.landingPageCritique}`,
      `- **Opening:** ${c.differentiationOpening}`,
      "",
    ].join("\n")),
  ].join("\n");
}

export function renderCompetitorWatchMarkdown(watchlist: CompetitorWatchItem[]): string {
  if (!watchlist.length) {
    return [
      "## Competitor watch snapshot",
      "No external competitor URL was available. Add competitor URLs and rerun research to create a watch baseline.",
    ].join("\n");
  }
  return [
    "## Competitor watch snapshot",
    ...watchlist.map((item) => [
      `### ${item.target}`,
      `- **URL:** ${item.url}`,
      `- **Baseline:** ${item.baseline}`,
      `- **Watch for:** ${item.watchFor.join(", ")}`,
      "",
    ].join("\n")),
  ].join("\n");
}

export function scoreCandidates(
  brief: DiscoveryBrief,
  candidates: IdeaCandidate[],
  sources: ResearchSource[],
): IdeaCandidate[] {
  const sourceTypes = new Set(sources.map(classifySource));
  const evidence = Math.min(5, 2 + Math.ceil(sources.length / 2));
  const noveltyBase = sourceTypes.has("launch") || sourceTypes.has("code") ? 3 : 4;
  return candidates.map((candidate) => {
    const buildFit = candidate.buildEffort === "low" ? 5 : candidate.buildEffort === "moderate" ? 4 : 2;
    const monetizationClarity =
      candidate.commercial === "strong" ? 5 : candidate.commercial === "medium" ? 3 : brief.goal === "commercial" ? 2 : 3;
    const competitionIntensity = sourceTypes.has("competitor") || sourceTypes.has("launch") ? 4 : 2;
    const demandEvidence = candidate.signal ? Math.max(3, evidence) : evidence;
    const novelty = candidate.title.toLowerCase().includes(brief.domain.toLowerCase()) ? noveltyBase : Math.min(5, noveltyBase + 1);
    const overall = Math.round(
      (demandEvidence * 0.3 + (6 - competitionIntensity) * 0.15 + buildFit * 0.2 + monetizationClarity * 0.2 + novelty * 0.15) *
        20,
    );
    const confidence: CandidateConfidence = {
      demandEvidence,
      competitionIntensity,
      buildFit,
      monetizationClarity,
      novelty,
      overall,
    };
    return {
      ...candidate,
      confidence,
      killCriteria: [
        "No repeated pain signal appears after 5 customer conversations.",
        "The buyer will not pay or change workflow for the promised first win.",
        competitionIntensity >= 4
          ? "A stronger incumbent already owns the exact wedge with better distribution."
          : "The idea remains interesting but cannot find a narrow enough wedge.",
      ],
    };
  });
}

export function buildDiscoveryOpportunityMap(
  brief: DiscoveryBrief,
  sources: ResearchSource[],
): OpportunityZone[] {
  const pseudoRun: Run = {
    id: "discovery",
    title: brief.domain,
    idea: brief.domain,
    goal: "validate",
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outputs: {
      researchFindings: "",
      researchToolkit: "",
      founderBrief: "",
      productStrategy: "",
      technicalArchitecture: "",
      claudeCritique: "",
      codexCritique: "",
      finalPlan: "",
      summary: "",
      mvpBacklog: "",
      risks: "",
      validationTests: "",
      nextPrompts: "",
      transcript: "",
    },
  };
  const toolkit = buildResearchToolkit(pseudoRun, sources, { note: "Discovery opportunity map." });
  return toolkit.opportunityMap;
}

function cleanCell(value: string): string {
  return value.replace(/\|/g, "/").replace(/\s+/g, " ").trim().slice(0, 180);
}
