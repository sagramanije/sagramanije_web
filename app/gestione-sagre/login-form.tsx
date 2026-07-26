"use client";

import { useActionState } from "react";
import { accedi, type StatoAzione } from "./actions";
import SubmitButton from "./submit-button";

const STATO_INIZIALE: StatoAzione = { esito: "idle", messaggio: "" };

export default function LoginForm() {
  const [stato, azione] = useActionState(accedi, STATO_INIZIALE);

  return (
    <form action={azione} className="mt-8 space-y-5">
      <div>
        <label htmlFor="password" className="text-sm font-bold">
          Password amministratore
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-2 min-h-12 w-full rounded-2xl border border-beige bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      {stato.esito === "errore" ? (
        <p
          role="alert"
          className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-ink"
        >
          {stato.messaggio}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Accesso…">Accedi</SubmitButton>
    </form>
  );
}
