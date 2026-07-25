import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Senza questo Turbopack risale a un package-lock.json fuori dal progetto.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Le locandine usano ?v=<hash> per invalidare la cache quando cambia
    // l'immagine originale. Il percorso resta limitato al nostro proxy.
    localPatterns: [{ pathname: "/locandina/**" }],
  },
};

export default nextConfig;
