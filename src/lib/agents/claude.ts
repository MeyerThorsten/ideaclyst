/**
 * Claude Code CLI backend. Spawns the local `claude` binary in headless/print
 * mode (`claude -p`) with the prompt piped on stdin, and returns its stdout.
 *
 * Uses array args + stdin (no shell) so prompts can't break escaping or inject
 * shell syntax. Authentication is whatever the local `claude` session already
 * has — IdeaClyst never handles credentials.
 */

import { spawn } from "node:child_process";

function claudeBin(): string {
  return process.env.IDEACLYST_CLAUDE_BIN || "claude";
}

function timeoutMs(): number {
  return Number(process.env.IDEACLYST_AGENT_TIMEOUT_MS) || 180_000;
}

const NOT_AVAILABLE =
  "set IDEACLYST_AGENT_MODE=mock to use mock outputs.";

export async function runClaude(prompt: string): Promise<string> {
  const bin = claudeBin();
  // `-p` = print mode (non-interactive); `--output-format text` keeps stdout
  // as plain text. Prompt is delivered on stdin to avoid argv length/escaping.
  const args = ["-p", "--output-format", "text"];

  return new Promise<string>((resolve, reject) => {
    const child = spawn(bin, args, {
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
