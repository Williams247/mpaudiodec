import { decryptPayloadAesGcmBase64, encryptPayloadAesGcmBase64 } from "@/lib/server/payload-crypto";
import { getPayloadEncryptionKey } from "@/lib/server/backend";

const DEFAULT_TTL_MS = 20 * 60 * 1000;

type AudioStreamPayload = {
  u: string;
  e: number;
};

function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(token: string): string {
  let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  return b64;
}

export function createAudioStreamToken(targetUrl: string, ttlMs = DEFAULT_TTL_MS): string | null {
  const key = getPayloadEncryptionKey();
  if (!key) return null;

  const payload: AudioStreamPayload = {
    u: targetUrl,
    e: Date.now() + ttlMs,
  };
  const encrypted = encryptPayloadAesGcmBase64(JSON.stringify(payload), key);
  return toBase64Url(encrypted);
}

export function parseAudioStreamToken(token: string): { url: string } | null {
  const key = getPayloadEncryptionKey();
  if (!key) return null;

  try {
    const plain = decryptPayloadAesGcmBase64(fromBase64Url(token), key);
    const parsed = JSON.parse(plain) as AudioStreamPayload;
    if (!parsed?.u?.trim() || !Number.isFinite(parsed.e)) return null;
    if (Date.now() > parsed.e) return null;
    return { url: parsed.u.trim() };
  } catch {
    return null;
  }
}
