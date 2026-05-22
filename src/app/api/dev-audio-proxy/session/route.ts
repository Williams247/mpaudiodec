import { NextRequest, NextResponse } from "next/server";
import {
  assertAllowedBackblazeTarget,
  createDevAudioSession,
} from "@/lib/server/devAudioProxyStore";

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
    const id = createDevAudioSession(targetUrl);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Session error" },
      { status: 500 },
    );
  }
}
