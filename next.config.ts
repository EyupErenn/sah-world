import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (Next.js 16 default) — no webpack config needed.
  // Three.js / R3F work fine under Turbopack with no extra config.
  turbopack: {},
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
};

export default nextConfig;
