import { CalendarDays } from "lucide-react";
import type { GiornoProgramma } from "../../lib/programma";

function formattaGiorno(giorno: Date): string {
  const testo = giorno.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

function formattaOra(ora: string | null): string | null {
  if (!ora) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(ora);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : ora;
}

export default function ProgrammaSagra({
  giorni,
}: {
  giorni: GiornoProgramma[];
}) {
  if (giorni.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="programma-sagra">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary-ink">
          <CalendarDays size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-primary-ink">GIORNO PER GIORNO</p>
          <h2 id="programma-sagra" className="font-title text-3xl">
            Programma
          </h2>
        </div>
      </div>

      <div className="mt-7 space-y-7">
        {giorni.map((giorno) => (
          <section key={giorno.giorno.toISOString()}>
            <h3 className="font-title text-xl">{formattaGiorno(giorno.giorno)}</h3>
            <ol className="mt-3 overflow-hidden rounded-3xl bg-surface px-4 py-2 sm:px-6">
              {giorno.attivita.map((attivita) => {
                const inizio = formattaOra(attivita.ora_inizio);
                const fine = formattaOra(attivita.ora_fine);

                return (
                  <li
                    key={attivita.id}
                    className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-beige py-4 last:border-b-0"
                  >
                    <div className="flex flex-col items-end pt-0.5 text-sm font-bold">
                      <time className="text-primary-ink">{inizio ?? "—"}</time>
                      {fine ? <time className="text-muted">{fine}</time> : null}
                    </div>
                    <div>
                      <p className="font-bold leading-snug">{attivita.titolo}</p>
                      {attivita.descrizione ? (
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          {attivita.descrizione}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
