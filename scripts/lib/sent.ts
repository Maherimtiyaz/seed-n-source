/** sent.json records every issue that went to subscribers, so nothing is sent twice. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const SENT_LOG = "sent.json";

export type SentEntry = { slug: string; broadcastId: string; sentAt: string };

export function readSentLog(path = SENT_LOG): SentEntry[] {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as SentEntry[];
}

export function appendSentLog(entry: SentEntry, path = SENT_LOG): void {
  const log = readSentLog(path);
  log.push(entry);
  writeFileSync(path, `${JSON.stringify(log, null, 2)}\n`);
}
