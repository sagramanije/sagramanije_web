import { Calendar, Clock, ExternalLink, MapPin, Navigation } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteNav from "../../components/site-nav";
import StripedPlaceholder from "../../components/striped-placeholder";
import Image from "next/image";
import {
  eventJsonLd,
  formatIntervallo,
  getSagraBySlug,
  getSagreAbruzzo,
  locandinaOriginale,
  meseDi,
  riassunto,
} from "../../../lib/sagre";

export const revalidate = 21_600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const sagre = await getSagreAbruzzo();
    return sagre.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sagra = await getSagraBySlug(slug);
  if (!sagra) return {};
  const anno = sagra.data_inizio?.getFullYear();
  const luogo = sagra.citta
    ? ` a ${sagra.citta}${sagra.provincia ? ` (${sagra.provincia})` : ""}`
    : " in Abruzzo";
  const titolo = `${sagra.nome_sagra}${anno ? ` ${anno}` : ""}${luogo}: date e orari`;
  return {
    title: `${titolo} | Sagramanije`,
    description: riassunto(sagra),
    alternates: { canonical: `/sagra/${slug}` },
    openGraph: { title: titolo, description: riassunto(sagra), url: `/sagra/${slug}` },
  };
}

export default async function SagraPage({ params }: Props) {
  const { slug } = await params;
  const sagra = await getSagraBySlug(slug);
  if (!sagra) notFound();

  const mese = sagra.data_inizio ? meseDi(sagra.data_inizio) : null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sagra.lat},${sagra.leng}`;

  const jsonLd = eventJsonLd(sagra, `https://sagramanije.it/sagra/${slug}`);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sagre in Abruzzo", item: "https://sagramanije.it/sagre/abruzzo" },
      { "@type": "ListItem", position: 2, name: sagra.nome_sagra },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
      />
      <SiteNav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <p className="text-sm font-semibold text-muted">
          <Link href="/sagre/abruzzo" className="hover:text-ink">
            Sagre in Abruzzo
          </Link>
          {mese ? (
            <>
              {" / "}
              <Link href={`/sagre/abruzzo/${mese.slug}`} className="hover:text-ink">
                {mese.nome.charAt(0).toUpperCase() + mese.nome.slice(1)} {mese.anno}
              </Link>
            </>
          ) : null}
        </p>

        <div className="relative mt-6 h-64 overflow-hidden rounded-3xl sm:h-80">
          <StripedPlaceholder />
          {locandinaOriginale(sagra) ? (
            // Passa dal proxy /locandina/<id>: l'URL d'origine non arriva al browser.
            <Image
              src={`/locandina/${sagra.id}`}
              alt={`Locandina: ${sagra.nome_sagra}`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          ) : null}
          <span className="absolute left-5 top-5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">
            {sagra.category?.toLowerCase() ?? "sagra"}
          </span>
        </div>

        <h1 className="mt-8 font-title text-4xl leading-tight sm:text-5xl">
          {sagra.nome_sagra}
        </h1>
        {sagra.citta ? (
          <p className="mt-2 flex items-center gap-1.5 text-lg font-medium text-warm">
            <MapPin size={18} strokeWidth={2.5} />
            {sagra.citta}
            {sagra.provincia ? `, ${sagra.provincia}` : ""} — Abruzzo
          </p>
        ) : null}

        <p className="mt-6 text-lg leading-relaxed text-muted">{riassunto(sagra)}</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <div className="rounded-3xl bg-surface p-5">
            <Calendar className="text-primary" size={22} />
            <p className="mt-3 text-xs font-medium text-muted">QUANDO</p>
            <p className="mt-1 text-sm font-bold">{formatIntervallo(sagra)}</p>
          </div>
          {sagra.ora_inizio ? (
            <div className="rounded-3xl bg-surface p-5">
              <Clock className="text-primary" size={22} />
              <p className="mt-3 text-xs font-medium text-muted">ORARIO</p>
              <p className="mt-1 text-sm font-bold">dalle {sagra.ora_inizio}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <Navigation size={17} />
            Come arrivare
          </a>
          {sagra.link_pagina_ufficiale ? (
            <a
              href={sagra.link_pagina_ufficiale}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2 rounded-2xl bg-surface px-6 py-3.5 font-bold transition-transform hover:-translate-y-0.5"
            >
              <ExternalLink size={17} />
              Pagina dell&apos;evento
            </a>
          ) : null}
        </div>

        <section className="mt-14 rounded-3xl bg-surface p-8">
          <h2 className="font-title text-2xl">Trovala sulla mappa</h2>
          <p className="mt-2 max-w-xl text-muted">
            Con l&apos;app Sagramanije vedi questa e tutte le altre sagre
            abruzzesi vicino a te, con la mappa e le indicazioni stradali.
          </p>
          <Link
            href="/#top"
            className="mt-4 inline-block font-bold text-primary-ink hover:underline"
          >
            Scopri l&apos;app →
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
