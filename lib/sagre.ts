import "server-only";
import * as z from "zod";
import archivioJson from "../data/archivio-sagre.json";

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

// L'archivio committato in data/: le sagre già viste, con lo slug che è stato
// loro assegnato. Stessa forma dell'API, più lo slug.
const ArchivioFile = z.object({
  aggiornato: z.string().nullable(),
  sagre: z.array(SagraApi.extend({ slug: z.string() })),
});

type SagraApiT = z.infer<typeof SagraApi>;

export type Sagra = SagraApiT & { slug: string };

// --- fetch + normalizzazione ---

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Le sagre abruzzesi attualmente in cartellone, dall'API. */
async function fetchLive(): Promise<SagraApiT[]> {
  if (!API_BASE_URL) throw new Error("SAGRE_API_BASE_URL non impostata");

  const res = await fetch(`${API_BASE_URL}/sagre/vicine`, {
    next: { revalidate: SAGRE_REVALIDATE },
  });
  if (!res.ok) throw new Error(`API sagre: HTTP ${res.status}`);

  return NearbyResponse.parse(await res.json()).risultati.filter(
    // "Abruzzo" arriva pulito, ma il campo regione in generale è sporco
    // (es. "Friuli Venezia Giulia" / "Friuli-Venezia Giulia"): meglio includes.
    (s) => s.regione?.toLowerCase().includes("abruzzo") ?? false,
  );
}

/** Le sagre già archiviate, con lo slug che avevano al momento dell'archiviazione. */
function leggiArchivio(): Sagra[] {
  const parsed = ArchivioFile.safeParse(archivioJson);
  // Un archivio corrotto non deve mandare giù il sito: peggio che vada,
  // si torna al comportamento di prima (solo API).
  return parsed.success ? parsed.data.sagre : [];
}

/**
 * Assegna gli slug. Quelli già in archivio sono CONGELATI e non si ricalcolano
 * mai: un URL pubblicato non deve cambiare per nessun motivo, nemmeno se in
 * futuro arriva un'omonima che gli contenderebbe lo slug corto.
 */
function assegnaSlug(sagre: SagraApiT[], congelati: Map<number, string>): Sagra[] {
  const presi = new Set(congelati.values());
  return sagre.map((s) => {
    const gia = congelati.get(s.id);
    if (gia) return { ...s, slug: gia };

    const base = slugify(`${s.nome_sagra} ${s.citta ?? ""}`) || String(s.id);
    const slug = presi.has(base) ? `${base}-${s.id}` : base;
    presi.add(slug);
    return { ...s, slug };
  });
}

/**
 * Tutte le sagre abruzzesi che conosciamo — quelle in cartellone più quelle
 * archiviate — ordinate per data di inizio.
 *
 * L'API restituisce solo gli eventi futuri: quando una sagra finisce sparisce
 * di lì, e senza archivio la sua pagina diventerebbe un 404. L'unione con
 * l'archivio è ciò che tiene vivi (e indicizzati) gli anni passati.
 */
export async function getSagreAbruzzo(): Promise<Sagra[]> {
  const archiviate = leggiArchivio();

  let live: SagraApiT[] = [];
  try {
    live = await fetchLive();
  } catch (errore) {
    // Con l'archivio in mano possiamo servire il sito anche ad API spenta.
    if (archiviate.length === 0) throw errore;
  }

  // A parità di id vince il dato live: date e orari possono essere corretti
  // dalla fonte dopo che li abbiamo archiviati.
  const perId = new Map<number, SagraApiT>();
  for (const s of archiviate) perId.set(s.id, s);
  for (const s of live) perId.set(s.id, s);

  const tutte = [...perId.values()].sort(
    (a, b) => (a.data_inizio?.getTime() ?? Infinity) - (b.data_inizio?.getTime() ?? Infinity),
  );

  return assegnaSlug(tutte, new Map(archiviate.map((s) => [s.id, s.slug])));
}

/** Una sagra è conclusa se l'ultimo giorno è ormai passato. */
export function eConclusa(s: Sagra, adesso: Date = new Date()): boolean {
  const fine = s.data_fine ?? s.data_inizio;
  if (!fine) return false;
  const oggi = new Date(adesso);
  oggi.setHours(0, 0, 0, 0);
  return fine < oggi;
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

/** Un mese è passato se è finito prima di quello corrente. */
export function mesePassato(m: Mese, adesso: Date = new Date()): boolean {
  return (
    m.anno < adesso.getFullYear() ||
    (m.anno === adesso.getFullYear() && m.indice < adesso.getMonth())
  );
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

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Riassunto costruito SOLO dai fatti dell'API (nome, luogo, date, orario).
 * Niente testi di terzi: le descrizioni della fonte sono coperte da copyright.
 */
export function riassunto(s: Sagra): string {
  const luogo = s.citta ? `a ${s.citta}${s.provincia ? ` (${s.provincia})` : ""}` : "in Abruzzo";
  const sagra = s.category?.toLowerCase() === "sagra";
  const tipo = sagra ? "La sagra" : "L'evento";
  // Al passato quando è già finita, o lo snippet su Google promette una sagra
  // che non c'è più.
  const passato = eConclusa(s) ? (sagra ? " si è tenuta" : " si è tenuto") : " si tiene";
  const quando = s.data_inizio ? `${passato} ${formatIntervallo(s)}` : " è in programma";
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
  const immagine = locandinaOriginale(s);
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
    // Solo dati reali: la locandina quando c'è ed è di fonte affidabile.
    ...(immagine && { image: [immagine] }),
    // Le sagre hanno ingresso libero: offerta gratuita, dato veritiero.
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url,
      ...(s.data_inizio && { validFrom: toISO(s.data_inizio) }),
    },
    description: riassunto(s),
    url,
  };
}
