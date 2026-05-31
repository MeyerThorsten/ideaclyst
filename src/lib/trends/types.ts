export type TrendConfidence = "weak" | "directional" | "strong";

export interface TrendCandidateRef {
  id: string;
  title: string;
  href: string;
  score?: number;
}

export interface TrendSignal {
  id: string;
  term: string;
  market: string;
  summary: string;
  growthNote: string;
  confidence: TrendConfidence;
  confidenceScore: number;
  sourceCount: number;
  sourceUrls: string[];
  relatedCommunities: string[];
  candidateIdeas: TrendCandidateRef[];
  firstSeenAt: string;
  updatedAt: string;
}

export interface TrendRadarState {
  generatedAt: string;
  signals: TrendSignal[];
}
