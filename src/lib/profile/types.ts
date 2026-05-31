export type BuilderStage = "exploring" | "validating" | "building" | "scaling";
export type RiskTolerance = "low" | "medium" | "high";
export type SalesComfort = "low" | "medium" | "high";
export type CapitalRange = "none" | "small" | "moderate" | "significant";

export interface FounderProfile {
  id: "local-founder";
  updatedAt: string;
  builderStage: BuilderStage;
  weeklyHours: number;
  riskTolerance: RiskTolerance;
  salesComfort: SalesComfort;
  capital: CapitalRange;
  domainAccess: string;
  skills: string[];
  preferredMarkets: string[];
  avoidedMarkets: string[];
  unfairAdvantages: string;
  notes: string;
}

export interface FounderProfileInput {
  builderStage?: BuilderStage;
  weeklyHours?: number;
  riskTolerance?: RiskTolerance;
  salesComfort?: SalesComfort;
  capital?: CapitalRange;
  domainAccess?: string;
  skills?: string[];
  preferredMarkets?: string[];
  avoidedMarkets?: string[];
  unfairAdvantages?: string;
  notes?: string;
}

export const BUILDER_STAGES: BuilderStage[] = ["exploring", "validating", "building", "scaling"];
export const RISK_TOLERANCES: RiskTolerance[] = ["low", "medium", "high"];
export const SALES_COMFORT_LEVELS: SalesComfort[] = ["low", "medium", "high"];
export const CAPITAL_RANGES: CapitalRange[] = ["none", "small", "moderate", "significant"];

export function defaultFounderProfile(): FounderProfile {
  return {
    id: "local-founder",
    updatedAt: new Date().toISOString(),
    builderStage: "exploring",
    weeklyHours: 10,
    riskTolerance: "medium",
    salesComfort: "medium",
    capital: "small",
    domainAccess: "",
    skills: [],
    preferredMarkets: [],
    avoidedMarkets: [],
    unfairAdvantages: "",
    notes: "",
  };
}
