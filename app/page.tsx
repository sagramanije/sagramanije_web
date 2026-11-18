import { ChevronRight, Info, MapPin, PlusCircle, Star } from "lucide-react";
import type { Metadata } from "next";
import { OG_DEFAULTS, SITE_URL } from "../lib/site";
import Copertina from "./components/copertina";
import { temaNatalizio } from "../lib/modalita-natale";
import FeatureCard from "./components/feature-card";
import MockDetail from "./components/mock-detail";
import MockList from "./components/mock-list";
import MockMap from "./components/mock-map";
import MockProgramma from "./components/mock-programma";
import PhoneFrame from "./components/phone-frame";
import SiteFooter from "./components/site-footer";
import SiteNav from "./components/site-nav";
import StoreBadges from "./components/store-badges";
import { EMAIL } from "./data";
import { Analytics } from "@vercel/analytics/next";
import ProssimeSagre from "./components/prossime-sagre";
import SezioneRoulette from "./components/sezione-roulette";

// La sezione "prossime sagre" legge l'API: rigenera la home ogni 6 ore.
export const revalidate = 21_600;

export async function generateMetadata(): Promise<Metadata> {
  const natale = await temaNatalizio();
  const title = natale ? "Mercatini di Natale e sagre in Abruzzo" : "Sagre e feste di paese in Abruzzo";
  const description = natale
    ? "Scopri i mercatini di Natale e le sagre in Abruzzo. Consulta date, località e programmi per organizzare una visita nei borghi abruzzesi."
    : "Trova le sagre e le feste di paese in Abruzzo. Sfoglia il calendario per mese e provincia o scopri gli appuntamenti di questo weekend.";
  return {
    title: { absolute: `${title} | Sagramanije` }, description,
    alternates: { canonical: "/" },
    openGraph: { ...OG_DEFAULTS, title, description, url: "/" },
  };
}

const REPORT_MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(
  "Segnalazione sagra",
)}`;

// Entità del brand: aiuta Google a collegare sito, nome e app.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sagramanije",
  url: SITE_URL,
  email: EMAIL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Il calendario di sagre, feste di paese e mercatini in Abruzzo.",
  areaServed: { "@type": "AdministrativeArea", name: "Abruzzo" },
};

export default async function Home() {
  const natale = await temaNatalizio();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <Analytics />
      <SiteNav />

      <main id="top" className="flex-1">
        <Copertina natale={natale} />
        <ProssimeSagre />

        {/* Come funziona */}
        <section id="come-funziona" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-title text-3xl sm:text-4xl">Come funziona</h2>
          <p className="mt-3 max-w-xl text-muted">
            Apri l&apos;app, dai il consenso alla posizione e vedi cosa succede
            stasera intorno a te. In lista o sulla mappa.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <FeatureCard
              icon={MapPin}
              color="#ec5a35"
              title="Tutt l'Abbruzz, in tempo reale"
              description="Date, orari e luoghi aggiornati direttamente dalle pro loco. Filtra per distanza e trova solo quello che ti resta comodo."
            />
            <FeatureCard
              icon={Star}
              color="#3f9d6b"
              title="Il gusto della tradizione"
              description="Scegliamo solo eventi autentici, niente turismo di plastica. Sagre di paese, feste patronali, rievocazioni storiche."
            />
            <FeatureCard
              icon={Info}
              color="#3c87f7"
              title="Sempre gratis"
              description="Cercare e scoprire sagre non costa nulla, per tutti. Nessun abbonamento, nessuna registrazione."
            />
          </div>
        </section>

        {/* Tocc' a 'ndà: La Roulette della Sagra */}
        <SezioneRoulette />

        {/* Schermate */}
        <section id="schermate" className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-title text-3xl sm:text-4xl">Le schermate</h2>
            <p className="mt-3 max-w-xl text-muted">
              Filtra le sagre per periodo e distanza, esplora la mappa, apri le
              locandine e consulta il programma ora per ora.
            </p>
          </div>

          {/* 4 telefoni = 1296px + padding: sotto 2xl la fila scorre, quindi
              niente justify-center (taglierebbe il primo telefono) */}
          <div className="mt-12 flex snap-x snap-mandatory gap-8 overflow-x-auto px-6 pb-6 2xl:justify-center">
            <PhoneFrame label="Lista" className="snap-center">
              <MockList />
            </PhoneFrame>
            <PhoneFrame label="Mappa" className="snap-center">
              <MockMap />
            </PhoneFrame>
            <PhoneFrame label="Dettaglio" className="snap-center">
              <MockDetail />
            </PhoneFrame>
            <PhoneFrame label="Programma" className="snap-center">
              <MockProgramma />
            </PhoneFrame>
          </div>
        </section>

        {/* Chi siamo */}
        <section id="chi-siamo" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-title text-3xl sm:text-4xl">Chi siamo</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                Setacciamo il web a caccia di sagre abruzzesi: locandine appese
                nei bar, pagine delle pro loco, volantini fotografati male. Le
                mettiamo tutte nello stesso posto, con la data giusta e il pin
                sulla mappa.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                Ne troviamo di nuove ogni settimana, e ogni tanto qualcuna ci
                sfugge. Per quello c&apos;è la segnalazione.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <h3 className="font-title text-2xl">Contribuisci</h3>
              <a
                href={REPORT_MAILTO}
                className="flex items-center gap-4 rounded-3xl bg-surface p-5 transition-transform hover:-translate-y-0.5"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "#ec5a3522" }}
                >
                  <PlusCircle size={26} strokeWidth={1.75} className="text-primary" />
                </span>
                <span className="flex-1">
                  <span className="block font-title text-lg">
                    Segnalaci una sagra
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Manca una sagra dalla mappa? Aiutaci ad aggiungerla.
                  </span>
                </span>
                <ChevronRight size={22} className="shrink-0 text-muted" />
              </a>

              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-4 rounded-3xl bg-surface p-5 transition-transform hover:-translate-y-0.5"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "#3c87f722" }}
                >
                  <Info size={26} strokeWidth={1.75} className="text-blue" />
                </span>
                <span className="flex-1">
                  <span className="block font-title text-lg">Scrivici</span>
                  <span className="mt-1 block text-sm text-muted">{EMAIL}</span>
                </span>
                <ChevronRight size={22} className="shrink-0 text-muted" />
              </a>
            </div>
          </div>
        </section>

        {/* CTA finale */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-col items-center gap-8 rounded-[2.5rem] bg-primary px-8 py-16 text-center text-white">
            <h2 className="max-w-2xl font-title text-3xl leading-tight sm:text-4xl">
              La prossima sagra è più vicina di quanto pensi
            </h2>
            <StoreBadges className="justify-center" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
