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
  sagreNelMese,
} from "../../../../lib/sagre";

export const revalidate = 21_600;

type Props = { params: Promise<{ mese: string }> };

function maiuscola(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "ad agosto", "ad aprile", ma "a luglio" (d eufonica solo davanti ad a-).
function aMese(nome: string) {
  return nome.startsWith("a") ? `ad ${nome}` : `a ${nome}`;
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
  return {
    title: `${titolo} | Sagramanije`,
    description: `Le sagre e le feste di paese in Abruzzo ${aMese(mese.nome)} ${mese.anno}: date, orari e paesi, in aggiornamento continuo. Trovale sulla mappa con l'app Sagramanije.`,
    alternates: { canonical: `/sagre/abruzzo/${slug}` },
    openGraph: { title: titolo, url: `/sagre/abruzzo/${slug}` },
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

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Sagre in Abruzzo a ${mese.nome} ${mese.anno}`,
    itemListElement: delMese.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.nome_sagra,
      url: `https://sagramanije.it/sagra/${s.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
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
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {delMese.length === 1
            ? "Una sagra in calendario"
            : `${delMese.length} sagre e feste di paese in calendario`}{" "}
          in Abruzzo {aMese(mese.nome)} {mese.anno}, con date, orari e paesi.
          L&apos;elenco si aggiorna man mano che ne troviamo di nuove.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
