/**
 * Issues live in issues/<slug>.md with a small front matter block:
 *
 *   ---
 *   title: Supabase: one tagline, one Hacker News post…
 *   subject: How Supabase grew from a tagline
 *   preheader: The story, the business and the stack behind…
 *   company: Supabase
 *   date: 2026-11-24
 *   approved: false
 *   ---
 *
 * Only a human sets `approved: true` (agents are told never to).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type IssueMeta = {
  title: string;
  subject: string;
  preheader: string;
  company: string;
  date: string;
  approved: boolean;
};

export type Issue = { slug: string; meta: IssueMeta; body: string };

export const ISSUES_DIR = "issues";
const SLUG_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;

/** Placeholders that must never reach subscribers. */
const UNFINISHED = [/\bTODO\b/i, /\[you fill/i, /\bTBD\b/, /lorem ipsum/i, /\{\{(?!\{RESEND_UNSUBSCRIBE_URL\}\})/];

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** Split `---` front matter from the body. Values are plain strings; `true`/`false` become booleans. */
export function parseIssue(slug: string, source: string): Issue {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) throw new Error(`${slug}: missing front matter (--- ... ---)`);
  const [, head = "", body = ""] = match;

  const fields: Record<string, string> = {};
  for (const line of head.split(/\r?\n/)) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (kv?.[1]) fields[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "").trim();
  }

  const required = ["title", "subject", "company", "date"] as const;
  for (const key of required) {
    if (!fields[key]) throw new Error(`${slug}: front matter is missing "${key}"`);
  }

  return {
    slug,
    meta: {
      title: fields.title ?? "",
      subject: fields.subject ?? "",
      preheader: fields.preheader ?? "",
      company: fields.company ?? "",
      date: fields.date ?? "",
      approved: fields.approved === "true",
    },
    body: body.trim(),
  };
}

export function loadIssue(slug: string, dir = ISSUES_DIR): Issue {
  if (!isValidSlug(slug)) {
    throw new Error(`"${slug}" is not a valid issue slug (expected YYYY-MM-DD-company).`);
  }
  return parseIssue(slug, readFileSync(join(dir, `${slug}.md`), "utf8"));
}

export function listIssueSlugs(dir = ISSUES_DIR): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(/\.md$/, ""))
    .filter(isValidSlug)
    .sort();
}

/** Headings (## or ###) whose next non-blank line is another heading, a rule, or the end. */
export function emptySections(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const empty: string[] = [];
  lines.forEach((line, index) => {
    if (!/^#{2,3} /.test(line)) return;
    const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "");
    if (next === undefined || /^#{1,3} /.test(next) || /^-{3,}\s*$/.test(next)) {
      empty.push(line.replace(/^#+\s*/, ""));
    }
  });
  return empty;
}

/** Problems that block sending. Empty array = ready. */
export function sendBlockers(issue: Issue): string[] {
  const problems: string[] = [];
  if (!issue.meta.approved) problems.push("front matter has approved: false (set it to true after reviewing)");
  if (issue.meta.subject.length > 80) problems.push("subject is longer than 80 characters");
  for (const pattern of UNFINISHED) {
    if (pattern.test(issue.body)) problems.push(`body still contains a placeholder matching ${pattern}`);
  }
  const empty = emptySections(issue.body);
  if (empty.length > 0) problems.push(`an empty section (heading with no text under it): ${empty.join(", ")}`);
  const words = issue.body.split(/\s+/).filter(Boolean).length;
  if (words < 400) problems.push(`only ${words} words — the issue looks incomplete`);
  return problems;
}
