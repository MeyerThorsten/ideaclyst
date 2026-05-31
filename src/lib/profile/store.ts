import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  BUILDER_STAGES,
  CAPITAL_RANGES,
  defaultFounderProfile,
  FounderProfile,
  FounderProfileInput,
  RISK_TOLERANCES,
  SALES_COMFORT_LEVELS,
} from "./types";
import { profileToDiscoveryContext } from "./summary";

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function profileDir(): string {
  return join(process.cwd(), dataDir(), "profile");
}

function profileJsonPath(): string {
  return join(profileDir(), "profile.json");
}

function profileMarkdownPath(): string {
  return join(profileDir(), "PROFILE.md");
}

async function writeFileAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 16);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function clampHours(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(80, Math.round(n)));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

function profileMarkdown(profile: FounderProfile): string {
  const context = profileToDiscoveryContext(profile) || "No founder profile details yet.";
  return [
    "# Founder Profile",
    "",
    context,
    "",
    "## Raw fields",
    "",
    `- Builder stage: ${profile.builderStage}`,
    `- Weekly hours: ${profile.weeklyHours}`,
    `- Risk tolerance: ${profile.riskTolerance}`,
    `- Sales comfort: ${profile.salesComfort}`,
    `- Capital: ${profile.capital}`,
    `- Updated: ${profile.updatedAt}`,
    "",
  ].join("\n");
}

function normalizeProfile(input: FounderProfileInput, previous?: FounderProfile): FounderProfile {
  const base = previous ?? defaultFounderProfile();
  return {
    id: "local-founder",
    updatedAt: new Date().toISOString(),
    builderStage: pick(input.builderStage, BUILDER_STAGES, base.builderStage),
    weeklyHours: clampHours(input.weeklyHours ?? base.weeklyHours),
    riskTolerance: pick(input.riskTolerance, RISK_TOLERANCES, base.riskTolerance),
    salesComfort: pick(input.salesComfort, SALES_COMFORT_LEVELS, base.salesComfort),
    capital: pick(input.capital, CAPITAL_RANGES, base.capital),
    domainAccess: typeof input.domainAccess === "string" ? input.domainAccess.trim().slice(0, 800) : base.domainAccess,
    skills: splitList(input.skills ?? base.skills),
    preferredMarkets: splitList(input.preferredMarkets ?? base.preferredMarkets),
    avoidedMarkets: splitList(input.avoidedMarkets ?? base.avoidedMarkets),
    unfairAdvantages: typeof input.unfairAdvantages === "string" ? input.unfairAdvantages.trim().slice(0, 800) : base.unfairAdvantages,
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 1000) : base.notes,
  };
}

export async function getFounderProfile(): Promise<FounderProfile | null> {
  let raw: string;
  try {
    raw = await readFile(profileJsonPath(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[ideaclyst] failed to read founder profile:", err);
    }
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as FounderProfile;
    return { ...normalizeProfile(parsed, parsed), updatedAt: parsed.updatedAt || new Date().toISOString() };
  } catch (err) {
    console.error("[ideaclyst] corrupted founder profile (treating as missing):", err);
    return null;
  }
}

export async function saveFounderProfile(input: FounderProfileInput): Promise<FounderProfile> {
  const previous = await getFounderProfile();
  const profile = normalizeProfile(input, previous ?? undefined);
  await mkdir(profileDir(), { recursive: true });
  await writeFileAtomic(profileJsonPath(), JSON.stringify(profile, null, 2));
  await writeFileAtomic(profileMarkdownPath(), profileMarkdown(profile));
  return profile;
}
