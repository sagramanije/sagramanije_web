import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Senza questo Turbopack risale a un package-lock.json fuori dal progetto.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Le locandine usano ?v=<hash> per invalidare la cache quando cambia
    // l'immagine originale. Manteniamo esplicitamente anche il marchio locale:
    // quando localPatterns è presente, Next blocca ogni percorso non elencato.
    localPatterns: [
      { pathname: "/locandina/**" },
      { pathname: "/pin-mark.png", search: "" },
    ],
  },
};

export default nextConfig;
