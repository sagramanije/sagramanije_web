import "server-only";
import { createHash } from "node:crypto";
import * as z from "zod";
import archivioJson from "../data/archivio-sagre.json";
import { normalizzaUrlHttpsPubblico } from "./public-image-fetch";

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
  tipo: testo.nullish(),
  ora_inizio: z.string().nullable().catch(null),
  // La descrizione estesa dell'evento. Manca sulle sagre archiviate prima che
  // il campo esistesse: lì la pagina ricade sul riassunto costruito dai dati.
  descrizione: testo.nullable().catch(null),
});

const NearbyResponse = z.object({ risultati: z.array(SagraApi) });

// L'archivio committato in data/: le sagre già viste, con lo slug che è stato
// loro assegnato. Stessa forma dell'API, più lo slug del record e quello della
// scheda in cui confluisce (assente nei record archiviati prima che esistesse).
const ArchivioFile = z.object({
  aggiornato: z.string().nullable(),
  sagre: z.array(SagraApi.extend({ slug: z.string(), scheda: z.string().optional() })),
});

type SagraApiT = z.infer<typeof SagraApi>;

/**
 * Una sagra (un record dell'API) con i suoi due slug.
 *
 * - `slug` è l'URL pubblico della scheda: è quello da usare in ogni link.
 *   Doppioni della stessa edizione ed edizioni di anni diversi condividono la
 *   stessa scheda, così ogni sagra ha un solo URL che accumula storia e link.
 * - `slugProprio` è lo slug assegnato al singolo record la prima volta che
 *   l'abbiamo visto. Se diverso da `slug`, quell'URL esiste ancora ma fa 301
 *   verso la scheda.
 */
export type Sagra = SagraApiT & { slug: string; slugProprio: string };

// Stessa precedenza dell’app mobile. I record storici possono avere solo il titolo.
export function eMercatino(s: Pick<Sagra, "tipo" | "category" | "nome_sagra">) {
  const tipoMercatino = /^mercatin[oi](?: (?:di )?natale| nataliz(?:io|i))?$/i;
  const tipo = s.tipo?.trim();
  if (tipo) return tipoMercatino.test(tipo.replace(/[_-]+/g, " "));
  return tipoMercatino.test(s.category.trim())
    || /^(?:(?:il|i)\s+)?mercatin[oi]\s+(?:di\s+natale|nataliz(?:io|i)|dell[’']avvento)\b/i.test(s.nome_sagra.trim());
}

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

type Archiviata = z.infer<typeof ArchivioFile>["sagre"][number];

/** Le sagre già archiviate, con gli slug che avevano al momento dell'archiviazione. */
function leggiArchivio(): Archiviata[] {
  const parsed = ArchivioFile.safeParse(archivioJson);
  // Un archivio corrotto non deve mandare giù il sito: peggio che vada,
  // si torna al comportamento di prima (solo API).
  return parsed.success ? parsed.data.sagre : [];
}

/**
 * Assegna gli slug dei singoli record. Quelli già in archivio sono CONGELATI e
 * non si ricalcolano mai: un URL pubblicato non deve cambiare per nessun
 * motivo, nemmeno se in futuro arriva un'omonima che gli contenderebbe lo slug
 * corto.
 */
function assegnaSlugPropri(
  sagre: SagraApiT[],
  congelati: Map<number, string>,
): (SagraApiT & { slugProprio: string })[] {
  const presi = new Set(congelati.values());
  return sagre.map((s) => {
    const gia = congelati.get(s.id);
    if (gia) return { ...s, slugProprio: gia };

    const base = slugify(`${s.nome_sagra} ${s.citta ?? ""}`) || String(s.id);
    const slug = presi.has(base) ? `${base}-${s.id}` : base;
    presi.add(slug);
    return { ...s, slugProprio: slug };
  });
}

// --- schede: doppioni ed edizioni della stessa sagra ---

// Numerale romano valido (II, XII, XXX…). Da solo matcherebbe anche parole
// italiane come "di" o "vi", quindi lo si usa solo in posizioni da edizione.
const ROMANO = /^m{0,3}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;

/**
 * Il nome della sagra senza ciò che cambia da un'edizione all'altra: ordinali
 * ("17ª", "XXX"), anni e la parola "edizione". "17ª Sagra della Polenta" e
 * "18ª Sagra della Polenta" danno la stessa chiave.
 */
function nomeSenzaEdizione(nome: string): string {
  const token = slugify(nome).split("-").filter(Boolean);
  const tenuti = token.filter((t, i) => {
    if (/^\d+[a-z]?$/.test(t)) return false; // 17, 2026, 8a (da "8ª")
    if (t === "edizione" || t === "ed") return false;
    const romano = t.length > 0 && ROMANO.test(t);
    // Romano in testa ("XXX Sagra…") o prima di "edizione" ("XII Edizione").
    if (romano && (i === 0 || token[i + 1] === "edizione" || token[i + 1] === "ed")) return false;
    return true;
  });
  return tenuti.join("-");
}

function chiaveScheda(s: SagraApiT): string {
  const nome = nomeSenzaEdizione(s.nome_sagra);
  // Un nome fatto solo di numeri non identifica niente: niente accorpamenti.
  if (!nome) return `id:${s.id}`;
  return `${nome}|${slugify(s.citta ?? "")}`;
}

// Due record della stessa sagra a meno di una settimana di distanza sono la
// stessa edizione arrivata da due fonti (spesso con date sfasate di un giorno).
const STESSA_EDIZIONE_MS = 7 * 24 * 60 * 60 * 1000;

function stessaEdizione(a: SagraApiT, b: SagraApiT): boolean {
  if (!a.data_inizio || !b.data_inizio) return false;
  return Math.abs(a.data_inizio.getTime() - b.data_inizio.getTime()) <= STESSA_EDIZIONE_MS;
}

/** Fra due doppioni della stessa edizione, quello con più contenuto. */
function punteggio(s: SagraApiT): number {
  return (
    (s.descrizione ? 4 : 0) +
    (s.locandina ? 2 : 0) +
    (s.ora_inizio ? 1 : 0) +
    (s.descrizione?.length ?? 0) / 100_000
  );
}

/** Slug "pulito": senza il suffisso -id anti-collisione e senza l'ordinale in testa. */
function slugPulito(s: { id: number; slugProprio: string }): boolean {
  return !s.slugProprio.endsWith(`-${s.id}`) && !/^\d+-/.test(s.slugProprio);
}

/**
 * Fonti diverse chiamano la stessa sagra in modi diversi ("Marsicaland" e
 * "Festival diffuso dell'agroalimentare – Marsicaland"). Se due record hanno
 * lo stesso paese, le stesse identiche date e le parole di un nome sono tutte
 * contenute nell'altro, sono lo stesso evento: i loro gruppi diventano uno.
 */
function unisciDoppioniConNomiDiversi(
  gruppi: Map<string, (SagraApiT & { slugProprio: string })[]>,
): void {
  const gruppoDi = new Map<number, string>();
  for (const [k, g] of gruppi) for (const s of g) gruppoDi.set(s.id, k);

  const parole = (s: SagraApiT) => new Set(nomeSenzaEdizione(s.nome_sagra).split("-").filter(Boolean));
  const contenuto = (a: Set<string>, b: Set<string>) => a.size > 0 && [...a].every((p) => b.has(p));

  const tutti = [...gruppi.values()].flat();
  for (let i = 0; i < tutti.length; i++) {
    for (let j = i + 1; j < tutti.length; j++) {
      const a = tutti[i];
      const b = tutti[j];
      if (!a.data_inizio || !b.data_inizio) continue;
      if (a.data_inizio.getTime() !== b.data_inizio.getTime()) continue;
      if ((a.data_fine?.getTime() ?? 0) !== (b.data_fine?.getTime() ?? 0)) continue;
      if (!a.citta || slugify(a.citta) !== slugify(b.citta ?? "")) continue;

      const ka = gruppoDi.get(a.id)!;
      const kb = gruppoDi.get(b.id)!;
      if (ka === kb) continue;
      const pa = parole(a);
      const pb = parole(b);
      if (!contenuto(pa, pb) && !contenuto(pb, pa)) continue;

      // Sposta tutto il gruppo di b dentro quello di a.
      const daSpostare = gruppi.get(kb)!;
      gruppi.get(ka)!.push(...daSpostare);
      for (const s of daSpostare) gruppoDi.set(s.id, ka);
      gruppi.delete(kb);
    }
  }
}

type Catalogo = {
  /** Tutti i record, doppioni compresi. Serve all'archivio e alle locandine. */
  tutte: Sagra[];
  /** Un record per edizione: quello che va negli elenchi. */
  edizioni: Sagra[];
  /** Scheda → le sue edizioni, in ordine di data. */
  perScheda: Map<string, Sagra[]>;
  /** Slug di un singolo record che non è la sua scheda → scheda (redirect). */
  alias: Map<string, string>;
};

function costruisciCatalogo(
  sagre: (SagraApiT & { slugProprio: string })[],
  schedeCongelate: Map<number, string>,
): Catalogo {
  const gruppi = new Map<string, (SagraApiT & { slugProprio: string })[]>();
  for (const s of sagre) {
    const k = chiaveScheda(s);
    const g = gruppi.get(k);
    if (g) g.push(s);
    else gruppi.set(k, [s]);
  }
  unisciDoppioniConNomiDiversi(gruppi);

  const tutte: Sagra[] = [];
  const edizioni: Sagra[] = [];
  const perScheda = new Map<string, Sagra[]>();
  const alias = new Map<string, string>();

  for (const gruppo of gruppi.values()) {
    // La scheda, una volta scelta, è congelata in archivio come gli slug: se
    // un membro ce l'ha già, vale quella. Altrimenti il più vecchio con uno
    // slug pulito, o semplicemente il più vecchio.
    const perId = [...gruppo].sort((a, b) => a.id - b.id);
    const congelata = perId.map((s) => schedeCongelate.get(s.id)).find(Boolean);
    const scheda =
      congelata ?? (perId.find(slugPulito) ?? perId[0]).slugProprio;

    const membri: Sagra[] = gruppo.map((s) => ({ ...s, slug: scheda }));
    tutte.push(...membri);
    for (const m of membri) {
      if (m.slugProprio !== scheda) alias.set(m.slugProprio, scheda);
    }

    // Edizioni: i membri in ordine di data, raggruppando i doppioni vicini.
    const inOrdine = [...membri].sort(
      (a, b) => (a.data_inizio?.getTime() ?? Infinity) - (b.data_inizio?.getTime() ?? Infinity),
    );
    const scelte: Sagra[] = [];
    for (const m of inOrdine) {
      const ultima = scelte.at(-1);
      if (ultima && stessaEdizione(ultima, m)) {
        if (punteggio(m) > punteggio(ultima)) scelte[scelte.length - 1] = m;
      } else {
        scelte.push(m);
      }
    }
    edizioni.push(...scelte);
    perScheda.set(scheda, scelte);
  }

  const perData = (a: Sagra, b: Sagra) =>
    (a.data_inizio?.getTime() ?? Infinity) - (b.data_inizio?.getTime() ?? Infinity);
  tutte.sort(perData);
  edizioni.sort(perData);

  return { tutte, edizioni, perScheda, alias };
}

/**
 * Tutte le sagre abruzzesi che conosciamo — quelle in cartellone più quelle
 * archiviate — raggruppate in schede.
 *
 * L'API restituisce solo gli eventi futuri: quando una sagra finisce sparisce
 * di lì, e senza archivio la sua pagina diventerebbe un 404. L'unione con
 * l'archivio è ciò che tiene vivi (e indicizzati) gli anni passati.
 */
async function getCatalogo(): Promise<Catalogo> {
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

  const conSlug = assegnaSlugPropri(
    [...perId.values()],
    new Map(archiviate.map((s) => [s.id, s.slug])),
  );
  const schedeCongelate = new Map<number, string>();
  for (const s of archiviate) if (s.scheda) schedeCongelate.set(s.id, s.scheda);

  return costruisciCatalogo(conSlug, schedeCongelate);
}

/**
 * Le sagre da mostrare negli elenchi, ordinate per data: una per edizione,
 * senza i doppioni arrivati da fonti diverse. Ognuna linka la sua scheda.
 */
export async function getSagreAbruzzo(): Promise<Sagra[]> {
  return (await getCatalogo()).edizioni;
}

/**
 * Tutti i record, doppioni compresi, con i loro slug. Per l'archivio (che
 * deve congelarli tutti) e per chi cerca una sagra per id.
 */
export async function getTutteLeSagre(): Promise<Sagra[]> {
  return (await getCatalogo()).tutte;
}

/** Una sagra è conclusa se l'ultimo giorno è ormai passato. */
export function eConclusa(s: Sagra, adesso: Date = new Date()): boolean {
  const fine = s.data_fine ?? s.data_inizio;
  if (!fine) return false;
  const oggi = new Date(adesso);
  oggi.setHours(0, 0, 0, 0);
  return fine < oggi;
}

/**
 * L'edizione da mostrare in una scheda: quella in corso o la prossima;
 * se sono tutte passate, l'ultima.
 */
function edizioneCorrente(edizioni: Sagra[], adesso: Date = new Date()): Sagra {
  return edizioni.find((e) => !eConclusa(e, adesso)) ?? edizioni[edizioni.length - 1];
}

export type Scheda =
  | { tipo: "scheda"; sagra: Sagra; edizioni: Sagra[] }
  | { tipo: "redirect"; slug: string };

/**
 * Risolve l'URL di una scheda. Uno slug di scheda dà la sagra (nella sua
 * edizione corrente) con tutte le edizioni; lo slug di un doppione o l'id
 * numerico di un record danno lo slug della scheda verso cui fare 301.
 */
export async function getScheda(slug: string): Promise<Scheda | null> {
  const { perScheda, alias, tutte } = await getCatalogo();

  const edizioni = perScheda.get(slug);
  if (edizioni) return { tipo: "scheda", sagra: edizioneCorrente(edizioni), edizioni };

  const verso = alias.get(slug);
  if (verso) return { tipo: "redirect", slug: verso };

  if (/^\d+$/.test(slug)) {
    const perId = tutte.find((s) => s.id === Number(slug));
    if (perId) return { tipo: "redirect", slug: perId.slug };
  }
  return null;
}

/** La sagra (edizione corrente) di una scheda, seguendo alias e id. */
export async function getSagraBySlug(slug: string): Promise<Sagra | undefined> {
  const risolta = await getScheda(slug);
  if (!risolta) return undefined;
  if (risolta.tipo === "scheda") return risolta.sagra;
  const finale = await getScheda(risolta.slug);
  return finale?.tipo === "scheda" ? finale.sagra : undefined;
}

/**
 * Tutti i parametri che /sagra/[slug] deve pre-renderizzare: le schede, gli
 * slug dei doppioni e gli id. Quelli che non sono schede fanno solo redirect,
 * ma se non sono generati Next risponde 404 senza mai eseguire il redirect.
 */
export async function getTuttiGliSlugSagra(): Promise<string[]> {
  const { perScheda, alias, tutte } = await getCatalogo();
  return [
    ...perScheda.keys(),
    ...alias.keys(),
    ...tutte.map((s) => String(s.id)),
  ];
}

/** Le schede, per sitemap e immagini OG: uno slug ciascuna, con l'edizione corrente. */
export async function getSchede(): Promise<Sagra[]> {
  const { perScheda } = await getCatalogo();
  return [...perScheda.values()].map((e) => edizioneCorrente(e));
}

// --- sagre vicine ---

function distanzaKm(a: { lat: number; leng: number }, b: { lat: number; leng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.leng - a.leng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Le prossime sagre (non concluse) più vicine a quella data, esclusa la sua
 * scheda. Sono il motivo per restare sul sito anche quando l'edizione che si
 * cercava è già passata.
 */
export function sagreVicine(sagra: Sagra, sagre: Sagra[], quante = 6): (Sagra & { km: number })[] {
  return sagre
    // Solo con una data: "data da confermare" non aiuta chi cerca dove andare.
    .filter((s) => s.slug !== sagra.slug && s.data_inizio && !eConclusa(s) && eMercatino(s) === eMercatino(sagra))
    .map((s) => ({ ...s, km: distanzaKm(sagra, s) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, quante);
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

// --- province ---

export type Provincia = { slug: string; sigla: string; nome: string };

// Le quattro province abruzzesi. La sigla è quella che arriva dall'API
// (già pulita: "AQ"/"TE"/"PE"/"CH"); lo slug è l'URL parlante.
export const PROVINCE: Provincia[] = [
  { slug: "l-aquila", sigla: "AQ", nome: "L'Aquila" },
  { slug: "teramo", sigla: "TE", nome: "Teramo" },
  { slug: "pescara", sigla: "PE", nome: "Pescara" },
  { slug: "chieti", sigla: "CH", nome: "Chieti" },
];

export function provinciaDaSlug(slug: string): Provincia | null {
  return PROVINCE.find((p) => p.slug === slug) ?? null;
}

export function sagreDiProvincia(sagre: Sagra[], p: Provincia): Sagra[] {
  return sagre.filter((s) => s.provincia?.toUpperCase() === p.sigla);
}

// --- weekend ---

export type Weekend = { inizio: Date; fine: Date };

/**
 * Il fine settimana "corrente": venerdì → domenica della settimana in corso.
 * Da lunedì a giovedì è quello che sta arrivando; da venerdì a domenica è
 * quello in corso (una sagra iniziata venerdì è ancora "questo weekend" il sabato).
 */
export function weekendCorrente(adesso: Date = new Date()): Weekend {
  const base = new Date(adesso);
  base.setHours(0, 0, 0, 0);
  const lun0 = (base.getDay() + 6) % 7; // lun=0 … ven=4 … dom=6
  const inizio = new Date(base);
  inizio.setDate(base.getDate() + (4 - lun0)); // venerdì di questa settimana
  const fine = new Date(inizio);
  fine.setDate(inizio.getDate() + 2);
  fine.setHours(23, 59, 59, 999); // domenica sera
  return { inizio, fine };
}

export function sagreNelWeekend(sagre: Sagra[], w: Weekend): Sagra[] {
  return sagre.filter((s) => {
    if (!s.data_inizio) return false;
    const fine = s.data_fine ?? s.data_inizio;
    return s.data_inizio <= w.fine && fine >= w.inizio;
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
 * È il ripiego per le sagre senza descrizione: come testo di pagina è thin
 * content — uguale per tutte a meno dei nomi propri — quindi quando la
 * descrizione estesa c'è vince quella (vedi paragrafi()).
 */
export function riassunto(s: Sagra): string {
  const luogo = s.citta ? `a ${s.citta}${s.provincia ? ` (${s.provincia})` : ""}` : "in Abruzzo";
  const cat = s.category?.toLowerCase();
  const mercatini = eMercatino(s);
  const sagra = !mercatini && cat === "sagra";
  let tipo = "L'evento";
  let passato = eConclusa(s) ? " si è tenuto" : " si tiene";

  if (sagra) {
    tipo = "La sagra";
    passato = eConclusa(s) ? " si è tenuta" : " si tiene";
  } else if (mercatini) {
    tipo = "I mercatini";
    passato = eConclusa(s) ? " si sono tenuti" : " si tengono";
  }

  // Al passato quando è già finita, o lo snippet su Google promette una sagra
  // che non c'è più.
  const quando = s.data_inizio
    ? `${passato} ${formatIntervallo(s)}`
    : mercatini
      ? " sono in programma"
      : " è in programma";
  const orario = s.ora_inizio ? `, a partire dalle ${s.ora_inizio}` : "";
  return `${tipo} "${s.nome_sagra}"${quando} ${luogo}${orario}.`;
}

/**
 * La descrizione dell'evento spezzata nei suoi paragrafi, pronta da stampare.
 * Vuoto se la sagra non ha descrizione: in quel caso la pagina usa riassunto().
 */
export function paragrafi(s: Sagra): string[] {
  if (!s.descrizione) return [];
  return s.descrizione
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// Google mostra ~160 caratteri: oltre taglia lui, e a metà parola.
const META_MAX = 160;

/**
 * La meta description: l'inizio della descrizione vera, chiuso all'ultima
 * frase (o all'ultima parola) che ci sta. Se manca, il riassunto dai dati.
 */
export function metaDescrizione(s: Sagra): string {
  const testo = paragrafi(s).join(" ");
  if (!testo) return riassunto(s);
  if (testo.length <= META_MAX) return testo;

  const taglio = testo.slice(0, META_MAX + 1);
  const frase = taglio.search(/[.!?](?=[^.!?]*$)/);
  // Una frase troppo corta lascerebbe uno snippet mozzo: meglio riempire
  // fino all'ultima parola intera e chiudere con i puntini.
  if (frase >= META_MAX / 2) return taglio.slice(0, frase + 1);
  return `${taglio.slice(0, taglio.lastIndexOf(" "))}…`;
}

// --- locandine ---

// Revisione mirata della cache per le fonti abilitate dopo che il loro URL era
// già finito nell'archivio. Cambiarla evita di riusare l'eventuale PNG
// trasparente memorizzato quando la fonte non era ancora consentita.
const REVISIONE_CACHE_LOCANDINE: Partial<Record<string, string>> = {
  "iltrafiletto.it": "1",
};

function revisioneCacheLocandina(host: string): string | undefined {
  if (host.endsWith(".fbcdn.net")) return "1";
  return REVISIONE_CACHE_LOCANDINE[host];
}

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
    return normalizzaUrlHttpsPubblico(u)?.href ?? null;
  } catch {
    return null;
  }
}

/** Versione corta e deterministica usata esclusivamente come chiave di cache. */
export function versioneLocandina(originale: string): string {
  const host = new URL(originale).hostname.replace(/^www\./, "");
  const revisione = revisioneCacheLocandina(host);
  const chiave = revisione ? `${originale}\0${revisione}` : originale;
  return createHash("sha256").update(chiave).digest("hex").slice(0, 12);
}

/**
 * URL pubblico e versionato della locandina.
 *
 * Il proxy resta identificato dall'id della sagra e genera soltanto due
 * varianti consentite. La versione cambia quando cambia l'URL originale:
 * in questo modo la CDN usa una nuova chiave di cache senza ricorrere
 * all'Image Optimization di Vercel.
 */
export type VarianteLocandina = "card" | "detail";

export function locandinaProxyUrl(
  s: Pick<Sagra, "id" | "locandina">,
  variante: VarianteLocandina,
): string | null {
  const originale = locandinaOriginale(s);
  if (!originale) return null;
  return `/locandina/${s.id}?v=${versioneLocandina(originale)}&variant=${variante}`;
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
    // Le sagre hanno ingresso libero: offerta gratuita, dato veritiero. Ma
    // solo finché l'edizione non è passata: "disponibile" su un evento
    // concluso sarebbe falso.
    ...(!eMercatino(s) && !eConclusa(s) && { offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url,
      ...(s.data_inizio && { validFrom: toISO(s.data_inizio) }),
    } }),
    // Nei dati strutturati va la descrizione per intero: è quella che descrive
    // davvero l'evento, il riassunto dai dati è solo il ripiego.
    description: paragrafi(s).join("\n\n") || riassunto(s),
    url,
  };
}
