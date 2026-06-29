import { createHash } from "node:crypto";
import { getCloudinaryApiSecret } from "@/lib/server/backend";

/** Cloudinary folder used for video-with-video-track uploads (paused on lock screen). */
export const CLOUDINARY_VIDEO_CONTAINER_FOLDER = "asdstr";

/** Cloudinary folder used for audio-only uploads (background playback friendly). */
export const CLOUDINARY_AUDIO_ONLY_FOLDER = "mpawav";

export type ParsedCloudinaryAuthenticatedUrl = {
  cloudName: string;
  resourceType: string;
  transformation: string;
  version: string;
  publicId: string;
};

/** True when the URL points at a Cloudinary asset known to include a video track. */
export function isCloudinaryVideoContainerUrl(urlString: string): boolean {
  try {
    const pathname = new URL(urlString).pathname.toLowerCase();
    if (!pathname.includes("/video/authenticated/")) return false;
    return pathname.includes(`/${CLOUDINARY_VIDEO_CONTAINER_FOLDER}/`);
  } catch {
    return false;
  }
}

/** Parse authenticated Cloudinary delivery URLs (with or without inline transformations). */
export function parseCloudinaryAuthenticatedUrl(
  urlString: string,
): ParsedCloudinaryAuthenticatedUrl | null {
  try {
    const u = new URL(urlString);
    if (!u.hostname.endsWith("cloudinary.com")) return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 5) return null;

    const [cloudName, resourceType, deliveryType, signatureToken] = parts;
    if (deliveryType !== "authenticated" || !signatureToken.startsWith("s--")) {
      return null;
    }

    let index = 4;
    const transformationParts: string[] = [];
    while (index < parts.length && !/^v\d+$/.test(parts[index] ?? "")) {
      transformationParts.push(parts[index] as string);
      index += 1;
    }
    if (index >= parts.length) return null;

    const version = parts[index] as string;
    const publicId = parts.slice(index + 1).join("/");
    if (!publicId) return null;

    return {
      cloudName,
      resourceType,
      transformation: transformationParts.join("/"),
      version,
      publicId,
    };
  } catch {
    return null;
  }
}

function cloudinaryDeliverySignature(toSign: string, apiSecret: string): string {
  const digest = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `s--${digest.slice(0, 8)}--`;
}

/**
 * Build a signed authenticated Cloudinary URL that strips the video track (audio-only m4a).
 * Requires CLOUDINARY_API_SECRET on the server.
 */
export function buildCloudinaryAudioOnlyUrl(
  sourceUrl: string,
  apiSecret = getCloudinaryApiSecret(),
): string | null {
  if (!apiSecret) return null;

  const parsed = parseCloudinaryAuthenticatedUrl(sourceUrl);
  if (!parsed) return null;

  const transformation = "f_m4a,vc_none";
  const toSign = [transformation, parsed.version, parsed.publicId].join("/");
  const signature = cloudinaryDeliverySignature(toSign, apiSecret);

  return [
    "https://res.cloudinary.com",
    parsed.cloudName,
    parsed.resourceType,
    "authenticated",
    signature,
    transformation,
    parsed.version,
    parsed.publicId,
  ].join("/");
}

/** Resolve the best upstream URL for background-friendly audio streaming. */
export function resolveBackgroundAudioUpstreamUrl(targetUrl: string): string {
  if (!isCloudinaryVideoContainerUrl(targetUrl)) return targetUrl;
  return buildCloudinaryAudioOnlyUrl(targetUrl) ?? targetUrl;
}
