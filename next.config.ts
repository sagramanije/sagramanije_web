import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const nextConfig: NextConfig = {
  // Permette al telefono sulla LAN di caricare gli asset del server di sviluppo.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(interfaccia =>
    (interfaccia ?? []).filter(ip => !ip.internal && ip.family === "IPv4").map(ip => ip.address)),
  // Senza questo Turbopack risale a un package-lock.json fuori dal progetto.
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      // www.sagramanije.it rispondeva 200 con le stesse pagine: un secondo
      // host con contenuti duplicati. Il canonical bastava a Google per
      // scegliere, ma un 301 non gli lascia nulla da scegliere.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sagramanije.it" }],
        destination: "https://sagramanije.it/:path*",
        permanent: true,
      },
    ];
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
      { pathname: "/mercatini-abruzzo.webp", search: "" },
      { pathname: "/sagra-abruzzo.webp", search: "" },
      { pathname: "/pin-mark.png", search: "" },
    ],
  },
};

export default nextConfig;
