import { CandidateRef } from "../discovery/candidates";
import { CandidateInsightReport, IdeaCandidate } from "../research/types";

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function score(report: CandidateInsightReport, label: string): number {
  return report.scores.find((item) => item.label === label)?.score || 0;
}

export function renderPrdFromCandidate(ref: CandidateRef): string {
  const { candidate, discovery, report } = ref;
  return [
    `# PRD: ${candidate.title}`,
    "",
    `**Source:** ${ref.href}`,
    `**Market:** ${discovery.domain}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "## Problem",
    report.oneLine,
    "",
    "## Target Users",
    bullets(report.executionPlan.buyerPersonas),
    "",
    "## MVP Scope",
    report.executionPlan.mvpApproach,
    "",
    "## Milestones",
    bullets(report.executionPlan.milestones),
    "",
    "## Acceptance Criteria",
    bullets(report.executionPlan.successMetrics),
    "",
    "## Risks",
    bullets(report.executionPlan.risks),
    "",
    "## Evidence",
    bullets(report.sources.slice(0, 8).map((source) => `${source.title || source.url} — ${source.url}`)),
  ].join("\n");
}

export function renderFunnel(ref: CandidateRef): string {
  const { candidate, report } = ref;
  const core = report.valueLadder.find((stage) => stage.stage === "core");
  return [
    `# Minimum Viable Funnel: ${candidate.title}`,
    "",
    "## Positioning",
    report.oneLine,
    "",
    "## Lead Magnet",
    report.valueLadder[0]?.offer || "Problem checklist",
    "",
    "## Landing Page Copy",
    `Hero: ${candidate.title}`,
    `Subhead: ${report.businessFit.goToMarket}`,
    `CTA: Start with ${core?.offer || "the focused pilot"}`,
    "",
    "## Outreach Sequence",
    bullets(report.executionPlan.acquisitionChannels.map((channel) => `${channel.channel}: ${channel.format} targeting ${channel.targetMetric}`)),
    "",
    "## First Traffic Channel",
    report.executionPlan.acquisitionChannels[0]
      ? `${report.executionPlan.acquisitionChannels[0].channel} — ${report.executionPlan.acquisitionChannels[0].why}`
      : "No channel recorded.",
  ].join("\n");
}

export function landingPageDraft(ref: CandidateRef) {
  const { candidate, report } = ref;
  const offer = report.valueLadder.find((stage) => stage.stage === "frontend") || report.valueLadder[1];
  return {
    hero: candidate.title,
    subhead: report.oneLine,
    pains: report.executionPlan.painPoints.slice(0, 4),
    proof: [
      ...report.proofSignals.map((signal) => `${signal.category}: ${signal.detail}`),
      ...(report.existingProducts?.length ? [`Competition exists: ${report.existingProducts[0].title}`] : []),
    ].slice(0, 5),
    offer: offer ? `${offer.offer} — ${offer.price}` : report.executionPlan.initialOffer,
    cta: `Join the ${candidate.title} validation pilot`,
    metric: report.executionPlan.successMetrics[0] || "Qualified buyer asks for a follow-up.",
    faqs: report.roast.hardQuestions.slice(0, 4).map((question, index) => ({
      question,
      answer: report.roast.deRiskingMoves[index % report.roast.deRiskingMoves.length] || "Validate this directly with the first customer conversations.",
    })),
  };
}

export function renderLandingPageMarkdown(ref: CandidateRef): string {
  const draft = landingPageDraft(ref);
  return [
    `# Landing Page Draft: ${draft.hero}`,
    "",
    `## Hero\n${draft.hero}`,
    "",
    `## Subhead\n${draft.subhead}`,
    "",
    "## Pain",
    bullets(draft.pains),
    "",
    "## Proof",
    bullets(draft.proof),
    "",
    `## Offer\n${draft.offer}`,
    "",
    `## CTA\n${draft.cta}`,
    "",
    `## Validation Metric\n${draft.metric}`,
    "",
    "## FAQ",
    ...draft.faqs.map((faq) => `### ${faq.question}\n${faq.answer}\n`),
  ].join("\n");
}

export function renderPrivacyRisk(ref: CandidateRef): string {
  const text = `${ref.candidate.title} ${ref.candidate.idea} ${ref.report.executionPlan.risks.join(" ")}`.toLowerCase();
  const flags = [
    ["Sensitive data", /\b(health|finance|children|student|patient|medical|personal data|pii)\b/.test(text)],
    ["Scraping dependency", /\b(scrap|crawl|browser|web data|source)\b/.test(text)],
    ["Regulated buyer", /\b(compliance|legal|finance|health|education|insurance)\b/.test(text)],
  ].filter(([, hit]) => hit).map(([label]) => label as string);
  return [
    `# Privacy & Compliance Risk Review: ${ref.candidate.title}`,
    "",
    flags.length ? `**Risk flags:** ${flags.join(", ")}` : "**Risk flags:** No obvious high-risk flags in the saved report.",
    "",
    "## Review Notes",
    bullets([
      "Confirm what data is collected before building the MVP.",
      "Prefer manual validation and public evidence before adding user data storage.",
      "Avoid stating legal conclusions; capture uncertainty and ask a qualified expert when needed.",
    ]),
    "",
    "## Stricter Validation Criteria",
    bullets(ref.report.roast.hardQuestions),
  ].join("\n");
}

export function pricingExperiments(ref: CandidateRef): string[] {
  return ref.report.valueLadder.slice(1, 4).map((stage) =>
    `${stage.label}: test ${stage.offer} at ${stage.price}; success means 3+ buyers ask for a next step within 14 days.`,
  );
}

export function buyerPersonas(ref: CandidateRef): string[] {
  return ref.report.executionPlan.buyerPersonas.map((persona, index) =>
    `${persona}: skeptical about ${ref.report.roast.blindSpots[index % ref.report.roast.blindSpots.length] || ref.candidate.risk || "unclear ROI"}. Ask: "${ref.report.roast.hardQuestions[index % ref.report.roast.hardQuestions.length] || "What would make this urgent?"}"`,
  );
}

export function advisorAnswers(ref: CandidateRef): string[] {
  return [
    `Best next move: ${ref.report.founderFit.nextMove}`,
    `Main objection: ${ref.report.roast.verdict}`,
    `Opportunity score: ${score(ref.report, "Opportunity")}/10`,
    `Use this only as report-grounded guidance; unknowns remain unknown until validated.`,
  ];
}

export function projectTasks(ref: CandidateRef): string[] {
  return [
    ...ref.report.executionPlan.nextActions,
    ...ref.report.buildActions,
    ...ref.report.executionPlan.milestones.map((milestone) => `Milestone: ${milestone}`),
  ].slice(0, 12);
}

export function candidateSearchText(candidate: IdeaCandidate): string {
  return [candidate.title, candidate.idea, candidate.targetCustomer, candidate.signal, candidate.risk]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
