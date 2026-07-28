"use client";

import {
  CalendarPlus,
  GripVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import SubmitButton from "../submit-button";
import { salvaProgramma, type StatoProgramma } from "./actions";

export type SagraProgramma = {
  id: number;
  nome: string;
  citta: string;
  dataInizio: string | null;
  dataFine: string | null;
};

type Riga = { chiave: number };

const STATO_INIZIALE: StatoProgramma = { esito: "idle", messaggio: "" };
const INPUT =
  "mt-2 min-h-12 w-full rounded-2xl border border-beige bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const LABEL = "text-sm font-bold";

function descrizioneSagra(sagra: SagraProgramma): string {
  const date = sagra.dataInizio
    ? sagra.dataFine && sagra.dataFine !== sagra.dataInizio
      ? `${sagra.dataInizio} – ${sagra.dataFine}`
      : sagra.dataInizio
    : "date da definire";
  return `${sagra.nome} — ${sagra.citta} · ${date}`;
}

function normalizzaRicerca(valore: string): string {
  return valore
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ProgrammaForm({
  sagre,
}: {
  sagre: SagraProgramma[];
}) {
  const [stato, azione] = useActionState(salvaProgramma, STATO_INIZIALE);
  const [righe, setRighe] = useState<Riga[]>([{ chiave: 1 }]);
  const [prossimaChiave, setProssimaChiave] = useState(2);
  const [idSagra, setIdSagra] = useState(sagre[0]?.id ?? 0);
  const [ricercaSagra, setRicercaSagra] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const sagraSelezionata = useMemo(
    () => sagre.find((sagra) => sagra.id === idSagra),
    [idSagra, sagre],
  );
  const sagreFiltrate = useMemo(() => {
    const query = normalizzaRicerca(ricercaSagra.trim());
    if (!query) return sagre;

    const risultati = sagre.filter((sagra) =>
      normalizzaRicerca(
        `${sagra.nome} ${sagra.citta} ${sagra.id}`,
      ).includes(query),
    );

    if (
      sagraSelezionata &&
      !risultati.some((sagra) => sagra.id === sagraSelezionata.id)
    ) {
      return [sagraSelezionata, ...risultati];
    }
    return risultati;
  }, [ricercaSagra, sagraSelezionata, sagre]);

  useEffect(() => {
    if (stato.esito === "successo") {
      formRef.current?.reset();
    }
  }, [stato.esito, stato.salvataggio]);

  function aggiungiRiga() {
    if (righe.length >= 50) return;
    setRighe((correnti) => [...correnti, { chiave: prossimaChiave }]);
    setProssimaChiave((valore) => valore + 1);
  }

  function rimuoviRiga(chiave: number) {
    setRighe((correnti) =>
      correnti.length === 1
        ? correnti
        : correnti.filter((riga) => riga.chiave !== chiave),
    );
  }

  return (
    <form ref={formRef} action={azione} className="space-y-7">
      {stato.esito !== "idle" ? (
        <p
          role={stato.esito === "errore" ? "alert" : "status"}
          className={
            stato.esito === "successo"
              ? "rounded-2xl bg-green/10 px-4 py-3 text-sm font-semibold text-green"
              : "rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary-ink"
          }
        >
          {stato.messaggio}
        </p>
      ) : null}

      <div>
        <label htmlFor="ricerca_sagra" className={LABEL}>
          Cerca una sagra
        </label>
        <div className="relative mt-2">
          <Search
            aria-hidden
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="ricerca_sagra"
            type="search"
            value={ricercaSagra}
            onChange={(evento) => setRicercaSagra(evento.target.value)}
            placeholder="Nome, città o ID…"
            autoComplete="off"
            className="min-h-12 w-full rounded-2xl border border-beige bg-white py-3 pl-11 pr-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>
        {ricercaSagra.trim() ? (
          <p className="mt-2 text-xs text-muted">
            {sagreFiltrate.length -
              (sagraSelezionata &&
              !normalizzaRicerca(
                `${sagraSelezionata.nome} ${sagraSelezionata.citta} ${sagraSelezionata.id}`,
              ).includes(normalizzaRicerca(ricercaSagra.trim()))
                ? 1
                : 0)}{" "}
            risultati trovati
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="id_sagra" className={LABEL}>
          Sagra *
        </label>
        <select
          id="id_sagra"
          name="id_sagra"
          required
          value={idSagra || ""}
          onChange={(evento) => setIdSagra(Number(evento.target.value))}
          className={INPUT}
        >
          {sagre.length === 0 ? (
            <option value="">Nessuna sagra disponibile</option>
          ) : null}
          {sagreFiltrate.map((sagra) => (
            <option key={sagra.id} value={sagra.id}>
              {descrizioneSagra(sagra)}
            </option>
          ))}
        </select>
        {sagraSelezionata?.dataInizio ? (
          <p className="mt-2 text-xs text-muted">
            Le attività devono essere comprese
            {sagraSelezionata.dataFine
              ? ` tra il ${sagraSelezionata.dataInizio} e il ${sagraSelezionata.dataFine}.`
              : ` nella giornata del ${sagraSelezionata.dataInizio}.`}
          </p>
        ) : null}
      </div>

      <input
        type="hidden"
        name="totale_attivita"
        value={righe.length}
      />

      <div className="space-y-5 border-t border-beige pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-title text-xl">Voci del programma</h2>
            <p className="mt-1 text-sm text-muted">
              {righe.length} {righe.length === 1 ? "voce" : "voci"}
            </p>
          </div>
          <button
            type="button"
            onClick={aggiungiRiga}
            disabled={righe.length >= 50}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-primary bg-white px-4 py-2 text-sm font-bold text-primary-ink transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden size={17} />
            Aggiungi attività
          </button>
        </div>

        <div className="space-y-4">
          {righe.map((riga, indice) => (
            <fieldset
              key={riga.chiave}
              className="rounded-3xl border border-beige bg-cream/60 p-4 sm:p-5"
            >
              <legend className="sr-only">Attività {indice + 1}</legend>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-title text-lg">
                  <GripVertical
                    aria-hidden
                    size={18}
                    className="text-warm"
                  />
                  Attività {indice + 1}
                </p>
                <button
                  type="button"
                  onClick={() => rimuoviRiga(riga.chiave)}
                  disabled={righe.length === 1}
                  aria-label={`Rimuovi attività ${indice + 1}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-primary/10 hover:text-primary-ink disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 aria-hidden size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor={`giorno_${indice}`} className={LABEL}>
                    Giorno *
                  </label>
                  <input
                    id={`giorno_${indice}`}
                    name={`giorno_${indice}`}
                    type="date"
                    required
                    min={sagraSelezionata?.dataInizio ?? undefined}
                    max={
                      sagraSelezionata?.dataFine ??
                      sagraSelezionata?.dataInizio ??
                      undefined
                    }
                    defaultValue={sagraSelezionata?.dataInizio ?? ""}
                    key={`${riga.chiave}-${idSagra}`}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`ora_inizio_${indice}`} className={LABEL}>
                    Ora inizio
                  </label>
                  <input
                    id={`ora_inizio_${indice}`}
                    name={`ora_inizio_${indice}`}
                    type="time"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`ora_fine_${indice}`} className={LABEL}>
                    Ora fine
                  </label>
                  <input
                    id={`ora_fine_${indice}`}
                    name={`ora_fine_${indice}`}
                    type="time"
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor={`titolo_${indice}`} className={LABEL}>
                  Titolo *
                </label>
                <input
                  id={`titolo_${indice}`}
                  name={`titolo_${indice}`}
                  required
                  maxLength={255}
                  placeholder="Es. Apertura stand gastronomici"
                  className={INPUT}
                />
              </div>

              <div className="mt-4">
                <label htmlFor={`descrizione_${indice}`} className={LABEL}>
                  Descrizione
                </label>
                <textarea
                  id={`descrizione_${indice}`}
                  name={`descrizione_${indice}`}
                  rows={3}
                  maxLength={20_000}
                  placeholder="Dettagli facoltativi sull’attività"
                  className={`${INPUT} min-h-24 resize-y`}
                />
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-beige pt-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-muted">
          <CalendarPlus aria-hidden size={15} />
          Le attività vengono salvate tutte insieme.
        </p>
        <SubmitButton pendingLabel="Salvataggio programma…">
          Salva programma
        </SubmitButton>
      </div>
    </form>
  );
}
