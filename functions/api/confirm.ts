/**
 * GET /api/confirm?t=<token>
 * Step 2 of double opt-in: verifies the signed link, adds the person to the
 * subscriber segment in Resend, sends the "You're planted" welcome email (first
 * confirmation only), and sends them to the confirmation page.
 */

import { sendEmail, subscribeContact } from "../../scripts/lib/resend.ts";
import { welcomeEmail } from "../_lib/emails.ts";
import type { PagesContext } from "../_lib/env.ts";
import { verifyToken } from "../_lib/token.ts";

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const url = new URL(request.url);
  const site = env.SITE_URL.replace(/\/$/, "");
  const email = await verifyToken(url.searchParams.get("t") ?? "", env.CONFIRM_SECRET);
  if (!email) return Response.redirect(`${site}/confirmed.html?status=expired`, 303);

  let result: "created" | "added";
  try {
    result = await subscribeContact(env.RESEND_API_KEY, email, env.RESEND_SEGMENT_ID);
  } catch (error) {
    console.error("confirm: could not add contact", error instanceof Error ? error.message : error);
    return Response.redirect(`${site}/confirmed.html?status=error`, 303);
  }
  // Welcome only brand-new contacts, so clicking the link twice doesn't send two.
  // A failed welcome must not undo the subscription, so errors are only logged.
  if (result === "created") {
    try {
      await sendEmail(env.RESEND_API_KEY, {
        from: env.FROM_EMAIL,
        to: email,
        ...(env.REPLY_TO ? { reply_to: env.REPLY_TO } : {}),
        ...welcomeEmail(site),
      });
    } catch (error) {
      console.error("confirm: welcome email failed", error instanceof Error ? error.message : error);
    }
  }
  return Response.redirect(`${site}/confirmed.html`, 303);
}
