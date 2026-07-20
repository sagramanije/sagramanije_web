import type { MetadataRoute } from "next";
import { getSagreAbruzzo, mesiConSagre } from "../lib/sagre";
import { SITE_URL } from "../lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Calendario e pagine mese cambiano davvero a ogni giro di ISR (aggiungiamo
  // sagre di continuo), quindi lastModified è un segnale onesto. Le pagine del
  // singolo evento invece non si toccano più una volta pubblicate: lì il campo
  // lo omettiamo, meglio nessun segnale che uno finto.
  const aggiornato = new Date();

  const fisse: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: aggiornato, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/sagre/abruzzo`,
      lastModified: aggiornato,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const sagre = await getSagreAbruzzo();
    const mesi = mesiConSagre(sagre).map((m) => ({
      url: `${SITE_URL}/sagre/abruzzo/${m.slug}`,
      lastModified: aggiornato,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
    const eventi = sagre.map((s) => ({
      url: `${SITE_URL}/sagra/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
    return [...fisse, ...mesi, ...eventi];
  } catch {
    // API irraggiungibile: meglio una sitemap parziale che un 500.
    return fisse;
  }
}
