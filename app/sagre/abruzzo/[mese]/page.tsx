import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventCard from "../../../components/event-card";
import SiteFooter from "../../../components/site-footer";
import SiteNav from "../../../components/site-nav";
import {
  eMercatino,
  getSagreAbruzzo,
  mesePassato,
  mesiConSagre,
  parseMeseSlug,
  PROVINCE,
  sagreDiProvincia,
  sagreNelMese,
  sagreNelWeekend,
  weekendCorrente,
} from "../../../../lib/sagre";
import { MERCATINI_PATH, OG_DEFAULTS, SITE_URL } from "../../../../lib/site";

export const revalidate = 21_600;

type Props = { params: Promise<{ mese: string }> };

function maiuscola(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "ad agosto", "ad aprile", ma "a luglio" (d eufonica solo davanti ad a-).
function aMese(nome: string) {
  return nome.startsWith("a") ? `ad ${nome}` : `a ${nome}`;
}

// Cosa caratterizza il mese nelle feste abruzzesi. È il testo che distingue
// davvero una pagina mese dall'altra: il resto dell'introduzione viene dai dati.
const STAGIONE: string[] = [
  "Gennaio è il mese dei fuochi di Sant'Antonio Abate, intorno al 17: in molti paesi si accendono i falò e si benedicono gli animali, con cene a base di maiale e dei prodotti dell'inverno.",
  "Febbraio è il mese del Carnevale: sfilate di carri e maschere nei paesi, con chiacchiere, castagnole e gli altri dolci fritti della tradizione.",
  "A marzo il calendario si apre con San Giuseppe, il 19, quando in diversi paesi si preparano le tavole del santo e si friggono le zeppole, e con le prime feste di primavera.",
  "Aprile porta la Pasqua e le sue tradizioni, dalle processioni alla pizza di Pasqua e ai fiadoni, e le prime giornate all'aperto della primavera.",
  "A maggio tornano le feste patronali e le prime sagre all'aperto, con i prodotti di stagione come le fave e il pecorino.",
  "Giugno apre la stagione estiva delle sagre: le serate si allungano, le piazze si riempiono di stand gastronomici e cominciano le feste di paese che vanno avanti fino a settembre.",
  "Luglio è piena stagione: arrosticini e cucina di montagna nell'entroterra, pesce sulla costa, e quasi ogni fine settimana più feste di paese in contemporanea.",
  "Agosto è il mese con più sagre dell'anno, con il picco intorno a Ferragosto: tra costa, colline e montagna quasi ogni paese ha la sua festa.",
  "Settembre è il mese della vendemmia: feste dell'uva e del vino, peperoni e prodotti dell'orto, e le ultime grandi sagre all'aperto prima dell'autunno.",
  "Ottobre porta i sapori dell'autunno: castagne, funghi, tartufo e vino nuovo, nelle feste dei paesi dell'entroterra e della montagna.",
  "Novembre è il mese di San Martino, l'11, con il vino novello, le castagne arrostite e l'olio nuovo appena franto: le feste si spostano spesso al chiuso o sotto tendoni riscaldati.",
  "Dicembre è il mese dei mercatini di Natale e dei presepi viventi, che accompagnano i paesi dall'Immacolata fino all'Epifania.",
];

function conteggio(n: number, uno: string, molti: string) {
  return n === 1 ? `1 ${uno}` : `${n} ${molti}`;
}

function elencoNaturale(parti: string[]) {
  return parti.length <= 1
    ? parti.join("")
    : `${parti.slice(0, -1).join(", ")} e ${parti[parti.length - 1]}`;
}

function toccaIlGiorno(
  sagra: { data_inizio: Date | null; data_fine: Date | null },
  giorno: Date,
) {
  if (!sagra.data_inizio) return false;
  const fine = sagra.data_fine ?? sagra.data_inizio;
  return sagra.data_inizio <= giorno && fine >= giorno;
}

export async function generateStaticParams() {
  try {
    const sagre = await getSagreAbruzzo();
    return mesiConSagre(sagre).map((m) => ({ mese: m.slug }));
  } catch {
    // API giù al momento del build: le pagine si generano alla prima visita.
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mese: slug } = await params;
  const mese = parseMeseSlug(slug);
  if (!mese) return {};
  const titolo = `Sagre in Abruzzo ${aMese(mese.nome)} ${mese.anno}: date e paesi`;

  // Il numero è il nostro vantaggio sui portali concorrenti: se ce l'abbiamo,
  // finisce in descrizione (e quindi nello snippet). Se l'API è giù, si tace.
  let quante: number | null = null;
  try {
    quante = sagreNelMese(await getSagreAbruzzo(), mese).length;
  } catch {
    quante = null;
  }
  const elenco = quante
    ? `Tutte le ${quante} sagre e feste di paese`
    : "Le sagre e le feste di paese";

  // Un mese passato non è "in aggiornamento": lo snippet lo dice com'è.
  const coda = mesePassato(mese)
    ? "date, paesi e schede di ogni evento, con le edizioni in arrivo."
    : "date, orari e paesi, in aggiornamento continuo. Trovale sulla mappa con l'app Sagramanije.";

  return {
    title: titolo,
    description: `${elenco} in Abruzzo ${aMese(mese.nome)} ${mese.anno}: ${coda}`,
    alternates: { canonical: `/sagre/abruzzo/${slug}` },
    openGraph: { ...OG_DEFAULTS, title: titolo, url: `/sagre/abruzzo/${slug}` },
  };
}

export default async function MesePage({ params }: Props) {
  const { mese: slug } = await params;
  const mese = parseMeseSlug(slug);
  if (!mese) notFound();

  const sagre = await getSagreAbruzzo();
  const delMese = sagreNelMese(sagre, mese);
  if (delMese.length === 0) notFound();

  const altriMesi = mesiConSagre(sagre).filter((m) => m.slug !== slug);
  const esempi = delMese.slice(0, 3);
  const passato = mesePassato(mese);

  // Composizione del mese, per un'introduzione fatta di dati veri.
  const mercatini = delMese.filter(eMercatino).length;
  const sagreVere = delMese.filter(
    (s) => !eMercatino(s) && s.category?.toLowerCase() === "sagra",
  ).length;
  const altriEventi = delMese.length - mercatini - sagreVere;
  const composizione = elencoNaturale(
    [
      sagreVere ? conteggio(sagreVere, "sagra", "sagre") : "",
      altriEventi ? conteggio(altriEventi, "festa o evento", "feste ed eventi") : "",
      mercatini ? conteggio(mercatini, "mercatino", "mercatini") : "",
    ].filter(Boolean),
  );
  const perPaese = new Map<string, number>();
  for (const s of delMese) {
    if (s.citta) perPaese.set(s.citta, (perPaese.get(s.citta) ?? 0) + 1);
  }
  const paesiAttivi = [...perPaese.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const perProvincia = PROVINCE.map((provincia) => ({
    provincia,
    sagre: sagreDiProvincia(delMese, provincia),
  }));
  const oggi = new Date();
  const meseCorrente =
    mese.anno === oggi.getFullYear() && mese.indice === oggi.getMonth();
  const delWeekend = meseCorrente
    ? sagreNelWeekend(delMese, weekendCorrente(oggi))
    : [];
  const ferragosto =
    mese.indice === 7
      ? delMese.filter((sagra) =>
          toccaIlGiorno(sagra, new Date(mese.anno, 7, 15, 12)),
        )
      : [];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Sagre in Abruzzo a ${mese.nome} ${mese.anno}`,
    itemListElement: delMese.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.nome_sagra,
      url: `${SITE_URL}/sagra/${s.slug}`,
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sagramanije", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Sagre in Abruzzo",
        item: `${SITE_URL}/sagre/abruzzo`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${maiuscola(mese.nome)} ${mese.anno}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb]) }}
      />
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <p className="text-sm font-semibold text-muted">
          <Link href="/" className="hover:text-ink">
            Sagramanije
          </Link>{" "}
          /{" "}
          <Link href="/sagre/abruzzo" className="hover:text-ink">
            Sagre in Abruzzo
          </Link>{" "}
          / {maiuscola(mese.nome)} {mese.anno}
        </p>
        <h1 className="mt-3 font-title text-titolo-pagina leading-tight">
          Sagre in Abruzzo {aMese(mese.nome)} {mese.anno}
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-lg leading-relaxed text-muted">
          <p>
            {passato
              ? `${maiuscola(aMese(mese.nome))} ${mese.anno} in Abruzzo si sono tenuti ${conteggio(delMese.length, "appuntamento", "appuntamenti")}: ${composizione}. Qui sotto trovi l'elenco completo, in ordine di data, con la scheda di ciascuno.`
              : `Cerchi cosa fare in Abruzzo ${aMese(mese.nome)} ${mese.anno}? In calendario ci sono ${conteggio(delMese.length, "appuntamento", "appuntamenti")}: ${composizione}, in ordine di data e con la scheda di ciascuno.`}
          </p>
          <p>
            {STAGIONE[mese.indice]}
            {mese.indice === 11 ? (
              <>
                {" "}
                Li trovi raccolti anche nel{" "}
                <Link href={MERCATINI_PATH} className="font-bold text-primary-ink hover:underline">
                  calendario dei mercatini di Natale in Abruzzo
                </Link>
                .
              </>
            ) : null}
          </p>
          <p>
            Per provincia:{" "}
            {perProvincia.map(({ provincia, sagre: sagreProvincia }, indice) => (
              <span key={provincia.slug}>
                {indice > 0
                  ? indice === perProvincia.length - 1
                    ? " e "
                    : ", "
                  : ""}
                {sagreProvincia.length} in provincia di {provincia.nome}
              </span>
            ))}
            .
            {paesiAttivi.length > 0
              ? ` ${paesiAttivi.length === 1 ? "Il paese" : "I paesi"} con più appuntamenti nel mese: ${elencoNaturale(paesiAttivi.map(([paese, n]) => `${paese} (${n})`))}.`
              : ""}
          </p>
          <p>
            {passato ? "Tra gli appuntamenti del mese c'erano " : "Tra gli appuntamenti in calendario ci sono "}
            {esempi.map((sagra, indice) => (
              <span key={sagra.slug}>
                {indice > 0 ? (indice === esempi.length - 1 ? " e " : ", ") : ""}
                <Link
                  href={`/sagra/${sagra.slug}`}
                  className="font-bold text-primary-ink hover:underline"
                >
                  {sagra.nome_sagra}
                </Link>
              </span>
            ))}
            .{" "}
            {passato
              ? "Molte tornano ogni anno: nella scheda di ciascuna trovi le edizioni passate e le prossime sagre in programma lì vicino."
              : "Le date arrivano dagli organizzatori e il calendario si aggiorna man mano che ne vengono pubblicate di nuove."}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {meseCorrente ? (
            <section className="rounded-3xl bg-surface p-6">
              <h2 className="font-title text-2xl">
                Sagre in Abruzzo questo weekend
              </h2>
              <p className="mt-2 text-muted">
                {delWeekend.length === 0
                  ? "Non risultano ancora sagre per questo fine settimana. Il calendario viene aggiornato di continuo."
                  : `${delWeekend.length} ${delWeekend.length === 1 ? "appuntamento cade" : "appuntamenti cadono"} nel fine settimana in corso.`}
              </p>
              <Link
                href="/sagre/abruzzo/questo-weekend"
                className="mt-4 inline-block font-bold text-primary-ink hover:underline"
              >
                Guarda le sagre del weekend →
              </Link>
            </section>
          ) : null}

          {mese.indice === 7 ? (
            <section id="ferragosto" className="rounded-3xl bg-surface p-6">
              <h2 className="font-title text-2xl">
                Sagre di Ferragosto in Abruzzo
              </h2>
              {ferragosto.length > 0 ? (
                <>
                  <p className="mt-2 text-muted">
                    {ferragosto.length === 1
                      ? "Un evento in calendario comprende il 15 agosto."
                      : `${ferragosto.length} eventi in calendario comprendono il 15 agosto.`}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {ferragosto.slice(0, 5).map((sagra) => (
                      <li key={sagra.slug}>
                        <Link
                          href={`/sagra/${sagra.slug}`}
                          className="font-bold text-primary-ink hover:underline"
                        >
                          {sagra.nome_sagra}
                          {sagra.citta ? ` — ${sagra.citta}` : ""}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-muted">
                  Non risultano ancora eventi per il 15 agosto: torna a
                  controllare, aggiungiamo nuove date appena vengono pubblicate.
                </p>
              )}
            </section>
          ) : null}
        </div>

        <section className="mt-10" aria-labelledby="province-title">
          <h2 id="province-title" className="font-title text-titolo-sezione">
            Sagre {aMese(mese.nome)} {mese.anno} per provincia
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perProvincia.map(({ provincia, sagre: sagreProvincia }) => (
              <Link
                key={provincia.slug}
                href={`/sagre/abruzzo/provincia/${provincia.slug}`}
                className="rounded-2xl bg-beige p-5 transition-transform hover:-translate-y-0.5 hover:bg-primary hover:text-white"
              >
                <h3 className="font-title text-lg">
                  Provincia di {provincia.nome}
                </h3>
                <p className="mt-1 text-sm font-semibold">
                  {sagreProvincia.length === 1
                    ? "1 evento nel mese"
                    : `${sagreProvincia.length} eventi nel mese`}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <h2 className="mt-14 font-title text-titolo-sezione">
          Tutte le sagre in Abruzzo {aMese(mese.nome)} {mese.anno}
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {delMese.map((s) => (
            <EventCard key={s.slug} sagra={s} />
          ))}
        </div>

        {altriMesi.length > 0 ? (
          <nav className="mt-14" aria-label="Altri mesi">
            <h2 className="font-title text-2xl">Altri mesi</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {altriMesi.map((m) => (
                <Link
                  key={m.slug}
                  href={`/sagre/abruzzo/${m.slug}`}
                  className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
                >
                  {maiuscola(m.nome)} {m.anno}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
