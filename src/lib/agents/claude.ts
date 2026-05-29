/**
 * Claude Code CLI backend. Runs the local `claude` binary as a one-shot
 * completion WITHOUT the `-p`/`--print` flag.
 *
 * How non-interactive output is achieved without `-p`: when `claude`'s stdout is
 * not a TTY (here it's a pipe), the CLI runs non-interactively and prints a
 * single response, then exits — so piping the prompt on stdin and capturing
 * stdout yields the completion. We additionally pass `--tools ""` so the run is
 * a pure text completion (no agentic file operations).
 *
 * Each call runs inside the idea's own directory (`cwd`), so every run gets an
 * isolated working directory. Array args + stdin (no shell) avoid escaping /
 * injection. Authentication is whatever the local `claude` session already has —
 * IdeaClyst never handles credentials.
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

function claudeBin(): string {
  return process.env.IDEACLYST_CLAUDE_BIN || "claude";
}

function timeoutMs(): number {
  return Number(process.env.IDEACLYST_AGENT_TIMEOUT_MS) || 180_000;
}

const NOT_AVAILABLE = "set IDEACLYST_AGENT_MODE=mock to use mock outputs.";

/**
 * @param prompt The full prompt to send on stdin.
 * @param cwd    The idea's own working directory to run `claude` in.
 */
export async function runClaude(prompt: string, cwd: string): Promise<string> {
  const bin = claudeBin();
  await mkdir(cwd, { recursive: true });

  // No `-p`: piped (non-TTY) stdout already makes claude non-interactive.
  // `--tools ""` keeps this a pure text completion (no file/agent actions).
  const args = ["--tools", ""];
  const model = process.env.IDEACLYST_CLAUDE_MODEL;
  if (model && model.toLowerCase() !== "default") {
    args.push("--model", model);
  }

  return new Promise<string>((resolve, reject) => {
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
      const out = stdout.trim();
      if (code !== 0 && !out) {
        reject(
          new Error(
            `\`${bin}\` failed (exit ${code}): ${stderr.slice(0, 400) || "no output"} — ${NOT_AVAILABLE}`,
          ),
        );
        return;
      }
      if (!out) {
        reject(new Error(`\`${bin}\` produced no output — ${NOT_AVAILABLE}`));
        return;
      }
      resolve(out);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
