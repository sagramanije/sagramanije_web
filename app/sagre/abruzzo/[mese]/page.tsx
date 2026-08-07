import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventCard from "../../../components/event-card";
import SiteFooter from "../../../components/site-footer";
import SiteNav from "../../../components/site-nav";
import {
  getSagreAbruzzo,
  mesiConSagre,
  parseMeseSlug,
  PROVINCE,
  sagreDiProvincia,
  sagreNelMese,
  sagreNelWeekend,
  weekendCorrente,
} from "../../../../lib/sagre";
import { OG_DEFAULTS, SITE_URL } from "../../../../lib/site";

export const revalidate = 21_600;

type Props = { params: Promise<{ mese: string }> };

function maiuscola(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "ad agosto", "ad aprile", ma "a luglio" (d eufonica solo davanti ad a-).
function aMese(nome: string) {
  return nome.startsWith("a") ? `ad ${nome}` : `a ${nome}`;
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

  return {
    title: titolo,
    description: `${elenco} in Abruzzo ${aMese(mese.nome)} ${mese.anno}: date, orari e paesi, in aggiornamento continuo. Trovale sulla mappa con l'app Sagramanije.`,
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
        <h1 className="mt-3 font-title text-4xl leading-tight sm:text-5xl">
          Sagre in Abruzzo {aMese(mese.nome)} {mese.anno}
        </h1>
        <div className="mt-5 max-w-3xl space-y-4 text-lg leading-relaxed text-muted">
          <p>
            Cerchi cosa fare in Abruzzo {aMese(mese.nome)} {mese.anno}? In
            questa pagina trovi {delMese.length === 1 ? "una sagra" : `${delMese.length} sagre`},
            feste di paese e appuntamenti enogastronomici in programma nelle
            province di Teramo, Pescara, Chieti e L&apos;Aquila, ordinati per
            data e località.
          </p>
          <p>
            Il calendario viene aggiornato man mano che troviamo nuove date
            pubblicate dagli organizzatori. Ogni scheda riporta il paese, il
            periodo, gli orari disponibili e la locandina, così puoi verificare
            subito quando si svolge l&apos;evento e aprire tutti i dettagli prima
            di partire.
          </p>
          <p>
            Nel dettaglio, il calendario conta{" "}
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
            . Il riepilogo per provincia ti permette di restringere subito la
            ricerca alla zona più comoda, senza scorrere l&apos;intero elenco.
          </p>
          <p>
            Tra gli appuntamenti già in calendario ci sono{" "}
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
            . Puoi partire dalle proposte del weekend, dagli eventi di
            Ferragosto quando presenti oppure dal calendario della provincia
            che ti interessa. Le stesse sagre sono disponibili nell&apos;app
            Sagramanije, anche sulla mappa.
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
          <h2 id="province-title" className="font-title text-2xl sm:text-3xl">
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

        <h2 className="mt-14 font-title text-2xl sm:text-3xl">
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
