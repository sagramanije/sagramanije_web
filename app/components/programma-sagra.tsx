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
    <section className="evento-riga" aria-labelledby="programma-sagra">
      <h2 id="programma-sagra" className="evento-h2">Il programma</h2>

      <div className="min-w-0 space-y-7">
        {giorni.map((giorno) => (
          <section key={giorno.giorno.toISOString()}>
            <h3 className="font-title text-xl">{formattaGiorno(giorno.giorno)}</h3>
            <ol className="mt-3 border-t border-beige">
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
