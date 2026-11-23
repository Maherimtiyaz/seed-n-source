# Seed & Source — newsroom handbook

Every agent working in this repo reads this first.

## What we are

A free weekly newsletter: **"How startups are planted, and what they're built from."**
Each issue takes ONE company and traces it from the first idea (the seed) down to its
code, tools and business model (the source). Promise: a seven-minute read where every
claim links to its source.

**Who reads it** (write for all of them at once):
- Indie hackers and bootstrappers: pricing, first customers, distribution, what one person can copy.
- Software engineers: the stack and the one engineering decision, explained without dumbing down.
- AI engineers: models, infra and costs behind AI products; what is real versus marketing.
- Tech, startup and business readers: the story and the business, with no jargon left unexplained.

## How agents work (adapted from the "Karpathy-inspired" CLAUDE.md guidelines)

1. **Think before writing.** State your assumptions in your file (e.g. "assuming the Series B date is the
   announcement date"). If two readings of a fact exist, write both down instead of picking one silently.
2. **Simplest thing that works.** Write what the step needs and nothing more: no extra sections, no
   speculative "future" claims, no filler.
3. **Surgical edits.** When fixing someone else's file (e.g. the fact-checker fixing the issue), change only
   the lines that are wrong. Don't rewrite style you merely dislike.
4. **Goal-driven, with a check.** Every step has a test it must pass before handing off: the researcher has
   15+ facts each with an opened URL; the writer hits 1,200–1,800 words and every section in order; the
   fact-checker has opened every link. If the check fails, fix it or say so; never hand off silently.

## Voice

- Plain, warm, specific English. Short sentences. Explain technical ideas so a non-engineer can follow.
- Concrete numbers, names and quotes over adjectives. No hype ("revolutionary", "game-changing", "insane").
- Never claim personal experience the editor didn't have. Never write "I tried" unless tools-tried.md says so.

## Issue format (same order every week)

1. **The Story**: how it started, first customers, the turning point or near-death moment, what's working now.
2. **The Business Side**: pricing, funding, team, revenue (only if reported), one key decision.
3. **Under the Hood**: the stack and one engineering decision, explained simply.
4. **What builders can take from it**: 3–5 lessons, each tied to a fact above.
5. **AI Radar**: 2–3 AI startups that did something notable in the last 7 days.
6. **Tools**: one open-source and one paid pick, ONLY from tools-tried.md. If it's empty, leave the section out.
7. **Quick Hits**: 3–5 one-line links from the last 7 days.
8. **Sources**: every URL used.

Length 1,200–1,800 words. Subject line under 60 characters, naming the company.
File: `issues/<YYYY-MM-DD>-<company-kebab>.md` (the date is the Tuesday it goes out), using `issues/_template.md`.

## Rotation

Rotate the main company: YC company → AI startup → open-source project → bootstrapped business.
Never repeat a company covered in issues/ within the last 6 months.

## Sources: the rules that protect the brand

- Every factual claim (numbers, dates, quotes, events) links to where it was found.
- Prefer primary sources: the company's blog, docs, changelog, GitHub; founder interviews; YC company pages;
  reputable press (CNBC, TechCrunch, Bloomberg, The Information, First Round Review).
- When sources disagree, use the primary one, or leave the claim out. Never average them.
- Revenue and user numbers only if the company or reputable press reported them. Analyst estimates are labelled "estimate".
- Quote at most 2 sentences from any source. Never copy paragraphs; summarize in our own words.
- Never invent quotes, numbers, customers, or "sources say".
- Posts on Reddit, X or LinkedIn may be linked and briefly quoted with credit. Never scrape them.

## The team (subagents in .claude/agents/)

Work in `research/<slug>/`. Each role writes its own file; the main agent assembles and checks the handoffs.

| Agent | Writes | Runs |
|---|---|---|
| scout | research/<slug>/pick.md | first |
| researcher | research/<slug>/facts.md (15+ sourced facts) | after scout |
| analyst | research/<slug>/business.md, tech.md | after researcher, in parallel with radar |
| radar | research/<slug>/radar.md | in parallel with analyst |
| writer | issues/<slug>.md | after analyst and radar |
| fact-checker | research/<slug>/factcheck.md, fixes the issue | last |

Run subagents in the foreground and wait for each result before starting the next step
(analyst and radar may run at the same time).

## Weekly pipeline (what `npm run issue` asks for)

1. Pick: scout (or the editor's `--company`). If fewer than 15 verified facts can be found, switch to a backup.
2. Research → analysis + radar → writing → fact-check.
3. Write `research/<slug>/social.md`: an X thread (6–8 posts) and a LinkedIn post, both ending with
   "Subscribe free: <SITE_URL>". The editor posts them by hand.
4. Run `npm run preview -- <slug>` (sends a test email to the editor only).
5. Reply with: slug, subject, fact-check totals, and anything the editor should double-check.

## Hard rules

- **Never send to subscribers.** Only the editor runs `npm run send`, after reviewing. Agents never run it,
  never set `approved: true`, and never edit `sent.json`.
- Never read `.env` or print API keys.
- Never touch the subscriber list. Never export, print or log subscriber emails.
- Label any sponsorship "Sponsored" and any affiliate link "(affiliate)". Never add sponsors or affiliate links on your own.
- Every email includes the unsubscribe link and the mailing address (the template adds them; never remove them).

## Commands

| Command | Who | What |
|---|---|---|
| `npm run issue` | editor | runs this pipeline with Claude Code |
| `npm run preview -- <slug>` | agents or editor | writes previews/<slug>.html and emails a test to EDITOR_EMAIL |
| `npm run send -- <slug>` | **editor only** | sends to all subscribers (needs `approved: true` + typed confirmation) |
| `npm run build` | editor | builds dist/ (landing + archive of sent issues) |
| `npm test` | anyone | unit tests |
