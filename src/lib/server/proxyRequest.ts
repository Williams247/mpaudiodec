import { getBackendApiBase, getPayloadEncryptionKey } from "@/lib/server/backend";
import {
  decryptPayloadAesGcmBase64,
  encryptPayloadAesGcmBase64,
} from "@/lib/server/payload-crypto";

const ENCRYPT_AUTH_SEGMENTS = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
]);

export type ProxyRequestInput = {
  pathSegments: string[];
  searchParams?: URLSearchParams;
  method: string;
  headers?: Record<string, string>;
  body?: string;
};

export type ProxyRequestOutput = {
  status: number;
  body: string;
  contentType: string;
};

function readHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return v;
  }
  return undefined;
}

function buildUpstreamUrl(
  backend: string,
  pathSegments: string[],
  searchParams: URLSearchParams,
): string {
  const sub = pathSegments.join("/");
  const url = new URL(`${backend}/api/${sub}`);
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function maybeEncryptAuthBody(
  pathSegments: string[],
  contentType: string | undefined,
  rawBody: string,
): Promise<string> {
  const first = pathSegments[0] ?? "";
  if (!ENCRYPT_AUTH_SEGMENTS.has(first)) return rawBody;
  if (!contentType?.includes("application/json") || !rawBody.trim()) return rawBody;

  const key = getPayloadEncryptionKey();
  if (!key) return rawBody;

  const normalized = JSON.stringify(JSON.parse(rawBody));
  const go = encryptPayloadAesGcmBase64(normalized, key);
  return JSON.stringify({ go });
}

export async function proxyBackendRequest(input: ProxyRequestInput): Promise<ProxyRequestOutput> {
  const backend = getBackendApiBase();
  if (!backend) {
    return {
      status: 503,
      body: JSON.stringify({ message: "Server misconfiguration: BACKEND_API_URL is not set" }),
      contentType: "application/json",
    };
  }

  const searchParams = input.searchParams ?? new URLSearchParams();
  const targetUrl = buildUpstreamUrl(backend, input.pathSegments, searchParams);

  const headers: Record<string, string> = {
    Accept: readHeader(input.headers, "accept") ?? "application/json",
  };
  const authHeader = readHeader(input.headers, "authorization");
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  let body = input.body;
  if (input.method !== "GET" && input.method !== "HEAD" && body !== undefined) {
    const contentType = readHeader(input.headers, "content-type");
    body = await maybeEncryptAuthBody(input.pathSegments, contentType, body);
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
  }

  const upstream = await fetch(targetUrl, {
    method: input.method,
    headers,
    body,
    cache: "no-store",
  });

  const bodyText = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json";
  return {
    status: upstream.status,
    body: bodyText,
    contentType,
  };
}

export function decodeHashedProxyPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;

  const rec = payload as Record<string, unknown>;
  const encrypted = rec.res;
  if (typeof encrypted !== "string") return payload;

  const key = getPayloadEncryptionKey();
  if (!key) {
    throw new Error("API_PAYLOAD_ENCRYPTION_KEY is not configured for proxy payload decoding");
  }

  const plain = decryptPayloadAesGcmBase64(encrypted, key);
  return JSON.parse(plain) as unknown;
}
