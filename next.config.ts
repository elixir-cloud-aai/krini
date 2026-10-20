import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // for testing purposes only
  async rewrites() {
    return [
      {
        source: "/tes-api/:path*",
        destination:
          "https://csc-tesk-noauth.rahtiapp.fi/:path*",
      },
    ];
  },
};

export default nextConfig;
