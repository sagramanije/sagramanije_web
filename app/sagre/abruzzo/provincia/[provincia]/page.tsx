import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventCard from "../../../../components/event-card";
import SiteFooter from "../../../../components/site-footer";
import SiteNav from "../../../../components/site-nav";
import {
  eConclusa,
  getSagreAbruzzo,
  PROVINCE,
  provinciaDaSlug,
  sagreDiProvincia,
} from "../../../../../lib/sagre";
import { OG_DEFAULTS, SITE_URL } from "../../../../../lib/site";

export const revalidate = 21_600;

type Props = { params: Promise<{ provincia: string }> };

export function generateStaticParams() {
  return PROVINCE.map((p) => ({ provincia: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia: slug } = await params;
  const prov = provinciaDaSlug(slug);
  if (!prov) return {};

  let prossime: number | null = null;
  try {
    prossime = sagreDiProvincia(await getSagreAbruzzo(), prov).filter(
      (s) => !eConclusa(s),
    ).length;
  } catch {
    prossime = null;
  }
  const quante =
    prossime && prossime > 0
      ? `${prossime} sagre e feste di paese in programma`
      : "Le sagre e le feste di paese";

  const titolo = `Sagre in provincia di ${prov.nome}: calendario, date e paesi`;
  return {
    title: titolo,
    description: `${quante} in provincia di ${prov.nome}, in Abruzzo: date, orari e paesi, in aggiornamento continuo. Trovale sulla mappa con l'app Sagramanije.`,
    alternates: { canonical: `/sagre/abruzzo/provincia/${slug}` },
    openGraph: {
      ...OG_DEFAULTS,
      title: `Sagre in provincia di ${prov.nome}`,
      url: `/sagre/abruzzo/provincia/${slug}`,
    },
  };
}

export default async function ProvinciaPage({ params }: Props) {
  const { provincia: slug } = await params;
  const prov = provinciaDaSlug(slug);
  if (!prov) notFound();

  const sagre = await getSagreAbruzzo();
  const dellaProvincia = sagreDiProvincia(sagre, prov);
  if (dellaProvincia.length === 0) notFound();

  const prossime = dellaProvincia.filter((s) => !eConclusa(s));
  const altre = PROVINCE.filter((p) => p.slug !== slug);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Sagre in provincia di ${prov.nome}`,
    itemListElement: prossime.slice(0, 50).map((s, i) => ({
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
      { "@type": "ListItem", position: 3, name: `Provincia di ${prov.nome}` },
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
          / Provincia di {prov.nome}
        </p>
        <h1 className="mt-3 font-title text-4xl leading-tight sm:text-5xl">
          Sagre in provincia di {prov.nome}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {prossime.length === 0
            ? `Al momento non ci sono sagre in programma in provincia di ${prov.nome}, ma il calendario si aggiorna di continuo.`
            : `${
                prossime.length === 1
                  ? "Una sagra in programma"
                  : `${prossime.length} sagre e feste di paese in programma`
              } in provincia di ${prov.nome}, con date, orari e paesi. L'elenco si aggiorna man mano che ne troviamo di nuove.`}
        </p>

        {prossime.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {prossime.map((s) => (
              <EventCard key={s.slug} sagra={s} />
            ))}
          </div>
        ) : null}

        <nav className="mt-14" aria-label="Altre province">
          <h2 className="font-title text-2xl">Le altre province</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {altre.map((p) => (
              <Link
                key={p.slug}
                href={`/sagre/abruzzo/provincia/${p.slug}`}
                className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
              >
                {p.nome}
              </Link>
            ))}
            <Link
              href="/sagre/abruzzo"
              className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
            >
              Tutto l&apos;Abruzzo →
            </Link>
          </div>
        </nav>
      </main>

      <SiteFooter />
    </>
  );
}
