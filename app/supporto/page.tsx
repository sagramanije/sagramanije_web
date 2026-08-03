import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  LocateFixed,
  Mail,
  Map,
  Smartphone,
} from "lucide-react";
import SiteFooter from "../components/site-footer";
import SiteNav from "../components/site-nav";
import { EMAIL } from "../data";

export const metadata: Metadata = {
  title: "Supporto",
  description:
    "Hai bisogno di aiuto con Sagramanije? Contatta l'assistenza o consulta le risposte ai problemi più comuni.",
  alternates: { canonical: "/supporto" },
};

const SUPPORT_MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(
  "Richiesta di supporto — Sagramanije",
)}&body=${encodeURIComponent(
  "Ciao,\n\nho bisogno di aiuto con Sagramanije.\n\nDescrizione del problema:\n\n\nDispositivo e versione del sistema operativo:\n\nVersione dell'app:\n",
)}`;

const helpItems = [
  {
    icon: LocateFixed,
    title: "La posizione non funziona",
    description:
      "Controlla nelle impostazioni del telefono che Sagramanije possa usare la posizione mentre utilizzi l’app. Puoi continuare a consultare le sagre anche senza concedere il permesso.",
  },
  {
    icon: Map,
    title: "Una sagra manca o contiene un errore",
    description:
      "Scrivici indicando il nome dell’evento, il comune e l’informazione da aggiungere o correggere. Se puoi, allega anche la locandina ufficiale.",
  },
  {
    icon: Smartphone,
    title: "L’app non si apre o si blocca",
    description:
      "Chiudi e riapri l’app, verifica la connessione e installa l’ultimo aggiornamento disponibile. Se il problema continua, comunicaci modello del telefono, sistema operativo e versione dell’app.",
  },
];

export default function SupportoPage() {
  return (
    <>
      <SiteNav />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            Torna alla home
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_20rem]">
            <div>
              <p className="flex items-center gap-2 font-semibold text-primary-ink">
                <CircleHelp size={19} strokeWidth={2.5} />
                Assistenza Sagramanije
              </p>
              <h1 className="mt-3 font-title text-4xl leading-[1.08] tracking-tight sm:text-5xl">
                Come possiamo aiutarti?
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
                Per domande, problemi tecnici o segnalazioni relative all’app,
                scrivici. Leggiamo personalmente ogni richiesta e ti
                risponderemo appena possibile.
              </p>
            </div>

            <div className="rounded-3xl bg-surface p-6 shadow-[0_16px_50px_rgba(75,45,20,0.08)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3c87f722] text-blue-ink">
                <Mail size={24} strokeWidth={2} />
              </span>
              <h2 className="mt-5 font-title text-xl">Contatta il supporto</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Il modo più semplice per ricevere assistenza è inviarci
                un’email.
              </p>
              <a
                href={SUPPORT_MAILTO}
                className="mt-5 flex items-center justify-between gap-3 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Scrivici ora
                <ChevronRight size={18} />
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="mt-4 block break-all text-center text-sm font-semibold text-blue-ink hover:underline"
              >
                {EMAIL}
              </a>
            </div>
          </div>

          <section className="mt-16">
            <h2 className="font-title text-3xl tracking-tight sm:text-4xl">
              Soluzioni rapide
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Prova questi passaggi oppure contattaci se hai ancora bisogno di
              aiuto.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {helpItems.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-3xl bg-surface p-6"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ec5a3518] text-primary-ink">
                      <Icon size={24} strokeWidth={1.9} />
                    </span>
                    <h3 className="mt-5 font-title text-xl leading-tight">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-16 rounded-[2rem] bg-beige/70 p-6 sm:p-8">
            <h2 className="font-title text-2xl tracking-tight">
              Cosa indicare nella richiesta
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Per aiutarci a capire e risolvere il problema più velocemente,
              descrivi cosa è successo e, se possibile, includi:
            </p>
            <ul className="mt-5 grid list-disc gap-3 pl-5 text-sm leading-relaxed text-muted marker:text-primary sm:grid-cols-2">
              <li>modello del telefono;</li>
              <li>versione di iOS o Android;</li>
              <li>versione dell’app installata;</li>
              <li>eventuali schermate del problema.</li>
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Per informazioni su come trattiamo i dati personali, consulta la{" "}
              <Link
                href="/privacy"
                className="font-semibold text-blue-ink hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
