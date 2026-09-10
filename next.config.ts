import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML for Netlify and other static hosts (no Worker runtime required).
  output: "export",
};

export default nextConfig;
