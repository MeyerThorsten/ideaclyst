/**
 * Tab listing/resolution — vendored from surfagent (src/chrome/tabs.ts).
 */

import { listTargets, CDPTarget } from "./connector";

export interface TabInfo {
  id: string;
  index: number;
  title: string;
  url: string;
}

export async function getAllTabs(port?: number, host?: string): Promise<TabInfo[]> {
  const targets = await listTargets(port, host);
  return targets.map((target: CDPTarget, index: number) => ({
    id: target.id,
    index,
    title: target.title,
    url: target.url,
  }));
}
