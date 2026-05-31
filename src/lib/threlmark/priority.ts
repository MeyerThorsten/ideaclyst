/** Priority scoring — identical to Threlmark so rankings never drift. */
import type { ThrelmarkItem, ThrelmarkItemView } from "./types";

export function priority(
  item: Pick<ThrelmarkItem, "impact" | "evidence" | "fit" | "effort">,
): number {
  return Math.max(
    0,
    Math.round(item.impact * 3 + item.evidence * 2 + item.fit * 2 - item.effort * 1.5),
  );
}

export function withPriority(item: ThrelmarkItem): ThrelmarkItemView {
  return { ...item, priority: priority(item) };
}
