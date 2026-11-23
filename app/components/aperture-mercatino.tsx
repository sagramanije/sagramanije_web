"use client";

import { useState } from "react";
import type { MeseAperture } from "../../lib/scheda-evento";

type Props = { mesi: MeseAperture[]; meseIniziale: string };

export default function ApertureMercatino({ mesi, meseIniziale }: Props) {
  const [chiave, scegliMese] = useState(meseIniziale);
  const attivo = mesi.find(mese => mese.chiave === chiave) ?? mesi[0];
  return (
    <section className="evento-aperture" aria-labelledby="titolo-aperture">
      <div className="evento-intestazione-aperture">
        <h2 id="titolo-aperture" className="evento-h2">Giorni di apertura</h2>
        {mesi.length > 1 && (
          <div className="evento-mesi" role="group" aria-label="Scegli il mese">
            {mesi.map(mese => (
              <button key={mese.chiave} type="button" aria-controls="giorni-aperture"
                aria-label={mese.mese + " " + mese.anno}
                aria-pressed={mese.chiave === attivo.chiave} onClick={() => scegliMese(mese.chiave)}>
                <span className="hidden sm:inline">{mese.mese} {mese.anno}</span>
                <span className="sm:hidden">{mese.mese.slice(0, 3)} ’{mese.anno.slice(-2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <ul id="giorni-aperture" className="evento-giorni" aria-live="polite">
        {attivo.intervalli.map(({ dal, al }) => (
          <li key={dal}>
            <span>{dal}{al > dal && <><span className="sr-only"> fino al </span><span aria-hidden>–</span>{al}</>}</span>
            {attivo.mese} {attivo.anno}
          </li>
        ))}
      </ul>
    </section>
  );
}
