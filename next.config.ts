import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Senza questo Turbopack risale a un package-lock.json fuori dal progetto.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Le locandine arrivano come multipart nelle Server Actions. Il limite
    // include anche l'overhead del form, non soltanto i byte del file.
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  images: {
    // Le locandine vengono già ridimensionate e convertite in WebP dalla
    // Route Handler /locandina. Così il loader predefinito non consuma
    // Image Transformations su Vercel, nemmeno per il piccolo logo.
    unoptimized: true,
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
