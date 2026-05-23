import { describe, expect, it } from "vitest";
import { pickSignedDownloadUrl } from "./upstreamJson";

describe("pickSignedDownloadUrl", () => {
  it("reads url from top-level and nested data", () => {
    expect(pickSignedDownloadUrl({ url: "https://example.com/a.mp3" })).toBe(
      "https://example.com/a.mp3",
    );
    expect(
      pickSignedDownloadUrl({ data: { signed_url: "https://example.com/b.mp3" } }),
    ).toBe("https://example.com/b.mp3");
  });
});
