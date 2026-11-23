import { Clock, ExternalLink, MapPin, Navigation, Snowflake, Sun } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import EventCard from "../../components/event-card";
import SiteFooter from "../../components/site-footer";
import SiteNav from "../../components/site-nav";
import ApertureMercatino from "../../components/aperture-mercatino";
import { contenutoScheda, mesiAperture } from "../../../lib/scheda-evento";
import "./scheda.css";
import ProgrammaSagra from "../../components/programma-sagra";
import SagraMeteo from "../../components/sagra-meteo";
import CarovanaWhatsApp from "../../components/carovana-whatsapp";
import SagraBottomBar from "../../components/sagra-bottom-bar";
import CartolinaEvento from "../../components/cartolina-evento";
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
  PROVINCE,
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

  const contenuto = contenutoScheda(sagra.descrizione, mercatino);
  const mesi = mesiAperture(contenuto.giorni);
  const oggi = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const meseIniziale = (contenuto.giorni.find(g => g >= oggi) ?? contenuto.giorni[0])?.slice(0, 7);
  const periodo = formatIntervallo(sagra);
  const luogo = [sagra.citta, provincia?.nome && provincia.nome !== sagra.citta ? provincia.nome : null]
    .filter(Boolean).join(", ") || sagra.provincia || "Abruzzo";
  const calendario = mercatino ? MERCATINI_PATH : "/sagre/abruzzo";
  const nomeCalendario = mercatino ? "Mercatini di Natale in Abruzzo" : "Sagre in Abruzzo";
  const percorso = [{ nome: nomeCalendario, href: calendario }];
  if (mese && !mercatino) {
    percorso.push({ nome: `${mese.nome[0].toUpperCase()}${mese.nome.slice(1)} ${mese.anno}`, href: `/sagre/abruzzo/${mese.slug}` });
  }
  const titolo = sagra.nome_sagra.match(mercatino
    ? /^(.*?mercatin[oi] di natale\s+)(.+)$/i
    : /^(.*?\bsagra\s+(?:dell['’]|dell[aeio]\s+|de[il]\s+|degli\s+|di\s+))(.+)$/i);
  const jsonLd = eventJsonLd(sagra, `${SITE_URL}/sagra/${sagra.slug}`);
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sagramanije", item: SITE_URL },
      ...percorso.map((voce, i) => ({ "@type": "ListItem", position: i + 2, name: voce.nome, item: SITE_URL + voce.href })),
      { "@type": "ListItem", position: percorso.length + 2, name: sagra.nome_sagra },
    ],
  };

  return (
    <div className="scheda-evento" data-evento={mercatino ? "mercatino" : "sagra"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }}
      />
      <SiteNav />

      <main className="evento-main">
        <nav className="evento-percorso" aria-label="Percorso">
          {percorso.map(voce => <Link key={voce.href} href={voce.href}>{voce.nome}</Link>)}
        </nav>
        <header className="evento-copertina">
          <div className="evento-testo">
            <p className="evento-data">
              {mercatino ? <Snowflake size={17} aria-hidden /> : <Sun size={17} aria-hidden />}
              {periodo}{conclusa && " · Edizione conclusa"}
            </p>
            <h1 className="evento-titolo">
              {titolo ? <>{titolo[1]}<em>{titolo[2]}</em></> : sagra.nome_sagra}
            </h1>
            <div className="evento-coordinate">
              <span><MapPin size={17} aria-hidden />{luogo}</span>
              {sagra.ora_inizio && <span><Clock size={17} aria-hidden />Dalle {sagra.ora_inizio}</span>}
            </div>
            {contenuto.introduzione && <p className="evento-intro">{contenuto.introduzione}</p>}
            <div className={conclusa ? "block" : "hidden lg:block"}>
              {conclusa ? (
                <Link className="pulsante-guida" href={calendario}>
                  {mercatino ? "Scopri i prossimi mercatini" : "Scopri le prossime sagre"}
                </Link>
              ) : (
                <a className="pulsante-guida" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation size={17} aria-hidden /> Come arrivare
                </a>
              )}
            </div>
          </div>
          <CartolinaEvento key={locandina} locandina={locandina} nome={sagra.nome_sagra} mercatino={mercatino} />
        </header>

        <div className="evento-articolo">
          {meseIniziale && <ApertureMercatino mesi={mesi} meseIniziale={meseIniziale} />}
          {mercatino && !mesi.length && sagra.data_inizio && sagra.data_fine && sagra.data_fine > sagra.data_inizio && (
            <section className="evento-riga">
              <h2 className="evento-h2">Periodo del mercatino</h2>
              <p className="evento-prosa">{periodo}. Per le singole aperture consulta il programma dell’organizzatore.</p>
            </section>
          )}
          {contenuto.specialita.length > 0 && <section className="evento-riga">
            <h2 className="evento-h2">Cosa si mangia</h2>
            <div className="evento-prosa">{contenuto.specialita.map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>}
          <ProgrammaSagra giorni={programma} />
          {contenuto.paragrafi.length > 0 && <section className="evento-riga">
            <h2 className="evento-h2">{mercatino ? "Tra le bancarelle" : "La festa in piazza"}</h2>
            <div className="evento-prosa">{contenuto.paragrafi.map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>}
          {(sagra.link_pagina_ufficiale || contenuto.fonti.length > 0) && <div className="evento-fonti">
            {sagra.link_pagina_ufficiale && <a className="evento-link" href={sagra.link_pagina_ufficiale} rel="noopener noreferrer nofollow" target="_blank">
              <ExternalLink size={16} aria-hidden /> Pagina dell’evento
            </a>}
            {contenuto.fonti.map((url, i) => <a className="evento-link" key={url} href={url} rel="noopener noreferrer nofollow" target="_blank">
              Fonte {i + 1}<ExternalLink size={14} aria-hidden />
            </a>)}
          </div>}
        </div>

        {!conclusa && <aside className="evento-organizza" aria-label="Organizza la visita">
          <SagraMeteo lat={sagra.lat} leng={sagra.leng} citta={sagra.citta} nomeSagra={sagra.nome_sagra}
            dataInizioStr={sagra.data_inizio ? toISO(sagra.data_inizio) : null}
            dataFineStr={sagra.data_fine ? toISO(sagra.data_fine) : null} oraInizio={sagra.ora_inizio} className="mt-0" />
          <CarovanaWhatsApp nomeSagra={sagra.nome_sagra} citta={sagra.citta} provincia={sagra.provincia}
            dataFormatted={periodo} url={`${SITE_URL}/sagra/${sagra.slug}`} className="mt-0" />
        </aside>}

        {/* Edizioni: la scheda è una sola per sagra, anno dopo anno */}
        {edizioni.length > 1 ? (
          <section className="mt-14" aria-labelledby="edizioni-title">
            <h2 id="edizioni-title" className="font-title text-titolo-sezione">
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
            <h2 id="vicine-title" className="font-title text-titolo-sezione">
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

        <nav className="mt-10 flex flex-wrap items-center gap-3" aria-label="Altri calendari">
          {mercatino && <Link className="evento-link" href={MERCATINI_PATH}>Calendario dei mercatini</Link>}
          {!mercatino && provincia ? (
            <Link
              href={`/sagre/abruzzo/provincia/${provincia.slug}`}
              className="rounded-full bg-beige px-4 py-2 text-sm font-bold hover:bg-primary hover:text-white"
            >
              Sagre in provincia di {provincia.nome}
            </Link>
          ) : null}
          {!mercatino && mese ? (
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
          <Link href="/scarica" className="evento-link">Esplora la mappa nell’app</Link>
        </nav>

        {/* Barra fissa in basso su mobile (per condividere su WhatsApp e navigare al volo) */}
        {!conclusa && <SagraBottomBar
          nomeSagra={sagra.nome_sagra}
          citta={sagra.citta}
          provincia={sagra.provincia}
          dataFormatted={periodo}
          url={`${SITE_URL}/sagra/${sagra.slug}`}
          mapsUrl={mapsUrl}
        />}
      </main>

      <SiteFooter />
    </div>
  );
}
