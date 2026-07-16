import "server-only";
import * as z from "zod";

// Stessa API dell'app mobile (sagramanije/src/services/sagra.service.ts).
// Qui gira solo lato server: l'URL non finisce mai nel bundle client.
const API_BASE_URL = process.env.SAGRE_API_BASE_URL;

// Ogni quanto rinfrescare i dati (secondi). 6 ore: le sagre non cambiano al minuto.
export const SAGRE_REVALIDATE = 21_600;

const MESI = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
] as const;

// --- parsing (porting dello schema dell'app: date miste ISO/italiano, entità HTML) ---

function parseData(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const s = value.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const it = /^(\d{1,2})\s+([A-Za-zàèéìòù]+)\s+(\d{4})$/.exec(s);
  if (it) {
    const mese = MESI.indexOf(it[2].toLowerCase() as (typeof MESI)[number]);
    if (mese !== -1) return new Date(Number(it[3]), mese, Number(it[1]));
  }
  return null;
}

const ENTITA: Record<string, string> = {
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">",
  nbsp: " ", hellip: "…", ndash: "–", mdash: "—",
  agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù",
};

function decodeEntita(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (match, corpo: string) => {
    if (corpo[0] === "#") {
      const code = corpo[1].toLowerCase() === "x"
        ? parseInt(corpo.slice(2), 16)
        : parseInt(corpo.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITA[corpo.toLowerCase()] ?? match;
  });
}

const testo = z.string().transform(decodeEntita);
const dataSchema = z.preprocess(parseData, z.date().nullable());

const SagraApi = z.object({
  id: z.number(),
  nome_sagra: testo,
  data_inizio: dataSchema,
  data_fine: dataSchema,
  citta: testo.nullable(),
  provincia: testo.nullable(),
  regione: testo.nullable().catch(null),
  lat: z.number(),
  leng: z.number(),
  locandina: z.url().nullable().catch(null),
  link_pagina_ufficiale: z.url().nullable().catch(null),
  category: testo,
  ora_inizio: z.string().nullable().catch(null),
});

const NearbyResponse = z.object({ risultati: z.array(SagraApi) });

export type Sagra = z.infer<typeof SagraApi> & { slug: string };

// --- fetch + normalizzazione ---

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Tutte le sagre abruzzesi, ordinate per data di inizio.
 * Cache di Next sul fetch: ISR ogni SAGRE_REVALIDATE secondi.
 */
export async function getSagreAbruzzo(): Promise<Sagra[]> {
  if (!API_BASE_URL) throw new Error("SAGRE_API_BASE_URL non impostata");

  const res = await fetch(`${API_BASE_URL}/sagre/vicine`, {
    next: { revalidate: SAGRE_REVALIDATE },
  });
  if (!res.ok) throw new Error(`API sagre: HTTP ${res.status}`);

  const tutte = NearbyResponse.parse(await res.json()).risultati;

  const abruzzo = tutte.filter(
    // "Abruzzo" arriva pulito, ma il campo regione in generale è sporco
    // (es. "Friuli Venezia Giulia" / "Friuli-Venezia Giulia"): meglio includes.
    (s) => s.regione?.toLowerCase().includes("abruzzo") ?? false,
  );

  abruzzo.sort(
    (a, b) => (a.data_inizio?.getTime() ?? Infinity) - (b.data_inizio?.getTime() ?? Infinity),
  );

  // Slug parlante e stabile; l'id numerico risolve gli omonimi.
  const visti = new Map<string, number>();
  return abruzzo.map((s) => {
    const base = slugify(`${s.nome_sagra} ${s.citta ?? ""}`) || String(s.id);
    const n = visti.get(base) ?? 0;
    visti.set(base, n + 1);
    return { ...s, slug: n === 0 ? base : `${base}-${s.id}` };
  });
}

export async function getSagraBySlug(slug: string): Promise<Sagra | undefined> {
  return (await getSagreAbruzzo()).find((s) => s.slug === slug);
}

// --- raggruppamento per mese ---

export type Mese = { slug: string; nome: string; anno: number; indice: number };

export function meseDi(d: Date): Mese {
  return {
    slug: `${MESI[d.getMonth()]}-${d.getFullYear()}`,
    nome: MESI[d.getMonth()],
    anno: d.getFullYear(),
    indice: d.getMonth(),
  };
}

export function parseMeseSlug(slug: string): Mese | null {
  const m = /^([a-z]+)-(\d{4})$/.exec(slug);
  if (!m) return null;
  const indice = MESI.indexOf(m[1] as (typeof MESI)[number]);
  if (indice === -1) return null;
  return { slug, nome: m[1], anno: Number(m[2]), indice };
}

/** Una sagra "cade" nel mese se il suo intervallo di date lo tocca. */
export function sagreNelMese(sagre: Sagra[], mese: Mese): Sagra[] {
  const inizioMese = new Date(mese.anno, mese.indice, 1);
  const fineMese = new Date(mese.anno, mese.indice + 1, 0, 23, 59, 59);
  return sagre.filter((s) => {
    if (!s.data_inizio) return false;
    const fine = s.data_fine ?? s.data_inizio;
    return s.data_inizio <= fineMese && fine >= inizioMese;
  });
}

/** I mesi (ordinati) che hanno almeno una sagra, per pagine e nav. */
export function mesiConSagre(sagre: Sagra[]): Mese[] {
  const mappa = new Map<string, Mese>();
  for (const s of sagre) {
    if (!s.data_inizio) continue;
    const fine = s.data_fine ?? s.data_inizio;
    const cursore = new Date(s.data_inizio.getFullYear(), s.data_inizio.getMonth(), 1);
    while (cursore <= fine) {
      const m = meseDi(cursore);
      mappa.set(m.slug, m);
      cursore.setMonth(cursore.getMonth() + 1);
    }
  }
  return [...mappa.values()].sort((a, b) => a.anno - b.anno || a.indice - b.indice);
}

// --- formattazione ---

export function formatIntervallo(s: Sagra): string {
  if (!s.data_inizio) return "Data da confermare";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const inizio = s.data_inizio.toLocaleDateString("it-IT", opts);
  if (!s.data_fine || s.data_fine.getTime() === s.data_inizio.getTime()) return inizio;
  const stessoMese =
    s.data_fine.getMonth() === s.data_inizio.getMonth() &&
    s.data_fine.getFullYear() === s.data_inizio.getFullYear();
  if (stessoMese) {
    return `dal ${s.data_inizio.getDate()} al ${s.data_fine.toLocaleDateString("it-IT", opts)}`;
  }
  return `dal ${s.data_inizio.toLocaleDateString("it-IT", { day: "numeric", month: "long" })} al ${s.data_fine.toLocaleDateString("it-IT", opts)}`;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Riassunto costruito SOLO dai fatti dell'API (nome, luogo, date, orario).
 * Niente testi di terzi: le descrizioni della fonte sono coperte da copyright.
 */
export function riassunto(s: Sagra): string {
  const luogo = s.citta ? `a ${s.citta}${s.provincia ? ` (${s.provincia})` : ""}` : "in Abruzzo";
  const tipo = s.category?.toLowerCase() === "sagra" ? "La sagra" : "L'evento";
  const quando = s.data_inizio ? ` si tiene ${formatIntervallo(s)}` : " è in programma";
  const orario = s.ora_inizio ? `, a partire dalle ${s.ora_inizio}` : "";
  return `${tipo} "${s.nome_sagra}"${quando} ${luogo}${orario}.`;
}

// --- locandine ---

// Host da cui accettiamo di scaricare le locandine (tutto il resto è rifiutato).
// Nota: alcune immagini di sagr.it non esistono più all'origine (403/404);
// il proxy in quel caso risponde con un PNG trasparente e la card mostra
// il placeholder a strisce.
const HOST_LOCANDINE = new Set(["sagr.it", "trovasagre.com", "sagreautentiche.it"]);

/**
 * URL diretto della locandina, o null se assente/non affidabile.
 * Quelle di sagr.it passano dal suo ottimizzatore (/_next/image?url=…):
 * estraiamo l'originale, che è più stabile e non dipende dal loro resize.
 */
export function locandinaOriginale(s: Pick<Sagra, "locandina">): string | null {
  if (!s.locandina) return null;
  try {
    let u = new URL(s.locandina);
    if (u.pathname === "/_next/image") {
      const interno = u.searchParams.get("url");
      if (!interno) return null;
      u = new URL(interno, u.origin);
    }
    const host = u.hostname.replace(/^www\./, "");
    if (u.protocol !== "https:" || !HOST_LOCANDINE.has(host)) return null;
    return u.href;
  } catch {
    return null;
  }
}

// --- JSON-LD (schema.org/Event) ---

export function eventJsonLd(s: Sagra, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: s.nome_sagra,
    ...(s.data_inizio && { startDate: toISO(s.data_inizio) }),
    ...(s.data_fine && { endDate: toISO(s.data_fine) }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: s.citta ?? "Abruzzo",
      address: {
        "@type": "PostalAddress",
        addressLocality: s.citta ?? undefined,
        addressRegion: "Abruzzo",
        addressCountry: "IT",
      },
      geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.leng },
    },
    description: riassunto(s),
    url,
  };
}
