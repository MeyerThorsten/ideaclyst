/**
 * Per-candidate idea reports. These are deterministic, local-first equivalents
 * of the rich "full report" surfaces in idea research products: scorecards,
 * value ladder, timing, proof, gaps, execution plan, frameworks, keywords,
 * founder fit, and a roast. They intentionally do not copy external wording;
 * they repackage IdeaClyst's own candidate + source evidence.
 */

import {
  ACPInsight,
  BusinessFitInsight,
  CandidateConfidence,
  CandidateInsightReport,
  CategorizationInsight,
  CommunitySignal,
  DiscoveryBrief,
  ExecutionChannel,
  ExecutionPlanInsight,
  FrameworkInsights,
  IdeaCandidate,
  InsightScore,
  KeywordAnalysis,
  KeywordInsight,
  MarketGapInsight,
  MarketMatrixInsight,
  ProofSignal,
  ResearchSource,
  ResearchSourceType,
  RoastInsight,
  ValueEquationInsight,
  ValueLadderStage,
  WhyNowFactor,
  FounderFitInsight,
} from "./types";

const CAPACITY_LABELS: Record<string, string> = {
  "solo-pro": "solo experienced founder",
  "solo-learning": "solo learning founder",
  team: "small team",
  "ai-assisted": "AI-assisted founder",
};

function clamp(n: number, min = 1, max = 10): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function rating(score: number): string {
  if (score >= 9) return "Exceptional";
  if (score >= 7) return "Strong";
  if (score >= 5) return "Promising";
  if (score >= 3) return "Needs proof";
  return "Weak";
}

function insight(label: string, score: number, detail: string): InsightScore {
  const safeScore = clamp(score);
  return { label, score: safeScore, rating: rating(safeScore), detail };
}

function seedFor(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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

function firstSource(sources: ResearchSource[], types: ResearchSourceType[]): ResearchSource | undefined {
  return sources.find((source) => source.sourceType && types.includes(source.sourceType));
}

function countSources(sources: ResearchSource[], type: ResearchSourceType): number {
  return sources.filter((source) => source.sourceType === type).length;
}

function confidenceFor(candidate: IdeaCandidate): CandidateConfidence {
  return candidate.confidence ?? {
    demandEvidence: 3,
    competitionIntensity: 3,
    buildFit: candidate.buildEffort === "low" ? 5 : candidate.buildEffort === "high" ? 2 : 4,
    monetizationClarity: candidate.commercial === "strong" ? 5 : candidate.commercial === "weak" ? 2 : 3,
    novelty: 3,
    overall: 60,
  };
}

function scorecard(candidate: IdeaCandidate, sources: ResearchSource[]): InsightScore[] {
  const c = confidenceFor(candidate);
  const opportunity = clamp(c.overall / 10);
  const problem = clamp(c.demandEvidence * 2);
  const feasibility = clamp(c.buildFit * 2);
  const whyNow = clamp((c.demandEvidence + c.novelty + Math.min(5, sources.length || 2)) * 1.25);
  return [
    insight("Opportunity", opportunity, `${candidate.title} has a weighted confidence score of ${c.overall}/100.`),
    insight("Problem", problem, candidate.signal || "The current evidence points to a repeated workflow pain."),
    insight("Feasibility", feasibility, `Build effort is ${candidate.buildEffort || "moderate"} for the stated capacity.`),
    insight("Why now", whyNow, "The timing improves when demand, channel visibility, and tooling readiness overlap."),
  ];
}

function businessFit(candidate: IdeaCandidate, brief: DiscoveryBrief): BusinessFitInsight {
  const c = confidenceFor(candidate);
  const paid = candidate.commercial === "strong" || brief.goal === "commercial";
  const revenue =
    candidate.commercial === "strong"
      ? "$1M-$10M ARR potential if the buyer owns a recurring budget and the wedge repeats weekly."
      : candidate.commercial === "medium"
        ? "$250K-$2M ARR potential if the wedge proves budget urgency."
        : "Best treated as portfolio, community, or validation-first until payment signals improve.";
  const difficulty =
    candidate.buildEffort === "low"
      ? "Low to moderate - a narrow MVP can be shipped quickly."
      : candidate.buildEffort === "high"
        ? "High - needs careful scoping, integrations, or trust-building."
        : "Moderate - feasible if the first release avoids platform breadth.";
  return {
    revenuePotential: revenue,
    executionDifficulty: `${difficulty} Current build fit: ${c.buildFit}/5.`,
    goToMarket: paid
      ? "Start with direct outreach and community proof, then convert the strongest workflow into a paid pilot."
      : "Lead with demos, content, and portfolio proof before asking for money.",
    founderFit: `Best for a ${CAPACITY_LABELS[brief.capacity] || brief.capacity} who can interview the buyer and ship a narrow first-win workflow.`,
  };
}

function valueLadder(candidate: IdeaCandidate, brief: DiscoveryBrief): ValueLadderStage[] {
  const target = candidate.targetCustomer || "the first niche";
  const topic = candidate.title;
  return [
    {
      stage: "lead-magnet",
      label: "Lead magnet",
      offer: `${titleCase(topic)} workflow checklist`,
      price: "Free",
      valueProvided: `Helps ${target} audit the painful workflow before they buy software.`,
      goal: "Capture qualified leads and learn the buyer's language.",
    },
    {
      stage: "frontend",
      label: "Frontend offer",
      offer: "Concierge setup or paid template",
      price: brief.goal === "commercial" ? "$19-$99" : "Free or low-ticket",
      valueProvided: "Delivers the first win manually before full automation exists.",
      goal: "Validate urgency and willingness to change workflow.",
    },
    {
      stage: "core",
      label: "Core offer",
      offer: `${topic} focused SaaS`,
      price: candidate.commercial === "strong" ? "$49-$499/month or annual team plan" : "$9-$49/month",
      valueProvided: "Turns the recurring manual workflow into a repeatable product loop.",
      goal: "Create the recurring revenue product.",
    },
    {
      stage: "continuity",
      label: "Continuity",
      offer: "Benchmarks, reporting, and ongoing monitoring",
      price: "$99-$1,000/year add-on",
      valueProvided: "Keeps the buyer engaged with trend, compliance, or performance insights.",
      goal: "Increase retention and expand usage.",
    },
    {
      stage: "backend",
      label: "Backend offer",
      offer: "Enterprise, agency, or white-label package",
      price: "Custom",
      valueProvided: "Adds integration help, priority support, and deeper workflow customization.",
      goal: "Capture high-value accounts once the wedge is proven.",
    },
  ];
}

function whyNow(candidate: IdeaCandidate, sources: ResearchSource[]): WhyNowFactor[] {
  const c = confidenceFor(candidate);
  const forum = firstSource(sources, ["forum", "community"]);
  const launch = firstSource(sources, ["launch"]);
  const review = firstSource(sources, ["review", "pricing", "competitor"]);
  return [
    {
      label: "Demand visibility",
      score: clamp(c.demandEvidence * 2),
      signal: candidate.signal || "Pain is visible enough to test with interviews.",
      detail: "Build now if the strongest complaint appears across more than one channel.",
      evidenceUrl: forum?.url || sources[0]?.url,
    },
    {
      label: "Tooling readiness",
      score: clamp(c.buildFit * 2),
      signal: "AI-assisted product work and managed infrastructure reduce MVP cost.",
      detail: "The first release should automate one high-friction workflow rather than become a platform.",
      evidenceUrl: launch?.url,
    },
    {
      label: "Budget clarity",
      score: clamp(c.monetizationClarity * 2),
      signal: candidate.commercial === "strong" ? "Payment path is relatively clear." : "Payment path needs testing.",
      detail: "Ask for money before building the broad product.",
      evidenceUrl: review?.url,
    },
    {
      label: "Competitive window",
      score: clamp((6 - c.competitionIntensity) * 2),
      signal: c.competitionIntensity >= 4 ? "The market is validated but crowded." : "The wedge is not obviously owned yet.",
      detail: "Position around one buyer and one first-win outcome.",
      evidenceUrl: firstSource(sources, ["competitor", "launch"])?.url,
    },
  ];
}

function proofSignals(candidate: IdeaCandidate, sources: ResearchSource[]): ProofSignal[] {
  const c = confidenceFor(candidate);
  const community = firstSource(sources, ["forum", "community"]);
  const pricing = firstSource(sources, ["pricing", "review", "competitor"]);
  return [
    {
      category: "Pain",
      score: clamp(c.demandEvidence * 2),
      title: "Repeated workflow friction",
      detail: candidate.signal || "The candidate should be validated against repeated manual workarounds.",
      evidenceUrl: community?.url || sources[0]?.url,
    },
    {
      category: "Money",
      score: clamp(c.monetizationClarity * 2),
      title: "Budget hypothesis",
      detail: candidate.targetCustomer
        ? `${candidate.targetCustomer} is the first group to test for budget ownership.`
        : "Find the person who owns the cost of the problem.",
      evidenceUrl: pricing?.url,
    },
    {
      category: "Urgency",
      score: clamp((candidate.risk ? 6 : 7) + c.demandEvidence / 2),
      title: "Switching pressure",
      detail: "Urgency is real only if the manual workaround costs time, risk, money, or reputation every week.",
      evidenceUrl: sources[1]?.url,
    },
    {
      category: "Distribution",
      score: clamp((sources.length ? 5 : 3) + Math.min(4, sources.length)),
      title: "Reachable communities",
      detail: "The best early channel is whichever source already contains buyer language.",
      evidenceUrl: sources[0]?.url,
    },
  ];
}

function marketGap(candidate: IdeaCandidate, brief: DiscoveryBrief): MarketGapInsight {
  const target = candidate.targetCustomer || `operators in ${brief.domain}`;
  return {
    underservedSegments: [
      `${target} who still run the workflow in spreadsheets, generic docs, or chat threads.`,
      `Small teams that feel the pain weekly but are too narrow for broad incumbents.`,
      `New adopters who need a guided first win before committing to a larger platform.`,
    ],
    featureGaps: [
      "A narrow workflow that gets to value without configuration-heavy onboarding.",
      "A buyer-facing proof artifact that shows time saved, risk reduced, or revenue created.",
      "A handoff path from manual concierge service to repeatable software.",
    ],
    differentiationLevers: [
      "Use specificity as the wedge: one buyer, one workflow, one measurable result.",
      "Show proof earlier than competitors with before/after examples and small pilot data.",
      "Keep implementation lighter than incumbent suites or generic platforms.",
    ],
  };
}

function executionChannels(candidate: IdeaCandidate, sources: ResearchSource[]): ExecutionChannel[] {
  const forumCount = countSources(sources, "forum") + countSources(sources, "community");
  const launchCount = countSources(sources, "launch");
  const reviewCount = countSources(sources, "review") + countSources(sources, "pricing");
  return [
    {
      channel: "Community pain posts",
      cadence: "Weekly",
      why: forumCount ? `${forumCount} community/forum source lanes were captured.` : "Use community posts to test buyer language.",
      format: "Problem teardown, interview ask, short demo clip",
      targetMetric: "5 qualified calls or 10 detailed replies in 7 days",
    },
    {
      channel: "Launch directories",
      cadence: "Once MVP is clickable",
      why: launchCount ? `${launchCount} launch-oriented source lanes were captured.` : "Launches test whether the promise is legible.",
      format: "Single-purpose demo and before/after promise",
      targetMetric: "25% demo completion or 10 waitlist joins",
    },
    {
      channel: "Direct outreach",
      cadence: "Daily during validation",
      why: "Direct conversations are the fastest way to verify money and switching cost.",
      format: "Concierge pilot offer",
      targetMetric: "3 paid pilots, LOIs, or budget-owner follow-ups",
    },
    {
      channel: "Review and alternative pages",
      cadence: "Bi-weekly",
      why: reviewCount ? `${reviewCount} review/pricing lanes were captured.` : "Competitor alternatives reveal objection and pricing language.",
      format: "Comparison page or alternative-positioning memo",
      targetMetric: "Organic search clicks or booked demos from alternative intent",
    },
  ];
}

function executionPlan(candidate: IdeaCandidate, brief: DiscoveryBrief, sources: ResearchSource[]): ExecutionPlanInsight {
  return {
    businessType: brief.goal === "commercial" || candidate.commercial !== "weak" ? "B2B/B2C SaaS validation" : "Portfolio-first product",
    timeline: candidate.buildEffort === "low" ? "2-4 weeks" : candidate.buildEffort === "high" ? "8-12 weeks" : "4-8 weeks",
    budget: "Local-first MVP budget: $0-$10K before paid acquisition.",
    buyerPersonas: [
      candidate.targetCustomer || `Power users in ${brief.domain}`,
      "Budget owner who feels the cost of the broken workflow",
      "Hands-on operator willing to pilot a narrow tool",
    ],
    painPoints: [
      candidate.signal || "Manual workaround is visible but needs sharper interview evidence.",
      candidate.risk || "Switching cost may be higher than the stated pain.",
      "Existing tools may solve adjacent jobs without owning this wedge.",
    ],
    mvpApproach: `Build only the first-win workflow for "${candidate.title}" and keep everything else manual.`,
    initialOffer: valueLadder(candidate, brief)[1].offer,
    acquisitionChannels: executionChannels(candidate, sources),
    milestones: [
      "Interview 10 people who match the buyer persona.",
      "Ship a clickable demo or concierge workflow.",
      "Run one paid pilot or collect explicit pricing objections.",
      "Promote to council for full strategy and architecture once the wedge survives validation.",
    ],
    successMetrics: [
      "Problem resonance: 5+ calls or 10+ detailed replies.",
      "Activation: 25% of demo visitors complete the first-win path.",
      "Commercial pull: 3 paid pilots, LOIs, or concrete procurement next steps.",
    ],
    risks: [
      candidate.risk || "The pain may be real but not budget-worthy.",
      "Trying to build a broad platform before the wedge has proof.",
      "Overtrusting keyword and source signals without customer interviews.",
    ],
    nextActions: [
      "Write the one-sentence promise and test it in the strongest channel.",
      "Create the lead magnet and use it to recruit interviews.",
      "Build the smallest demo that proves the first win.",
    ],
  };
}

function valueEquation(candidate: IdeaCandidate): ValueEquationInsight {
  const c = confidenceFor(candidate);
  return {
    dreamOutcome: insight(
      "Dream outcome",
      clamp(5 + c.demandEvidence),
      `The buyer gets a visible first win around ${candidate.title}.`,
    ),
    perceivedLikelihood: insight(
      "Perceived likelihood",
      clamp(4 + c.monetizationClarity),
      "Trust depends on proof, demos, and credible source evidence.",
    ),
    timeDelay: insight(
      "Time delay",
      candidate.buildEffort === "low" ? 8 : candidate.buildEffort === "high" ? 4 : 6,
      "Shorter setup and concierge onboarding make the offer easier to believe.",
    ),
    effortAndSacrifice: insight(
      "Effort and sacrifice",
      candidate.buildEffort === "high" ? 4 : 7,
      "Reduce switching cost with imports, templates, and a manual migration path.",
    ),
    improvements: [
      "Increase proof with a specific before/after demo.",
      "Reduce time to value with concierge onboarding.",
      "Remove effort by deferring integrations until one workflow is proven.",
    ],
  };
}

function frameworks(candidate: IdeaCandidate, brief: DiscoveryBrief): FrameworkInsights {
  const c = confidenceFor(candidate);
  const uniqueness = clamp(c.novelty * 2);
  const value = clamp((c.demandEvidence + c.monetizationClarity) * 1.1);
  const quadrant =
    uniqueness >= 7 && value >= 7
      ? "Category king"
      : uniqueness >= 7
        ? "Novel but unproven"
        : value >= 7
          ? "Commodity with demand"
          : "Low-impact hypothesis";
  const categorization: CategorizationInsight = {
    type: candidate.commercial === "weak" ? "Validation or portfolio product" : "SaaS",
    market: brief.goal === "commercial" ? "Commercial" : titleCase(brief.goal),
    target: candidate.targetCustomer || brief.domain,
    mainCompetitor: c.competitionIntensity >= 4 ? "Existing alternatives and broad incumbents" : "Manual status quo",
    trendAnalysis:
      "The report treats trend and keyword signals as directional until verified with live customers and source citations.",
  };
  const acp: ACPInsight = {
    audience: insight("Audience", clamp(c.demandEvidence * 2), candidate.targetCustomer || "Define the buyer more tightly."),
    community: insight("Community", brief.capacity === "ai-assisted" ? 7 : 6, "Use the strongest source lane as the first community."),
    product: insight("Product", clamp(c.buildFit * 2), "Keep the first product narrower than the market category."),
  };
  const matrix: MarketMatrixInsight = {
    uniqueness,
    customerValue: value,
    quadrant,
    detail: "High value plus high uniqueness deserves a full council run; low uniqueness requires distribution advantage.",
  };
  return {
    valueEquation: valueEquation(candidate),
    marketMatrix: matrix,
    acp,
    categorization,
  };
}

function communitySignals(sources: ResearchSource[], brief: DiscoveryBrief): CommunitySignal[] {
  return [
    {
      channel: "Reddit / forums",
      count: `${countSources(sources, "forum")} source lanes`,
      signal: "Look for complaints, workarounds, and repeated questions.",
      firstMove: `Post a problem teardown for ${brief.domain} and ask how people solve it today.`,
    },
    {
      channel: "Launch communities",
      count: `${countSources(sources, "launch")} source lanes`,
      signal: "Launch traction shows whether the promise is legible.",
      firstMove: "Ship a narrow demo and watch which promise gets clicks.",
    },
    {
      channel: "Developer / integration ecosystem",
      count: `${countSources(sources, "code") + countSources(sources, "docs")} source lanes`,
      signal: "Code and docs show whether integrations can create distribution.",
      firstMove: "Publish one integration guide before building a marketplace.",
    },
    {
      channel: "Review and pricing pages",
      count: `${countSources(sources, "review") + countSources(sources, "pricing") + countSources(sources, "competitor")} source lanes`,
      signal: "Pricing and alternatives expose buyer objections.",
      firstMove: "Write an alternatives page that owns one narrow use case.",
    },
  ];
}

function keyword(keyword: string, base: number): KeywordInsight {
  const seed = seedFor(keyword) + base;
  const volume = seed % 3 === 0 ? `${((seed % 90) + 10).toFixed(0)}.0K` : `${((seed % 900) + 100).toFixed(0)}`;
  const growth = seed % 4 === 0 ? `+${(seed % 400) + 20}%` : seed % 5 === 0 ? "flat" : `+${(seed % 90) + 5}%`;
  const competition: KeywordInsight["competition"] = seed % 5 === 0 ? "high" : seed % 3 === 0 ? "medium" : "low";
  return { keyword, volume, growth, competition };
}

function keywordAnalysis(candidate: IdeaCandidate, brief: DiscoveryBrief): KeywordAnalysis {
  const ws = words(`${brief.domain} ${candidate.title} ${candidate.targetCustomer || ""}`).slice(0, 8);
  const baseTopic = ws.slice(0, 3).join(" ") || brief.domain;
  const terms = [
    `${baseTopic} software`,
    `${baseTopic} template`,
    `${baseTopic} automation`,
    `${baseTopic} compliance`,
    `${baseTopic} alternatives`,
    `${baseTopic} dashboard`,
    `${baseTopic} workflow`,
    `${baseTopic} pricing`,
  ];
  const insights = terms.map((term, i) => keyword(term, i * 17));
  return {
    summary:
      "Directional keyword map derived from the discovered topic. Validate with a real keyword tool before treating volumes as market facts.",
    fastestGrowing: insights.slice(0, 3),
    highestVolume: insights.slice(3, 6),
    mostRelevant: [insights[0], insights[2], insights[6]],
  };
}

function founderFit(candidate: IdeaCandidate, brief: DiscoveryBrief): FounderFitInsight {
  const c = confidenceFor(candidate);
  const capacityBoost = brief.capacity === "team" ? 2 : brief.capacity === "ai-assisted" ? 1 : 0;
  const score = clamp(c.buildFit + c.monetizationClarity + capacityBoost, 1, 10);
  return {
    score,
    idealFor: `A ${CAPACITY_LABELS[brief.capacity] || brief.capacity} with access to ${candidate.targetCustomer || brief.domain}.`,
    advantages: [
      "Can talk to the buyer before writing much code.",
      "Can ship a narrow first-win demo quickly.",
      "Can use AI and local artifacts to keep research moving without a large team.",
    ],
    gaps: [
      "Needs real buyer access, not only desk research.",
      "Needs proof of budget or repeated urgency.",
      "Needs a crisp wedge before broad product work starts.",
    ],
    avoidIf: [
      "You cannot reach the buyer directly.",
      "The idea only sounds interesting but does not save time, money, risk, or reputation.",
      "You want to build the full platform before validating the first workflow.",
    ],
    nextMove: "Run the lead magnet and first-win demo tests before promoting the broad version.",
  };
}

function roast(candidate: IdeaCandidate): RoastInsight {
  const c = confidenceFor(candidate);
  return {
    verdict:
      c.overall >= 75
        ? "Worth serious validation, but still not exempt from customer proof."
        : c.overall >= 55
          ? "Promising enough to test, not strong enough to build broadly."
          : "Interesting hypothesis, but it needs sharper demand evidence before build time.",
    blindSpots: [
      candidate.risk || "The buyer may tolerate the current workaround.",
      c.competitionIntensity >= 4
        ? "Crowded alternatives can flatten differentiation unless the wedge is painfully specific."
        : "A quiet market can mean hidden opportunity or absent budget.",
      "The first release can easily become a generic dashboard if the job is not named tightly.",
    ],
    hardQuestions: [
      "Who wakes up already trying to solve this?",
      "What do they stop paying for or stop doing when this works?",
      "What proof would make a skeptical buyer trust it in one screen?",
      "What is the smallest paid version of this idea?",
    ],
    deRiskingMoves: [
      "Sell a manual pilot before building automation.",
      "Record five exact phrases buyers use to describe the pain.",
      "Cut any feature that does not support the first measurable win.",
    ],
  };
}

export function buildCandidateInsightReport(
  brief: DiscoveryBrief,
  candidate: IdeaCandidate,
  sources: ResearchSource[] = [],
): CandidateInsightReport {
  const sourceList = sources.length
    ? sources
    : candidate.sourceUrl
      ? [{
          url: candidate.sourceUrl,
          title: candidate.sourceUrl,
          summary: candidate.signal || candidate.idea,
          kind: "serp" as const,
          sourceType: "search" as const,
          sourceName: "Candidate source",
        }]
      : [];
  return {
    generatedAt: new Date().toISOString(),
    oneLine: `${candidate.title} should be validated as a narrow first-win workflow for ${candidate.targetCustomer || brief.domain}.`,
    scores: scorecard(candidate, sourceList),
    businessFit: businessFit(candidate, brief),
    valueLadder: valueLadder(candidate, brief),
    whyNow: whyNow(candidate, sourceList),
    proofSignals: proofSignals(candidate, sourceList),
    marketGap: marketGap(candidate, brief),
    executionPlan: executionPlan(candidate, brief, sourceList),
    frameworks: frameworks(candidate, brief),
    communitySignals: communitySignals(sourceList, brief),
    keywordAnalysis: keywordAnalysis(candidate, brief),
    founderFit: founderFit(candidate, brief),
    roast: roast(candidate),
    buildActions: [
      "View this full report with the buyer in mind, then delete any section that feels generic.",
      "Run the lead magnet and first-win demo tests.",
      "Promote to council once the wedge survives interviews or paid-pilot outreach.",
    ],
    sources: sourceList.slice(0, 12),
  };
}

export function ensureCandidateInsightReport(
  brief: DiscoveryBrief,
  candidate: IdeaCandidate,
  sources: ResearchSource[] = [],
): CandidateInsightReport {
  return candidate.report ?? buildCandidateInsightReport(brief, candidate, sources);
}

export function renderCandidateInsightReportMarkdown(candidate: IdeaCandidate): string {
  if (!candidate.report) return "";
  const r = candidate.report;
  const lines: string[] = [
    `# Idea report - ${candidate.title}`,
    "",
    r.oneLine,
    "",
    "## Scorecard",
    ...r.scores.map((s) => `- **${s.label}: ${s.score}/10 (${s.rating})** - ${s.detail}`),
    "",
    "## Business fit",
    `- **Revenue potential:** ${r.businessFit.revenuePotential}`,
    `- **Execution difficulty:** ${r.businessFit.executionDifficulty}`,
    `- **Go-to-market:** ${r.businessFit.goToMarket}`,
    `- **Founder fit:** ${r.businessFit.founderFit}`,
    "",
    "## Value ladder",
    ...r.valueLadder.map((stage) => `- **${stage.label}:** ${stage.offer} (${stage.price}) - ${stage.goal}`),
    "",
    "## Why now",
    ...r.whyNow.map((factor) => `- **${factor.label}: ${factor.score}/10** - ${factor.signal}`),
    "",
    "## Proof and signals",
    ...r.proofSignals.map((signal) => `- **${signal.category}: ${signal.score}/10** - ${signal.title}: ${signal.detail}`),
    "",
    "## Market gap",
    "### Underserved segments",
    ...r.marketGap.underservedSegments.map((item) => `- ${item}`),
    "### Feature gaps",
    ...r.marketGap.featureGaps.map((item) => `- ${item}`),
    "### Differentiation levers",
    ...r.marketGap.differentiationLevers.map((item) => `- ${item}`),
    "",
    "## Execution plan",
    `- **Business type:** ${r.executionPlan.businessType}`,
    `- **Timeline:** ${r.executionPlan.timeline}`,
    `- **Budget:** ${r.executionPlan.budget}`,
    `- **MVP approach:** ${r.executionPlan.mvpApproach}`,
    "### Channels",
    ...r.executionPlan.acquisitionChannels.map((c) => `- **${c.channel}:** ${c.format}; metric: ${c.targetMetric}`),
    "### Next actions",
    ...r.executionPlan.nextActions.map((item) => `- ${item}`),
    "",
    "## Framework fit",
    `- **Value equation:** dream ${r.frameworks.valueEquation.dreamOutcome.score}/10, likelihood ${r.frameworks.valueEquation.perceivedLikelihood.score}/10, time delay ${r.frameworks.valueEquation.timeDelay.score}/10, effort ${r.frameworks.valueEquation.effortAndSacrifice.score}/10.`,
    `- **Market matrix:** ${r.frameworks.marketMatrix.quadrant} (${r.frameworks.marketMatrix.detail})`,
    `- **Audience-community-product:** audience ${r.frameworks.acp.audience.score}/10, community ${r.frameworks.acp.community.score}/10, product ${r.frameworks.acp.product.score}/10.`,
    "",
    "## Community signals",
    ...r.communitySignals.map((c) => `- **${c.channel}:** ${c.count}. ${c.firstMove}`),
    "",
    "## Keyword intelligence",
    r.keywordAnalysis.summary,
    ...r.keywordAnalysis.mostRelevant.map((k) => `- **${k.keyword}:** ${k.volume}, ${k.growth}, ${k.competition} competition`),
    "",
    "## Founder fit",
    `Score: ${r.founderFit.score}/10. ${r.founderFit.idealFor}`,
    ...r.founderFit.gaps.map((gap) => `- ${gap}`),
    "",
    "## Roast",
    r.roast.verdict,
    ...r.roast.blindSpots.map((spot) => `- ${spot}`),
    "",
  ];
  return lines.join("\n");
}
