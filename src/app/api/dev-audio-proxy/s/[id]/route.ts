import { NextRequest, NextResponse } from "next/server";
import { inferMediaContentType } from "@/lib/mediaUrl";
import { getDevAudioSession } from "@/lib/server/devAudioProxyStore";
import { parseAudioStreamToken } from "@/lib/server/audioStreamToken";

export const dynamic = "force-dynamic";

function resolveStreamTargetUrl(rawId: string): string | null {
  const tryKeys = [rawId];
  try {
    const decoded = decodeURIComponent(rawId);
    if (decoded !== rawId) tryKeys.push(decoded);
  } catch {
    /* ignore */
  }
  for (const key of tryKeys) {
    const fromToken = parseAudioStreamToken(key)?.url;
    if (fromToken) return fromToken;
    const fromSession = getDevAudioSession(key)?.url;
    if (fromSession) return fromSession;
  }
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return streamSession(request, context, "GET");
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return streamSession(request, context, "HEAD");
}

async function streamSession(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  method: "GET" | "HEAD",
) {
  const { id } = await context.params;
  const targetUrl = resolveStreamTargetUrl(id);
  if (!targetUrl) {
    return new NextResponse("Unknown or expired session", { status: 404 });
  }

  const range = request.headers.get("range") ?? undefined;
  const upstream = await fetch(targetUrl, {
    method,
    headers: {
      Accept: "*/*",
      ...(range ? { Range: range } : {}),
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok) {
    const snippet = await upstream.text();
    return new NextResponse(
      `Media fetch failed (${upstream.status}). ${snippet.slice(0, 500)}${snippet.length > 500 ? "…" : ""}`,
      { status: upstream.status, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "accept-ranges",
    "content-range",
    "etag",
    "last-modified",
  ] as const) {
    const v = upstream.headers.get(name);
    if (v) headers.set(name, v);
  }

  if (!headers.has("accept-ranges") && upstream.status !== 206) {
    headers.set("accept-ranges", "bytes");
  }

  const upstreamType = headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const inferredType = inferMediaContentType(targetUrl);
  if (
    inferredType &&
    (!upstreamType || upstreamType === "application/octet-stream" || upstreamType === "binary/octet-stream")
  ) {
    headers.set("content-type", inferredType);
  }

  if (method === "HEAD" || upstream.status === 204) {
    return new NextResponse(null, { status: upstream.status, headers });
  }

  headers.set("Cache-Control", "no-store, no-cache");

  if (!upstream.body) {
    return new NextResponse(null, { status: upstream.status, headers });
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
