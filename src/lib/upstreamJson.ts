import { decryptPayloadAesGcmBase64 } from "@/lib/payloadCrypto";

export async function readUpstreamJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  let payload: unknown = JSON.parse(text);
  if (payload && typeof payload === "object") {
    const rec = payload as Record<string, unknown>;
    if (typeof rec.res === "string") {
      const key = (process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY ?? "").trim();
      if (!key) {
        throw new Error(
          "Encrypted API response. Set NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY in the browser.",
        );
      }
      const plain = await decryptPayloadAesGcmBase64(rec.res, key);
      payload = JSON.parse(plain) as unknown;
    }
  }
  return payload;
}

export function pickSignedDownloadUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const candidates: unknown[] = [payload];
  const rec = payload as Record<string, unknown>;
  if (rec.data && typeof rec.data === "object") {
    candidates.push(rec.data);
  }

  const keys = ["url", "signed_url", "signedUrl", "download_url", "downloadUrl", "music_url", "musicUrl"];
  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    for (const key of keys) {
      if (typeof row[key] === "string" && row[key].trim()) {
        return row[key].trim();
      }
    }
  }
  return null;
}
