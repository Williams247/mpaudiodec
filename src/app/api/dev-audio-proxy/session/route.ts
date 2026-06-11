import { NextRequest, NextResponse } from "next/server";
import {
  assertAllowedMediaProxyTarget,
  createDevAudioSession,
} from "@/lib/server/devAudioProxyStore";
import { createAudioStreamToken } from "@/lib/server/audioStreamToken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const parsed = (await request.json()) as { url?: string };
    const targetUrl = parsed.url?.trim();
    if (!targetUrl) {
      return NextResponse.json({ message: "Missing url" }, { status: 400 });
    }
    if (!assertAllowedMediaProxyTarget(targetUrl)) {
      return NextResponse.json({ message: "Host not allowed" }, { status: 403 });
    }
    const token = createAudioStreamToken(targetUrl);
    if (token) {
      return NextResponse.json({ token });
    }
    const sessionId = createDevAudioSession(targetUrl);
    return NextResponse.json({ id: sessionId });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Session error" },
      { status: 500 },
    );
  }
}
