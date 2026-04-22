import { randomUUID } from "node:crypto";

type DevAudioSession = { url: string; exp: number };

const sessions = new Map<string, DevAudioSession>();
const TTL_MS = 20 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (entry.exp < now) sessions.delete(id);
  }
}

export function assertAllowedBackblazeTarget(targetUrl: string): URL | null {
  let remote: URL;
  try {
    remote = new URL(targetUrl);
  } catch {
    return null;
  }
  if (remote.protocol !== "https:" && remote.protocol !== "http:") {
    return null;
  }
  const host = remote.hostname.toLowerCase();
  if (!host.includes("backblazeb2.com") && !host.includes("backblaze")) {
    return null;
  }
  return remote;
}

export function createDevAudioSession(url: string): string {
  prune();
  const id = randomUUID();
  sessions.set(id, { url, exp: Date.now() + TTL_MS });
  return id;
}

export function getDevAudioSession(id: string): DevAudioSession | null {
  prune();
  return sessions.get(id) ?? null;
}
