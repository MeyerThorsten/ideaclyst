/**
 * Shared types for the research layer (market research, competitor teardown,
 * idea-discovery scouting). All research is best-effort: results carry ok/degraded
 * flags and a human-readable note instead of throwing.
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export type ResearchSourceType =
  | "search"
  | "competitor"
  | "forum"
  | "launch"
  | "code"
  | "review"
  | "pricing"
  | "community"
  | "docs";

export interface ResearchSource {
  url: string;
  title: string;
  summary: string;
  kind: "serp" | "page";
  sourceType?: ResearchSourceType;
  sourceName?: string;
}

export interface ResearchTimelineEvent {
  at: string;
  label: string;
  detail: string;
  status: "done" | "partial" | "skipped" | "failed";
}

export interface DossierEntry {
  id: string;
  url: string;
  title: string;
  sourceType: ResearchSourceType;
  sourceName?: string;
  retrievedAt: string;
  summary: string;
  extractedClaims: string[];
  painSignals: string[];
  pricingSignals: string[];
  competitorsMentioned: string[];
  confidence: number;
}

export interface CompetitorProfile {
  name: string;
  url: string;
  positioning: string;
  targetCustomer: string;
  pricingSignal: string;
  featureSignals: string[];
  strengths: string[];
  weaknesses: string[];
  differentiationOpening: string;
  landingPageCritique: string;
}

export interface OpportunityZone {
  quadrant:
    | "high-pain-low-competition"
    | "high-pain-high-competition"
    | "low-pain-low-competition"
    | "low-pain-high-competition";
  label: string;
  description: string;
  opportunities: string[];
}

export interface DistributionChannel {
  channel: string;
  whyItFits: string;
  firstMove: string;
  evidenceUrl?: string;
}

export interface ValidationExperiment {
  name: string;
  audience: string;
  channel: string;
  script: string;
  successMetric: string;
  evidenceUrl?: string;
}

export interface ScopeNegotiation {
  mustHave: string[];
  wedgeOnly: string[];
  defer: string[];
  dangerousScopeCreep: string[];
}

export interface CompetitorWatchItem {
  target: string;
  url: string;
  watchFor: string[];
  baseline: string;
}

export interface ResearchToolkit {
  generatedAt: string;
  timeline: ResearchTimelineEvent[];
  dossier: DossierEntry[];
  competitorMatrix: CompetitorProfile[];
  opportunityMap: OpportunityZone[];
  distributionChannels: DistributionChannel[];
  validationExperiments: ValidationExperiment[];
  killCriteria: string[];
  scopeNegotiation: ScopeNegotiation;
  founderBrief: string;
  watchlist: CompetitorWatchItem[];
}

export interface ResearchResult {
  ok: boolean; // true if any real web data was gathered
  degraded: boolean; // true if it fell back / hit caps / Chrome missing
  note?: string; // human-readable status, surfaced in the findings doc
  findings: string; // researchFindings Markdown — ALWAYS non-empty
  sources: ResearchSource[];
  toolkit?: ResearchToolkit;
}

export type EffortLevel = "low" | "moderate" | "high";
export type CommercialStrength = "strong" | "medium" | "weak";

export interface IdeaCandidate {
  id: string;
  title: string;
  idea: string; // the wedge / what it does in 1–2 sentences
  targetCustomer?: string; // who pays
  buildEffort?: EffortLevel;
  commercial?: CommercialStrength;
  risk?: string; // the main risk, one line
  fit?: string; // why it fits the stated goal + capacity
  signal?: string; // the demand signal that surfaced it
  sourceUrl?: string;
  confidence?: CandidateConfidence;
  killCriteria?: string[];
  forYou?: {
    score: number;
    reasons: string[];
  };
  report?: CandidateInsightReport;
}

export interface CandidateConfidence {
  demandEvidence: number;
  competitionIntensity: number;
  buildFit: number;
  monetizationClarity: number;
  novelty: number;
  overall: number;
}

export interface InsightScore {
  label: string;
  score: number;
  rating: string;
  detail: string;
}

export interface BusinessFitInsight {
  revenuePotential: string;
  executionDifficulty: string;
  goToMarket: string;
  founderFit: string;
}

export interface ValueLadderStage {
  stage: "lead-magnet" | "frontend" | "core" | "continuity" | "backend";
  label: string;
  offer: string;
  price: string;
  valueProvided: string;
  goal: string;
}

export interface WhyNowFactor {
  label: string;
  score: number;
  signal: string;
  detail: string;
  evidenceUrl?: string;
}

export interface ProofSignal {
  category: string;
  score: number;
  title: string;
  detail: string;
  evidenceUrl?: string;
}

export interface MarketGapInsight {
  underservedSegments: string[];
  featureGaps: string[];
  differentiationLevers: string[];
}

export interface ExecutionChannel {
  channel: string;
  cadence: string;
  why: string;
  format: string;
  targetMetric: string;
}

export interface ExecutionPlanInsight {
  businessType: string;
  timeline: string;
  budget: string;
  buyerPersonas: string[];
  painPoints: string[];
  mvpApproach: string;
  initialOffer: string;
  acquisitionChannels: ExecutionChannel[];
  milestones: string[];
  successMetrics: string[];
  risks: string[];
  nextActions: string[];
}

export interface ValueEquationInsight {
  dreamOutcome: InsightScore;
  perceivedLikelihood: InsightScore;
  timeDelay: InsightScore;
  effortAndSacrifice: InsightScore;
  improvements: string[];
}

export interface MarketMatrixInsight {
  uniqueness: number;
  customerValue: number;
  quadrant: string;
  detail: string;
}

export interface ACPInsight {
  audience: InsightScore;
  community: InsightScore;
  product: InsightScore;
}

export interface CategorizationInsight {
  type: string;
  market: string;
  target: string;
  mainCompetitor: string;
  trendAnalysis: string;
}

export interface FrameworkInsights {
  valueEquation: ValueEquationInsight;
  marketMatrix: MarketMatrixInsight;
  acp: ACPInsight;
  categorization: CategorizationInsight;
}

export interface CommunitySignal {
  channel: string;
  count: string;
  signal: string;
  firstMove: string;
}

export interface KeywordInsight {
  keyword: string;
  volume: string;
  growth: string;
  competition: "low" | "medium" | "high";
}

export interface KeywordAnalysis {
  summary: string;
  fastestGrowing: KeywordInsight[];
  highestVolume: KeywordInsight[];
  mostRelevant: KeywordInsight[];
  source?: string;
  freshness?: string;
  generatedAt?: string;
}

export interface FounderFitInsight {
  score: number;
  idealFor: string;
  advantages: string[];
  gaps: string[];
  avoidIf: string[];
  nextMove: string;
}

export interface RoastInsight {
  verdict: string;
  blindSpots: string[];
  hardQuestions: string[];
  deRiskingMoves: string[];
}

export interface ExistingProductMatch {
  title: string;
  url: string;
  sourceName: string;
  sourceType: ResearchSourceType | "unknown";
  strength: "strong" | "possible";
  rationale: string;
}

export interface CandidateInsightReport {
  generatedAt: string;
  oneLine: string;
  scores: InsightScore[];
  businessFit: BusinessFitInsight;
  valueLadder: ValueLadderStage[];
  whyNow: WhyNowFactor[];
  proofSignals: ProofSignal[];
  marketGap: MarketGapInsight;
  executionPlan: ExecutionPlanInsight;
  frameworks: FrameworkInsights;
  communitySignals: CommunitySignal[];
  keywordAnalysis: KeywordAnalysis;
  founderFit: FounderFitInsight;
  roast: RoastInsight;
  buildActions: string[];
  existingProducts?: ExistingProductMatch[];
  sources: ResearchSource[];
}

export interface DiscoveryScoutResult {
  ok: boolean;
  degraded: boolean;
  note?: string;
  sources: ResearchSource[];
  timeline?: ResearchTimelineEvent[];
  opportunityMap?: OpportunityZone[];
}

/** The founder's brief for an idea-discovery run. */
export interface DiscoveryBrief {
  domain: string;
  goal: string; // commercial | portfolio | learning | personal
  capacity: string; // solo-pro | solo-learning | team | ai-assisted
  constraints?: string;
}

export interface DiscoveryOutput {
  marketRead: string;
  candidates: IdeaCandidate[];
  sources: ResearchSource[];
  degraded: boolean;
  note?: string;
}
