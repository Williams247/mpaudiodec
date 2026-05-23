import { NextRequest, NextResponse } from "next/server";
import { assertAllowedBackblazeTarget } from "@/lib/server/devAudioProxyStore";
import { createAudioStreamToken } from "@/lib/server/audioStreamToken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const parsed = (await request.json()) as { url?: string };
    const targetUrl = parsed.url?.trim();
    if (!targetUrl) {
      return NextResponse.json({ message: "Missing url" }, { status: 400 });
    }
    if (!assertAllowedBackblazeTarget(targetUrl)) {
      return NextResponse.json({ message: "Host not allowed" }, { status: 403 });
    }
    const token = createAudioStreamToken(targetUrl);
    if (!token) {
      return NextResponse.json(
        { message: "Server misconfiguration: API_PAYLOAD_ENCRYPTION_KEY is not set" },
        { status: 503 },
      );
    }
    return NextResponse.json({ token });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Session error" },
      { status: 500 },
    );
  }
}
