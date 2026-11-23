# Seed & Source

**How startups are planted, and what they're built from.** A free weekly newsletter:
one company per issue, from the first idea down to the stack.

The newsletter is researched and written by a team of Claude agents that runs **on your
computer when you type one command**. Nothing runs on a schedule, and nothing reaches
subscribers until you approve it.

```bash
npm run issue                         # agents research + write next Tuesday's issue, email you a test
# read the test email, fix anything, set approved: true in the issue file
npm run send -- 2026-11-24-supabase   # you send it to everyone (asks you to type the slug)
npm run build && git push             # publishes the web archive
```

## How it works

```
npm run issue  ──► Claude Code (headless, on your machine) reads CLAUDE.md
                    ├─ scout         picks the company (+2 backups)
                    ├─ researcher    15+ facts, each with a source link
                    ├─ analyst       business side + under the hood    ┐ in parallel
                    ├─ radar         AI Radar + Quick Hits (last 7 days) ┘
                    ├─ writer        writes issues/<slug>.md (approved: false)
                    └─ fact-checker  opens every link, fixes or removes claims
                  ──► npm run preview  → test email to you only

you            ──► read it, edit if needed, set approved: true
npm run send   ──► refuses unless approved, finished and not sent before,
                    then asks you to type the slug → Resend broadcast to all subscribers

website (Cloudflare Pages, free)
  /                landing page with signup
  /api/subscribe   emails a confirmation link (double opt-in)
  /api/confirm     adds the person to your Resend subscriber segment
  /issues/         archive of every SENT issue (drafts never go public)
```

The agents are in `.claude/agents/`, and their rules are in `CLAUDE.md`. They are blocked
from running `npm run send`, reading `.env`, or editing `sent.json` (`.claude/settings.json`).

## One-time setup (about 1–2 hours)

### 1. Tools on your computer

- **Node.js 20+:** https://nodejs.org
- **Claude Code** (uses your Claude Pro/Max subscription):
  - macOS / Linux / WSL: `curl -fsSL https://claude.ai/install.sh | bash`
  - Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
  - Then run `claude` once and log in in the browser.
- Clone this repo and install:

```bash
git clone https://github.com/Maherimtiyaz/seed-and-source.git
cd seed-and-source
npm install
```

- **Trust the folder once:** run `claude` inside `seed-and-source`, accept the trust prompt,
  then type `/exit`. Headless runs need this so the project's agents and safety settings load.
- If `ANTHROPIC_API_KEY` is set in your shell, unset it, or runs are billed to the API instead
  of your subscription. `npm run issue` warns you.

### 2. Domain

Buy `seedandsource.com` (or your choice) at any registrar. You'll point it at Cloudflare in step 4.

### 3. Resend (email)

1. In **Domains**, add your domain and add the DNS records Resend shows. Wait until it says *Verified*.
2. In **Audience → Segments**, create a segment called `Subscribers`. Copy its ID.
3. In **API Keys**, create a key with **Full access**.
4. Copy `.env.example` to `.env` and fill in `RESEND_API_KEY`, `RESEND_SEGMENT_ID`,
   `FROM_EMAIL` (on your verified domain), `REPLY_TO`, `EDITOR_EMAIL`, `SITE_URL`
   and `MAILING_ADDRESS` (US anti-spam law requires one; a PO box or virtual address works).

Free plan: up to 1,000 subscribers for newsletters. Check https://resend.com/pricing.

### 4. Cloudflare Pages (website + signup)

1. Create a free account: **https://dash.cloudflare.com/sign-up**
2. **Workers & Pages → Create → Pages → Connect to Git**, pick `seed-and-source`.
3. Build settings: build command `npm run build`, output directory `dist`.
4. **Settings → Variables and Secrets** (Production): add `RESEND_API_KEY`,
   `RESEND_SEGMENT_ID`, `FROM_EMAIL`, `SITE_URL`, `CONFIRM_SECRET`
   (any long random string, e.g. from `openssl rand -hex 32`), and optionally `REPLY_TO`
   (where reader replies go, e.g. the brand Gmail).
5. **Custom domains:** add your domain and follow the DNS steps.
6. Test it: subscribe with your own email, click the confirmation link, and check that
   you appear in the Resend segment.

Every `git push` redeploys the site.

## Every week

1. `npm run issue` (optionally `-- --company "PostHog"`). It takes 15–40 minutes and shows progress.
2. Read the test email and `issues/<slug>.md`. Check `research/<slug>/factcheck.md` for anything removed or uncertain.
3. Edit anything you want. Add tools you really tried to `tools-tried.md` before the run if you want a Tools section.
4. Set `approved: true` in the issue's front matter.
5. `npm run send -- <slug>` and type the slug to confirm.
6. `npm run build`, then commit and push (publishes the archive).
7. Post the X thread and LinkedIn post from `research/<slug>/social.md`.

## Subscribers: where they live and what happens automatically

- **Signing up:** someone clicks your invite → lands on the site → types their email → gets a confirmation
  email → clicks it → is added to the `Subscribers` segment in Resend. Nobody is added without that click.
- **What they receive:** a branded confirmation email, then (on their first confirmation only) the
  "You're planted" welcome email, and the confirmation page in the browser. Templates: `functions/_lib/emails.ts`.
- **Where to see them:** Resend → Audience → Contacts (filter by the `Subscribers` segment). You can export a
  CSV there. Keep that file private; never commit it.
- **Unsubscribing:** every issue has an unsubscribe link (added by the template). One click marks the contact
  "unsubscribed" in Resend, and future broadcasts skip them automatically. Nothing for you to do.
- **Bounces and spam complaints:** Resend suppresses those addresses automatically.
- **Who's reading:** each broadcast in Resend shows opens and clicks. Opens are approximate (Apple Mail
  pre-loads emails), so clicks are the more honest signal.
- **People who stopped reading:** not automated yet. Once you have a few months of issues, do a quarterly
  clean-up: send non-readers one "Still want this?" email, then unsubscribe anyone who doesn't click.
  Resend's API can list who opened or clicked each broadcast, so this can become an editor-only command later.

## Brand and invitations

- `brand/`: logo avatars (`avatar-ink.png` for Gmail and social profiles), `monogram.png`, `wordmark.png`,
  `og.png` (link preview) and `invite.png`. Sources in `brand/src/`.
- `invites/`: how to invite people, ready-to-paste messages per audience, a branded invitation email and
  the invitation card.

## Commands

| Command | What it does |
|---|---|
| `npm run issue` | Runs the agent team for next Tuesday's issue |
| `npm run preview -- <slug>` | Writes `previews/<slug>.html` and emails a test to `EDITOR_EMAIL` (`--no-email` to skip) |
| `npm run send -- <slug>` | Sends to all subscribers (approved + finished + typed confirmation) |
| `npm run build` | Builds `dist/` for Cloudflare Pages |
| `npm test` / `npm run typecheck` | Tests and type checks |

## Files

| Path | What it is |
|---|---|
| `CLAUDE.md` | Newsroom handbook: voice, format, sourcing rules, the pipeline |
| `.claude/agents/` | The six agents |
| `.claude/settings.json` | What agents may never do |
| `issues/` | One markdown file per issue; `_template.md` is the format |
| `research/<slug>/` | The agents' working notes, fact tables and fact-check reports |
| `ideas.md` | Backlog of companies; reader suggestions go first |
| `tools-tried.md` | Tools you actually used (the only ones the writer may feature) |
| `sent.json` | Issues already sent; prevents double sends |
| `site/` | Landing page, confirmation page, archive styles |
| `brand/` | Logo, avatars, link-preview image, invitation card (+ HTML sources) |
| `invites/` | Invitation guide, messages per audience, branded invite email |
| `functions/api/` | Signup and confirmation endpoints (Cloudflare Pages Functions) |
| `scripts/` | The commands above |
