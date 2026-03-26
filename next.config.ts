import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required to build standard Docker environments for Next.js efficiently
  output: "standalone",
};

export default nextConfig;
