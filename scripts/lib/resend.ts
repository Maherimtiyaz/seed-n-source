/**
 * Minimal Resend REST client (plain fetch, no SDK). Endpoints checked against
 * resend.com/docs on 2026-11-19. Note: Resend renamed "audiences" to "segments".
 * Shared by the local scripts and the Cloudflare Pages Functions.
 */

const API = "https://api.resend.com";

export class ResendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ResendError";
  }
}

type FetchLike = typeof fetch;

async function call<T>(
  apiKey: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<T> {
  const response = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed.message ?? text;
    } catch {
      // keep raw text
    }
    throw new ResendError(`Resend ${method} ${path} failed (${response.status}): ${message}`, response.status);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export type EmailInput = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
};

export function sendEmail(apiKey: string, email: EmailInput, fetchImpl?: FetchLike) {
  return call<{ id: string }>(apiKey, "POST", "/emails", email, fetchImpl);
}

export type BroadcastInput = {
  segment_id: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  name: string;
  reply_to?: string;
};

/** Creates a draft broadcast (does not send). */
export function createBroadcast(apiKey: string, broadcast: BroadcastInput, fetchImpl?: FetchLike) {
  return call<{ id: string }>(apiKey, "POST", "/broadcasts", broadcast, fetchImpl);
}

export function sendBroadcast(apiKey: string, broadcastId: string, fetchImpl?: FetchLike) {
  return call<{ id: string }>(apiKey, "POST", `/broadcasts/${encodeURIComponent(broadcastId)}/send`, {}, fetchImpl);
}

/**
 * Subscribe an email to the segment. New contacts are created inside the
 * segment; if the contact already exists, it is added to the segment instead.
 * A contact who unsubscribed earlier stays unsubscribed (Resend keeps that globally).
 */
export async function subscribeContact(
  apiKey: string,
  email: string,
  segmentId: string,
  fetchImpl?: FetchLike,
): Promise<"created" | "added"> {
  try {
    await call(apiKey, "POST", "/contacts", { email, segments: [{ id: segmentId }] }, fetchImpl);
    return "created";
  } catch (error) {
    // Existing contact (Resend answers 4xx): attach it to the segment instead.
    if (error instanceof ResendError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 403) {
      await call(apiKey, "POST", `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`, undefined, fetchImpl);
      return "added";
    }
    throw error;
  }
}
