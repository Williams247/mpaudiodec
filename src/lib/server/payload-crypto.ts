import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKeyFromBase64(keyB64: string): Buffer {
  const key = Buffer.from(keyB64.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("API_PAYLOAD_ENCRYPTION_KEY must be base64 encoding exactly 32 bytes");
  }
  return key;
}

/** Matches Laravel `PayloadEncryptionService::encrypt` / `decrypt`. */
export function encryptPayloadAesGcmBase64(plaintext: string, keyB64: string): string {
  const key = getKeyFromBase64(keyB64);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const out = Buffer.concat([iv, enc, tag]);
  return out.toString("base64");
}

export function decryptPayloadAesGcmBase64(encryptedBase64: string, keyB64: string): string {
  const key = getKeyFromBase64(keyB64);
  const raw = Buffer.from(encryptedBase64.trim(), "base64");
  if (raw.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted payload length");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(raw.length - TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
