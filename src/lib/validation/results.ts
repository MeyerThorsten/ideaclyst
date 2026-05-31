import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ValidationResult {
  id: string;
  importedAt: string;
  source: "csv" | "text";
  raw: string;
  rows: number;
  positiveSignals: number;
  negativeSignals: number;
  score: number;
  notes: string[];
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function validationDir(): string {
  return join(process.cwd(), dataDir(), "validation");
}

function resultsPath(): string {
  return join(validationDir(), "results.json");
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

export async function listValidationResults(): Promise<ValidationResult[]> {
  try {
    const parsed = JSON.parse(await readFile(resultsPath(), "utf8")) as { results?: ValidationResult[] };
    return Array.isArray(parsed.results) ? parsed.results : [];
  } catch {
    return [];
  }
}

function parseRows(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((row) => row.trim())
    .filter(Boolean)
    .slice(0, 500);
}

export async function importValidationResult(raw: string, source: "csv" | "text"): Promise<ValidationResult> {
  const rows = parseRows(raw);
  const positive = rows.filter((row) => /\b(yes|paid|booked|joined|interested|reply|demo|call|accepted|converted)\b/i.test(row));
  const negative = rows.filter((row) => /\b(no|not interested|unsubscribe|too expensive|blocked|failed|bounce)\b/i.test(row));
  const score = Math.max(0, Math.min(100, Math.round(50 + positive.length * 8 - negative.length * 6)));
  const result: ValidationResult = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    importedAt: new Date().toISOString(),
    source,
    raw,
    rows: rows.length,
    positiveSignals: positive.length,
    negativeSignals: negative.length,
    score,
    notes: [
      `${positive.length} positive signal rows.`,
      `${negative.length} negative or blocking rows.`,
      "Original raw input retained for audit.",
    ],
  };
  const current = await listValidationResults();
  const next = [result, ...current].slice(0, 200);
  await mkdir(validationDir(), { recursive: true });
  await writeAtomic(resultsPath(), JSON.stringify({ updatedAt: new Date().toISOString(), results: next }, null, 2));
  await writeAtomic(join(validationDir(), "VALIDATION_RESULTS.md"), [
    "# Validation Results",
    "",
    ...next.map((item) => [
      `## ${item.importedAt}`,
      "",
      `- Source: ${item.source}`,
      `- Rows: ${item.rows}`,
      `- Score: ${item.score}/100`,
      `- Positive: ${item.positiveSignals}`,
      `- Negative: ${item.negativeSignals}`,
      "",
      "```",
      item.raw.slice(0, 4000),
      "```",
      "",
    ].join("\n")),
  ].join("\n"));
  return result;
}
