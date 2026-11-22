import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// In monorepo development, load root .env when running Next.js
try {
  const rootEnvPath = path.resolve(process.cwd(), "../../.env");
  if (existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(rootEnvPath);
  }
} catch {
  // Ignore when .env does not exist or in production environments
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  webpack(config) {
    // Enable async WebAssembly for zxing-wasm (CIR-6)
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const targetApiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:3000";

    return [
      {
        source: "/api/:path*",
        destination: `${targetApiUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' wasm-unsafe-eval; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 ws:; frame-ancestors 'none'; object-src 'none';",
          },
        ],
      },
    ];
  },
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
