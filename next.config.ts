import { createRequire } from "node:module";
import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const require = createRequire(import.meta.url);
const runtimeCaching = require("./pwa-runtime-caching.cjs");

const withPWA = nextPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);
