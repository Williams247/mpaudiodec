import { NextRequest, NextResponse } from "next/server";
import { getDevAudioSession } from "@/lib/server/devAudioProxyStore";

export const dynamic = "force-dynamic";

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
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not available", { status: 404 });
  }

  const { id } = await context.params;
  const session = getDevAudioSession(id);
  if (!session) {
    return new NextResponse("Unknown or expired session", { status: 404 });
  }

  const range = request.headers.get("range") ?? undefined;
  const upstream = await fetch(session.url, {
    method,
    headers: range ? { Range: range } : undefined,
    redirect: "follow",
  });

  if (!upstream.ok) {
    const snippet = await upstream.text();
    return new NextResponse(
      `Backblaze fetch failed (${upstream.status}). ${snippet.slice(0, 500)}${snippet.length > 500 ? "…" : ""}`,
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

  if (method === "HEAD" || upstream.status === 204) {
    return new NextResponse(null, { status: upstream.status, headers });
  }

  if (!upstream.body) {
    return new NextResponse(null, { status: upstream.status, headers });
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}
