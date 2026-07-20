import type { Metadata } from "next";
import Link from "next/link";
import EventCard from "../../../components/event-card";
import SiteFooter from "../../../components/site-footer";
import SiteNav from "../../../components/site-nav";
import {
  getSagreAbruzzo,
  sagreNelWeekend,
  weekendCorrente,
  type Weekend,
} from "../../../../lib/sagre";
import { OG_DEFAULTS, SITE_URL } from "../../../../lib/site";

// Pagina "di freschezza": il weekend cambia ogni settimana, quindi si rigenera
// più spesso delle altre. I dati veri restano dietro la cache dell'API (6h);
// qui si ricalcola solo quale weekend è "questo".
export const revalidate = 3_600;

// Il canonical resta pulito e stabile: è sempre "il weekend corrente", non un
// weekend datato che genererebbe URL diversi ogni settimana.
export const metadata: Metadata = {
  title: "Sagre in Abruzzo questo weekend: dove andare sabato e domenica",
  description:
    "Le sagre e le feste di paese in Abruzzo questo fine settimana: cosa si mangia sabato e domenica, con date, orari e paesi. Aggiornato di continuo.",
  alternates: { canonical: "/sagre/abruzzo/questo-weekend" },
  openGraph: {
    ...OG_DEFAULTS,
    title: "Sagre in Abruzzo questo weekend",
    url: "/sagre/abruzzo/questo-weekend",
  },
};

function intervalloWeekend(w: Weekend): string {
  const g = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString("it-IT", opts);
  const stessoMese = w.inizio.getMonth() === w.fine.getMonth();
  const inizio = stessoMese
    ? String(w.inizio.getDate())
    : g(w.inizio, { day: "numeric", month: "long" });
  return `dal ${inizio} al ${g(w.fine, { day: "numeric", month: "long", year: "numeric" })}`;
}

export default async function QuestoWeekendPage() {
  const w = weekendCorrente();
  const sagre = await getSagreAbruzzo();
  const delWeekend = sagreNelWeekend(sagre, w);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sagre in Abruzzo questo weekend",
    itemListElement: delWeekend.map((s, i) => ({
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
      { "@type": "ListItem", position: 3, name: "Questo weekend" },
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
          / Questo weekend
        </p>
        <h1 className="mt-3 font-title text-4xl leading-tight sm:text-5xl">
          Sagre in Abruzzo questo weekend
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {delWeekend.length === 0
            ? `Nessuna sagra in calendario ${intervalloWeekend(w)}. Dai un'occhiata al calendario completo: qualcosa in settimana o nel weekend dopo di sicuro c'è.`
            : `${
                delWeekend.length === 1
                  ? "Una sagra"
                  : `${delWeekend.length} sagre e feste di paese`
              } in Abruzzo ${intervalloWeekend(w)}, con date, orari e paesi. Scegli e parti.`}
        </p>

        {delWeekend.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {delWeekend.map((s) => (
              <EventCard key={s.slug} sagra={s} />
            ))}
          </div>
        ) : null}

        <section className="mt-14 rounded-3xl bg-surface p-8">
          <h2 className="font-title text-2xl">Non solo questo weekend</h2>
          <p className="mt-2 max-w-xl text-muted">
            Guarda{" "}
            <Link
              href="/sagre/abruzzo"
              className="font-bold text-primary-ink hover:underline"
            >
              tutte le sagre in Abruzzo
            </Link>{" "}
            mese per mese, oppure filtra{" "}
            <Link
              href="/sagre/abruzzo/provincia/teramo"
              className="font-bold text-primary-ink hover:underline"
            >
              per provincia
            </Link>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
