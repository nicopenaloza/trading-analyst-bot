import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence the multi-lockfile workspace warning
  outputFileTracingRoot: path.resolve(__dirname, ".."),

  webpack(config) {
    // Allow API routes to import directly from ../src/ and from dashboard root
    config.resolve.alias = {
      ...config.resolve.alias,
      "@":    path.resolve(__dirname),
      "@bot": path.resolve(__dirname, "../src"),
    };

    // The bot's TypeScript files use .js extensions (NodeNext style).
    // Tell Webpack to try .ts/.tsx before .js so those imports resolve.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js":  [".ts", ".tsx", ".js", ".jsx"],
      ".cjs": [".cts", ".cjs"],
      ".mjs": [".mts", ".mjs"],
    };

    return config;
  },
};

export default nextConfig;
