/**
 * npm run build
 *
 * Builds the public site into dist/ for Cloudflare Pages: the landing page,
 * the confirmation page, and an archive page for every issue that was SENT
 * (listed in sent.json). Drafts never become public.
 */

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

import { Marked } from "marked";

import { loadIssue, type Issue } from "./lib/issue.ts";
import { escapeHtml } from "./lib/render.ts";
import { readSentLog } from "./lib/sent.ts";

const OUT = "dist";

function page(title: string, description: string, content: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Playfair+Display:wght@900&family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&display=swap">
<link rel="stylesheet" href="/assets/archive.css"></head>
<body><main class="page">
<a class="mark" href="/">Seed &amp; Source</a>
${content}
<div class="subscribe"><strong>Get the next edition.</strong> One startup, from seed to bloom, every Tuesday. <a href="/#email-top">Subscribe free</a></div>
</main></body></html>
`;
}

export function issuePage(issue: Issue): string {
  const body = new Marked({ gfm: true }).parse(issue.body, { async: false }) as string;
  return page(
    `${issue.meta.title} · Seed & Source`,
    issue.meta.preheader || issue.meta.subject,
    `<p class="meta">${escapeHtml(issue.meta.date)} · ${escapeHtml(issue.meta.company)}</p>
<h1>${escapeHtml(issue.meta.title)}</h1>
${body}`,
  );
}

export function indexPage(issues: Issue[]): string {
  const items = issues.length
    ? issues
        .map((issue) => `<li><a href="/issues/${issue.slug}.html">${escapeHtml(issue.meta.title)}</a><div class="meta">${escapeHtml(issue.meta.date)} · ${escapeHtml(issue.meta.company)}</div></li>`)
        .join("\n")
    : `<li>The first issue is on its way.</li>`;
  return page("Past editions · Seed & Source", "Every past edition of Seed & Source.", `<h1>Past editions</h1>\n<ul class="list">\n${items}\n</ul>`);
}

function main() {
  rmSync(OUT, { recursive: true, force: true });
  cpSync("site", OUT, { recursive: true });
  mkdirSync(`${OUT}/issues`, { recursive: true });

  const sent = readSentLog().map((entry) => loadIssue(entry.slug)).reverse();
  for (const issue of sent) writeFileSync(`${OUT}/issues/${issue.slug}.html`, issuePage(issue));
  writeFileSync(`${OUT}/issues/index.html`, indexPage(sent));
  console.log(`Built ${OUT}/ with ${sent.length} published issue(s).`);
}

if (process.argv[1]?.endsWith("build-site.ts")) main();
