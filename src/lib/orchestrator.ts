/**
 * The council orchestrator. `startRun` runs the 5-step Claude+Codex deliberation
 * for a queued run, persisting progress after every step so the polling client
 * sees outputs appear live. It is fired without await from the POST handler;
 * disk (run.json) is the only state, so a server restart can't lose a result
 * (an interrupted run simply stops updating — see the README caveat).
 */

import { getRun, updateRun, writeRunFile } from "./runs/store";
import { Run, RunOutputs } from "./runs/types";
import { runAgent, CouncilStepKey } from "./agents";
import {
  productStrategyPrompt,
  technicalArchitecturePrompt,
  claudeCritiquePrompt,
  codexCritiquePrompt,
  finalSynthesisPrompt,
} from "./agents/prompts";
import { splitFinalPlan } from "./runs/markdown";
import { runMarketResearch } from "./research";

function transcriptBlock(label: string, body: string): string {
  return `\n\n---\n\n## ${label}\n\n${body.trim()}\n`;
}

export async function startRun(runId: string): Promise<void> {
  let run = await getRun(runId);
  if (!run) return;
  if (run.status !== "queued") return; // already started/finished

  try {
    run = await updateRun(runId, { status: "running", currentStep: "Market research" });
    let transcript = `# Council transcript — ${run.title}\n`;

    const persistStep = async (
      patch: Partial<RunOutputs>,
      label: string,
      body: string,
      nextStep?: string,
    ): Promise<Run> => {
      transcript += transcriptBlock(label, body);
      await writeRunFile(runId, "TRANSCRIPT.md", transcript);
      return updateRun(runId, {
        outputs: { ...patch, transcript },
        ...(nextStep ? { currentStep: nextStep } : {}),
      });
    };

    const call = (agent: "claude" | "codex", prompt: string, stepKey: CouncilStepKey) =>
      runAgent(agent, prompt, { run: run as Run, stepKey });

    // Step 0 — Web research (best-effort; never throws). Grounds every later step.
    // Skipped (with a note) when the founder turns it off in the form.
    const researchFindings =
      run.includeResearch === false
        ? "_Web research was turned off for this run._"
        : (await runMarketResearch(run, { competitorUrls: run.competitorUrls })).findings;
    await writeRunFile(runId, "RESEARCH_FINDINGS.md", researchFindings);
    run = await persistStep(
      { researchFindings },
      "Web Research",
      researchFindings,
      "Product strategy",
    );

    // Step 1 — Claude: product strategy
    const productStrategy = await call(
      "claude",
      productStrategyPrompt(run, researchFindings),
      "productStrategy",
    );
    await writeRunFile(runId, "PRODUCT_STRATEGY.md", productStrategy);
    run = await persistStep(
      { productStrategy },
      "Claude — Product Strategist",
      productStrategy,
      "Technical architecture",
    );

    // Step 2 — Codex: technical architecture (sees Claude's strategy)
    const technicalArchitecture = await call(
      "codex",
      technicalArchitecturePrompt(run, productStrategy, researchFindings),
      "technicalArchitecture",
    );
    await writeRunFile(runId, "TECHNICAL_ARCHITECTURE.md", technicalArchitecture);
    run = await persistStep(
      { technicalArchitecture },
      "Codex — Pragmatic CTO",
      technicalArchitecture,
      "Claude critiques the architecture",
    );

    // Step 3 — Claude: critique of Codex's plan
    const claudeCritique = await call(
      "claude",
      claudeCritiquePrompt(run, technicalArchitecture, researchFindings),
      "claudeCritique",
    );
    run = await persistStep(
      { claudeCritique },
      "Claude — Critique of the Architecture",
      claudeCritique,
      "Codex critiques the strategy",
    );

    // Step 4 — Codex: critique of Claude's strategy
    const codexCritique = await call(
      "codex",
      codexCritiquePrompt(run, productStrategy, researchFindings),
      "codexCritique",
    );
    run = await persistStep(
      { codexCritique },
      "Codex — Critique of the Strategy",
      codexCritique,
      "Final synthesis",
    );
    // Combined critiques file
    await writeRunFile(
      runId,
      "CRITIQUES.md",
      `# Critiques — ${run.title}\n\n## Claude on the architecture\n\n${claudeCritique}\n\n## Codex on the strategy\n\n${codexCritique}\n`,
    );

    // Step 5 — Claude: final synthesis
    const finalPlan = await call(
      "claude",
      finalSynthesisPrompt(
        run,
        {
          productStrategy,
          technicalArchitecture,
          claudeCritique,
          codexCritique,
        },
        researchFindings,
      ),
      "finalPlan",
    );
    await writeRunFile(runId, "FINAL_PLAN.md", finalPlan);

    const sections = splitFinalPlan(finalPlan);
    // Fallback: if a section didn't parse out, the summary shows the whole plan.
    const summary = sections.summary || finalPlan;

    transcript += transcriptBlock("Claude — Final Synthesis", finalPlan);
    await writeRunFile(runId, "TRANSCRIPT.md", transcript);

    await updateRun(runId, {
      status: "completed",
      currentStep: undefined,
      outputs: {
        finalPlan,
        summary,
        mvpBacklog: sections.mvpBacklog,
        risks: sections.risks,
        validationTests: sections.validationTests,
        nextPrompts: sections.nextPrompts,
        transcript,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during council run";
    await updateRun(runId, { status: "failed", error: message, currentStep: undefined }).catch(
      () => {},
    );
  }
}
