/**
 * Mock backend. Returns realistic, idea-aware Markdown for each council step so
 * the full packet looks credible in a demo without invoking any real CLI. The
 * content weaves in the actual idea/title/customer so it reads as bespoke. A
 * small artificial delay per step lets the UI visibly transition
 * queued → running → completed.
 */

import { Run } from "../runs/types";

export type CouncilStepKey =
  | "marketResearch"
  | "productStrategy"
  | "technicalArchitecture"
  | "claudeCritique"
  | "codexCritique"
  | "finalPlan";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function subject(run: Run): string {
  return run.title || "this product";
}

function customer(run: Run): string {
  return run.targetCustomer || "the target customer";
}

function stack(run: Run): string {
  return run.preferredStack || "a TypeScript + Next.js + Postgres stack";
}

function marketResearch(run: Run): string {
  return `## What the web suggests
A scan of the space around "${run.idea}" shows ${customer(run)} already reaching for
spreadsheets, generic SaaS, and a couple of point tools — a sign the pain is real but
under-served, not unsolved.

## Likely incumbents & alternatives
- A heavyweight platform that does this as one feature among many (powerful, slow to adopt).
- A cheaper niche tool that nails part of the job but lacks the wedge's "first win".
- The status quo: manual process + spreadsheets, which is the real competitor to beat.

## Demand signals
- Recurring questions/complaints in the communities where ${customer(run)} gathers.
- Steady (not spiking) search interest — a durable problem rather than a fad.
- Adjacent tools showing healthy adoption, implying budget exists in this category.

## Implications for strategy
Differentiate on speed-to-value and a ruthless wedge; assume switching cost is the main
barrier, not awareness.`;
}

function productStrategy(run: Run): string {
  return `## Problem & who feels it
${subject(run)} targets a real pain for ${customer(run)}: the idea — "${run.idea}" — points at a workflow that is currently manual, fragmented, or simply tolerated. The people who feel it most are those who hit it weekly and already cobble together spreadsheets or point tools to cope.

## The wedge
Don't boil the ocean. The sharpest initial use case is the single most painful slice of "${run.idea}". Win that one job completely before expanding. A narrow wedge that delights beats a broad product that's merely adequate.

## Target customer & willingness to pay
Primary: ${customer(run)}. They have budget when the pain maps to lost time or lost revenue. Price on value, not features — a clear before/after time saving justifies a recurring seat or usage fee.

## Differentiation
Generic tools treat this as a side feature; incumbents are heavy and slow to adopt. The opening is a focused, fast, opinionated product that nails the wedge and has an obvious "aha" in the first session.

## Go-to-market angle
Land via a free, self-serve "first win" that requires no sales call. Distribute where ${customer(run)} already gathers (communities, marketplaces, integrations). Expand within the account once the wedge is trusted.

## Riskiest assumptions
- That ${customer(run)} will change an entrenched habit for this.
- That the wedge is painful enough to pay for *now*, not "someday".
- That we can deliver the first win fast enough to matter.`;
}

function technicalArchitecture(run: Run): string {
  return `## Recommended stack
Use ${stack(run)}. It's boring, fast to hire for, and lets a small team ship the wedge in weeks. Avoid novel infrastructure until the product is validated.

## Core data model
- \`Account\` / \`User\` — auth and ownership.
- \`Workspace\` — the unit ${customer(run)} works inside.
- \`Item\` — the core object the wedge acts on (derived from "${run.idea}").
- \`Event\` — append-only log for activity, undo, and later analytics.

## Key components
- A thin web app (server-rendered) for the core flow.
- A small job worker for anything slow or async.
- One well-chosen third-party API for the hardest non-core capability — buy, don't build.

## Build risks
- Over-investing in scale before product-market fit.
- Coupling the wedge to a fragile external dependency.
- Premature multi-tenant complexity.

## Sequencing — what to build first
1. Auth + workspace + the single wedge flow, end to end.
2. The "first win" output that proves value.
3. Persistence + minimal history.
4. Only then: integrations, collaboration, settings.`;
}

function claudeCritique(run: Run): string {
  return `## Where it's over-engineered
For an MVP of ${subject(run)}, the job worker and the append-only \`Event\` log are likely premature — they add moving parts before we've proven anyone wants the wedge. Cut them from v1 and add them when a real need appears.

## Does it serve the wedge?
Mostly yes, but the multi-object data model risks diffusing focus. The first release should obsess over the single \`Item\` flow that delivers the "first win" for ${customer(run)} and ignore everything else.

## What I'd cut to ship in weeks
- Defer collaboration, settings, and integrations.
- Start with a single workspace per account (no sharing).
- Use the simplest possible persistence; skip the event log.

## Where it adds risk without value
Any custom infrastructure. Lean entirely on managed services so the team spends its weeks on the wedge, not on plumbing.`;
}

function codexCritique(run: Run): string {
  return `## Expensive or infeasible assumptions
The strategy's "first win with no sales call" is right, but assumes the wedge can be delivered with zero configuration. For "${run.idea}", some setup (data import, connecting a source) is likely unavoidable — budget engineering for a frictionless onboarding, or the self-serve motion stalls.

## Where GTM outruns delivery
Distributing through integrations sounds cheap but each integration is real, ongoing engineering. Pick exactly one to start; treat the rest as validated demand before building.

## Technical constraints that should reshape strategy
- The "instant aha" may require precomputation or caching — design the wedge so the first result is fast even if the full feature set isn't.
- Willingness to pay should be tied to a metric we can actually meter from day one.

## Constructive bottom line
The strategy is sound if scope stays ruthless. Anchor every GTM promise to something the MVP can technically deliver in the first release.`;
}

function finalPlan(run: Run): string {
  return `## Summary
${subject(run)} should launch as a focused, self-serve tool that nails one painful slice of "${run.idea}" for ${customer(run)}. Win the wedge with an instant "first win," price on the value of time saved, and resist scope creep until there's pull. Build on ${stack(run)} with managed services so the team spends its weeks on the wedge, not plumbing.

## MVP Backlog
1. Auth + single workspace per account.
2. The core wedge flow on one \`Item\` object, end to end.
3. The "first win" output that demonstrates value in the first session.
4. Frictionless onboarding for the one unavoidable setup step.
5. Minimal persistence and history (no event log yet).
6. A single, metered usage signal to support value-based pricing.

## Risks
- **Habit change** — ${customer(run)} may not switch. *Mitigation:* make the first win faster than their current workaround.
- **Onboarding friction** — setup could stall self-serve. *Mitigation:* invest in import/connect UX before launch.
- **Premature scope** — integrations/collab dilute focus. *Mitigation:* ship one integration only after validated demand.

## Validation Tests
- **Wedge demand:** landing page → activation rate of the first win. Success: ≥25% of signups reach the "aha".
- **Willingness to pay:** offer a paid tier at launch. Success: ≥5 paying workspaces in 30 days.
- **Retention:** week-2 return rate. Success: ≥30% come back unprompted.

## Next Prompts
- "Scaffold a ${stack(run)} app with auth, one workspace per account, and a single \`Item\` CRUD flow for ${subject(run)}."
- "Design a frictionless onboarding screen that gets a new ${customer(run)} to their first win in under two minutes."
- "Write an instrumentation plan that meters one usage signal for value-based pricing."`;
}

const GENERATORS: Record<CouncilStepKey, (run: Run) => string> = {
  marketResearch,
  productStrategy,
  technicalArchitecture,
  claudeCritique,
  codexCritique,
  finalPlan,
};

export async function runMock(run: Run, stepKey: CouncilStepKey): Promise<string> {
  // Visible-but-snappy progress for the polling UI.
  await delay(300 + Math.floor(Math.random() * 300));
  return GENERATORS[stepKey](run);
}
