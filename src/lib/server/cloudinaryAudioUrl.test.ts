import { describe, expect, it } from "vitest";
import {
  buildCloudinaryAudioOnlyUrl,
  isCloudinaryVideoContainerUrl,
  parseCloudinaryAuthenticatedUrl,
} from "./cloudinaryAudioUrl";

const ASDSTR_URL =
  "https://res.cloudinary.com/samdc/video/authenticated/s--ZylRrmrp--/v1/asdstr/Timaya_-_Sexy_Ladies_TA22O8N-Ybw_20260521180639_aad268f5";
const MPAWAV_URL =
  "https://res.cloudinary.com/samdc/video/authenticated/s--Dj3Ir-3l--/v1/mpawav/WIZKID_-_OJUELEGBA_Q7QiLceJSLQ_20260423011520_71560ef4";

describe("parseCloudinaryAuthenticatedUrl", () => {
  it("parses authenticated video delivery URLs", () => {
    expect(parseCloudinaryAuthenticatedUrl(ASDSTR_URL)).toEqual({
      cloudName: "samdc",
      resourceType: "video",
      transformation: "",
      version: "v1",
      publicId: "asdstr/Timaya_-_Sexy_Ladies_TA22O8N-Ybw_20260521180639_aad268f5",
    });
  });
});

describe("isCloudinaryVideoContainerUrl", () => {
  it("flags asdstr assets and not mpawav assets", () => {
    expect(isCloudinaryVideoContainerUrl(ASDSTR_URL)).toBe(true);
    expect(isCloudinaryVideoContainerUrl(MPAWAV_URL)).toBe(false);
  });
});

describe("buildCloudinaryAudioOnlyUrl", () => {
  it("builds a signed audio-only delivery URL", () => {
    const audioUrl = buildCloudinaryAudioOnlyUrl(ASDSTR_URL, "test-secret");
    expect(audioUrl).toContain("/f_m4a,vc_none/v1/asdstr/");
    expect(audioUrl).toMatch(/\/s--[A-Za-z0-9_-]{8}--\//);
    expect(audioUrl).not.toContain("ZylRrmrp");
  });

  it("returns null without an API secret", () => {
    expect(buildCloudinaryAudioOnlyUrl(ASDSTR_URL, null)).toBeNull();
  });
});
