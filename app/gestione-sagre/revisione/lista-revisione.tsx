"use client";

import { Calendar, ChevronRight, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SagraPreProdRiga } from "../../../lib/sagre-pre-prod";

function formatDataBreve(iso: string | null): string | null {
  if (!iso) return null;
  const data = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

function intervallo(riga: SagraPreProdRiga): string {
  const inizio = formatDataBreve(riga.data_inizio);
  const fine = formatDataBreve(riga.data_fine);
  if (!inizio) return "Data da confermare";
  if (!fine || fine === inizio) return inizio;
  return `${inizio} – ${fine}`;
}

export default function ListaRevisione({ righe }: { righe: SagraPreProdRiga[] }) {
  const [ricerca, setRicerca] = useState("");

  const filtrate = useMemo(() => {
    const query = ricerca.trim().toLowerCase();
    if (!query) return righe;
    return righe.filter((r) =>
      `${r.nome_sagra} ${r.citta} ${r.provincia ?? ""}`.toLowerCase().includes(query),
    );
  }, [righe, ricerca]);

  if (righe.length === 0) return null;

  return (
    <div>
      <div className="relative">
        <Search
          aria-hidden
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca per nome o città…"
          className="min-h-12 w-full rounded-2xl border border-beige bg-white py-3 pl-11 pr-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <ul className="mt-5 space-y-3">
        {filtrate.map((r) => (
          <li key={r.id}>
            <Link
              href={`/gestione-sagre/revisione/${r.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 sm:p-5"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-title text-lg">{r.nome_sagra}</span>
                  {r.gia_presente ? (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary-ink">
                      Già presente in sagre
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <MapPin aria-hidden size={15} />
                    {r.citta}
                    {r.provincia ? `, ${r.provincia}` : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {r.verifica_data_esito}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar aria-hidden size={15} />
                    {intervallo(r)}
                  </span>
                </p>
              </div>
              <ChevronRight aria-hidden size={20} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      {filtrate.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Nessuna bozza corrisponde alla ricerca.</p>
      ) : null}
    </div>
  );
}
