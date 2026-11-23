/**
 * Turns an issue into email-safe HTML (inline styles, single column, table
 * layout for old clients) plus a plain-text version, and into a web page for
 * the public archive.
 */

import { Marked } from "marked";

import type { Issue } from "./issue.ts";

export type RenderOptions = {
  siteUrl: string;
  mailingAddress: string;
  /** Broadcasts get Resend's per-recipient unsubscribe link; test emails get a note. */
  unsubscribeUrl: string;
};

export const RESEND_UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

const COLORS = {
  paper: "#e9ece2",
  sheet: "#f6f7f1",
  ink: "#18221b",
  muted: "#56625a",
  accent: "#8a5a00",
  line: "#cfd4c6",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Markdown → HTML with inline styles that survive email clients. */
export function markdownToEmailHtml(markdown: string): string {
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const size = depth <= 2 ? 22 : 18;
        return `<h${depth} style="font-family:Georgia,'Times New Roman',serif;font-size:${size}px;line-height:1.25;color:${COLORS.ink};margin:32px 0 12px">${text}</h${depth}>`;
      },
      paragraph({ tokens }) {
        return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${COLORS.ink}">${this.parser.parseInline(tokens)}</p>`;
      },
      link({ href, tokens }) {
        return `<a href="${escapeHtml(href)}" style="color:${COLORS.accent};text-decoration:underline">${this.parser.parseInline(tokens)}</a>`;
      },
      blockquote({ tokens }) {
        return `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${COLORS.accent};background:${COLORS.sheet};color:${COLORS.ink}">${this.parser.parse(tokens)}</blockquote>`;
      },
      hr() {
        return `<hr style="border:0;border-top:1px solid ${COLORS.line};margin:28px 0">`;
      },
      codespan({ text }) {
        return `<code style="font-family:Menlo,Consolas,monospace;font-size:14px;background:${COLORS.sheet};padding:1px 4px;border-radius:3px">${text}</code>`;
      },
      table(token) {
        const head = token.header
          .map((cell) => `<th style="text-align:left;padding:8px;border-bottom:2px solid ${COLORS.ink};font-size:14px">${this.parser.parseInline(cell.tokens)}</th>`)
          .join("");
        const rows = token.rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td style="padding:8px;border-bottom:1px solid ${COLORS.line};font-size:14px;vertical-align:top">${this.parser.parseInline(cell.tokens)}</td>`)
                .join("")}</tr>`,
          )
          .join("");
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 20px"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
      },
      list(token) {
        const tag = token.ordered ? "ol" : "ul";
        const items = token.items
          .map((item) => `<li style="margin:0 0 8px;font-size:16px;line-height:1.6;color:${COLORS.ink}">${this.parser.parse(item.tokens)}</li>`)
          .join("")
          .replace(/<p style="[^"]*">([\s\S]*?)<\/p>/g, "$1");
        return `<${tag} style="margin:0 0 16px;padding-left:22px">${items}</${tag}>`;
      },
    },
  });
  return marked.parse(markdown, { async: false }) as string;
}

/** Plain-text version: markdown is already readable; keep links visible. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderEmail(issue: Issue, options: RenderOptions): { html: string; text: string } {
  const content = markdownToEmailHtml(issue.body);
  const webUrl = `${options.siteUrl.replace(/\/$/, "")}/issues/${issue.slug}.html`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(issue.meta.subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.paper}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(issue.meta.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid ${COLORS.line};border-radius:6px">
<tr><td style="padding:28px 28px 8px;font-family:Helvetica,Arial,sans-serif">
<p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.muted}">Seed &amp; Source · ${escapeHtml(issue.meta.date)}</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:${COLORS.ink};margin:10px 0 0">${escapeHtml(issue.meta.title)}</h1>
<p style="margin:10px 0 0;font-size:13px"><a href="${escapeHtml(webUrl)}" style="color:${COLORS.muted}">Read on the web</a></p>
</td></tr>
<tr><td style="padding:12px 28px 28px;font-family:Helvetica,Arial,sans-serif">${content}</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid ${COLORS.line};font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${COLORS.muted}">
You're receiving this because you subscribed at ${escapeHtml(options.siteUrl.replace(/^https?:\/\//, ""))}. Just hit reply to talk to us.<br>
<a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${COLORS.muted}">Unsubscribe</a> · ${escapeHtml(options.mailingAddress)}
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `SEED & SOURCE · ${issue.meta.date}`,
    issue.meta.title,
    `Read on the web: ${webUrl}`,
    "",
    markdownToText(issue.body),
    "",
    "—",
    `You're receiving this because you subscribed at ${options.siteUrl}.`,
    `Unsubscribe: ${options.unsubscribeUrl}`,
    options.mailingAddress,
  ].join("\n");

  return { html, text };
}
