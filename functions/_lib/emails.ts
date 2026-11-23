/**
 * The two emails a new reader gets, in the newspaper look of the site:
 *   1. confirmEmail: the double opt-in link (sent by /api/subscribe)
 *   2. welcomeEmail: "You're planted", sent once they confirm (by /api/confirm)
 * Email clients ignore web fonts, so the masthead is an image (site/email/wordmark.png)
 * with Georgia as the text fallback. Everything is inline-styled tables.
 */

const PAPER = "#f1e8d4";
const EDGE = "#e4d6b8";
const INK = "#1d1b17";
const SOFT = "#4a443a";
const HAIR = "#b9aa8b";
const SPOT = "#8e2b1d";
const SERIF = "Georgia,'Times New Roman',serif";

export type RenderedEmail = { subject: string; html: string; text: string };

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function frame(site: string, preheader: string, notice: string, inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${EDGE};">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EDGE};"><tr><td style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${PAPER};border:2px solid ${INK};">
<tr><td style="padding:26px 30px 0;text-align:center;font-family:${SERIF};color:${INK};">
  <p style="margin:0 0 10px;font-size:11px;letter-spacing:4px;text-transform:uppercase;">${notice}</p>
  <a href="${escapeAttr(site)}" style="text-decoration:none;color:${INK};"><img src="${escapeAttr(site)}/email/wordmark.png" width="300" alt="Seed &amp; Source" style="display:block;margin:0 auto;width:300px;max-width:100%;height:auto;border:0;font-family:${SERIF};font-size:34px;color:${INK};"></a>
  <div style="border-top:3px double ${INK};margin:14px 0 0;"></div>
</td></tr>
${inner}
<tr><td style="padding:0 30px 24px;font-family:${SERIF};font-size:12px;color:${SOFT};text-align:center;">
  <div style="border-top:1px solid ${HAIR};margin:0 0 12px;"></div>
  Seed &amp; Source · one startup a week, from seed to stack · <a href="${escapeAttr(site)}" style="color:${SPOT};">${escapeAttr(site.replace(/^https?:\/\//, ""))}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;background:${INK};color:${PAPER};font-family:${SERIF};font-size:14px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:13px 26px;">${label}</a>`;
}

export function confirmEmail(link: string, site: string): RenderedEmail {
  const inner = `<tr><td style="padding:20px 30px 8px;font-family:${SERIF};color:${INK};text-align:center;">
  <h1 style="margin:0;font-size:28px;line-height:1.15;">One click, and your seed is in the ground.</h1>
  <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:${SOFT};font-style:italic;">You asked to receive Seed &amp; Source, a free weekly newsletter about how startups are planted and what they're built from.</p>
</td></tr>
<tr><td style="padding:18px 30px 22px;text-align:center;">${button(link, "Confirm my subscription")}
  <p style="margin:14px 0 0;font-family:${SERIF};font-size:13px;color:${SOFT};">The link works for 48 hours. If you didn't ask for this, ignore this email and nothing happens.</p>
</td></tr>`;
  return {
    subject: "Confirm your Seed & Source subscription",
    html: frame(site, "One click to confirm your subscription.", "Subscription form · awaiting signature", inner),
    text: `Seed & Source\n\nOne click, and your seed is in the ground. Confirm your subscription:\n\n${link}\n\nThe link works for 48 hours. If you didn't ask for this, ignore this email and nothing happens.`,
  };
}

export function welcomeEmail(site: string): RenderedEmail {
  const p = `margin:0 0 14px;font-size:16px;line-height:1.65;`;
  const inner = `<tr><td style="padding:22px 30px 0;font-family:${SERIF};color:${INK};text-align:center;">
  <img src="${escapeAttr(site)}/email/sprout.png" width="96" height="96" alt="" style="display:block;margin:0 auto 10px;border:0;border-radius:50%;">
  <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${SPOT};font-weight:bold;">Founding reader · Vol. I</p>
  <h1 style="margin:8px 0 0;font-size:32px;line-height:1.1;">You're planted.</h1>
  <p style="margin:10px 0 0;font-size:17px;line-height:1.5;color:${SOFT};font-style:italic;">Every company in this paper began as a seed in the dark. So does every paper. You're one of its first seeds.</p>
</td></tr>
<tr><td style="padding:22px 30px 6px;font-family:${SERIF};color:${INK};">
  <p style="${p}">Thank you for subscribing to <b>Seed &amp; Source</b>. You're joining before the first edition goes out, which makes you a founding reader. This paper will grow from here, and you'll have watched it from the roots.</p>
  <p style="${p}">Here's what lands in your inbox every Tuesday:</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${SERIF};font-size:15px;line-height:1.5;color:${INK};border-top:2px solid ${INK};">
    <tr><td style="padding:9px 0;border-bottom:1px dotted ${HAIR};"><b>The Story</b> · where the idea came from and the moment it clicked</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px dotted ${HAIR};"><b>The Business Side</b> · pricing, funding and how it makes money</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px dotted ${HAIR};"><b>Under the Hood</b> · the stack and one engineering decision, in plain words</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px dotted ${HAIR};"><b>AI Radar &amp; Quick Hits</b> · what's blooming this week</td></tr>
  </table>
  <p style="margin:16px 0 14px;font-size:16px;line-height:1.65;">One company, seven minutes, and every claim linked to where we found it.</p>
  <p style="${p}"><b>One favor:</b> hit reply and tell me which startup's story you'd like us to dig up. I read every reply, and reader suggestions go to the top of the list.</p>
  <p style="${p}">So the paper reaches you and not your spam folder, add this address to your contacts.</p>
  <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">See you Tuesday,<br><i>The Editor, Seed &amp; Source</i></p>
</td></tr>`;
  return {
    subject: "You're planted: welcome to Seed & Source",
    html: frame(site, "You're one of the first seeds of Seed & Source.", "Special notice to our newest reader", inner),
    text: `Seed & Source · Founding reader, Vol. I

You're planted.

Every company in this paper began as a seed in the dark. So does every paper. You're one of its first seeds.

Thank you for subscribing. You're joining before the first edition goes out, which makes you a founding reader.

Every Tuesday:
- The Story: where the idea came from and the moment it clicked
- The Business Side: pricing, funding and how it makes money
- Under the Hood: the stack and one engineering decision, in plain words
- AI Radar & Quick Hits: what's blooming this week

One company, seven minutes, every claim linked to where we found it.

One favor: reply and tell me which startup's story you'd like us to dig up.

See you Tuesday,
The Editor, Seed & Source
${site}`,
  };
}
