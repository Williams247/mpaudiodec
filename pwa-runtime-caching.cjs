/** @type {import("next-pwa").RuntimeCaching[]} */
const defaultCache = require("next-pwa/cache");

const mediaStreamBypass = [
  {
    urlPattern: /^\/api\/dev-audio-proxy\//i,
    handler: "NetworkOnly",
    method: "GET",
  },
  {
    urlPattern: ({ url }) => {
      const host = url.hostname.toLowerCase();
      return (
        host.includes("backblazeb2.com") ||
        host.includes("backblaze") ||
        host.includes("cloudinary.com")
      );
    },
    handler: "NetworkOnly",
    method: "GET",
  },
];

const patchedDefault = defaultCache.map((entry) => {
  if (entry.options?.cacheName !== "apis") return entry;
  return {
    ...entry,
    urlPattern: ({ url }) => {
      if (self.origin !== url.origin) return false;
      const pathname = url.pathname;
      if (pathname.startsWith("/api/auth/")) return false;
      if (pathname.startsWith("/api/dev-audio-proxy/")) return false;
      if (pathname.startsWith("/api/upstream/")) return false;
      return pathname.startsWith("/api/");
    },
  };
});

module.exports = [...mediaStreamBypass, ...patchedDefault];
