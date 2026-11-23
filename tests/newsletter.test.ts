import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { createToken, verifyToken } from "../functions/_lib/token.ts";
import { indexPage, issuePage } from "../scripts/build-site.ts";
import { loadIssue, parseIssue, sendBlockers } from "../scripts/lib/issue.ts";
import { renderEmail, RESEND_UNSUBSCRIBE } from "../scripts/lib/render.ts";
import { ResendError, subscribeContact } from "../scripts/lib/resend.ts";
import { ALLOWED_TOOLS, buildPrompt, nextTuesday } from "../scripts/new-issue.ts";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

function issueSource(overrides: { approved?: boolean; body?: string } = {}) {
  return `---
title: Acme: the pivot that worked
subject: How Acme found its first customers
preheader: One sentence preview.
company: Acme
date: 2026-12-01
approved: ${overrides.approved ?? true}
---

## 🌱 The Story

${overrides.body ?? words(500)} [source](https://example.com/a)
`;
}

describe("issues", () => {
  test("parses front matter and body", () => {
    const issue = parseIssue("2026-12-01-acme", issueSource());
    assert.equal(issue.meta.company, "Acme");
    assert.equal(issue.meta.approved, true);
    assert.match(issue.body, /^## 🌱 The Story/);
  });

  test("missing front matter or fields is an error", () => {
    assert.throws(() => parseIssue("x", "no front matter"), /missing front matter/);
    assert.throws(() => parseIssue("x", "---\ntitle: a\n---\nbody"), /missing "subject"/);
  });

  test("a finished, approved issue has no blockers", () => {
    assert.deepEqual(sendBlockers(parseIssue("s", issueSource())), []);
  });

  test("unapproved, unfinished, empty or short issues are blocked", () => {
    assert.ok(sendBlockers(parseIssue("s", issueSource({ approved: false }))).some((b) => b.includes("approved: false")));
    assert.ok(sendBlockers(parseIssue("s", issueSource({ body: `${words(500)} [you fill this in]` }))).some((b) => b.includes("placeholder")));
    assert.ok(sendBlockers(parseIssue("s", issueSource({ body: `${words(500)} TODO` }))).length > 0);
    assert.ok(sendBlockers(parseIssue("s", issueSource({ body: `${words(500)}\n\n## 📡 AI Radar\n\n## ⚡ Quick Hits\n\nhit` }))).some((b) => b.includes("empty section")));
    assert.ok(sendBlockers(parseIssue("s", issueSource({ body: "too short" }))).some((b) => b.includes("words")));
  });

  test("Issue 01 is not sendable until the editor approves it", () => {
    const issue = loadIssue("2026-11-24-supabase");
    const blockers = sendBlockers(issue);
    assert.ok(blockers.some((b) => b.includes("approved: false")));
  });

  test("slugs are validated before touching the filesystem", () => {
    assert.throws(() => loadIssue("../.env"), /not a valid issue slug/);
  });
});

describe("email rendering", () => {
  const issue = parseIssue("2026-12-01-acme", issueSource({ body: `${words(450)} <script>x</script> [link](https://example.com/a)` }));

  test("broadcasts carry Resend's unsubscribe placeholder and the mailing address", () => {
    const { html, text } = renderEmail(issue, { siteUrl: "https://seedandsource.com", mailingAddress: "PO Box 1, Town", unsubscribeUrl: RESEND_UNSUBSCRIBE });
    assert.ok(html.includes(RESEND_UNSUBSCRIBE));
    assert.ok(html.includes("PO Box 1, Town"));
    assert.ok(text.includes(RESEND_UNSUBSCRIBE));
    assert.ok(html.includes("https://seedandsource.com/issues/2026-12-01-acme.html"));
  });

  test("links keep their URLs in the plain-text version", () => {
    const { text } = renderEmail(issue, { siteUrl: "https://s.co", mailingAddress: "a", unsubscribeUrl: "u" });
    assert.match(text, /link \(https:\/\/example\.com\/a\)/);
  });

  test("title and subject are HTML-escaped", () => {
    const tricky = parseIssue("2026-12-01-acme", issueSource().replace("Acme: the pivot that worked", "A <b>bold</b> & co"));
    const { html } = renderEmail(tricky, { siteUrl: "https://s.co", mailingAddress: "a", unsubscribeUrl: "u" });
    assert.ok(html.includes("A &lt;b&gt;bold&lt;/b&gt; &amp; co"));
  });
});

describe("double opt-in tokens", () => {
  const secret = "test-secret-please-change";

  test("a fresh token round-trips the email", async () => {
    const token = await createToken("a@b.co", secret);
    assert.equal(await verifyToken(token, secret), "a@b.co");
  });

  test("tampered, wrong-secret and expired tokens are rejected", async () => {
    const token = await createToken("a@b.co", secret);
    const [payload, signature] = token.split(".");
    const otherPayload = (await createToken("evil@x.co", secret)).split(".")[0];
    assert.equal(await verifyToken(`${otherPayload}.${signature}`, secret), null);
    assert.equal(await verifyToken(token, "another-secret"), null);
    assert.equal(await verifyToken(`${payload}`, secret), null);
    assert.equal(await verifyToken("garbage", secret), null);
    const old = await createToken("a@b.co", secret, Date.now() - 49 * 3600 * 1000);
    assert.equal(await verifyToken(old, secret), null);
  });
});

describe("resend client", () => {
  test("new contacts are created inside the segment", async () => {
    const calls: string[] = [];
    const result = await subscribeContact("key", "a@b.co", "seg_1", (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method} ${String(url)} ${String(init?.body ?? "")}`);
      return new Response(JSON.stringify({ object: "contact", id: "c1" }), { status: 200 });
    }) as typeof fetch);
    assert.equal(result, "created");
    assert.equal(calls.length, 1);
    assert.match(calls[0] ?? "", /POST https:\/\/api\.resend\.com\/contacts .*"segments":\[\{"id":"seg_1"\}\]/);
  });

  test("an existing contact is added to the segment instead", async () => {
    const calls: string[] = [];
    const result = await subscribeContact("key", "a@b.co", "seg_1", (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method} ${String(url)}`);
      return calls.length === 1
        ? new Response(JSON.stringify({ message: "Contact already exists" }), { status: 409 })
        : new Response(JSON.stringify({ id: "seg_1" }), { status: 200 });
    }) as typeof fetch);
    assert.equal(result, "added");
    assert.equal(calls[1], "POST https://api.resend.com/contacts/a%40b.co/segments/seg_1");
  });

  test("auth failures are not mistaken for duplicates", async () => {
    await assert.rejects(
      subscribeContact("bad", "a@b.co", "seg_1", (async () => new Response("{}", { status: 401 })) as typeof fetch),
      (error: unknown) => error instanceof ResendError && error.status === 401,
    );
  });
});

describe("the agent run", () => {
  test("next Tuesday is always in the future", () => {
    assert.equal(nextTuesday(new Date("2026-11-19T10:00:00Z")), "2026-11-24"); // Thursday
    assert.equal(nextTuesday(new Date("2026-11-24T10:00:00Z")), "2026-12-01"); // a Tuesday → the next one
  });

  test("the prompt forbids sending and approval", () => {
    const prompt = buildPrompt("2026-11-24", "Cal.com");
    assert.match(prompt, /Do not run npm run send/);
    assert.match(prompt, /never set approved: true/);
    assert.match(prompt, /Cal\.com/);
  });

  test("agents are never allowed to run send, and settings deny it", () => {
    assert.ok(!ALLOWED_TOOLS.some((tool) => /send(?!-test)/.test(tool) && !tool.includes("preview")));
    const settings = JSON.parse(readFileSync(".claude/settings.json", "utf8")) as { permissions: { deny: string[] } };
    assert.ok(settings.permissions.deny.includes("Bash(npm run send *)"));
    assert.ok(settings.permissions.deny.includes("Read(./.env)"));
  });
});

describe("archive", () => {
  test("pages escape metadata and the index handles an empty archive", () => {
    const issue = parseIssue("2026-12-01-acme", issueSource());
    assert.match(issuePage(issue), /<h1>Acme: the pivot that worked<\/h1>/);
    assert.match(indexPage([]), /first issue is on its way/);
    assert.match(indexPage([issue]), /\/issues\/2026-12-01-acme\.html/);
  });
});

describe("signup emails", () => {
  test("the confirmation email carries the link and the brand", async () => {
    const { confirmEmail } = await import("../functions/_lib/emails.ts");
    const email = confirmEmail("https://s.co/api/confirm?t=a&b", "https://s.co");
    assert.ok(email.html.includes('href="https://s.co/api/confirm?t=a&amp;b"'));
    assert.ok(email.text.includes("https://s.co/api/confirm?t=a&b"));
    assert.ok(email.html.includes("https://s.co/email/wordmark.png"));
  });

  test("confirming sends the welcome once, to new contacts only", async () => {
    const { onRequestGet } = await import("../functions/api/confirm.ts");
    const env = { RESEND_API_KEY: "k", RESEND_SEGMENT_ID: "seg", FROM_EMAIL: "S <h@s.co>", SITE_URL: "https://s.co", CONFIRM_SECRET: "secret-for-tests", REPLY_TO: "r@s.co" };
    const token = await createToken("new@b.co", env.CONFIRM_SECRET);
    const realFetch = globalThis.fetch;
    for (const existing of [false, true]) {
      const calls: { url: string; body: string }[] = [];
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), body: String(init?.body ?? "") });
        if (existing && String(url).endsWith("/contacts")) return new Response("{}", { status: 409 });
        return new Response('{"id":"x"}', { status: 200 });
      }) as typeof fetch;
      try {
        const response = await onRequestGet({ request: new Request(`https://s.co/api/confirm?t=${encodeURIComponent(token)}`), env });
        assert.equal(response.headers.get("location"), "https://s.co/confirmed.html");
        const welcomes = calls.filter((c) => c.url.endsWith("/emails"));
        assert.equal(welcomes.length, existing ? 0 : 1);
        if (!existing) assert.match(welcomes[0]?.body ?? "", /You're planted.*"reply_to":"r@s.co"|"reply_to":"r@s.co".*You're planted/);
      } finally {
        globalThis.fetch = realFetch;
      }
    }
  });
});
