import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/nowcast/:path*",
        destination: "http://127.0.0.1:8000/api/v1/nowcast/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/intelligence",
        destination: "/data-sources?tab=intelligence",
        permanent: false,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://vxyfdnvxjynwgmzsrylk.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable__F7kpzAvsaqDKdVav8ezcQ_LnE1lRVF",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.tile.openstreetmap.org",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Use memory-only cache in development to prevent Webpack PackFileCacheStrategy
      // disk-pack corruption that causes '__webpack_modules__[moduleId] is not a function'
      config.cache = {
        type: "memory",
      };
    }
    return config;
  },
};

export default nextConfig;
