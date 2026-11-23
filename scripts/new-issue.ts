/**
 * npm run issue                       research + write next Tuesday's issue
 * npm run issue -- --company "Cal.com"  force the company
 * npm run issue -- --date 2026-12-01    target a different Tuesday
 *
 * Runs Claude Code on YOUR machine in headless mode. The main agent follows
 * CLAUDE.md and delegates to the agent team in .claude/agents/ (scout,
 * researcher, analyst, radar, writer, fact-checker). It ends by writing
 * issues/<slug>.md (approved: false) and sending you a test email.
 *
 * It can never email subscribers: `npm run send` is denied in
 * .claude/settings.json and also requires you to type a confirmation.
 */

import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

/** The next Tuesday after `from` (UTC), as YYYY-MM-DD. */
export function nextTuesday(from: Date = new Date()): string {
  const day = from.getUTCDay(); // 0 Sun … 2 Tue
  const add = ((2 - day + 7) % 7) || 7;
  return new Date(from.getTime() + add * 86_400_000).toISOString().slice(0, 10);
}

function argValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

export function buildPrompt(date: string, company?: string): string {
  return [
    `Produce the Seed & Source issue for Tuesday ${date}.`,
    `Follow CLAUDE.md exactly ("Weekly pipeline"), delegating to the subagents in .claude/agents/:`,
    `scout, researcher, analyst, radar, writer, fact-checker.`,
    company
      ? `The editor chose the company: ${company}. Skip the scout's choice, but still check the rotation and repeat rules and say so if it breaks them.`
      : `Let the scout pick the company.`,
    `The issue file must be issues/${date}-<company-in-kebab-case>.md with approved: false.`,
    `Do not run npm run send, and never set approved: true.`,
    `Finish by running: npm run preview -- <slug>   (sends a test email to the editor only).`,
    `Then reply with: the slug, the subject line, the fact-check counts (verified / fixed / removed),`,
    `and anything the editor should double-check.`,
  ].join("\n");
}

/** Tools the run may use without asking. Everything else is denied in headless mode. */
export const ALLOWED_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Agent",
  "Bash(npm run preview *)",
  "Bash(npm test)",
  "Bash(git status)",
  "Bash(git diff *)",
  "Bash(ls *)",
  "Bash(date *)",
];

function describeToolUse(name: string, input: Record<string, unknown>): string {
  const detail =
    (input.query as string) ??
    (input.url as string) ??
    (input.file_path as string) ??
    (input.command as string) ??
    (input.description as string) ??
    (input.subagent_type as string) ??
    "";
  return `  → ${name}${detail ? `: ${String(detail).slice(0, 100)}` : ""}`;
}

async function main() {
  const args = process.argv.slice(2);
  const date = argValue(args, "--date") ?? nextTuesday();
  const company = argValue(args, "--company");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got ${date}`);

  const check = spawnSync("claude", ["--version"], { encoding: "utf8" });
  if (check.error || check.status !== 0) {
    throw new Error("Claude Code isn't installed or not on your PATH. Install: https://code.claude.com/docs/en/setup");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "Warning: ANTHROPIC_API_KEY is set, so this run bills the API instead of your Claude subscription.\n" +
        "To use your subscription, run `unset ANTHROPIC_API_KEY` first.\n",
    );
  }

  console.log(`Seed & Source — researching the issue for ${date}${company ? ` (${company})` : ""}.`);
  console.log("This usually takes 15–40 minutes. Progress appears below.\n");

  const child = spawn(
    "claude",
    [
      "-p",
      buildPrompt(date, company),
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      "acceptEdits",
      "--max-turns",
      "300",
      "--allowedTools",
      ...ALLOWED_TOOLS,
    ],
    {
      stdio: ["ignore", "pipe", "inherit"],
      // Research subagents can run longer than the default wait in print mode.
      env: { ...process.env, CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: String(60 * 60 * 1000) },
    },
  );

  let finalText = "";
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    let event: { type?: string; message?: { content?: unknown[] }; result?: string; total_cost_usd?: number };
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "assistant" && Array.isArray(event.message?.content)) {
      for (const part of event.message.content as Array<Record<string, unknown>>) {
        if (part.type === "tool_use") {
          console.log(describeToolUse(String(part.name), (part.input as Record<string, unknown>) ?? {}));
        } else if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
          console.log(`\n${part.text.trim().slice(0, 400)}\n`);
        }
      }
    } else if (event.type === "result") {
      finalText = event.result ?? "";
    }
  });

  const code: number = await new Promise((resolve) => child.on("close", (c) => resolve(c ?? 1)));
  console.log("\n────────────────────────────────────────");
  console.log(finalText || "(no final summary)");
  if (code !== 0) {
    console.error(`\nClaude exited with code ${code}. Check the output above.`);
    process.exitCode = code;
    return;
  }
  console.log("\nNext: read the test email (and issues/<slug>.md). When you're happy,");
  console.log("set `approved: true` in the issue's front matter, then run: npm run send -- <slug>");
}

if (process.argv[1]?.endsWith("new-issue.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
