import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Senza questo Turbopack risale a un package-lock.json fuori dal progetto.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
