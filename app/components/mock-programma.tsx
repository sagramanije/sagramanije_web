import { ArrowLeft } from "lucide-react";
import { PROGRAMMA_DEMO, SAGRA_DETTAGLIO } from "../data";
import { StatusBar } from "./phone-frame";

// Ricalca src/app/sagra/[id]/attivita.tsx: colonna degli orari a sinistra e
// una card bianca per ogni giornata.
export default function MockProgramma() {
  return (
    <div className="flex h-full flex-col">
      <StatusBar />

      <div className="flex items-center gap-3 px-5 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
          <ArrowLeft size={18} />
        </span>
        <div>
          <h3 className="font-title text-[22px] leading-tight">Programma</h3>
          <p className="text-[11px] text-muted">{SAGRA_DETTAGLIO.nome}</p>
        </div>
      </div>

      {/* l'ultima giornata resta tagliata dal bordo: la lista continua */}
      <div className="flex-1 overflow-hidden px-5">
        {PROGRAMMA_DEMO.map((giorno) => (
          <section key={giorno.giorno} className="mt-5">
            <h4 className="font-title text-lg">{giorno.giorno}</h4>
            <div className="mt-3 rounded-3xl bg-surface py-2">
              {giorno.attivita.map((a) => (
                <div key={a.titolo} className="flex gap-3 px-2 py-2">
                  <div className="flex w-12 shrink-0 flex-col items-end pt-0.5">
                    <span className="text-[11px] font-bold text-primary-ink">
                      {a.inizio}
                    </span>
                    {a.fine ? (
                      <span className="text-[11px] font-bold text-muted">
                        {a.fine}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold leading-snug">
                      {a.titolo}
                    </p>
                    {a.descrizione ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-muted">
                        {a.descrizione}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
