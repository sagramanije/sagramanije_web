import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/gestione-sagre",
    },
    sitemap: "https://sagramanije.it/sitemap.xml",
  };
}
