import type { MetadataRoute } from "next";
import {
  eConclusa,
  getSagreAbruzzo,
  mesePassato,
  mesiConSagre,
  PROVINCE,
} from "../lib/sagre";
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
    {
      url: `${SITE_URL}/sagre/abruzzo/questo-weekend`,
      lastModified: aggiornato,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...PROVINCE.map((p) => ({
      url: `${SITE_URL}/sagre/abruzzo/provincia/${p.slug}`,
      lastModified: aggiornato,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];

  try {
    const sagre = await getSagreAbruzzo();

    // Mesi ed eventi passati restano in sitemap — sono pagine vive, che Google
    // deve continuare a conoscere — ma con priorità e frequenza più basse:
    // non cambiano più e non sono lì che vogliamo il traffico.
    const mesi = mesiConSagre(sagre).map((m) => {
      const passato = mesePassato(m);
      return {
        url: `${SITE_URL}/sagre/abruzzo/${m.slug}`,
        ...(passato ? {} : { lastModified: aggiornato }),
        changeFrequency: passato ? ("yearly" as const) : ("daily" as const),
        priority: passato ? 0.3 : 0.8,
      };
    });
    const eventi = sagre.map((s) => ({
      url: `${SITE_URL}/sagra/${s.slug}`,
      changeFrequency: eConclusa(s) ? ("yearly" as const) : ("weekly" as const),
      priority: eConclusa(s) ? 0.3 : 0.6,
    }));
    return [...fisse, ...mesi, ...eventi];
  } catch {
    // API irraggiungibile: meglio una sitemap parziale che un 500.
    return fisse;
  }
}
