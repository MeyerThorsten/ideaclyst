/**
 * Deterministic coverage/gap summary from a project's items. No model, no network:
 * pure counting so the orchestrator can feed real structure into prompts and the UI.
 */

import { THRELMARK_CATEGORIES } from "./categories";
import { THRELMARK_LANES, type GapMap, type ThrelmarkItemView, type ThrelmarkStatus } from "./types";

export function buildGapMap(items: ThrelmarkItemView[]): GapMap {
  const laneCounts = { idea: 0, ranked: 0, development: 0, done: 0 } as Record<ThrelmarkStatus, number>;
  const byCategory = new Map<string, { total: number; done: number; open: number }>();

  for (const it of items) {
    if (THRELMARK_LANES.includes(it.status)) laneCounts[it.status]++;
    const c = byCategory.get(it.category) ?? { total: 0, done: 0, open: 0 };
    c.total++;
    if (it.status === "done") c.done++;
    else c.open++;
    byCategory.set(it.category, c);
  }

  // Seed every known category so entirely-absent ones surface in underCovered.
  for (const cat of THRELMARK_CATEGORIES) {
    if (!byCategory.has(cat)) byCategory.set(cat, { total: 0, done: 0, open: 0 });
  }

  const categoryCoverage = [...byCategory.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);

  const underCovered = categoryCoverage.filter((c) => c.total <= 1).map((c) => c.category);

  const topOpenItems = items
    .filter((it) => it.status !== "done")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8)
    .map((it) => ({ title: it.title, category: it.category, priority: it.priority }));

  const summaryLine =
    `${items.length} items (${laneCounts.done} done, ` +
    `${laneCounts.idea + laneCounts.ranked + laneCounts.development} open). ` +
    `Strongest: ${categoryCoverage.slice(0, 3).map((c) => c.category).join(", ") || "n/a"}. ` +
    `Thin/absent: ${underCovered.slice(0, 5).join(", ") || "none"}.`;

  return { categoryCoverage, laneCounts, topOpenItems, underCovered, summaryLine };
}
