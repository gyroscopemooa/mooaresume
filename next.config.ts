import type { NextConfig } from "next";

const privatePaths = [
  "analysis",
  "analyze",
  "auth",
  "begin",
  "entry",
  // Operator-only screens. They were reachable to a crawler that guessed the
  // path, and the console lists other people's addresses and letters.
  "MAIL",
  "meensoo",
  "onboarding",
  "pro",
  "quick",
  "result",
  "sample",
  "start",
];

const nextConfig: NextConfig = {
  // Optional local worktree preview; production config and the default root stay unchanged.
  ...(process.env.NODE_ENV === "development" && process.env.MOOA_PREVIEW_ROOT
    ? { turbopack: { root: process.env.MOOA_PREVIEW_ROOT } } : {}),
  poweredByHeader: false,
  allowedDevOrigins: ["local.mooaresume.com", "dev.mooaresume.com"],
  async redirects() {
    return [
      { source: "/start", destination: "/begin", permanent: false },
      { source: "/analyze", destination: "/begin", permanent: false },
      { source: "/sample", destination: "/examples", permanent: false },
    ];
  },
  async headers() {
    return [...privatePaths.map((path) => ({
      source: `/${path}/:path*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    })), {
      source: "/result/second-review/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "Referrer-Policy", value: "no-referrer" },
        // This document contains private review text and a recipient-bound grant.
        // Do not load third-party analytics/session recording on the delivery route.
        { key: "Content-Security-Policy", value: "script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; frame-src 'none'; img-src 'self' data: blob:" },
      ],
    }];
  },
};

export default nextConfig;
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
