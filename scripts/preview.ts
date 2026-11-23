/**
 * npm run preview -- <slug>
 *
 * Renders the issue, saves the HTML to previews/<slug>.html (open it in a
 * browser), and emails a test copy to EDITOR_EMAIL only. Safe to run any time:
 * it never touches subscribers. Pass --no-email to only write the HTML file.
 */

import { mkdirSync, writeFileSync } from "node:fs";

import { requireEnv } from "./lib/env.ts";
import { loadIssue } from "./lib/issue.ts";
import { renderEmail } from "./lib/render.ts";
import { sendEmail } from "./lib/resend.ts";

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((arg) => !arg.startsWith("--"));
  const noEmail = args.includes("--no-email");
  if (!slug) {
    console.error("Usage: npm run preview -- <slug> [--no-email]   e.g. 2026-11-24-supabase");
    process.exitCode = 2;
    return;
  }

  const issue = loadIssue(slug);
  const env = noEmail
    ? { SITE_URL: process.env.SITE_URL ?? "https://example.com", MAILING_ADDRESS: process.env.MAILING_ADDRESS ?? "(mailing address)" }
    : requireEnv("RESEND_API_KEY", "FROM_EMAIL", "EDITOR_EMAIL", "SITE_URL", "MAILING_ADDRESS");

  const { html, text } = renderEmail(issue, {
    siteUrl: env.SITE_URL ?? "",
    mailingAddress: env.MAILING_ADDRESS ?? "",
    unsubscribeUrl: "#preview-unsubscribe-link",
  });

  mkdirSync("previews", { recursive: true });
  const file = `previews/${slug}.html`;
  writeFileSync(file, html);
  console.log(`Preview written to ${file}`);

  if (noEmail) return;
  const result = await sendEmail(env.RESEND_API_KEY ?? "", {
    from: env.FROM_EMAIL ?? "",
    to: env.EDITOR_EMAIL ?? "",
    subject: `[TEST] ${issue.meta.subject}`,
    html,
    text,
    reply_to: process.env.REPLY_TO || undefined,
  });
  console.log(`Test email sent to ${env.EDITOR_EMAIL} (Resend id ${result.id}).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
