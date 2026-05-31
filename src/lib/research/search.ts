/**
 * Web search via headless Chrome recon of a search-engine results page. Default
 * engine is the DuckDuckGo HTML endpoint (server-rendered, friendliest to
 * headless). Returns a small, deduped list of organic result links. Live path
 * only — the mock layer never calls this.
 */

import { ensureChrome, releaseChrome } from "./chrome";
import { cachedJson } from "./cache";
import { reconUrl } from "./recon";
import { isSafePublicUrl } from "./url-safety";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

type Engine = "duckduckgo" | "bing" | "google" | "brave";

function engines(): Engine[] {
  const raw = process.env.IDEACLYST_RESEARCH_ENGINES || process.env.IDEACLYST_RESEARCH_ENGINE || "duckduckgo";
  const parsed = raw
    .split(",")
    .map((engine) => engine.trim().toLowerCase())
    .filter((engine): engine is Engine => ["duckduckgo", "bing", "google", "brave"].includes(engine));
  return parsed.length ? Array.from(new Set(parsed)) : ["duckduckgo"];
}

function searchUrl(query: string, e: Engine): string {
  const q = encodeURIComponent(query);
  if (e === "bing") return `https://www.bing.com/search?q=${q}`;
  if (e === "google") return `https://www.google.com/search?q=${q}`;
  if (e === "brave") return `https://search.brave.com/search?q=${q}`;
  return `https://html.duckduckgo.com/html/?q=${q}`;
}

const ENGINE_HOSTS = ["duckduckgo.com", "bing.com", "google.com", "microsoft.com", "msn.com", "brave.com"];

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

function cleanNativeQuery(query: string): string {
  return query
    .replace(/site:\S+/gi, " ")
    .replace(/\bOR\b/gi, " ")
    .replace(/["()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

async function hackerNewsSearch(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const q = cleanNativeQuery(query);
  if (!q) return [];
  const url = `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${maxResults}&query=${encodeURIComponent(q)}`;
  const { value } = await cachedJson<{
    hits?: { title?: string; story_title?: string; objectID?: string; url?: string }[];
  }>("hn-search", url, async () => {
    const res = await fetch(url, { headers: { "User-Agent": "IdeaClyst local research" } });
    if (!res.ok) return { hits: [] };
    return (await res.json()) as { hits?: { title?: string; story_title?: string; objectID?: string; url?: string }[] };
  });
  return (value.hits || [])
    .map((hit) => ({
      title: hit.title || hit.story_title || "Hacker News discussion",
      url: hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : hit.url || "",
      snippet: hit.url ? `Linked URL: ${hit.url}` : "Hacker News discussion result",
    }))
    .filter((item) => item.url && isSafePublicUrl(item.url))
    .slice(0, maxResults);
}

async function redditSearch(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const q = cleanNativeQuery(query);
  if (!q) return [];
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&t=year&limit=${maxResults}`;
  const { value } = await cachedJson<{
    data?: { children?: { data?: { title?: string; permalink?: string; selftext?: string; subreddit_name_prefixed?: string } }[] };
  }>("reddit-search", url, async () => {
    const res = await fetch(url, { headers: { "User-Agent": "IdeaClyst local research" } });
    if (!res.ok) return { data: { children: [] } };
    return (await res.json()) as {
      data?: { children?: { data?: { title?: string; permalink?: string; selftext?: string; subreddit_name_prefixed?: string } }[] };
    };
  });
  return (value.data?.children || [])
    .map((child) => child.data)
    .filter((post): post is NonNullable<typeof post> => Boolean(post?.title && post.permalink))
    .map((post) => ({
      title: post.title || "Reddit discussion",
      url: `https://www.reddit.com${post.permalink}`,
      snippet: [post.subreddit_name_prefixed, post.selftext?.slice(0, 220)].filter(Boolean).join(" — "),
    }))
    .filter((item) => isSafePublicUrl(item.url))
    .slice(0, maxResults);
}

function dedupe(results: WebSearchResult[], maxResults: number): WebSearchResult[] {
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];
  for (const result of results) {
    let key = result.url;
    try {
      const url = new URL(result.url);
      key = `${url.hostname.replace(/^www\./, "")}${url.pathname}`;
    } catch {
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(result);
    if (out.length >= maxResults) break;
  }
  return out;
}

async function engineSearch(query: string, e: Engine, maxResults: number, waitMs?: number): Promise<WebSearchResult[]> {
  const { port, host } = await ensureChrome();
  try {
    const recon = await reconUrl(searchUrl(query, e), { port, host, waitMs: waitMs ?? 2200 });
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

export async function webSearch(
  query: string,
  opts: { maxResults?: number; waitMs?: number } = {},
): Promise<WebSearchResult[]> {
  const maxResults =
    opts.maxResults ?? (Number(process.env.IDEACLYST_RESEARCH_MAX_RESULTS) || 6);
  const cacheKey = JSON.stringify({ query, engines: engines(), maxResults });
  const { value } = await cachedJson<WebSearchResult[]>("web-search", cacheKey, async () => {
    const collected: WebSearchResult[] = [];
    const nativeMax = Math.max(2, Math.ceil(maxResults / 2));

    const nativeResults = await Promise.allSettled([
      hackerNewsSearch(query, nativeMax),
      redditSearch(query, nativeMax),
    ]);
    for (const result of nativeResults) {
      if (result.status === "fulfilled") collected.push(...result.value);
    }

    for (const e of engines()) {
      try {
        collected.push(...await engineSearch(query, e, maxResults, opts.waitMs));
      } catch {
        // Multi-engine fanout is best-effort: a blocked engine must not starve the run.
      }
    }

    return dedupe(collected, maxResults);
  });
  return value;
}
