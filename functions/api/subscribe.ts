/**
 * POST /api/subscribe  { email }
 * Step 1 of double opt-in: emails a signed confirmation link. Nobody is added
 * to the list until they click it, so a stranger can't subscribe someone else.
 * Always answers 200 for well-formed requests, so it never reveals who is subscribed.
 */

import { sendEmail } from "../../scripts/lib/resend.ts";
import { confirmEmail } from "../_lib/emails.ts";
import type { PagesContext } from "../_lib/env.ts";
import { createToken, EMAIL_RE } from "../_lib/token.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  let body: { email?: unknown; company_website?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(400, { error: "Send JSON with an email field." });
  }

  // Honeypot: real people never fill this hidden field; bots often do.
  if (typeof body.company_website === "string" && body.company_website.length > 0) return json(200, { ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return json(400, { error: "Enter a valid email address." });

  const token = await createToken(email, env.CONFIRM_SECRET);
  const link = `${env.SITE_URL.replace(/\/$/, "")}/api/confirm?t=${encodeURIComponent(token)}`;

  const site = env.SITE_URL.replace(/\/$/, "");
  await sendEmail(env.RESEND_API_KEY, {
    from: env.FROM_EMAIL,
    to: email,
    ...(env.REPLY_TO ? { reply_to: env.REPLY_TO } : {}),
    ...confirmEmail(link, site),
  });

  return json(200, { ok: true });
}
