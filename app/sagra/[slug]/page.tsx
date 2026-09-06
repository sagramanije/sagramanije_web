import { Calendar, Clock, ExternalLink, MapPin, Navigation } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteNav from "../../components/site-nav";
import StripedPlaceholder from "../../components/striped-placeholder";
import ProgrammaSagra from "../../components/programma-sagra";
import SagraMeteo from "../../components/sagra-meteo";
import CarovanaWhatsApp from "../../components/carovana-whatsapp";
import SagraBottomBar from "../../components/sagra-bottom-bar";
import Image from "next/image";
import {
  eConclusa,
  eventJsonLd,
  formatIntervallo,
  getSagraBySlug,
  getSagreAbruzzo,
  locandinaProxyUrl,
  meseDi,
  metaDescrizione,
  paragrafi,
  riassunto,
  toISO,
} from "../../../lib/sagre";
import { getProgrammaSagra } from "../../../lib/programma";
import { OG_DEFAULTS, SITE_URL } from "../../../lib/site";

export const revalidate = 21_600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const sagre = await getSagreAbruzzo();
    const slugs = sagre.map((s) => ({ slug: s.slug }));
    const ids = sagre.map((s) => ({ slug: s.id.toString() }));
    return [...slugs, ...ids];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let sagra = await getSagraBySlug(slug);
  if (!sagra && !isNaN(Number(slug))) {
    const sagre = await getSagreAbruzzo();
    sagra = sagre.find((s) => s.id === Number(slug));
  }
  if (!sagra) return {};
  const anno = sagra.data_inizio?.getFullYear();
  const luogo = sagra.citta
    ? ` a ${sagra.citta}${sagra.provincia ? ` (${sagra.provincia})` : ""}`
    : " in Abruzzo";
  const titolo = `${sagra.nome_sagra}${anno ? ` ${anno}` : ""}${luogo}: date e orari`;
  const descrizione = metaDescrizione(sagra);
  return {
    title: titolo,
    description: descrizione,
    alternates: { canonical: `/sagra/${sagra.slug}` },
    openGraph: {
      ...OG_DEFAULTS,
      title: titolo,
      description: descrizione,
      url: `/sagra/${sagra.slug}`,
    },
  };
}

export default async function SagraPage({ params }: Props) {
  const { slug } = await params;
  let sagra = await getSagraBySlug(slug);

  if (!sagra && !isNaN(Number(slug))) {
    const sagre = await getSagreAbruzzo();
    sagra = sagre.find((s) => s.id === Number(slug));
    if (sagra) {
      redirect(`/sagra/${sagra.slug}`);
    }
  }

  if (!sagra) notFound();
  const programma = await getProgrammaSagra(sagra.id);
  
  const mese = sagra.data_inizio ? meseDi(sagra.data_inizio) : null;
  const conclusa = eConclusa(sagra);
  const locandina = locandinaProxyUrl(sagra, "detail");
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sagra.lat},${sagra.leng}`;

  // La descrizione vera dell'evento. Quando manca resta il riassunto dai dati,
  // che però è quasi identico per tutte le sagre: come testo di pagina vale poco.
  const descrizione = paragrafi(sagra);

  const jsonLd = eventJsonLd(sagra, `${SITE_URL}/sagra/${slug}`);
  // Stessa scala dei breadcrumb visibili in pagina: home / Abruzzo / mese / evento.
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
      ...(mese
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: `${mese.nome.charAt(0).toUpperCase() + mese.nome.slice(1)} ${mese.anno}`,
              item: `${SITE_URL}/sagre/abruzzo/${mese.slug}`,
            },
          ]
        : []),
      { "@type": "ListItem", position: mese ? 4 : 3, name: sagra.nome_sagra },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
      />
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10 pb-28 lg:pt-14 lg:pb-14">
        {/* Breadcrumbs */}
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

        {/* Griglia a due colonne (con riordino mobile: l'utile prima del lungo) */}
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_390px] xl:grid-cols-[1.1fr_420px] items-start">
          {/* 1. Header Principale: Locandina, Titolo e Luogo */}
          <div className="order-1 lg:col-start-1 min-w-0 space-y-6">
            {/* Locandina */}
            <div className="relative h-72 overflow-hidden rounded-3xl sm:h-96 w-full">
              <StripedPlaceholder />
              {locandina ? (
                <Image
                  src={locandina}
                  alt={`Locandina: ${sagra.nome_sagra}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 700px"
                  className="object-cover"
                  priority
                />
              ) : null}
              <span className="absolute left-5 top-5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs">
                {sagra.category?.toLowerCase() ?? "sagra"}
              </span>
            </div>

            {/* Titolo e Luogo */}
            <div>
              <h1 className="font-title text-4xl leading-tight sm:text-5xl text-ink">
                {sagra.nome_sagra}
              </h1>
              {sagra.citta ? (
                <p className="mt-2.5 flex items-center gap-2 text-lg font-medium text-warm">
                  <MapPin size={20} strokeWidth={2.5} className="text-primary" />
                  {sagra.citta}
                  {sagra.provincia ? `, ${sagra.provincia}` : ""} — Abruzzo
                </p>
              ) : null}
            </div>

            {/* Banner Edizione Conclusa */}
            {conclusa ? (
              <div className="rounded-3xl bg-beige p-6">
                <p className="font-title text-lg">Questa edizione è conclusa</p>
                <p className="mt-2 text-muted">
                  La sagra si è svolta {formatIntervallo(sagra)}. Di solito torna
                  ogni anno: intanto guarda{" "}
                  <Link
                    href="/sagre/abruzzo"
                    className="font-bold text-primary-ink hover:underline"
                  >
                    le sagre in programma adesso
                  </Link>
                  .
                </p>
              </div>
            ) : null}
          </div>

          {/* 2. Sidebar Operativa:
              SU MOBILE: viene SUBITO dopo il titolo (order-2) per mostrare l'utile prima del lungo!
              SU DESKTOP: si posiziona nella seconda colonna (col-2) e resta sticky durante lo scroll */}
          <aside className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 space-y-6 self-start">
            {/* Card Informazioni & Azioni principali */}
            <div className="overflow-hidden rounded-3xl bg-surface p-6 sm:p-7 border border-beige/60 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Informazioni & Indicazioni
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Calendar size={18} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-muted uppercase">Quando</p>
                    <p className="text-sm font-bold text-ink mt-0.5 leading-snug">
                      {formatIntervallo(sagra)}
                    </p>
                  </div>
                </div>

                {sagra.ora_inizio && (
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Clock size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-muted uppercase">Orario</p>
                      <p className="text-sm font-bold text-ink mt-0.5">
                        dalle {sagra.ora_inizio}
                      </p>
                    </div>
                  </div>
                )}

                {sagra.citta && (
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-muted uppercase">Luogo</p>
                      <p className="text-sm font-bold text-ink mt-0.5">
                        {sagra.citta}{sagra.provincia ? `, ${sagra.provincia}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottoni azione */}
              <div className="mt-6 flex flex-col gap-2.5">
                {!conclusa ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-bold text-white shadow-xs transition-transform hover:-translate-y-0.5"
                  >
                    <Navigation size={18} />
                    Come arrivare
                  </a>
                ) : null}
                {sagra.link_pagina_ufficiale ? (
                  <a
                    href={sagra.link_pagina_ufficiale}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-beige/40 px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-beige"
                  >
                    <ExternalLink size={16} />
                    Pagina dell&apos;evento
                  </a>
                ) : null}
              </div>
            </div>

            {/* Meteo Interattivo */}
            {!conclusa ? (
              <SagraMeteo
                lat={sagra.lat}
                leng={sagra.leng}
                citta={sagra.citta}
                nomeSagra={sagra.nome_sagra}
                dataInizioStr={sagra.data_inizio ? toISO(sagra.data_inizio) : null}
                dataFineStr={sagra.data_fine ? toISO(sagra.data_fine) : null}
                oraInizio={sagra.ora_inizio}
                className="mt-0"
              />
            ) : null}

            {/* Carovana WhatsApp */}
            {!conclusa && (
              <CarovanaWhatsApp
                nomeSagra={sagra.nome_sagra}
                citta={sagra.citta}
                provincia={sagra.provincia}
                dataFormatted={formatIntervallo(sagra)}
                url={`${SITE_URL}/sagra/${sagra.slug}`}
                className="mt-0"
              />
            )}
          </aside>

          {/* 3. Approfondimenti:
              SU MOBILE: viene DOPO i widget (order-3)
              SU DESKTOP: continua sotto l'header (col-1 row-2) */}
          <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2 min-w-0 space-y-8">
            {/* Descrizione della sagra */}
            {descrizione.length > 0 ? (
              <div className="space-y-4 text-lg leading-relaxed text-muted">
                {descrizione.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-lg leading-relaxed text-muted">{riassunto(sagra)}</p>
            )}

            {/* Programma giorno per giorno */}
            <ProgrammaSagra giorni={programma} />

            {/* CTA Trovala sulla mappa */}
            <section className="rounded-3xl bg-surface p-8 border border-beige/60 shadow-xs">
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
          </div>
        </div>

        {/* Barra fissa in basso su mobile (per condividere su WhatsApp e navigare al volo) */}
        <SagraBottomBar
          nomeSagra={sagra.nome_sagra}
          citta={sagra.citta}
          provincia={sagra.provincia}
          dataFormatted={formatIntervallo(sagra)}
          url={`${SITE_URL}/sagra/${sagra.slug}`}
          mapsUrl={mapsUrl}
          conclusa={conclusa}
        />
      </main>

      <SiteFooter />
    </>
  );
}
