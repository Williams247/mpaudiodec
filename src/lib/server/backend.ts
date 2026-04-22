/**
 * Laravel API base URL (no trailing slash). Server-only — never import in client components.
 */
export function getBackendApiBase(): string | null {
  const raw = process.env.BACKEND_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function getPayloadEncryptionKey(): string | null {
  const k = process.env.API_PAYLOAD_ENCRYPTION_KEY?.trim();
  return k && k.length > 0 ? k : null;
}
