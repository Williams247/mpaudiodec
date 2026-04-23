import type { ApiCategory, ApiMusic, Category, Song } from "@/types/music";
import { decryptPayloadAesGcmBase64 } from "@/lib/payloadCrypto";

const AUTH_TOKEN_KEY = "authToken";
const UPSTREAM_PREFIX = "/api/upstream";

function toUpstreamUrl(apiPath: string): string {
  if (!apiPath.startsWith("/api/")) {
    throw new Error(`Invalid API path: ${apiPath}`);
  }
  return `${UPSTREAM_PREFIX}${apiPath.slice("/api".length)}`;
}

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (withAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(toUpstreamUrl(path), {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (response.ok && payload && typeof payload === "object") {
    const rec = payload as Record<string, unknown>;
    if (typeof rec.res === "string") {
      const key = (process.env.NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY ?? "").trim();
      if (!key) {
        throw new Error(
          "Encrypted response received. Set NEXT_PUBLIC_API_PAYLOAD_ENCRYPTION_KEY to decrypt in browser.",
        );
      }
      const plain = await decryptPayloadAesGcmBase64(rec.res, key);
      payload = JSON.parse(plain) as unknown;
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (payload && typeof payload === "object") {
      const maybeMessage = (payload as { message?: unknown }).message;
      if (typeof maybeMessage === "string") message = maybeMessage;
    } else if (typeof payload === "string" && payload.trim().length > 0) {
      message = payload;
    }
    throw new ApiRequestError(message, response.status, payload);
  }

  return payload as T;
}

function parseDurationToSeconds(duration: string): number {
  const [mins, secs] = duration.split(":").map((value) => Number(value) || 0);
  return mins * 60 + secs;
}

function categoryToIcon(name?: string): string {
  if (!name) return "";
  return "";
}

function normalizeMediaUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  const cleaned = rawUrl.trim().replace(/&amp;/g, "&");
  if (cleaned.startsWith("//")) return `https:${cleaned}`;
  return cleaned;
}

function sanitizeDisplayText(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\boff(?:i)?cial\s+music\s+video\b/gi, "")
    .replace(/\boff(?:i)?cial\s*video\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pickAudioFileUrl(music: ApiMusic): string {
  const candidates: Array<string | undefined> = [
    music.signed_music_url,
    music.signedMusicUrl,
    music.music_url,
    music.musicUrl,
    music.audio_url,
    music.audioUrl,
    music.file_url,
    music.fileUrl,
    music.url,
    music.src,
    music.link,
  ];
  for (const raw of candidates) {
    const normalized = normalizeMediaUrl(raw);
    if (normalized) return normalized;
  }

  const dynamicEntries = Object.entries(music as unknown as Record<string, unknown>);
  for (const [key, value] of dynamicEntries) {
    if (!/(url|audio|music|file|src)/i.test(key)) continue;
    if (typeof value === "string") {
      const normalized = normalizeMediaUrl(value);
      if (normalized) return normalized;
    }
    if (value && typeof value === "object") {
      for (const nestedValue of Object.values(value as Record<string, unknown>)) {
        if (typeof nestedValue !== "string") continue;
        const normalized = normalizeMediaUrl(nestedValue);
        if (normalized) return normalized;
      }
    }
  }
  return "";
}

function normalizeMusic(music: ApiMusic): Song {
  const playableUrl = pickAudioFileUrl(music);

  return {
    id: music.id,
    title: music.title,
    artist: sanitizeDisplayText(music.filename) || "Unknown Artist",
    duration: parseDurationToSeconds(music.duration),
    thumbnail: normalizeMediaUrl(music.thumbnail_url || music.thumbnail),
    description: music.description ?? "",
    categoryId: music.category,
    url: playableUrl,
  };
}

function normalizeCategory(category: ApiCategory): Category {
  return {
    id: category.title,
    backendId: category.id,
    name: category.title,
    icon: categoryToIcon(category.title),
  };
}

type LoginResponse = {
  status?: number;
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    access_token?: string;
    accessToken?: string;
    user?: {
      name?: string;
      email?: string;
    };
  };
  token?: string;
  access_token?: string;
  accessToken?: string;
  token_type?: string;
  user?: {
    name?: string;
    email?: string;
  };
};

function mapLoginResponse(
  payload: LoginResponse,
  fallbackEmail: string,
): {
  token: string | null;
  user: { email?: string; name?: string };
  message: string;
} {
  const token =
    payload?.data?.token ||
    payload?.data?.access_token ||
    payload?.data?.accessToken ||
    payload?.token ||
    payload?.access_token ||
    payload?.accessToken ||
    null;

  return {
    token,
    user: payload?.data?.user || payload?.user || { email: fallbackEmail },
    message: payload?.message || "Login successful",
  };
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password;

  let lastError: unknown = null;

  const attempts: Array<() => Promise<LoginResponse>> = [
    () =>
      request<LoginResponse>("/api/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
      }),
    () =>
      request<LoginResponse>("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: normalizedEmail, password: normalizedPassword }),
      }),
  ];

  for (const attempt of attempts) {
    try {
      const payload = await attempt();
      return mapLoginResponse(payload, normalizedEmail);
    } catch (error) {
      lastError = error;
      const retry = error instanceof ApiRequestError && error.status === 401;
      if (!retry) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("Unable to login with the provided credentials");
}

export async function fetchCurrentUser() {
  return request<{ email?: string; name?: string } | { data?: { email?: string; name?: string } }>(
    "/api/user",
    {},
    true,
  );
}

export async function forgotPassword(email: string) {
  return request<{ message?: string; success?: boolean }>("/api/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  email: string,
  otpCode: string,
  password: string,
) {
  return request<{ message?: string; success?: boolean }>("/api/reset-password", {
    method: "PATCH",
    body: JSON.stringify({ email, otp_code: otpCode, password }),
  });
}

export async function logoutUser() {
  return request<{ message?: string; success?: boolean }>(
    "/api/logout",
    { method: "DELETE" },
    true,
  );
}

type FetchMusicResponseBody =
  | ApiMusic[]
  | {
      data?: ApiMusic[];
      media_urls_expires_at?: string;
      media_urls_ttl_seconds?: number;
    };

export type FetchMusicResult = {
  songs: Song[];
  mediaUrlsExpiresAt: number | null;
  mediaUrlsTtlSeconds: number | null;
};

function parseMusicFetchPayload(payload: FetchMusicResponseBody): {
  list: ApiMusic[];
  mediaUrlsExpiresAt: number | null;
  mediaUrlsTtlSeconds: number | null;
} {
  if (Array.isArray(payload)) {
    return { list: payload, mediaUrlsExpiresAt: null, mediaUrlsTtlSeconds: null };
  }
  const o = payload as Record<string, unknown>;
  const list = Array.isArray(o.data) ? (o.data as ApiMusic[]) : [];
  let mediaUrlsExpiresAt: number | null = null;
  if (typeof o.media_urls_expires_at === "string") {
    const t = Date.parse(o.media_urls_expires_at);
    if (!Number.isNaN(t)) {
      mediaUrlsExpiresAt = t;
    }
  }
  let mediaUrlsTtlSeconds: number | null = null;
  if (typeof o.media_urls_ttl_seconds === "number") {
    mediaUrlsTtlSeconds = o.media_urls_ttl_seconds;
  }
  return { list, mediaUrlsExpiresAt, mediaUrlsTtlSeconds };
}

function unwrapFetchMusicPayload(payload: unknown): FetchMusicResponseBody {
  if (!payload || typeof payload !== "object") {
    return payload as FetchMusicResponseBody;
  }

  const rec = payload as Record<string, unknown>;
  if (typeof rec.res === "string") {
    throw new Error(
      "Music list is encrypted (res) and is intentionally not decrypted in server actions.",
    );
  }

  return payload as FetchMusicResponseBody;
}

export async function fetchMusic(): Promise<FetchMusicResult> {
  const raw = await request<unknown>("/api/fetch-music", {}, true);
  const payload = unwrapFetchMusicPayload(raw);
  const { list, mediaUrlsExpiresAt, mediaUrlsTtlSeconds } = parseMusicFetchPayload(payload);
  return {
    songs: list.map(normalizeMusic),
    mediaUrlsExpiresAt,
    mediaUrlsTtlSeconds,
  };
}

export async function fetchMusicCategories() {
  const payload = await request<ApiCategory[] | { data?: ApiCategory[] }>(
    "/api/fetch-music-categories",
    {},
    true,
  );
  const list = Array.isArray(payload) ? payload : payload.data ?? [];
  return list.map(normalizeCategory);
}

export async function createMusicCategory(title: string) {
  return request<{ message?: string; success?: boolean }>(
    "/api/create-music-category",
    {
      method: "POST",
      body: JSON.stringify({ title }),
    },
    true,
  );
}

export async function updateMusicCategory(params: {
  id: string;
  category: string;
  newCategory: string;
}) {
  const q = new URLSearchParams({ id: params.id });
  return request<{ message?: string; success?: boolean }>(
    `/api/update-music-category?${q.toString()}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        category: params.category,
        new_category: params.newCategory,
      }),
    },
    true,
  );
}
