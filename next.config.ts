import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build for a small container image (Cloud Run).
  output: "standalone",
  // allowlisted development origins
  allowedDevOrigins: ["192.168.1.81"],
  images: {
    // Serve images as-is so the container doesn't need the native `sharp` lib.
    unoptimized: true,
  },
};

export default nextConfig;
