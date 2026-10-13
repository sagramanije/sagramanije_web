"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ImageDown,
  Loader2,
} from "lucide-react";
import type { SagraPreProd } from "../../../../lib/sagre-pre-prod";
import type { DestinazioneLocandina } from "../../../../lib/locandina-storage";
import SubmitButton from "../../submit-button";
import {
  convalidaSagra,
  salvaLocandinaDaSocial,
  type StatoAzione,
} from "../actions";

const STATO_INIZIALE: StatoAzione = { esito: "idle", messaggio: "" };
const INPUT =
  "mt-2 min-h-12 w-full rounded-2xl border border-beige bg-white px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const LABEL = "text-sm font-bold";
const CATEGORIE = ["sagra", "Evento", "Altro"];
const PROVINCE = ["AQ", "CH", "PE", "TE"];

export default function RevisioneForm({ bozza }: { bozza: SagraPreProd }) {
  const [stato, azione] = useActionState(convalidaSagra, STATO_INIZIALE);

  const [locandinaUrl, setLocandinaUrl] = useState(bozza.locandina ?? "");
  const [linkSocial, setLinkSocial] = useState(
    bozza.link_pagina_ufficiale ?? bozza.verifica_data_fonte ?? "",
  );
  const [destinazioneLocandina, setDestinazioneLocandina] =
    useState<DestinazioneLocandina>("minio");
  const [estraendo, setEstraendo] = useState(false);
  const [statoSocial, setStatoSocial] = useState<{
    tipo: "successo" | "errore";
    testo: string;
  } | null>(null);

  async function gestisciEstrazioneFotoSocial() {
    const urlDaUsare =
      linkSocial.trim() ||
      (bozza.link_pagina_ufficiale ?? "").trim() ||
      (bozza.verifica_data_fonte ?? "").trim();

    if (!urlDaUsare) {
      setStatoSocial({
        tipo: "errore",
        testo:
          "Inserisci prima il link del post social (Facebook o Instagram) nel campo 'Pagina ufficiale'.",
      });
      return;
    }

    setEstraendo(true);
    setStatoSocial(null);

    try {
      const res = await salvaLocandinaDaSocial({
        preProdId: bozza.id,
        urlSocial: urlDaUsare,
        destinazione: destinazioneLocandina,
      });

      if (res.esito === "successo") {
        setLocandinaUrl(res.urlLocandina);
        setStatoSocial({ tipo: "successo", testo: res.messaggio });
      } else {
        setStatoSocial({ tipo: "errore", testo: res.messaggio });
      }
    } catch (err) {
      console.error(err);
      setStatoSocial({
        tipo: "errore",
        testo:
          "Si è verificato un errore durante l'estrazione e il salvataggio della foto.",
      });
    } finally {
      setEstraendo(false);
    }
  }

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
            value={locandinaUrl}
            onChange={(e) => setLocandinaUrl(e.target.value)}
            placeholder="https://…"
            className={INPUT}
          />
          {locandinaUrl ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-beige bg-beige/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-muted">Anteprima locandina</p>
                <a
                  href={locandinaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink size={12} aria-hidden />
                  Apri a grandezza originale
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={locandinaUrl}
                alt={`Locandina ${bozza.nome_sagra}`}
                className="max-h-96 w-auto max-w-full rounded-xl object-contain shadow-sm"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-2xl border border-beige/80 bg-beige/20 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="link_pagina_ufficiale" className={LABEL}>
              Pagina ufficiale / Link post social
            </label>
            <span className="text-xs text-muted">Facebook, Instagram o sito</span>
          </div>

          <input
            id="link_pagina_ufficiale"
            name="link_pagina_ufficiale"
            type="url"
            inputMode="url"
            value={linkSocial}
            onChange={(e) => setLinkSocial(e.target.value)}
            placeholder="https://www.facebook.com/... o https://www.instagram.com/p/..."
            className={INPUT}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-muted">
              <span>Salva su:</span>
              <select
                value={destinazioneLocandina}
                onChange={(evento) =>
                  setDestinazioneLocandina(
                    evento.target.value as DestinazioneLocandina,
                  )
                }
                disabled={estraendo}
                className="rounded-xl border border-beige bg-white px-3 py-1.5 text-xs text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="minio">MinIO (predefinito)</option>
                <option value="cloudinary">Cloudinary</option>
              </select>
            </label>

            <button
              id="bottone-estrai-foto-social"
              type="button"
              onClick={gestisciEstrazioneFotoSocial}
              disabled={estraendo}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {estraendo ? (
                <>
                  <Loader2 aria-hidden size={17} className="animate-spin" />
                  <span>Estrazione e salvataggio in corso…</span>
                </>
              ) : (
                <>
                  <ImageDown aria-hidden size={17} />
                  <span>Prendi foto dal post e salva</span>
                </>
              )}
            </button>
          </div>

          {statoSocial ? (
            <div
              role={statoSocial.tipo === "errore" ? "alert" : "status"}
              className={`flex items-start gap-2.5 rounded-2xl p-3 text-sm font-medium ${
                statoSocial.tipo === "successo"
                  ? "bg-green/10 text-green"
                  : "bg-primary/10 text-primary-ink"
              }`}
            >
              {statoSocial.tipo === "successo" ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden />
              ) : (
                <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              )}
              <p className="flex-1 text-xs sm:text-sm">{statoSocial.testo}</p>
            </div>
          ) : null}
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
