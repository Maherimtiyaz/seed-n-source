# Invitations

How to invite people to Seed & Source. Every invitation sends people to the landing page
(`https://seedandsource.com`), where they sign up and confirm by email. **You never add
anyone to the list yourself.** People join only by confirming their own email (double opt-in).
That keeps you legal (CAN-SPAM, GDPR) and keeps Resend from flagging your domain.

## What's here

| File | Use it for |
|---|---|
| `invite-card.png` (1080×1350) | Image post on LinkedIn, X, Instagram, WhatsApp status |
| `../brand/og.png` (1200×630) | Preview image that shows up when anyone pastes the link (already wired into the site) |
| `invite-email.html` | A branded, personal invitation you send from your own inbox, one person at a time |
| `messages.md` | Ready-to-paste DMs, emails and posts for each audience |

## The rules (they protect the brand)

1. **One person at a time.** Write to people you know or who follow your work. Change the first line for each one.
   Send at most about 20 personal emails a day from Gmail.
2. **Never buy, scrape or import email lists.** Never add someone because they gave you a business card.
   Send them the link instead.
3. **Communities:** read each one's self-promotion rules first. Share the issue itself (once it's in the
   archive), not just the signup page. Give before you ask.
4. **Never send invitations through Resend.** Resend is only for people who confirmed. Cold email through it
   can get the account suspended.

## Before the domain is live

Until your domain is connected, the site lives at `https://<project>.pages.dev`. Replace
`https://seedandsource.com` in `invite-email.html` (the "Deliver my paper" button) and in
your messages with that address while you test.

## Changing the domain

The card and the link-preview image say `seedandsource.com`. If you buy a different domain, change it in
`brand/src/social.html` and `site/index.html` (`og:image`), then re-render the images.
`brand/src/*.html` are the sources: open one in Chrome and screenshot the element, or ask Claude to re-render.
