/**
 * Headless Chrome lifecycle manager for the live research path. Lazily launches
 * ONE headless Chrome (separate from any user Chrome) with remote debugging, then
 * reuses it across recons. Reference-counted with an idle reaper and process-exit
 * cleanup so we never leak a browser. Launch flags adapted from surfagent's cli.ts.
 *
 * Everything here is best-effort: callers must treat a thrown error as "Chrome
 * unavailable" and degrade, never crash a run.
 */

import { spawn, ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";

export function cdpPort(): number {
  return Number(process.env.IDEACLYST_RESEARCH_CDP_PORT) || 9222;
}

export function cdpHost(): string {
  return process.env.IDEACLYST_RESEARCH_CDP_HOST || "localhost";
}

function idleMs(): number {
  return Number(process.env.IDEACLYST_RESEARCH_IDLE_MS) || 120_000;
}

function chromeCandidates(): string[] {
  if (process.env.IDEACLYST_CHROME_BIN) return [process.env.IDEACLYST_CHROME_BIN];
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }
  if (process.platform === "win32") {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
  }
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];
}

function findChrome(): string | null {
  for (const p of chromeCandidates()) {
    try {
      if (existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function checkCDP(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://${cdpHost()}:${cdpPort()}/json/version`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForCDP(maxWait = 12_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (await checkCDP()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

// ---- singleton state ----
let child: ChildProcess | null = null;
let launching: Promise<void> | null = null;
let refs = 0;
let idleTimer: NodeJS.Timeout | null = null;
let cleanupRegistered = false;
// True only for a Chrome WE launched (vs. one already running on the port).
let weLaunched = false;

function registerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  const kill = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (child && weLaunched) {
      try {
        child.kill("SIGKILL");
      } catch {}
    }
    child = null;
  };
  process.once("exit", kill);
  process.once("SIGINT", () => {
    kill();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    kill();
    process.exit(143);
  });
}

function armReaper(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (refs <= 0 && child && weLaunched) {
      try {
        child.kill("SIGKILL");
      } catch {}
      child = null;
      weLaunched = false;
    }
  }, idleMs());
  // Don't keep the event loop alive just for the reaper.
  idleTimer.unref?.();
}

async function launch(): Promise<void> {
  // Reuse an already-running Chrome on the port (e.g. user ran one manually).
  if (await checkCDP()) {
    weLaunched = false;
    return;
  }
  const bin = findChrome();
  if (!bin) {
    throw new Error(
      "Chrome not found for research. Install Chrome/Chromium or set IDEACLYST_CHROME_BIN.",
    );
  }
  const userDataDir = join(tmpdir(), "ideaclyst-research-chrome");
  // Headless Chrome's default UA contains "HeadlessChrome", which triggers
  // bot challenges (e.g. DuckDuckGo). Spoof a normal desktop Chrome UA.
  const userAgent =
    process.env.IDEACLYST_RESEARCH_USER_AGENT ||
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
  const proc = spawn(
    bin,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-notifications",
      "--disable-blink-features=AutomationControlled",
      "--mute-audio",
      "--lang=en-US",
      `--user-agent=${userAgent}`,
      `--remote-debugging-port=${cdpPort()}`,
      `--user-data-dir=${userDataDir}`,
    ],
    { detached: false, stdio: "ignore" },
  );
  child = proc;
  weLaunched = true;
  registerCleanup();

  const ok = await waitForCDP();
  if (!ok) {
    try {
      proc.kill("SIGKILL");
    } catch {}
    child = null;
    weLaunched = false;
    throw new Error("Headless Chrome started but CDP did not respond.");
  }
}

/**
 * Ensure a headless Chrome is reachable; returns its CDP {port,host}. Increments
 * a refcount — every caller MUST call releaseChrome() in a finally block.
 */
export async function ensureChrome(): Promise<{ port: number; host: string }> {
  refs += 1;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  try {
    if (!(await checkCDP())) {
      if (!launching) {
        launching = launch().finally(() => {
          launching = null;
        });
      }
      await launching;
    }
    return { port: cdpPort(), host: cdpHost() };
  } catch (err) {
    // Startup failed before the caller could enter its try/finally — give back
    // the reference we took so the refcount invariant holds (and reap if idle).
    releaseChrome();
    throw err;
  }
}

/** Release a reference; arms the idle reaper when the last caller leaves. */
export function releaseChrome(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0) armReaper();
}
