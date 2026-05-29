/**
 * Web search via headless Chrome recon of a search-engine results page. Default
 * engine is the DuckDuckGo HTML endpoint (server-rendered, friendliest to
 * headless). Returns a small, deduped list of organic result links. Live path
 * only — the mock layer never calls this.
 */

import { ensureChrome, releaseChrome } from "./chrome";
import { reconUrl } from "./recon";
import { isSafePublicUrl } from "./url-safety";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

type Engine = "duckduckgo" | "bing" | "google";

function engine(): Engine {
  const e = (process.env.IDEACLYST_RESEARCH_ENGINE || "duckduckgo").toLowerCase();
  if (e === "bing" || e === "google") return e;
  return "duckduckgo";
}

function searchUrl(query: string, e: Engine): string {
  const q = encodeURIComponent(query);
  if (e === "bing") return `https://www.bing.com/search?q=${q}`;
  if (e === "google") return `https://www.google.com/search?q=${q}`;
  return `https://html.duckduckgo.com/html/?q=${q}`;
}

const ENGINE_HOSTS = ["duckduckgo.com", "bing.com", "google.com", "microsoft.com", "msn.com"];

/** DuckDuckGo HTML wraps result links as /l/?uddg=<encoded-real-url>. Unwrap it. */
function unwrap(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname.includes("duckduckgo.com") && u.pathname.startsWith("/l/")) {
      const real = u.searchParams.get("uddg");
      return real ? decodeURIComponent(real) : null;
    }
    return href;
  } catch {
    return null;
  }
}

function isResultLink(url: string): boolean {
  if (!isSafePublicUrl(url)) return false; // SSRF guard: only public http(s) targets
  try {
    const u = new URL(url);
    return !ENGINE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

export async function webSearch(
  query: string,
  opts: { maxResults?: number; waitMs?: number } = {},
): Promise<WebSearchResult[]> {
  const maxResults =
    opts.maxResults ?? (Number(process.env.IDEACLYST_RESEARCH_MAX_RESULTS) || 6);
  const e = engine();

  const { port, host } = await ensureChrome();
  try {
    const recon = await reconUrl(searchUrl(query, e), { port, host, waitMs: opts.waitMs ?? 2200 });

    const out: WebSearchResult[] = [];
    const seenHosts = new Set<string>();
    for (const el of recon.elements) {
      if (el.tag !== "A" || !el.href) continue;
      const real = unwrap(el.href);
      if (!real || !isResultLink(real)) continue;
      const title = (el.text || "").trim();
      if (title.length < 3) continue;
      let h: string;
      try {
        h = new URL(real).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
      if (seenHosts.has(h)) continue;
      seenHosts.add(h);
      out.push({ title: title.slice(0, 160), url: real, snippet: "" });
      if (out.length >= maxResults) break;
    }
    return out;
  } finally {
    releaseChrome();
  }
}
