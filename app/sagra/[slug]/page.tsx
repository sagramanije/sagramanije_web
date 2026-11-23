import { Calendar, Clock, ExternalLink, MapPin, Navigation } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import EventCard from "../../components/event-card";
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
  eMercatino,
  eventJsonLd,
  formatIntervallo,
  getSagreAbruzzo,
  getScheda,
  getTuttiGliSlugSagra,
  locandinaProxyUrl,
  meseDi,
  metaDescrizione,
  paragrafi,
  PROVINCE,
  riassunto,
  sagreVicine,
  toISO,
} from "../../../lib/sagre";
import { getProgrammaSagra } from "../../../lib/programma";
import { MERCATINI_PATH, OG_DEFAULTS, SITE_URL } from "../../../lib/site";

export const revalidate = 21_600;

type Props = { params: Promise<{ slug: string }> };

// Schede, slug dei doppioni e id: gli ultimi due fanno solo 301 verso la
// scheda, ma vanno pre-renderizzati o Next risponde 404 senza eseguire il
// redirect (vedi AGENTS.md).
export async function generateStaticParams() {
  try {
    return (await getTuttiGliSlugSagra()).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const scheda = await getScheda(slug);
  // Per i redirect i metadati non servono: la pagina risponde 308.
  if (scheda?.tipo !== "scheda") return {};
  const { sagra } = scheda;
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
  const scheda = await getScheda(slug);

  if (!scheda) notFound();
  // Doppioni e id: un solo URL per sagra, gli altri indirizzi passano la
  // mano (e i link che hanno accumulato) alla scheda.
  if (scheda.tipo === "redirect") permanentRedirect(`/sagra/${scheda.slug}`);

  const { sagra, edizioni } = scheda;
  const programma = await getProgrammaSagra(sagra.id);
  const vicine = sagreVicine(sagra, await getSagreAbruzzo());
  const provincia = PROVINCE.find((p) => p.sigla === sagra.provincia?.toUpperCase()) ?? null;

  const mese = sagra.data_inizio ? meseDi(sagra.data_inizio) : null;
  const mercatino = eMercatino(sagra);
  const conclusa = eConclusa(sagra);
  const locandina = locandinaProxyUrl(sagra, "detail");
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sagra.lat},${sagra.leng}`;

  // La descrizione vera dell'evento. Quando manca resta il riassunto dai dati,
  // che però è quasi identico per tutte le sagre: come testo di pagina vale poco.
  const descrizione = paragrafi(sagra);

  const jsonLd = eventJsonLd(sagra, `${SITE_URL}/sagra/${sagra.slug}`);
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
                {mercatino ? "Mercatino" : sagra.category?.toLowerCase() ?? "sagra"}
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
                  {mercatino
                    ? `I mercatini si sono svolti ${formatIntervallo(sagra)}.`
                    : sagra.category?.toLowerCase() === "evento"
                      ? `L'evento si è svolto ${formatIntervallo(sagra)}.`
                      : `La sagra si è svolta ${formatIntervallo(sagra)}.`}{" "}
                  Di solito torna ogni anno: intanto guarda{" "}
                  <Link
                    href={mercatino ? MERCATINI_PATH : "/sagre/abruzzo"}
                    className="font-bold text-primary-ink hover:underline"
                  >
                    {mercatino ? "il calendario dei mercatini" : "le sagre in programma adesso"}
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

        {/* Edizioni: la scheda è una sola per sagra, anno dopo anno */}
        {edizioni.length > 1 ? (
          <section className="mt-14" aria-labelledby="edizioni-title">
            <h2 id="edizioni-title" className="font-title text-2xl sm:text-3xl">
              Le edizioni di {sagra.nome_sagra}
            </h2>
            <ul className="mt-4 space-y-2 text-muted">
              {[...edizioni].reverse().map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-2">
                  <span className="font-bold text-ink">
                    {e.data_inizio ? e.data_inizio.getFullYear() : "Data da confermare"}
                  </span>
                  <span>
                    {formatIntervallo(e)}
                    {e.citta && e.citta !== sagra.citta ? `, ${e.citta}` : ""}
                    {e.id === sagra.id ? " (questa edizione)" : eConclusa(e) ? " (conclusa)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Le sagre in programma più vicine: il motivo per restare anche
            quando l'edizione cercata è già passata */}
        {vicine.length > 0 ? (
          <section className="mt-14" aria-labelledby="vicine-title">
            <h2 id="vicine-title" className="font-title text-2xl sm:text-3xl">
              {conclusa
                ? `Le prossime ${mercatino ? "date" : "sagre"} vicino a ${sagra.citta ?? "qui"}`
                : `Altre ${mercatino ? "date" : "sagre"} in programma vicino a ${sagra.citta ?? "qui"}`}
            </h2>
            <p className="mt-2 text-muted">
              {mercatino ? "I mercatini" : "Le sagre e le feste"} in calendario più
              vicine, con la distanza in linea d&apos;aria da {sagra.citta ?? "questo evento"}.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vicine.map((s) => (
                <div key={s.slug} className="relative">
                  <EventCard sagra={s} />
                  <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold text-ink shadow-xs">
                    {s.km < 1 ? "meno di 1 km" : `${Math.round(s.km)} km`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="mt-10 flex flex-wrap gap-3" aria-label="Altri calendari">
          {provincia ? (
            <Link
              href={`/sagre/abruzzo/provincia/${provincia.slug}`}
              className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
            >
              Sagre in provincia di {provincia.nome}
            </Link>
          ) : null}
          {mese ? (
            <Link
              href={`/sagre/abruzzo/${mese.slug}`}
              className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
            >
              Sagre di {mese.nome} {mese.anno}
            </Link>
          ) : null}
          <Link
            href="/sagre/abruzzo/questo-weekend"
            className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
          >
            Sagre di questo weekend
          </Link>
        </nav>

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
