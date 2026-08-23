import type { NextConfig } from "next";

const privatePaths = [
  "analysis",
  "analyze",
  "auth",
  "begin",
  "entry",
  "onboarding",
  "pro",
  "quick",
  "result",
  "sample",
  "start",
];

const nextConfig: NextConfig = {
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
    return privatePaths.map((path) => ({
      source: `/${path}/:path*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }));
  },
};

export default nextConfig;
import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
