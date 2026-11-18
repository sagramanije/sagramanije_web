"use client";

import { useActionState } from "react";
import { TreePine } from "lucide-react";
import { cambiaModalitaNatale } from "./actions";

export default function ModalitaNatale({ attiva }: { attiva: boolean | null }) {
  const [messaggio, azione, inCorso] = useActionState(cambiaModalitaNatale, "");
  return (
    <section className="mt-7 rounded-3xl border border-beige bg-surface p-5 sm:p-6">
      <form action={azione} className="flex flex-wrap items-center gap-4">
        <span className="rounded-2xl bg-[#e4eee4] p-3 text-[#215343]"><TreePine aria-hidden /></span>
        <div className="min-w-40 flex-1">
          <h2 id="titolo-natale" className="font-title text-xl">Modalità Natale</h2>
          <p className="mt-1 text-sm text-muted">Colori delle feste in tutto il sito e mercatini in copertina.</p>
        </div>
        {attiva !== null ? (
          <button type="submit" name="attiva" value={attiva ? "0" : "1"} role="switch"
            aria-checked={attiva} aria-labelledby="titolo-natale" disabled={inCorso}
            className="flex min-h-11 items-center gap-3 rounded-full px-2 text-sm font-bold disabled:opacity-60">
            {inCorso ? "Salvataggio…" : attiva ? "Attiva" : "Disattivata"}
            <span aria-hidden className={`flex h-7 w-12 items-center rounded-full p-1 ${attiva ? "justify-end bg-[#215343]" : "justify-start bg-muted"}`}>
              <span className="size-5 rounded-full bg-white shadow-sm" />
            </span>
          </button>
        ) : <p className="text-sm text-muted">Impostazione non disponibile. Ricarica la pagina.</p>}
      </form>
      <p role="status" className="text-sm font-semibold empty:hidden mt-2">{messaggio}</p>
    </section>
  );
}
