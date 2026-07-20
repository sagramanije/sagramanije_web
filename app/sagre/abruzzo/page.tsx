import type { Metadata } from "next";
import Link from "next/link";
import EventCard from "../../components/event-card";
import SiteFooter from "../../components/site-footer";
import SiteNav from "../../components/site-nav";
import {
  eConclusa,
  getSagreAbruzzo,
  mesePassato,
  mesiConSagre,
  sagreNelMese,
} from "../../../lib/sagre";
import { OG_DEFAULTS, SITE_URL } from "../../../lib/site";

export const revalidate = 21_600; // allineato a SAGRE_REVALIDATE in lib/sagre.ts

export const metadata: Metadata = {
  title: "Sagre in Abruzzo: calendario con date, paesi e orari",
  description:
    "Il calendario delle sagre e feste di paese in Abruzzo, mese per mese: date, orari e paesi in provincia di L'Aquila, Teramo, Pescara e Chieti. Aggiornato di continuo.",
  alternates: { canonical: "/sagre/abruzzo" },
  openGraph: {
    ...OG_DEFAULTS,
    title: "Sagre in Abruzzo: il calendario",
    description:
      "Tutte le sagre e le feste di paese in Abruzzo, mese per mese, con date e orari.",
    url: "/sagre/abruzzo",
  },
};

function maiuscola(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function SagreAbruzzoPage() {
  const sagre = await getSagreAbruzzo();
  // L'hub parla del presente: i mesi già passati restano raggiungibili (e
  // indicizzati) ma vanno in fondo, come archivio, senza riempire la pagina.
  const mesi = mesiConSagre(sagre).filter((m) => !mesePassato(m));
  const archivio = mesiConSagre(sagre)
    .filter((m) => mesePassato(m))
    .reverse();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sagre in Abruzzo",
    // Solo sagre ancora da venire: l'elenco strutturato deve rispecchiare
    // quello che il visitatore può effettivamente andare a vedere.
    itemListElement: sagre
      .filter((s) => !eConclusa(s))
      .slice(0, 50)
      .map((s, i) => ({
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
      { "@type": "ListItem", position: 2, name: "Sagre in Abruzzo" },
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
          / Sagre in Abruzzo
        </p>
        <h1 className="mt-3 font-title text-4xl leading-tight sm:text-5xl">
          Sagre in Abruzzo
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Il calendario delle sagre e delle feste di paese abruzzesi: date,
          orari e paesi delle province di L&apos;Aquila, Teramo, Pescara e
          Chieti. Lo teniamo aggiornato di continuo — le stesse sagre che trovi
          nell&apos;app, sulla mappa e a portata di mano.
        </p>

        {/* nav dei mesi */}
        <nav className="mt-8 flex flex-wrap gap-3" aria-label="Sagre per mese">
          {mesi.map((m) => (
            <Link
              key={m.slug}
              href={`/sagre/abruzzo/${m.slug}`}
              className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
            >
              {maiuscola(m.nome)} {m.anno}
            </Link>
          ))}
        </nav>

        {mesi.map((m) => {
          const delMese = sagreNelMese(sagre, m);
          return (
            <section key={m.slug} className="mt-14">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-title text-2xl sm:text-3xl">
                  {maiuscola(m.nome)} {m.anno}
                </h2>
                <Link
                  href={`/sagre/abruzzo/${m.slug}`}
                  className="shrink-0 text-sm font-bold text-primary-ink hover:underline"
                >
                  Sagre di {m.nome} →
                </Link>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {delMese.map((s) => (
                  <EventCard key={s.slug} sagra={s} />
                ))}
              </div>
            </section>
          );
        })}

        {archivio.length > 0 ? (
          <nav className="mt-16" aria-label="Mesi passati">
            <h2 className="font-title text-2xl">Le sagre dei mesi scorsi</h2>
            <p className="mt-2 max-w-xl text-muted">
              Le edizioni già passate restano consultabili: quasi tutte queste
              sagre tornano ogni anno, più o meno negli stessi giorni.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {archivio.map((m) => (
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

        <section className="mt-16 rounded-3xl bg-surface p-8">
          <h2 className="font-title text-2xl">Manca una sagra?</h2>
          <p className="mt-2 max-w-xl text-muted">
            Setacciamo il web a caccia di sagre abruzzesi, ma ogni tanto
            qualcuna ci sfugge.{" "}
            <a
              href="mailto:sagramanije@gmail.com?subject=Segnalazione%20sagra"
              className="font-bold text-primary-ink hover:underline"
            >
              Segnalacela
            </a>{" "}
            e la aggiungiamo al calendario e all&apos;app.
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
