import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function cacheDir(): string {
  return join(process.cwd(), dataDir(), "research-cache");
}

function ttlMs(): number {
  return Number(process.env.IDEACLYST_RESEARCH_CACHE_TTL_MS) || 1000 * 60 * 60 * 24;
}

function maxEntries(): number {
  return Number(process.env.IDEACLYST_RESEARCH_CACHE_MAX_ENTRIES) || 400;
}

function enabled(): boolean {
  const value = (process.env.IDEACLYST_RESEARCH_CACHE || "1").toLowerCase();
  return value !== "0" && value !== "false" && value !== "off";
}

function cachePath(namespace: string, key: string): string {
  const digest = createHash("sha256").update(`${namespace}:${key}`).digest("hex");
  return join(cacheDir(), `${namespace}-${digest}.json`);
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

async function pruneCache(): Promise<void> {
  try {
    const entries = await readdir(cacheDir());
    const files = await Promise.all(entries
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => {
        const path = join(cacheDir(), name);
        const s = await stat(path);
        return { path, mtimeMs: s.mtimeMs };
      }));
    const overflow = files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(maxEntries());
    await Promise.all(overflow.map((file) => unlink(file.path).catch(() => {})));
  } catch {
    // Cache pruning should never affect research.
  }
}

export async function cachedJson<T>(
  namespace: string,
  key: string,
  producer: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  if (!enabled()) return { value: await producer(), hit: false };
  const path = cachePath(namespace, key);
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { writtenAt: string; value: T };
    if (Date.now() - new Date(parsed.writtenAt).getTime() < ttlMs()) {
      return { value: parsed.value, hit: true };
    }
  } catch {
    // Cache misses are normal; live research remains the source of truth.
  }

  const value = await producer();
  await mkdir(cacheDir(), { recursive: true });
  await writeAtomic(path, JSON.stringify({ writtenAt: new Date().toISOString(), value }, null, 2));
  await pruneCache();
  return { value, hit: false };
}

export async function cacheStats(): Promise<{ entries: number; bytes: number; ttlMs: number; maxEntries: number; enabled: boolean }> {
  try {
    const entries = await readdir(cacheDir());
    const files = await Promise.all(entries
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => stat(join(cacheDir(), name)).catch(() => null)));
    return {
      entries: files.filter(Boolean).length,
      bytes: files.reduce((sum, s) => sum + (s?.size || 0), 0),
      ttlMs: ttlMs(),
      maxEntries: maxEntries(),
      enabled: enabled(),
    };
  } catch {
    return { entries: 0, bytes: 0, ttlMs: ttlMs(), maxEntries: maxEntries(), enabled: enabled() };
  }
}
