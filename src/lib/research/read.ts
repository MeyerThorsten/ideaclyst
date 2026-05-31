/**
 * Readable-content extraction — vendored from surfagent (readPage in src/api/act.ts).
 * `readUrl` opens a fresh tab, extracts structured readable content, closes the tab.
 * Read-only.
 */

import CDP from "chrome-remote-interface";
import { connectToTab, CDPClient } from "./connector";
import { cachedJson } from "./cache";

export interface ReadResult {
  title: string;
  url: string;
  sections: Array<
    | { type: "heading"; level: number; text: string }
    | { type: "table"; rows: string[][] }
    | { type: "code"; text: string }
    | { type: string; text: string }
  >;
  notifications: string[];
  resultText: string | null;
  plainText: string;
}

const READ_SCRIPT = `
(function() {
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  const title = document.title;
  const url = window.location.href;

  const mainEl = document.querySelector('main, article, [role="main"]') || document.body;
  const clone = mainEl.cloneNode(true);
  clone.querySelectorAll('script,style,noscript,svg,nav,header,footer,[role="navigation"],[aria-hidden="true"]').forEach(e => e.remove());

  const sections = [];
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT, null);
  let node;
  while (node = walker.nextNode()) {
    const tag = node.tagName?.toLowerCase();
    const text = node.innerText?.trim();
    if (!text) continue;
    if (/^h[1-6]$/.test(tag)) {
      sections.push({ type: 'heading', level: parseInt(tag[1]), text: text.substring(0, 200) });
    } else if (tag === 'table') {
      const rows = [];
      for (const tr of node.querySelectorAll('tr')) {
        const cells = Array.from(tr.querySelectorAll('th,td')).map(c => c.innerText?.trim()).filter(Boolean);
        if (cells.length) rows.push(cells);
      }
      if (rows.length) sections.push({ type: 'table', rows: rows.slice(0, 50) });
      walker.nextNode();
    } else if (tag === 'pre' || tag === 'code') {
      sections.push({ type: 'code', text: text.substring(0, 1000) });
    } else if (tag === 'p' || tag === 'li' || tag === 'dd' || tag === 'blockquote') {
      if (text.length > 10) sections.push({ type: tag, text: text.substring(0, 500) });
    }
  }

  const notifications = [];
  for (const el of document.querySelectorAll('[role="alert"], [role="status"], .toast, .notification, .alert, [class*="toast"], [class*="notification"]')) {
    if (!isVisible(el)) continue;
    const text = el.innerText?.trim();
    if (text && text.length > 3) notifications.push(text.substring(0, 200));
  }

  const resultEl = document.querySelector('[class*="result"], [class*="output"], [data-testid*="result"], .cm-content');
  const resultText = resultEl?.innerText?.trim()?.substring(0, 2000) || null;

  const plainText = (clone.innerText || '').trim().substring(0, 4000);

  return { title, url, sections: sections.slice(0, 100), notifications, resultText, plainText };
})()
`;

export async function readUrl(
  url: string,
  options: { port?: number; host?: string; waitMs?: number },
): Promise<ReadResult> {
  const { value } = await cachedJson<ReadResult>(
    "read-url",
    JSON.stringify({ url, waitMs: options.waitMs ?? 2000 }),
    () => liveReadUrl(url, options),
  );
  return value;
}

async function liveReadUrl(
  url: string,
  options: { port?: number; host?: string; waitMs?: number },
): Promise<ReadResult> {
  const port = options.port || 9222;
  const host = options.host || "localhost";
  const waitMs = options.waitMs ?? 2000;

  const target = await CDP.New({ port, host, url });
  let client: CDPClient | null = null;

  try {
    client = await connectToTab(target.id, port, host);
    await Promise.race([
      (client.Page as unknown as { loadEventFired?: () => Promise<void> }).loadEventFired?.() ??
        Promise.resolve(),
      new Promise((r) => setTimeout(r, waitMs)),
    ]);
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    const r = await client.Runtime.evaluate({
      expression: READ_SCRIPT,
      returnByValue: true,
    });
    const result = r.result.value as ReadResult;

    await client.close();
    client = null;
    await CDP.Close({ port, host, id: target.id });
    return result;
  } catch (error) {
    if (client) await client.close().catch(() => {});
    try {
      await CDP.Close({ port, host, id: target.id });
    } catch {}
    throw error;
  }
}
