import type { Metadata } from "next";
import { OG_DEFAULTS, SITE_URL } from "../lib/site";
import Copertina from "./components/copertina";
import { temaNatalizio } from "../lib/modalita-natale";
import SiteFooter from "./components/site-footer";
import SiteNav from "./components/site-nav";
import StoreBadges from "./components/store-badges";
import { EMAIL } from "./data";
import { Analytics } from "@vercel/analytics/next";
import ProssimeSagre from "./components/prossime-sagre";

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

        <section id="come-funziona" className="mx-auto max-w-6xl scroll-mt-28 px-5 pb-16 sm:px-6">
          <div className="grid gap-8 rounded-3xl border border-beige bg-surface p-6 sm:p-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-title text-2xl font-bold">Porta il calendario con te</h2>
              <p className="mt-2 max-w-md text-muted">Nell’app puoi vedere le feste sulla mappa e ordinarle per distanza dalla tua posizione.</p>
              <StoreBadges className="mt-5" />
            </div>
            <div id="chi-siamo" className="border-t border-beige pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
              <h2 className="font-title text-2xl font-bold">Manca una festa?</h2>
              <p className="mt-2 text-muted">Raccogliamo locandine e programmi dai paesi d’Abruzzo. Se hai una data da aggiungere, mandaci la locandina.</p>
              <a href={REPORT_MAILTO} className="mt-4 inline-block font-bold text-primary-ink underline underline-offset-4">Segnala un appuntamento</a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
