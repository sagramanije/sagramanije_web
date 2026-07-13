import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "../components/site-footer";
import SiteNav from "../components/site-nav";
import { EMAIL, PRIVACY_OWNER, PRIVACY_UPDATED } from "../data";

export const metadata: Metadata = {
  title: "Privacy Policy — Sagramanije",
  description:
    "Come Sagramanije tratta i tuoi dati: posizione usata solo per cercare le sagre vicine, nessun account, nessuna profilazione.",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-title text-2xl tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            Torna alla home
          </Link>

          <h1 className="mt-6 font-title text-4xl leading-[1.1] tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Questa informativa spiega quali dati tratta{" "}
            <strong className="font-bold text-ink">Sagramanije</strong> —
            l&apos;app e questo sito — perché lo fa e quali diritti hai. È resa
            ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679
            (GDPR).
          </p>
          <p className="mt-2 text-sm text-warm">
            Ultimo aggiornamento: {PRIVACY_UPDATED}
          </p>

          {/* Riassunto: la parte che leggerà davvero la maggior parte delle persone. */}
          <div className="mt-10 rounded-3xl bg-surface p-6 sm:p-8">
            <h2 className="font-title text-xl tracking-tight">In breve</h2>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted marker:text-primary">
              <li>
                Non ti chiediamo di registrarti: l&apos;app non ha account, né
                nome, né email.
              </li>
              <li>
                La posizione è <strong className="text-ink">facoltativa</strong>{" "}
                e serve solo a cercare le sagre più vicine a te. La usiamo mentre
                usi l&apos;app, mai in background, e non conserviamo lo storico
                dei tuoi spostamenti.
              </li>
              <li>
                Non facciamo profilazione, non mostriamo pubblicità e non
                vendiamo dati a nessuno.
              </li>
              <li>
                L&apos;app non usa cookie. Il sito usa statistiche aggregate e
                senza cookie.
              </li>
            </ul>
          </div>

          <div className="mt-14 flex flex-col gap-12">
            <Section id="titolare" title="1. Contitolari del trattamento">
              <p>
                Sagramanije è un progetto di {PRIVACY_OWNER}, che determinano
                insieme finalità e modalità del trattamento e ne sono quindi
                contitolari ai sensi dell&apos;art. 26 GDPR. Rispondono in
                solido delle richieste che ricevono: puoi rivolgerti
                indifferentemente all&apos;uno o all&apos;altro scrivendo a{" "}
                <a
                  href={`mailto:${EMAIL}`}
                  className="font-semibold text-blue-ink hover:underline"
                >
                  {EMAIL}
                </a>
                , che è il punto di contatto unico per qualsiasi domanda su
                questa informativa e per esercitare i tuoi diritti.
              </p>
            </Section>

            <Section id="dati" title="2. Quali dati trattiamo">
              <p>
                <strong className="text-ink">Posizione geografica.</strong> Se
                dai il consenso al sistema operativo, l&apos;app legge la tua
                posizione approssimata o precisa e la invia ai nostri server per
                ottenere l&apos;elenco delle sagre entro il raggio che hai
                scelto. Le coordinate vengono usate per rispondere a quella
                singola richiesta: non le associamo a un profilo, non le
                colleghiamo a un&apos;identità e non teniamo la cronologia delle
                posizioni. Il permesso è richiesto solo &quot;quando l&apos;app è
                in uso&quot;: non ti localizziamo mai in background. Puoi
                rifiutare o revocare il permesso in ogni momento dalle
                impostazioni del telefono; l&apos;app continua a funzionare e
                mostra comunque le sagre, semplicemente senza ordinarle per
                distanza.
              </p>
              <p>
                <strong className="text-ink">Città e provincia.</strong> Per
                mostrarti dove ti trovi, l&apos;app converte le coordinate nel
                nome del comune usando il servizio di geocodifica del tuo sistema
                operativo (Apple o Google). Il risultato resta sul dispositivo.
              </p>
              <p>
                <strong className="text-ink">
                  Dati tecnici di connessione.
                </strong>{" "}
                Come ogni servizio che passa da internet, i nostri server e i
                fornitori che usiamo registrano nei log tecnici l&apos;indirizzo
                IP e i dati della richiesta (data, ora, risorsa richiesta). Ci
                servono solo per far funzionare il servizio, diagnosticare
                malfunzionamenti e difenderci da abusi.
              </p>
              <p>
                <strong className="text-ink">Segnalazioni di sagre.</strong> Se
                usi la funzione &quot;Segnala una sagra&quot;, l&apos;app apre la
                tua app di posta con un messaggio precompilato: sei tu a
                inviarlo. Riceviamo quindi il tuo indirizzo email e quello che
                hai scritto (nome della sagra, indirizzo, descrizione). Nessun
                campo è obbligatorio.
              </p>
              <p>
                <strong className="text-ink">
                  Dati salvati sul tuo dispositivo.
                </strong>{" "}
                L&apos;app memorizza in locale una sola informazione tecnica: se
                hai già visto la schermata introduttiva. Non è un dato personale,
                non lascia il telefono e sparisce disinstallando l&apos;app.
              </p>
            </Section>

            <Section id="finalita" title="3. Perché li trattiamo">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-ink">
                      <th className="py-3 pr-4 font-semibold">Dato</th>
                      <th className="py-3 pr-4 font-semibold">Finalità</th>
                      <th className="py-3 font-semibold">Base giuridica</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/5">
                      <td className="py-3 pr-4">Posizione</td>
                      <td className="py-3 pr-4">
                        Mostrarti le sagre vicine e la distanza
                      </td>
                      <td className="py-3">
                        Consenso, che dai al sistema operativo (art. 6.1.a GDPR)
                      </td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-3 pr-4">Dati tecnici e log</td>
                      <td className="py-3 pr-4">
                        Erogare il servizio, sicurezza, diagnostica
                      </td>
                      <td className="py-3">
                        Legittimo interesse a un servizio funzionante e sicuro
                        (art. 6.1.f GDPR)
                      </td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-3 pr-4">Email di segnalazione</td>
                      <td className="py-3 pr-4">
                        Valutare la segnalazione e risponderti
                      </td>
                      <td className="py-3">
                        Legittimo interesse a gestire le richieste che ci invii
                        (art. 6.1.f GDPR)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Statistiche del sito</td>
                      <td className="py-3 pr-4">
                        Capire quante persone visitano il sito, in forma
                        aggregata
                      </td>
                      <td className="py-3">
                        Legittimo interesse a misurare l&apos;audience senza
                        tracciamento (art. 6.1.f GDPR)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="terze-parti" title="4. Servizi di terze parti">
              <p>
                Per funzionare l&apos;app e il sito si appoggiano a servizi
                esterni. Ognuno di essi, per il solo fatto di ricevere una
                richiesta, può vedere il tuo indirizzo IP.
              </p>
              <ul className="flex list-disc flex-col gap-3 pl-5 marker:text-primary">
                <li>
                  <strong className="text-ink">OpenFreeMap</strong> — fornisce le
                  mappe che vedi nell&apos;app. Riceve le richieste dei riquadri
                  di mappa che stai guardando.
                </li>
                <li>
                  <strong className="text-ink">Apple / Google</strong> — i
                  servizi di geocodifica del sistema operativo convertono le
                  coordinate in nome del comune. Quando tocchi &quot;Portami
                  lì&quot;, si apre Apple Maps o Google Maps: da quel momento vale
                  la loro informativa privacy.
                </li>
                <li>
                  <strong className="text-ink">Google (Gmail)</strong> — è il
                  provider della casella {EMAIL} su cui riceviamo le
                  segnalazioni.
                </li>
                <li>
                  <strong className="text-ink">Vercel</strong> — ospita questo
                  sito e ne fornisce le statistiche di traffico, aggregate e
                  senza cookie né identificatori persistenti.
                </li>
              </ul>
              <p>
                Alcuni di questi fornitori possono trattare dati fuori
                dall&apos;Unione Europea; in tal caso il trasferimento avviene
                sulla base delle garanzie previste dal Capo V del GDPR (decisioni
                di adeguatezza o clausole contrattuali standard).
              </p>
            </Section>

            <Section id="conservazione" title="5. Per quanto tempo li teniamo">
              <p>
                Le coordinate inviate per una ricerca non vengono conservate in
                una banca dati: esauriscono la loro funzione con la risposta. I
                log tecnici sono conservati per il tempo strettamente necessario
                a sicurezza e diagnostica, e comunque non oltre 12 mesi. Le email
                di segnalazione restano nella nostra casella finché servono a
                gestire la segnalazione e a tenere memoria delle sagre aggiunte;
                puoi chiederne la cancellazione quando vuoi.
              </p>
            </Section>

            <Section id="diritti" title="6. I tuoi diritti">
              <p>
                Puoi chiederci in ogni momento l&apos;accesso ai tuoi dati, la
                rettifica, la cancellazione, la limitazione o la portabilità, e
                puoi opporti a un trattamento fondato sul legittimo interesse
                (artt. 15-22 GDPR). Dove il trattamento si basa sul consenso —
                come per la posizione — puoi revocarlo quando vuoi dalle
                impostazioni del telefono, senza che questo pregiudichi la
                liceità di quanto fatto prima.
              </p>
              <p>
                Ti rispondiamo scrivendo a{" "}
                <a
                  href={`mailto:${EMAIL}`}
                  className="font-semibold text-blue-ink hover:underline"
                >
                  {EMAIL}
                </a>
                . Tieni presente che, non avendo account, spesso non siamo in
                grado di ricollegare un dato a te: in quel caso potremmo non
                poter dare seguito alla richiesta (art. 11 GDPR). Se ritieni che
                il trattamento violi il GDPR puoi proporre reclamo al Garante per
                la protezione dei dati personali (
                <a
                  href="https://www.garanteprivacy.it"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-ink hover:underline"
                >
                  garanteprivacy.it
                </a>
                ).
              </p>
            </Section>

            <Section id="minori" title="7. Minori">
              <p>
                L&apos;app è rivolta a un pubblico generale e non raccoglie
                consapevolmente dati di minori di 14 anni. Non essendoci
                registrazione, non trattiamo dati che identifichino
                l&apos;età degli utenti.
              </p>
            </Section>

            <Section id="cookie" title="8. Cookie">
              <p>
                L&apos;app non usa cookie. Questo sito non usa cookie di
                profilazione né di terze parti: le statistiche di visita sono
                aggregate e non impiegano identificatori persistenti, quindi non
                è richiesto alcun banner di consenso.
              </p>
            </Section>

            <Section id="modifiche" title="9. Modifiche a questa informativa">
              <p>
                Se cambieremo il modo in cui trattiamo i dati aggiorneremo questa
                pagina e la data di ultimo aggiornamento in cima. Se le modifiche
                saranno rilevanti te lo segnaleremo dentro l&apos;app.
              </p>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
