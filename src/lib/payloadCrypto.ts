/**
 * Decrypts payloads produced by Laravel `PayloadEncryptionService`:
 * base64(iv[12] + ciphertext + tag[16]), AES-256-GCM.
 */
const IV_LENGTH = 12;
const TAG_LENGTH_BITS = 128;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/** Detached copy on a fresh `ArrayBuffer` (satisfies strict `BufferSource` typing). */
function copyBytes(src: Uint8Array): Uint8Array {
  const buf = new ArrayBuffer(src.byteLength);
  const out = new Uint8Array(buf);
  out.set(src);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin);
}

/**
 * Encrypts UTF-8 plaintext to the same format as Laravel `PayloadEncryptionService::encrypt`:
 * base64(iv[12] + ciphertext + tag[16]), AES-256-GCM.
 */
export async function encryptPayloadAesGcmBase64(
  plaintext: string,
  keyBase64: string,
): Promise<string> {
  const keyBytes = copyBytes(base64ToBytes(keyBase64.trim()));
  if (keyBytes.length !== 32) {
    throw new Error("API payload key must be base64 encoding exactly 32 bytes");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: TAG_LENGTH_BITS },
      cryptoKey,
      encoded,
    ),
  );

  const out = new Uint8Array(iv.length + ciphertextWithTag.length);
  out.set(iv, 0);
  out.set(ciphertextWithTag, iv.length);
  return bytesToBase64(out);
}

export async function decryptPayloadAesGcmBase64(
  encryptedBase64: string,
  keyBase64: string,
): Promise<string> {
  const keyBytes = copyBytes(base64ToBytes(keyBase64.trim()));
  if (keyBytes.length !== 32) {
    throw new Error("API payload key must be base64 encoding exactly 32 bytes");
  }

  const raw = base64ToBytes(encryptedBase64.trim());
  if (raw.length < IV_LENGTH + 16) {
    throw new Error("Invalid encrypted payload length");
  }

  const iv = copyBytes(raw.subarray(0, IV_LENGTH));
  const ciphertextWithTag = copyBytes(raw.subarray(IV_LENGTH));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource, tagLength: TAG_LENGTH_BITS },
    cryptoKey,
    ciphertextWithTag as BufferSource,
  );

  return new TextDecoder("utf-8", { fatal: true }).decode(decrypted);
}
