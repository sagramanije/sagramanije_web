"use client";

import Image from "next/image";
import { Maximize2, Sun } from "lucide-react";
import { useState } from "react";

type Props = { locandina: string | null; nome: string; mercatino: boolean };

export default function CartolinaEvento({ locandina, nome, mercatino }: Props) {
  const [indisponibile, setIndisponibile] = useState(false);
  if (locandina && !indisponibile) {
    return (
      <a href={locandina} target="_blank" rel="noopener noreferrer" className="evento-locandina"
        aria-label={`Apri la locandina di ${nome} in una nuova scheda`}>
        <figure className="cartolina">
          <Image src={locandina} alt={`Locandina ufficiale di ${nome}`} width={640} height={640}
            loading="eager" onError={() => setIndisponibile(true)}
            onLoad={({ currentTarget }) => {
              // Il proxy restituisce un pixel trasparente quando l'originale è scaduto.
              if (currentTarget.naturalWidth === 1 && currentTarget.naturalHeight === 1) setIndisponibile(true);
            }} />
          <figcaption>Locandina ufficiale <Maximize2 size={15} aria-hidden /></figcaption>
        </figure>
      </a>
    );
  }
  return (
    <figure className={mercatino ? "evento-illustrazione" : "cartolina evento-cartolina"}>
      <Image src={mercatino ? "/mercatini-abruzzo.webp" : "/sagra-abruzzo.webp"}
        width={1500} height={1000} sizes="(min-width: 768px) 44vw, 100vw"
        alt={mercatino ? "Illustrazione di un mercatino tra le montagne d’Abruzzo" : "Illustrazione di una sagra ai piedi del Gran Sasso"} />
      {!mercatino && <figcaption>Le piazze d’Abruzzo <Sun size={16} aria-hidden /></figcaption>}
    </figure>
  );
}
