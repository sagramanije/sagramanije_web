"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { eliminaBozza, type StatoAzione } from "../actions";

const STATO_INIZIALE: StatoAzione = { esito: "idle", messaggio: "" };

function TastoElimina() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-primary px-4 py-2 text-sm font-bold text-primary-ink transition hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60"
    >
      <Trash2 aria-hidden size={16} />
      {pending ? "Eliminazione…" : "Elimina bozza"}
    </button>
  );
}

export default function EliminaBozzaButton({
  preProdId,
  nomeSagra,
}: {
  preProdId: number;
  nomeSagra: string;
}) {
  const [stato, azione] = useActionState(eliminaBozza, STATO_INIZIALE);

  return (
    <div className="space-y-2">
      <form
        action={azione}
        onSubmit={(evento) => {
          if (
            !window.confirm(
              `Eliminare definitivamente la bozza “${nomeSagra}” da sagre_pre_prod? L'operazione non è reversibile.`,
            )
          ) {
            evento.preventDefault();
          }
        }}
      >
        <input type="hidden" name="pre_prod_id" value={preProdId} />
        <TastoElimina />
      </form>
      {stato.esito === "errore" ? (
        <p role="alert" className="text-sm font-semibold text-primary-ink">
          {stato.messaggio}
        </p>
      ) : null}
    </div>
  );
}
