"use client";

import { useActionState, useRef, useState } from "react";
import { salvaSagra, analizzaSagra, type StatoAzione } from "./actions";
import SubmitButton from "./submit-button";
import { Wand2 } from "lucide-react";

const STATO_INIZIALE: StatoAzione = { esito: "idle", messaggio: "" };
const INPUT =
  "mt-2 min-h-12 w-full rounded-2xl border border-beige bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const LABEL = "text-sm font-bold";

export default function SagraForm() {
  const [stato, azione] = useActionState(salvaSagra, STATO_INIZIALE);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analizzando, setAnalizzando] = useState(false);

  async function gestisciLocandina(evento: React.ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    if (!file) return;

    setAnalizzando(true);
    try {
      const formData = new FormData();
      formData.append("locandina", file);
      const risultato = await analizzaSagra(formData);

      if (risultato.esito === "successo") {
        const form = formRef.current;
        if (!form) return;

        const { dati, urlLocandina } = risultato;
        if (dati.nomeSagra) (form.elements.namedItem("nome_sagra") as HTMLInputElement).value = dati.nomeSagra;
        if (dati.dataInizio) (form.elements.namedItem("data_inizio") as HTMLInputElement).value = dati.dataInizio;
        if (dati.dataFine) (form.elements.namedItem("data_fine") as HTMLInputElement).value = dati.dataFine;
        if (dati.oraInizio) (form.elements.namedItem("ora_inizio") as HTMLInputElement).value = dati.oraInizio;
        if (dati.citta) (form.elements.namedItem("citta") as HTMLInputElement).value = dati.citta;
        if (dati.provincia) (form.elements.namedItem("provincia") as HTMLSelectElement).value = dati.provincia;
        if (dati.linkPaginaUfficiale) (form.elements.namedItem("link_pagina_ufficiale") as HTMLInputElement).value = dati.linkPaginaUfficiale;
        if (dati.descrizione) (form.elements.namedItem("descrizione") as HTMLTextAreaElement).value = dati.descrizione;
        if (urlLocandina) (form.elements.namedItem("locandina") as HTMLInputElement).value = urlLocandina;
      } else {
        alert(risultato.messaggio);
      }
    } catch (errore) {
      console.error(errore);
      alert("Errore durante l'analisi della locandina.");
    } finally {
      setAnalizzando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

      <fieldset className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <legend className="font-title text-xl">Informazioni principali</legend>
          
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={gestisciLocandina}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={analizzando}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary-ink transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 aria-hidden size={17} />
              {analizzando ? "Upload & Analisi..." : "Carica Locandina (AI)"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="nome_sagra" className={LABEL}>
            Nome della sagra *
          </label>
          <input
            id="nome_sagra"
            name="nome_sagra"
            maxLength={255}
            required
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
              defaultValue="sagra"
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
              defaultValue=""
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
            placeholder="https://…"
            className={INPUT}
          />
          <p className="mt-2 text-xs text-muted">
            Puoi incollare un URL o usare il bottone "Carica Locandina (AI)" in alto per caricarla automaticamente.
          </p>
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
            className={`${INPUT} min-h-44 resize-y`}
          />
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-beige pt-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">* Campi obbligatori</p>
        <SubmitButton>Salva la sagra</SubmitButton>
      </div>
    </form>
  );
}
