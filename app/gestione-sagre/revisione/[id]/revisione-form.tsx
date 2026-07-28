"use client";

import { useActionState } from "react";
import type { SagraPreProd } from "../../../../lib/sagre-pre-prod";
import SubmitButton from "../../submit-button";
import { convalidaSagra, type StatoAzione } from "../actions";

const STATO_INIZIALE: StatoAzione = { esito: "idle", messaggio: "" };
const INPUT =
  "mt-2 min-h-12 w-full rounded-2xl border border-beige bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const LABEL = "text-sm font-bold";
const CATEGORIE = ["sagra", "Evento", "Altro"];
const PROVINCE = ["AQ", "CH", "PE", "TE"];

export default function RevisioneForm({ bozza }: { bozza: SagraPreProd }) {
  const [stato, azione] = useActionState(convalidaSagra, STATO_INIZIALE);

  const categoria = CATEGORIE.includes(bozza.category ?? "")
    ? (bozza.category as string)
    : "sagra";
  const provincia = PROVINCE.includes(bozza.provincia ?? "")
    ? (bozza.provincia as string)
    : "";

  return (
    <form action={azione} className="space-y-7">
      <input type="hidden" name="pre_prod_id" value={bozza.id} />

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

      <fieldset className="space-y-5">
        <legend className="font-title text-xl">Informazioni principali</legend>

        <div>
          <label htmlFor="nome_sagra" className={LABEL}>
            Nome della sagra *
          </label>
          <input
            id="nome_sagra"
            name="nome_sagra"
            maxLength={255}
            required
            defaultValue={bozza.nome_sagra}
            className={INPUT}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="data_inizio" className={LABEL}>
              Data di inizio
            </label>
            <input
              id="data_inizio"
              name="data_inizio"
              type="date"
              defaultValue={bozza.data_inizio ?? ""}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="data_fine" className={LABEL}>
              Data di fine
            </label>
            <input
              id="data_fine"
              name="data_fine"
              type="date"
              defaultValue={bozza.data_fine ?? ""}
              className={INPUT}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="ora_inizio" className={LABEL}>
              Ora di inizio
            </label>
            <input
              id="ora_inizio"
              name="ora_inizio"
              type="time"
              defaultValue={bozza.ora_inizio ?? ""}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="category" className={LABEL}>
              Categoria
            </label>
            <select
              id="category"
              name="category"
              defaultValue={categoria}
              className={INPUT}
            >
              <option value="sagra">Sagra</option>
              <option value="Evento">Evento</option>
              <option value="Altro">Altro</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-beige pt-7">
        <legend className="font-title text-xl">Luogo</legend>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_180px]">
          <div>
            <label htmlFor="citta" className={LABEL}>
              Città *
            </label>
            <input
              id="citta"
              name="citta"
              maxLength={150}
              required
              defaultValue={bozza.citta}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="provincia" className={LABEL}>
              Provincia
            </label>
            <select
              id="provincia"
              name="provincia"
              defaultValue={provincia}
              className={INPUT}
            >
              <option value="">Seleziona</option>
              <option value="AQ">L’Aquila</option>
              <option value="CH">Chieti</option>
              <option value="PE">Pescara</option>
              <option value="TE">Teramo</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="lat" className={LABEL}>
              Latitudine
            </label>
            <input
              id="lat"
              name="lat"
              type="number"
              inputMode="decimal"
              step="any"
              min="-90"
              max="90"
              defaultValue={bozza.lat ?? ""}
              placeholder="42.3500"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="leng" className={LABEL}>
              Longitudine
            </label>
            <input
              id="leng"
              name="leng"
              type="number"
              inputMode="decimal"
              step="any"
              min="-180"
              max="180"
              defaultValue={bozza.leng ?? ""}
              placeholder="13.4000"
              className={INPUT}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-beige pt-7">
        <legend className="font-title text-xl">Contenuti e collegamenti</legend>

        <div>
          <label htmlFor="locandina" className={LABEL}>
            URL della locandina
          </label>
          <input
            id="locandina"
            name="locandina"
            type="url"
            inputMode="url"
            defaultValue={bozza.locandina ?? ""}
            placeholder="https://…"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="link_pagina_ufficiale" className={LABEL}>
            Pagina ufficiale
          </label>
          <input
            id="link_pagina_ufficiale"
            name="link_pagina_ufficiale"
            type="url"
            inputMode="url"
            defaultValue={bozza.link_pagina_ufficiale ?? ""}
            placeholder="https://…"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="descrizione" className={LABEL}>
            Descrizione
          </label>
          <textarea
            id="descrizione"
            name="descrizione"
            rows={8}
            maxLength={20_000}
            defaultValue={bozza.descrizione ?? ""}
            className={`${INPUT} min-h-44 resize-y`}
          />
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-beige pt-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          * Campi obbligatori — la convalida sposta la bozza in sagre e la
          rimuove da sagre_pre_prod.
        </p>
        <SubmitButton pendingLabel="Convalida…">
          Convalida e trasferisci in sagre
        </SubmitButton>
      </div>
    </form>
  );
}
