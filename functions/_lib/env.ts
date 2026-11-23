/** Environment variables set in Cloudflare Pages → Settings → Variables and Secrets. */
export type Env = {
  RESEND_API_KEY: string;
  RESEND_SEGMENT_ID: string;
  FROM_EMAIL: string;
  SITE_URL: string;
  /** Any long random string; signs confirmation links. */
  CONFIRM_SECRET: string;
  /** Optional: where reader replies go (e.g. the brand Gmail). */
  REPLY_TO?: string;
};

export type PagesContext = { request: Request; env: Env };
