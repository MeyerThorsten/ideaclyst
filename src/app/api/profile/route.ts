import { NextResponse } from "next/server";

import { getFounderProfile, saveFounderProfile } from "@/lib/profile/store";
import {
  BUILDER_STAGES,
  CAPITAL_RANGES,
  FounderProfileInput,
  RISK_TOLERANCES,
  SALES_COMFORT_LEVELS,
} from "@/lib/profile/types";

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return value.split(/[\n,]/);
  return [];
}

export async function GET() {
  const profile = await getFounderProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const input: FounderProfileInput = {};

  if (isOneOf(b.builderStage, BUILDER_STAGES)) input.builderStage = b.builderStage;
  if (isOneOf(b.riskTolerance, RISK_TOLERANCES)) input.riskTolerance = b.riskTolerance;
  if (isOneOf(b.salesComfort, SALES_COMFORT_LEVELS)) input.salesComfort = b.salesComfort;
  if (isOneOf(b.capital, CAPITAL_RANGES)) input.capital = b.capital;
  input.weeklyHours = Number(b.weeklyHours);
  input.domainAccess = typeof b.domainAccess === "string" ? b.domainAccess : "";
  input.skills = list(b.skills);
  input.preferredMarkets = list(b.preferredMarkets);
  input.avoidedMarkets = list(b.avoidedMarkets);
  input.unfairAdvantages = typeof b.unfairAdvantages === "string" ? b.unfairAdvantages : "";
  input.notes = typeof b.notes === "string" ? b.notes : "";

  const profile = await saveFounderProfile(input);
  return NextResponse.json({ profile });
}
