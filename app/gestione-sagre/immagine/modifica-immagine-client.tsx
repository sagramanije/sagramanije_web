"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  ImageDown,
  Link2,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import type { DestinazioneLocandina } from "../../../lib/locandina-storage";
import {
  aggiornaLocandinaUrl,
  caricaEImpostaLocandina,
  cercaSagreInDb,
  estraiEImpostaLocandinaDaSocial,
  rimuoviLocandina,
  type SagraImmagineItem,
} from "./actions";

const INPUT =
  "mt-2 min-h-12 w-full rounded-2xl border border-beige bg-white px-4 py-3 text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const LABEL = "text-sm font-bold text-ink";

type TipoFiltro = "tutte" | "senza_immagine" | "con_immagine";
type MetodoModifica = "file" | "url" | "social";

function normalizza(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formattaIntervalloDate(
  dataInizio: string | null,
  dataFine: string | null,
): string {
  if (!dataInizio) return "Data da confermare";
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const dInizio = new Date(`${dataInizio}T00:00:00`);
  if (Number.isNaN(dInizio.getTime())) return dataInizio;

  const testoInizio = dInizio.toLocaleDateString("it-IT", opts);
  if (!dataFine || dataFine === dataInizio) return testoInizio;

  const dFine = new Date(`${dataFine}T00:00:00`);
  if (Number.isNaN(dFine.getTime())) return `${testoInizio} – ${dataFine}`;
  const testoFine = dFine.toLocaleDateString("it-IT", opts);

  return `${testoInizio} – ${testoFine}`;
}

export default function ModificaImmagineClient({
  initialSagre,
  initialSelectedId,
}: {
  initialSagre: SagraImmagineItem[];
  initialSelectedId?: number;
}) {
  const [sagre, setSagre] = useState<SagraImmagineItem[]>(initialSagre);
  const [ricerca, setRicerca] = useState("");
  const [filtro, setFiltro] = useState<TipoFiltro>("tutte");
  const [idSelezionato, setIdSelezionato] = useState<number | null>(
    initialSelectedId ?? initialSagre[0]?.id ?? null,
  );
  const [metodo, setMetodo] = useState<MetodoModifica>("file");

  const sagraIniziale =
    initialSagre.find(
      (s) => s.id === (initialSelectedId ?? initialSagre[0]?.id),
    ) ?? null;

  // Input per i 3 metodi di modifica
  const [inputUrl, setInputUrl] = useState(sagraIniziale?.locandina ?? "");
  const [fileSelezionato, setFileSelezionato] = useState<File | null>(null);
  const [anteprimaFileBlob, setAnteprimaFileBlob] = useState<string | null>(null);
  const [inputSocial, setInputSocial] = useState(
    sagraIniziale?.link_pagina_ufficiale ?? "",
  );
  const [destinazione, setDestinazione] = useState<DestinazioneLocandina>("minio");

  // Stati di caricamento e feedback
  const [inCorso, setInCorso] = useState(false);
  const [staCercando, avviaTransizioneRicerca] = useTransition();
  const [messaggioFeedback, setMessaggioFeedback] = useState<{
    tipo: "successo" | "errore";
    testo: string;
  } | null>(null);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRicerca = useRef<NodeJS.Timeout | null>(null);

  // Sagra attiva selezionata
  const sagraAttiva = useMemo(
    () => sagre.find((s) => s.id === idSelezionato) ?? null,
    [idSelezionato, sagre],
  );

  function selezionaSagra(sagra: SagraImmagineItem) {
    setIdSelezionato(sagra.id);
    setInputUrl(sagra.locandina ?? "");
    setInputSocial(sagra.link_pagina_ufficiale ?? "");
    setFileSelezionato(null);
    if (anteprimaFileBlob) {
      URL.revokeObjectURL(anteprimaFileBlob);
      setAnteprimaFileBlob(null);
    }
    setMessaggioFeedback(null);
    setConfermaEliminazione(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Gestione preview locale file
  function gestisciSelezioneFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (anteprimaFileBlob) {
      URL.revokeObjectURL(anteprimaFileBlob);
      setAnteprimaFileBlob(null);
    }
    if (!file) {
      setFileSelezionato(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessaggioFeedback({
        tipo: "errore",
        testo: "Il file supera il limite massimo di 10 MB.",
      });
      e.target.value = "";
      setFileSelezionato(null);
      return;
    }
    setFileSelezionato(file);
    setAnteprimaFileBlob(URL.createObjectURL(file));
    setMessaggioFeedback(null);
  }

  // Ricerca con debounce su DB per completare i risultati
  function gestisciCambioRicerca(nuovoValore: string) {
    setRicerca(nuovoValore);
    if (timerRicerca.current) clearTimeout(timerRicerca.current);

    timerRicerca.current = setTimeout(() => {
      avviaTransizioneRicerca(async () => {
        try {
          const trovate = await cercaSagreInDb(nuovoValore);
          setSagre((correnti) => {
            const mappa = new Map<number, SagraImmagineItem>();
            for (const item of trovate) mappa.set(item.id, item);
            for (const item of correnti) {
              if (!mappa.has(item.id)) mappa.set(item.id, item);
            }
            return [...mappa.values()];
          });
        } catch (err) {
          console.error("Errore ricerca sagre:", err);
        }
      });
    }, 280);
  }

  // Filtraggio lista
  const sagreFiltrate = useMemo(() => {
    const q = normalizza(ricerca.trim());
    return sagre.filter((s) => {
      // Filtro per presenza immagine
      if (filtro === "con_immagine" && !s.locandina) return false;
      if (filtro === "senza_immagine" && Boolean(s.locandina)) return false;

      // Filtro per testo
      if (!q) return true;
      const haystack = normalizza(
        `${s.nome_sagra} ${s.citta} ${s.provincia ?? ""} ${s.regione ?? ""} ${s.id}`,
      );
      return haystack.includes(q);
    });
  }, [sagre, ricerca, filtro]);

  // Aggiorna lo stato locale della sagra dopo ogni modifica
  function aggiornaSagraLocale(nuovaLocandina: string | null) {
    if (!idSelezionato) return;
    setSagre((correnti) =>
      correnti.map((s) =>
        s.id === idSelezionato ? { ...s, locandina: nuovaLocandina } : s,
      ),
    );
    if (nuovaLocandina) {
      setInputUrl(nuovaLocandina);
    } else {
      setInputUrl("");
    }
    setFileSelezionato(null);
    if (anteprimaFileBlob) {
      URL.revokeObjectURL(anteprimaFileBlob);
      setAnteprimaFileBlob(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Azione 1: Salva URL diretto
  async function gestisciSalvaUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!sagraAttiva) return;

    setInCorso(true);
    setMessaggioFeedback(null);

    const res = await aggiornaLocandinaUrl({
      idSagra: sagraAttiva.id,
      nuovoUrl: inputUrl,
    });

    if (res.esito === "successo") {
      aggiornaSagraLocale(res.urlLocandina);
      setMessaggioFeedback({ tipo: "successo", testo: res.messaggio });
    } else {
      setMessaggioFeedback({ tipo: "errore", testo: res.messaggio });
    }
    setInCorso(false);
  }

  // Azione 2: Carica File
  async function gestisciCaricaFile(e: React.FormEvent) {
    e.preventDefault();
    if (!sagraAttiva || !fileSelezionato) return;

    setInCorso(true);
    setMessaggioFeedback(null);

    try {
      const formData = new FormData();
      formData.append("id_sagra", String(sagraAttiva.id));
      formData.append("file", fileSelezionato);
      formData.append("destinazione", destinazione);

      const res = await caricaEImpostaLocandina(formData);

      if (res.esito === "successo") {
        aggiornaSagraLocale(res.urlLocandina);
        setMessaggioFeedback({ tipo: "successo", testo: res.messaggio });
      } else {
        setMessaggioFeedback({ tipo: "errore", testo: res.messaggio });
      }
    } catch (err) {
      console.error(err);
      setMessaggioFeedback({
        tipo: "errore",
        testo: "Si è verificato un errore imprevisto durante il caricamento.",
      });
    } finally {
      setInCorso(false);
    }
  }

  // Azione 3: Estrai da Social o Web
  async function gestisciEstraiSocial(e: React.FormEvent) {
    e.preventDefault();
    if (!sagraAttiva) return;

    if (!inputSocial.trim()) {
      setMessaggioFeedback({
        tipo: "errore",
        testo: "Inserisci l'URL del post o della pagina da cui estrarre l'immagine.",
      });
      return;
    }

    setInCorso(true);
    setMessaggioFeedback(null);

    try {
      const res = await estraiEImpostaLocandinaDaSocial({
        idSagra: sagraAttiva.id,
        urlSocial: inputSocial,
        destinazione,
      });

      if (res.esito === "successo") {
        aggiornaSagraLocale(res.urlLocandina);
        setMessaggioFeedback({ tipo: "successo", testo: res.messaggio });
      } else {
        setMessaggioFeedback({ tipo: "errore", testo: res.messaggio });
      }
    } catch (err) {
      console.error(err);
      setMessaggioFeedback({
        tipo: "errore",
        testo: "Si è verificato un errore durante l'estrazione dell'immagine.",
      });
    } finally {
      setInCorso(false);
    }
  }

  // Azione 4: Rimuovi Locandina
  async function gestisciRimuoviLocandina() {
    if (!sagraAttiva) return;

    setInCorso(true);
    setMessaggioFeedback(null);

    try {
      const res = await rimuoviLocandina({ idSagra: sagraAttiva.id });

      if (res.esito === "successo") {
        aggiornaSagraLocale(null);
        setConfermaEliminazione(false);
        setMessaggioFeedback({ tipo: "successo", testo: res.messaggio });
      } else {
        setMessaggioFeedback({ tipo: "errore", testo: res.messaggio });
      }
    } catch (err) {
      console.error(err);
      setMessaggioFeedback({
        tipo: "errore",
        testo: "Si è verificato un errore durante la rimozione della locandina.",
      });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
      {/* COLONNA SINISTRA: Ricerca e Selezione Sagra */}
      <section className="lg:col-span-5 flex flex-col gap-4">
        <div className="rounded-3xl bg-surface p-4 shadow-sm sm:p-6">
          <label htmlFor="ricerca-sagra" className={LABEL}>
            Cerca una sagra
          </label>
          <div className="relative mt-2">
            <Search
              aria-hidden
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="ricerca-sagra"
              type="search"
              value={ricerca}
              onChange={(e) => gestisciCambioRicerca(e.target.value)}
              placeholder="Nome sagra, città o ID..."
              autoComplete="off"
              className="min-h-12 w-full rounded-2xl border border-beige bg-white py-3 pl-11 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            {ricerca ? (
              <button
                type="button"
                onClick={() => gestisciCambioRicerca("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-beige/40 hover:text-ink"
                title="Cancella ricerca"
              >
                <X size={15} aria-hidden />
              </button>
            ) : null}
          </div>

          {/* Filtro per stato locandina */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFiltro("tutte")}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filtro === "tutte"
                  ? "bg-primary text-white"
                  : "bg-beige/50 text-muted hover:bg-beige hover:text-ink"
              }`}
            >
              Tutte ({sagre.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("senza_immagine")}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filtro === "senza_immagine"
                  ? "bg-primary text-white"
                  : "bg-beige/50 text-muted hover:bg-beige hover:text-ink"
              }`}
            >
              Senza immagine (
              {sagre.filter((s) => !s.locandina).length}
              )
            </button>
            <button
              type="button"
              onClick={() => setFiltro("con_immagine")}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                filtro === "con_immagine"
                  ? "bg-primary text-white"
                  : "bg-beige/50 text-muted hover:bg-beige hover:text-ink"
              }`}
            >
              Con immagine (
              {sagre.filter((s) => Boolean(s.locandina)).length}
              )
            </button>
          </div>

          <p className="mt-3 text-xs text-muted">
            {staCercando ? "Aggiornamento risultati..." : `${sagreFiltrate.length} sagre trovate`}
          </p>

          {/* Lista risultati sagre */}
          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {sagreFiltrate.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-beige p-6 text-center text-sm text-muted">
                Nessuna sagra corrispondente alla ricerca.
              </div>
            ) : null}

            {sagreFiltrate.map((sagra) => {
              const eSelezionata = sagra.id === idSelezionato;
              return (
                <button
                  key={sagra.id}
                  type="button"
                  onClick={() => selezionaSagra(sagra)}
                  className={`w-full rounded-2xl p-3.5 text-left transition flex items-start gap-3 border ${
                    eSelezionata
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-beige/70 bg-white hover:border-primary/40 hover:bg-beige/10"
                  }`}
                >
                  {/* Mini-anteprima o icona */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-beige/40">
                    {sagra.locandina ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={sagra.locandina}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ImageIcon size={20} className="text-muted/60" aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-ink">
                        {sagra.nome_sagra}
                      </p>
                      <span className="shrink-0 text-[11px] font-semibold text-muted">
                        #{sagra.id}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-xs text-muted">
                      {sagra.citta}
                      {sagra.provincia ? ` (${sagra.provincia})` : ""}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                      <span>{formattaIntervalloDate(sagra.data_inizio, sagra.data_fine)}</span>
                      {sagra.locandina ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-green">
                          <CheckCircle2 size={11} aria-hidden /> Ha immagine
                        </span>
                      ) : (
                        <span className="font-semibold text-primary-ink">
                          Manca immagine
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* COLONNA DESTRA: Dettaglio e Modifica Immagine */}
      <section className="lg:col-span-7 flex flex-col gap-6">
        {sagraAttiva ? (
          <div className="space-y-6 rounded-3xl bg-surface p-4 shadow-sm sm:p-8">
            {/* Intestazione Sagra Selezionata */}
            <div className="border-b border-beige pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Sagra #{sagraAttiva.id}
                </span>
                {sagraAttiva.link_pagina_ufficiale ? (
                  <a
                    href={sagraAttiva.link_pagina_ufficiale}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
                  >
                    <ExternalLink size={13} aria-hidden />
                    Pagina ufficiale
                  </a>
                ) : null}
              </div>

              <h2 className="mt-2 font-title text-2xl sm:text-3xl">
                {sagraAttiva.nome_sagra}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {sagraAttiva.citta}
                {sagraAttiva.provincia ? ` (${sagraAttiva.provincia})` : ""}
                {" · "}
                {formattaIntervalloDate(sagraAttiva.data_inizio, sagraAttiva.data_fine)}
              </p>
            </div>

            {/* Banner Feedback */}
            {messaggioFeedback ? (
              <div
                role="alert"
                className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-semibold ${
                  messaggioFeedback.tipo === "successo"
                    ? "bg-green/10 text-green"
                    : "bg-primary/10 text-primary-ink"
                }`}
              >
                {messaggioFeedback.tipo === "successo" ? (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" aria-hidden />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden />
                )}
                <p className="flex-1">{messaggioFeedback.testo}</p>
                <button
                  type="button"
                  onClick={() => setMessaggioFeedback(null)}
                  className="text-muted hover:text-ink"
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            ) : null}

            {/* Anteprima Immagine Corrente */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={LABEL}>Locandina attuale</label>
                {sagraAttiva.locandina ? (
                  <a
                    href={sagraAttiva.locandina}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <ExternalLink size={13} aria-hidden />
                    Visualizza a risoluzione piena
                  </a>
                ) : null}
              </div>

              {sagraAttiva.locandina ? (
                <div className="overflow-hidden rounded-2xl border border-beige bg-beige/20 p-4">
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sagraAttiva.locandina}
                      alt={`Locandina ${sagraAttiva.nome_sagra}`}
                      className="max-h-80 w-auto max-w-full rounded-xl object-contain shadow-xs"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-beige/80 pt-3">
                    <p className="max-w-md truncate text-xs text-muted font-mono">
                      {sagraAttiva.locandina}
                    </p>

                    {confermaEliminazione ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          Confermi la rimozione?
                        </span>
                        <button
                          type="button"
                          disabled={inCorso}
                          onClick={gestisciRimuoviLocandina}
                          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-dark disabled:opacity-50"
                        >
                          {inCorso ? "Eliminazione..." : "Sì, rimuovi"}
                        </button>
                        <button
                          type="button"
                          disabled={inCorso}
                          onClick={() => setConfermaEliminazione(false)}
                          className="rounded-xl border border-beige px-3 py-1.5 text-xs font-bold text-ink hover:bg-white disabled:opacity-50"
                        >
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfermaEliminazione(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                      >
                        <Trash2 size={13} aria-hidden />
                        Rimuovi locandina
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-beige bg-beige/10 p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-beige text-muted">
                    <ImageIcon size={24} aria-hidden />
                  </div>
                  <p className="mt-3 text-sm font-bold text-ink">
                    Nessuna locandina impostata
                  </p>
                  <p className="mt-1 text-xs text-muted max-w-sm">
                    Questa sagra non ha ancora un&apos;immagine associata. Scegli una modalità qui sotto per impostarne una.
                  </p>
                </div>
              )}
            </div>

            {/* SEZIONE: Opzioni di Modifica Immagine */}
            <div className="border-t border-beige pt-6">
              <h3 className="font-title text-xl">Aggiorna o sostituisci immagine</h3>
              <p className="mt-1 text-xs text-muted">
                Puoi caricare un file dal tuo dispositivo, incollare un URL diretto oppure estrarla da un post social.
              </p>

              {/* Selettore Tab Metodo */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-beige/40 p-1.5">
                <button
                  type="button"
                  onClick={() => setMetodo("file")}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                    metodo === "file"
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Upload size={14} aria-hidden />
                  Carica file
                </button>
                <button
                  type="button"
                  onClick={() => setMetodo("url")}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                    metodo === "url"
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <Link2 size={14} aria-hidden />
                  Incolla URL
                </button>
                <button
                  type="button"
                  onClick={() => setMetodo("social")}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                    metodo === "social"
                      ? "bg-white text-ink shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <ImageDown size={14} aria-hidden />
                  Estrai da social
                </button>
              </div>

              {/* METODO 1: Caricamento File */}
              {metodo === "file" ? (
                <form onSubmit={gestisciCaricaFile} className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className={LABEL}>Seleziona immagine dal computer</label>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted">
                      <span>Destinazione:</span>
                      <select
                        value={destinazione}
                        onChange={(e) =>
                          setDestinazione(e.target.value as DestinazioneLocandina)
                        }
                        disabled={inCorso}
                        className="rounded-xl border border-beige bg-white px-2.5 py-1 text-xs text-ink outline-none focus:border-primary"
                      >
                        <option value="minio">MinIO (predefinito)</option>
                        <option value="cloudinary">Cloudinary</option>
                      </select>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
                    onChange={gestisciSelezioneFile}
                    className="block w-full text-xs text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-primary/10 file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-primary file:cursor-pointer hover:file:bg-primary/20"
                  />

                  {/* Anteprima file selezionato prima dell'upload */}
                  {anteprimaFileBlob ? (
                    <div className="rounded-2xl border border-beige bg-white p-3 flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={anteprimaFileBlob}
                        alt="Anteprima selezione"
                        className="h-16 w-16 rounded-xl object-cover bg-beige/20"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">
                          {fileSelezionato?.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {fileSelezionato
                            ? `${(fileSelezionato.size / 1024 / 1024).toFixed(2)} MB`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!fileSelezionato || inCorso}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inCorso ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                        Caricamento in corso...
                      </>
                    ) : (
                      <>
                        <Upload size={16} aria-hidden />
                        Carica e imposta come locandina
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              {/* METODO 2: Incolla URL */}
              {metodo === "url" ? (
                <form onSubmit={gestisciSalvaUrl} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="url-diretto" className={LABEL}>
                      Indirizzo web (HTTPS) dell&apos;immagine
                    </label>
                    <input
                      id="url-diretto"
                      type="url"
                      inputMode="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://..."
                      required
                      className={INPUT}
                    />
                    <p className="mt-1.5 text-xs text-muted">
                      Incolla il link diretto all&apos;immagine ospitata online.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputUrl.trim() || inCorso}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inCorso ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                        Salvataggio in corso...
                      </>
                    ) : (
                      <>
                        <Link2 size={16} aria-hidden />
                        Salva URL locandina
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              {/* METODO 3: Estrazione da Social o Web */}
              {metodo === "social" ? (
                <form onSubmit={gestisciEstraiSocial} className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label htmlFor="link-social" className={LABEL}>
                      Link post Facebook, Instagram o pagina web
                    </label>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted">
                      <span>Salva su:</span>
                      <select
                        value={destinazione}
                        onChange={(e) =>
                          setDestinazione(e.target.value as DestinazioneLocandina)
                        }
                        disabled={inCorso}
                        className="rounded-xl border border-beige bg-white px-2.5 py-1 text-xs text-ink outline-none focus:border-primary"
                      >
                        <option value="minio">MinIO (predefinito)</option>
                        <option value="cloudinary">Cloudinary</option>
                      </select>
                    </div>
                  </div>

                  <input
                    id="link-social"
                    type="url"
                    inputMode="url"
                    value={inputSocial}
                    onChange={(e) => setInputSocial(e.target.value)}
                    placeholder="https://www.facebook.com/... oppure https://www.instagram.com/p/..."
                    required
                    className={INPUT}
                  />

                  <p className="text-xs text-muted">
                    L&apos;immagine verrà estratta automaticamente dal post, salvata sullo storage scelto e associata alla sagra.
                  </p>

                  <button
                    type="submit"
                    disabled={!inputSocial.trim() || inCorso}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {inCorso ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                        Estrazione e salvataggio in corso...
                      </>
                    ) : (
                      <>
                        <ImageDown size={16} aria-hidden />
                        Estrai e salva locandina
                      </>
                    )}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-surface p-12 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImageIcon size={28} aria-hidden />
            </div>
            <h2 className="mt-4 font-title text-2xl">Nessuna sagra selezionata</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Usa la barra di ricerca a sinistra per trovare una sagra e iniziare a modificarne o sostituirne l&apos;immagine.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
