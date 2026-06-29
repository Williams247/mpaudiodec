import { describe, expect, it } from "vitest";
import { getMediaExtension, scorePlayableMediaUrl } from "./mediaUrl";

describe("scorePlayableMediaUrl", () => {
  it("treats wav and mp3 as playable and rejects webp artwork", () => {
    const mp3 = "https://res.cloudinary.com/demo/raw/upload/v1/track.mp3";
    const wav = "https://res.cloudinary.com/demo/raw/upload/v1/track.wav";
    const webp = "https://res.cloudinary.com/demo/image/upload/v1/cover.webp";

    expect(scorePlayableMediaUrl(mp3)).toBe(100);
    expect(scorePlayableMediaUrl(wav)).toBe(100);
    expect(scorePlayableMediaUrl(webp)).toBe(-1);
  });

  it("prefers mpawav over asdstr Cloudinary folders", () => {
    const mpawav =
      "https://res.cloudinary.com/samdc/video/authenticated/s--x--/v1/mpawav/song";
    const asdstr =
      "https://res.cloudinary.com/samdc/video/authenticated/s--x--/v1/asdstr/song";

    expect(scorePlayableMediaUrl(mpawav)).toBeGreaterThan(scorePlayableMediaUrl(asdstr));
  });

  it("reads extension before query string", () => {
    expect(getMediaExtension("https://cdn.example.com/song.mp3?token=abc")).toBe("mp3");
  });
});
