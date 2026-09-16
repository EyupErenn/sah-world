import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep E2E compilation isolated from the user's already-running dev server.
  distDir: process.env.SAH_E2E === '1' ? '.next-e2e' : '.next',
  devIndicators: process.env.SAH_E2E === '1' ? false : undefined,
  allowedDevOrigins: ["10.58.0.180"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  // Turbopack (Next.js 16 default) — no webpack config needed.
  // Three.js / R3F work fine under Turbopack with no extra config.
  turbopack: {},
  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "@react-three/postprocessing",
  ],
};

export default nextConfig;
