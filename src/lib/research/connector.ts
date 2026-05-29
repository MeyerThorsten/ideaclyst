/**
 * CDP connection helpers — vendored from surfagent (src/chrome/connector.ts),
 * trimmed to the read-only surface IdeaClyst needs. Connects to a Chrome that is
 * already running with --remote-debugging-port (see chrome.ts).
 */

import CDP from "chrome-remote-interface";

export interface CDPClient {
  Page: CDP.Client["Page"];
  Runtime: CDP.Client["Runtime"];
  DOM: CDP.Client["DOM"];
  close: () => Promise<void>;
}

export interface CDPTarget {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

const DEFAULT_PORT = 9222;
const DEFAULT_HOST = "localhost";

export async function listTargets(
  port: number = DEFAULT_PORT,
  host: string = DEFAULT_HOST,
): Promise<CDPTarget[]> {
  const targets = await CDP.List({ port, host });
  return targets.filter((t: CDPTarget) => t.type === "page");
}

export async function connectToTab(
  targetId: string,
  port: number = DEFAULT_PORT,
  host: string = DEFAULT_HOST,
): Promise<CDPClient> {
  const client = await CDP({ target: targetId, port, host });
  await client.Page.enable();
  await client.Runtime.enable();
  await client.DOM.enable();
  return client as CDPClient;
}
