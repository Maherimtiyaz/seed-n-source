/**
 * npm run send -- <slug>
 *
 * Sends an issue to ALL subscribers through a Resend broadcast. This is the
 * only command that reaches subscribers, and it is meant to be run by a human.
 * (The agents are blocked from running it in .claude/settings.json.)
 *
 * It refuses unless:
 *   1. the issue's front matter says `approved: true`,
 *   2. the issue has no unfinished placeholders or empty sections,
 *   3. it was not sent before (sent.json),
 *   4. you type the slug to confirm.
 */

import { createInterface } from "node:readline/promises";

import { requireEnv } from "./lib/env.ts";
import { loadIssue, sendBlockers } from "./lib/issue.ts";
import { renderEmail, RESEND_UNSUBSCRIBE } from "./lib/render.ts";
import { createBroadcast, sendBroadcast } from "./lib/resend.ts";
import { appendSentLog, readSentLog, SENT_LOG } from "./lib/sent.ts";

async function main() {
  const slug = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!slug) {
    console.error("Usage: npm run send -- <slug>   e.g. 2026-11-24-supabase");
    process.exitCode = 2;
    return;
  }

  const issue = loadIssue(slug);
  const blockers = sendBlockers(issue);
  const sent = readSentLog();
  if (sent.some((entry) => entry.slug === slug)) blockers.push("this issue was already sent (see sent.json)");
  if (blockers.length > 0) {
    console.error(`Not sending ${slug}:\n- ${blockers.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }

  const env = requireEnv("RESEND_API_KEY", "RESEND_SEGMENT_ID", "FROM_EMAIL", "SITE_URL", "MAILING_ADDRESS");

  if (!process.stdin.isTTY) {
    console.error("Refusing to send without a person at the keyboard (no interactive terminal).");
    process.exitCode = 1;
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\nAbout to email EVERY subscriber:\n  Subject: ${issue.meta.subject}\n  Issue:   ${issue.meta.title}\n`);
  const answer = (await rl.question(`Type the slug (${slug}) to send, or anything else to cancel: `)).trim();
  rl.close();
  if (answer !== slug) {
    console.log("Cancelled. Nothing was sent.");
    return;
  }

  const { html, text } = renderEmail(issue, {
    siteUrl: env.SITE_URL ?? "",
    mailingAddress: env.MAILING_ADDRESS ?? "",
    unsubscribeUrl: RESEND_UNSUBSCRIBE,
  });

  const draft = await createBroadcast(env.RESEND_API_KEY ?? "", {
    segment_id: env.RESEND_SEGMENT_ID ?? "",
    from: env.FROM_EMAIL ?? "",
    subject: issue.meta.subject,
    html,
    text,
    name: `Seed & Source ${slug}`,
    reply_to: process.env.REPLY_TO || undefined,
  });
  await sendBroadcast(env.RESEND_API_KEY ?? "", draft.id);

  appendSentLog({ slug, broadcastId: draft.id, sentAt: new Date().toISOString() });
  console.log(`Sent ${slug} (broadcast ${draft.id}). Recorded in ${SENT_LOG}.`);
  console.log("Next: npm run build && git add -A && git commit -m \"Send " + slug + "\" && git push   (publishes the archive)");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
