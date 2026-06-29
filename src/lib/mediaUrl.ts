/** Shared helpers for presigned / Backblaze media URLs used by the API and player. */

export function isBackblazeUrl(value: string): boolean {
  return value.includes('backblazeb2.com') || value.includes('backblaze');
}

export function isCloudinaryUrl(value: string): boolean {
  return value.includes('cloudinary.com');
}

const DEFAULT_PROXIABLE_HOST_MARKERS = [
  'backblazeb2.com',
  'backblaze',
  'cloudinary.com',
] as const;

function extraProxiableHosts(): string[] {
  const raw =
    typeof process !== 'undefined'
      ? process.env.MEDIA_PROXY_EXTRA_HOSTS ?? process.env.NEXT_PUBLIC_MEDIA_PROXY_EXTRA_HOSTS
      : undefined;
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** Hosts the audio proxy is allowed to fetch (Cloudinary, Backblaze, optional custom CNAMEs). */
export function isProxiableMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (DEFAULT_PROXIABLE_HOST_MARKERS.some((marker) => host.includes(marker))) {
    return true;
  }
  return extraProxiableHosts().some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

/** True when a remote URL should be streamed through the same-origin audio proxy. */
export function isProxiableMediaUrl(
  urlString: string,
  origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
): boolean {
  if (!needsSameOriginAudioProxy(urlString, origin)) return false;
  try {
    return isProxiableMediaHost(new URL(urlString, origin).hostname);
  } catch {
    return false;
  }
}

/**
 * Cross-origin remote audio should be streamed via the same-origin proxy so iOS/Android
 * keep playing when the screen locks (direct CDN URLs are often paused in background).
 */
export function needsSameOriginAudioProxy(
  urlString: string,
  origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
): boolean {
  if (!urlString.trim()) return false;
  try {
    const u = new URL(urlString, origin);
    if (u.pathname.startsWith('/api/dev-audio-proxy/')) return false;
    if (u.origin === origin) return false;
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
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

const IMAGE_EXTENSIONS = new Set([
  'webp',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'svg',
  'avif',
  'heic',
  'heif',
]);

const PLAYABLE_FORMAT_SCORE: Record<string, number> = {
  mp3: 100,
  wav: 100,
  m4a: 95,
  aac: 90,
  ogg: 80,
  flac: 75,
};

export function getMediaExtension(urlString: string): string {
  const path = urlString.split('?')[0]?.split('#')[0] ?? '';
  const dot = path.lastIndexOf('.');
  if (dot === -1) return '';
  return path.slice(dot + 1).toLowerCase();
}

/** True when a Cloudinary URL likely includes a video track (paused on lock screen). */
export function isCloudinaryVideoContainerUrl(urlString: string): boolean {
  try {
    const pathname = new URL(urlString).pathname.toLowerCase();
    if (!pathname.includes('/video/authenticated/')) return false;
    return pathname.includes('/asdstr/');
  } catch {
    return false;
  }
}

/** Higher is better; -1 means not playable (e.g. Cloudinary artwork .webp). */
export function scorePlayableMediaUrl(urlString: string): number {
  if (!urlString.trim()) return -1;

  const ext = getMediaExtension(urlString);
  if (IMAGE_EXTENSIONS.has(ext)) return -1;

  if (ext in PLAYABLE_FORMAT_SCORE) {
    return PLAYABLE_FORMAT_SCORE[ext];
  }

  try {
    const pathname = new URL(urlString).pathname.toLowerCase();
    if (pathname.includes('/image/upload/')) return -1;
    // Cloudinary raw uploads are commonly .wav / .mp3 audio files.
    if (pathname.includes('/raw/upload/')) return 60;
    // Audio-only Cloudinary uploads (mka/webm) — reliable background playback.
    if (pathname.includes('/mpawav/')) return 85;
    // Video-with-video-track uploads — foreground only on mobile lock screen.
    if (pathname.includes('/asdstr/')) return 15;
  } catch {
    /* ignore */
  }

  return ext ? 10 : 5;
}

export function isPlayableMediaUrl(urlString: string): boolean {
  return scorePlayableMediaUrl(urlString) >= 0;
}

export function isImageMediaUrl(urlString: string): boolean {
  if (!urlString.trim()) return false;
  if (IMAGE_EXTENSIONS.has(getMediaExtension(urlString))) return true;
  try {
    return new URL(urlString).pathname.toLowerCase().includes('/image/upload/');
  } catch {
    return false;
  }
}

export function inferMediaContentType(urlString: string): string | undefined {
  const ext = getMediaExtension(urlString);
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    default:
      return undefined;
  }
}
