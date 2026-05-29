/**
 * Codex CLI backend. Spawns OpenAI's `codex` binary in non-interactive mode
 * (`codex exec`) with the prompt piped on stdin, and returns the final assistant
 * message.
 *
 * The invocation runs Codex read-only inside an isolated temp working dir so the
 * agent can't touch the filesystem — we only want the text completion. The final
 * message is read from the `-o` output file; the `--json` event stream is parsed
 * as a fallback (and to surface a clean error). Array args + stdin (no shell)
 * avoid escaping/injection. Auth is the local `codex login` session.
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function codexBin(): string {
  return process.env.IDEACLYST_CODEX_BIN || "codex";
}

function timeoutMs(): number {
  return Number(process.env.IDEACLYST_AGENT_TIMEOUT_MS) || 180_000;
}

const NOT_AVAILABLE = "set IDEACLYST_AGENT_MODE=mock to use mock outputs.";

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number;
}

function spawnCodex(args: string[], prompt: string, cwd: string): Promise<SpawnResult> {
  const bin = codexBin();
  return new Promise<SpawnResult>((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`\`${bin}\` timed out after ${timeoutMs() / 1000}s — ${NOT_AVAILABLE}`));
    }, timeoutMs());

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error(`\`${bin}\` not found on PATH — ${NOT_AVAILABLE}`));
      } else {
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout) {
        reject(
          new Error(`\`${bin}\` failed (exit ${code}): ${stderr.slice(0, 400) || "no output"} — ${NOT_AVAILABLE}`),
        );
      } else {
        resolve({ stdout, stderr, code: code ?? 0 });
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function runCodex(prompt: string): Promise<string> {
  const bin = codexBin();
  const workdir = await mkdtemp(join(tmpdir(), "ideaclyst-codex-"));
  const lastMsgFile = join(workdir, "last-message.txt");

  const args = [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "--ephemeral",
    "-s",
    "read-only",
    "--color",
    "never",
    "-C",
    workdir,
    "-o",
    lastMsgFile,
  ];
  const model = process.env.IDEACLYST_CODEX_MODEL;
  if (model && model.toLowerCase() !== "default") {
    args.push("-m", model);
  }
  args.push("-"); // read prompt from stdin

  try {
    const { stdout, code } = await spawnCodex(args, prompt, workdir);

    // Parse the JSONL event stream for a fallback message and any error.
    let messageFallback = "";
    let errorMessage = "";
    for (const line of stdout.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) continue;
      try {
        const ev = JSON.parse(trimmed) as {
          type?: string;
          message?: string;
          error?: { message?: string };
          item?: { type?: string; text?: string };
        };
        if (ev.type === "item.completed" && ev.item?.type === "agent_message" && ev.item.text) {
          messageFallback = ev.item.text;
        }
        if (ev.type === "error" || ev.type === "turn.failed") {
          errorMessage = ev.error?.message || ev.message || errorMessage;
        }
      } catch {
        // skip non-JSON lines
      }
    }

    // Prefer the -o file (clean final message); fall back to the parsed event.
    let content = "";
    try {
      content = (await readFile(lastMsgFile, "utf8")).trim();
    } catch {
      content = "";
    }
    if (!content) content = messageFallback.trim();

    if (!content) {
      // Codex sometimes nests the real API error as JSON inside `message`.
      let detail = errorMessage;
      try {
        const inner = JSON.parse(errorMessage) as { error?: { message?: string } };
        if (inner?.error?.message) detail = inner.error.message;
      } catch {
        // not JSON — use as-is
      }
      throw new Error(
        detail
          ? `\`${bin}\` error: ${detail} — ${NOT_AVAILABLE}`
          : `\`${bin}\` produced no output (exit ${code}). Is it logged in? Run \`codex login status\`. — ${NOT_AVAILABLE}`,
      );
    }

    return content;
  } finally {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
}
