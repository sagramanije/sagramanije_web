import type { MetadataRoute } from "next";
import { getSagreAbruzzo, mesiConSagre } from "../lib/sagre";

const BASE = "https://sagramanije.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fisse: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/sagre/abruzzo`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const sagre = await getSagreAbruzzo();
    const mesi = mesiConSagre(sagre).map((m) => ({
      url: `${BASE}/sagre/abruzzo/${m.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
    const eventi = sagre.map((s) => ({
      url: `${BASE}/sagra/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
    return [...fisse, ...mesi, ...eventi];
  } catch {
    // API irraggiungibile: meglio una sitemap parziale che un 500.
    return fisse;
  }
}
