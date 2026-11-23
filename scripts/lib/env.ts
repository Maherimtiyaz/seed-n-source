/** Loads .env (no dependency) and reads required settings with clear errors. */

import { existsSync, readFileSync } from "node:fs";

export function loadDotEnv(path = ".env"): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1] || line.trim().startsWith("#")) continue;
    const value = (match[2] ?? "").replace(/^["']|["']$/g, "");
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

export function requireEnv(...names: string[]): Record<string, string> {
  loadDotEnv();
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing in .env: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`);
  }
  return Object.fromEntries(names.map((name) => [name, (process.env[name] ?? "").trim()]));
}
