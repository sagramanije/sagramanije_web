import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { eConclusa, eMercatino, formatIntervallo, getSagreAbruzzo } from "../../../lib/sagre";
import { MERCATINI_PATH, OG_DEFAULTS, SITE_URL } from "../../../lib/site";
import EventCard from "../../components/event-card";
import SiteFooter from "../../components/site-footer";
import SiteNav from "../../components/site-nav";

export const revalidate = 21_600;

const titolo = "Mercatini di Natale in Abruzzo";
const descrizione = "Il calendario dei mercatini di Natale in Abruzzo. Scopri in quali borghi si tengono, consulta date e orari e apri la mappa di ogni mercatino.";

export const metadata: Metadata = {
  title: titolo, description: descrizione,
  alternates: { canonical: MERCATINI_PATH },
  openGraph: { ...OG_DEFAULTS, url: MERCATINI_PATH, title: titolo, description: descrizione },
};

export default async function MercatiniPage() {
  const mercatini = (await getSagreAbruzzo()).filter(eMercatino);
  const oggi = new Date();
  const prossimi = mercatini.filter((s) => !eConclusa(s, oggi));
  const passati = mercatini.filter((s) => eConclusa(s, oggi)).reverse();
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sagramanije", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: titolo, item: SITE_URL + MERCATINI_PATH },
    ],
  };
  const elenco = {
    "@context": "https://schema.org", "@type": "ItemList", name: titolo,
    itemListElement: prossimi.map((s, i) => ({
      "@type": "ListItem", position: i + 1, name: s.nome_sagra, url: `${SITE_URL}/sagra/${s.slug}`,
    })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(prossimi.length ? [breadcrumb, elenco] : breadcrumb).replace(/</g, "\\u003c"),
      }} />
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Percorso" className="mb-6 text-sm text-muted">
          <Link href="/" className="hover:underline">Sagramanije</Link> / Mercatini di Natale
        </nav>
        <header className="grid overflow-hidden rounded-2xl bg-ink text-cream md:grid-cols-[1fr_.9fr]">
          <div className="self-center px-6 py-9 sm:p-10">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em]">
              <MapPin size={16} aria-hidden /> La guida regionale
            </p>
            <h1 className="max-w-lg font-title text-titolo-pagina font-bold tracking-tight">{titolo}</h1>
            <p className="mt-4 max-w-lg leading-relaxed">Scegli il paese e controlla le date. Nella scheda di ogni mercatino trovi le indicazioni per raggiungerlo e il programma, quando disponibile.</p>
          </div>
          <Image src="/mercatini-abruzzo.webp" alt="" width={1500} height={1000}
            className="h-44 w-full object-cover md:h-full" sizes="(min-width: 768px) 500px, 100vw" preload />
        </header>
        <section className="mt-12" aria-labelledby="in-calendario">
          <h2 id="in-calendario" className="font-title text-titolo-sezione">Mercatini in programma</h2>
          {prossimi.length ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {prossimi.map((s) => <EventCard key={s.id} sagra={s} />)}
            </div>
          ) : (
            <div className="mt-5 flex items-start gap-4 rounded-2xl border border-beige bg-surface p-6">
              <CalendarDays aria-hidden className="shrink-0 text-primary-ink" />
              <div>
                <p>Al momento non ci sono mercatini di Natale in programma nel calendario.</p>
                <Link href="/sagre/abruzzo" className="mt-2 inline-block font-bold text-primary-ink hover:underline">Esplora le sagre in Abruzzo →</Link>
              </div>
            </div>
          )}
        </section>
        {passati.length > 0 && (
          <section className="mt-12">
            <h2 className="font-title text-2xl">Edizioni passate</h2>
            <ul className="mt-4 divide-y divide-beige">
              {passati.map((s) => (
                <li key={s.id} className="py-3">
                  <Link href={`/sagra/${s.slug}`} className="font-bold hover:underline">{s.nome_sagra}</Link>
                  <p className="text-sm text-muted">{[s.citta, formatIntervallo(s)].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
