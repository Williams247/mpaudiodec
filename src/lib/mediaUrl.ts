/** Shared helpers for presigned / Backblaze media URLs used by the API and player. */

export function isBackblazeUrl(value: string): boolean {
  return value.includes('backblazeb2.com') || value.includes('backblaze');
}

function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** True when the URL carries a time-limited signature that is past its expiry (or unparseable). */
export function isExpiredSignedMediaUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const q = u.searchParams;
    const now = nowEpochSeconds();

    const expiresRaw = q.get('Expires');
    if (expiresRaw) {
      const expiresAt = Number(expiresRaw);
      if (Number.isFinite(expiresAt)) return now >= expiresAt - 10;
    }

    const amzDate = q.get('X-Amz-Date');
    const amzExpires = q.get('X-Amz-Expires');
    if (amzDate && amzExpires) {
      const match = amzDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
      if (match) {
        const [, y, m, d, hh, mm, ss] = match;
        const issuedAtMs = Date.UTC(
          Number(y),
          Number(m) - 1,
          Number(d),
          Number(hh),
          Number(mm),
          Number(ss),
        );
        const ttlSeconds = Number(amzExpires);
        if (Number.isFinite(issuedAtMs) && Number.isFinite(ttlSeconds)) {
          const expiresAt = Math.floor(issuedAtMs / 1000) + ttlSeconds;
          return now >= expiresAt - 10;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * True when the URL already has a non-expired presigned query (S3 / native B2 download token).
 * Native B2 `Authorization` query tokens are not treated as long-lived — they are re-signed.
 */
export function hasValidPresignedQuery(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const q = u.searchParams;

    if (q.has('Authorization') && u.pathname.includes('/file/')) {
      return false;
    }

    if (q.has('X-Amz-Algorithm') || q.has('X-Amz-Credential') || q.has('X-Amz-Signature')) {
      return !isExpiredSignedMediaUrl(urlString);
    }
    if (q.has('Signature') || q.has('AWSAccessKeyId')) {
      return !isExpiredSignedMediaUrl(urlString);
    }
    return false;
  } catch {
    return false;
  }
}

export function artworkMimeType(src: string): string {
  const path = src.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}
