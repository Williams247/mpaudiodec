import { NextRequest, NextResponse } from "next/server";
import { proxyBackendRequest } from "@/lib/server/proxyRequest";

export const dynamic = "force-dynamic";

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
  method: string,
): Promise<NextResponse> {
  const { path: pathSegments = [] } = await context.params;
  const contentType = request.headers.get("content-type");
  const rawBody = method === "GET" || method === "HEAD" ? undefined : await request.text();

  const result = await proxyBackendRequest({
    pathSegments,
    searchParams: request.nextUrl.searchParams,
    method,
    headers: {
      Accept: request.headers.get("accept") ?? "application/json",
      ...(request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization") as string }
        : {}),
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    body: rawBody,
  });

  return new NextResponse(result.body, {
    status: result.status,
    headers: { "Content-Type": result.contentType },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "POST");
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "PUT");
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handle(request, context, "DELETE");
}
