import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Always define this at build time. Next only inlines a NEXT_PUBLIC_* var that
  // exists, and an inlined literal lets the bundler strip the demo-account UI
  // (and its credentials) from production builds.
  env: {
    NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS:
      process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS ?? "false",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
