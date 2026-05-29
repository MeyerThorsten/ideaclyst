/**
 * Splits the council's final synthesis (one Markdown document) into the named
 * sections the UI surfaces as tabs. The final-synthesis prompt asks Claude to
 * use these exact `##` headings; this matcher is forgiving (case-insensitive,
 * keyword-based) so a slightly-off heading still routes to the right tab.
 *
 * If a section can't be found, the caller falls back to showing the full final
 * plan, so the packet is never blank.
 */

export interface FinalSections {
  summary: string;
  mvpBacklog: string;
  risks: string;
  validationTests: string;
  nextPrompts: string;
}

interface SectionSpec {
  key: keyof FinalSections;
  /** keywords; a heading matches if it contains any of these */
  match: string[];
}

const SECTIONS: SectionSpec[] = [
  { key: "summary", match: ["summary", "overview", "executive"] },
  { key: "mvpBacklog", match: ["mvp", "backlog", "scope", "milestone"] },
  { key: "risks", match: ["risk", "assumption", "unknown"] },
  { key: "validationTests", match: ["validation", "experiment", "test", "metric"] },
  { key: "nextPrompts", match: ["next prompt", "next step", "prompts", "handoff"] },
];

interface ParsedHeading {
  title: string;
  body: string;
}

/** Break a document into top-level (`##`) sections with their bodies. */
function parseSections(md: string): ParsedHeading[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: ParsedHeading[] = [];
  let current: ParsedHeading | null = null;

  for (const line of lines) {
    // treat ## or ### as a section boundary (## preferred, ### tolerated)
    const h = line.match(/^#{2,3}\s+(.*)$/);
    if (h) {
      if (current) out.push(current);
      current = { title: h[1].trim(), body: "" };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) out.push(current);
  return out;
}

export function splitFinalPlan(finalPlan: string): FinalSections {
  const result: FinalSections = {
    summary: "",
    mvpBacklog: "",
    risks: "",
    validationTests: "",
    nextPrompts: "",
  };

  const parsed = parseSections(finalPlan);

  for (const section of parsed) {
    const titleLower = section.title.toLowerCase();
    for (const spec of SECTIONS) {
      if (result[spec.key]) continue; // first match wins
      if (spec.match.some((kw) => titleLower.includes(kw))) {
        result[spec.key] = section.body.trim();
        break;
      }
    }
  }

  return result;
}
