"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowRight, Bookmark, CalendarDays, Dices, MapPin, Search } from "lucide-react";
import Link from "next/link";

export type Appuntamento = {
  slug: string;
  titolo: string;
  citta: string | null;
  provincia: string;
  tipo: "Sagra" | "Mercatino" | "Evento";
  giorno: number | null;
  mese: string;
  date: string;
  oggi: boolean;
  weekend: boolean;
};

const CHIAVE = "sagramanije:agenda-salvati";
const CAMBIO = "sagramanije:salvati-modificati";
let copiaLocale: string | null = null;

function leggiSalvati() {
  if (copiaLocale !== null) return copiaLocale;
  try { return localStorage.getItem(CHIAVE) ?? "[]"; }
  catch { return "[]"; }
}

function slugsSalvati(valore: string): string[] {
  try {
    const lista: unknown = JSON.parse(valore);
    return Array.isArray(lista) ? lista.filter((s): s is string => typeof s === "string") : [];
  } catch { return []; }
}

function ascoltaSalvati(aggiorna: () => void) {
  window.addEventListener("storage", aggiorna);
  window.addEventListener(CAMBIO, aggiorna);
  return () => {
    window.removeEventListener("storage", aggiorna);
    window.removeEventListener(CAMBIO, aggiorna);
  };
}

function normalizza(testo: string) {
  return testo.toLocaleLowerCase("it").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ");
}

type Props = {
  eventi: Appuntamento[];
  province: { nome: string; sigla: string }[];
  disponibile: boolean;
};

export default function Agenda({ eventi, province, disponibile }: Props) {
  const [cerca, setCerca] = useState("");
  const [provincia, setProvincia] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tipo, setTipo] = useState("");
  const [soloSalvati, setSoloSalvati] = useState(false);
  const [limite, setLimite] = useState(6);
  const [sorteggio, setSorteggio] = useState("");
  const salvati = slugsSalvati(useSyncExternalStore(ascoltaSalvati, leggiSalvati, () => "[]"));
  const attiviSalvati = eventi.filter(e => salvati.includes(e.slug)).length;
  const ricerca = normalizza(cerca.trim());
  const risultati = eventi.filter(e =>
    (!soloSalvati || salvati.includes(e.slug)) && (!tipo || e.tipo === tipo)
    && (!provincia || e.provincia === provincia)
    && (!periodo || (periodo === "oggi" ? e.oggi : e.weekend))
    && normalizza([e.titolo, e.citta, e.provincia].join(" ")).includes(ricerca)
  );
  const estratto = risultati.find(e => e.slug === sorteggio);

  function cambiaFiltro() {
    setLimite(6);
    setSorteggio("");
  }

  function azzera() {
    setCerca(""); setProvincia(""); setPeriodo(""); setTipo(""); setSoloSalvati(false);
    cambiaFiltro();
  }

  function salva(slug: string) {
    const attuali = slugsSalvati(leggiSalvati());
    const prossimi = JSON.stringify(attuali.includes(slug) ? attuali.filter(s => s !== slug) : [...attuali, slug]);
    try {
      localStorage.setItem(CHIAVE, prossimi);
      copiaLocale = null;
    } catch {
      copiaLocale = prossimi;
    }
    window.dispatchEvent(new Event(CAMBIO));
  }

  function pesca() {
    const possibili = risultati.length > 1 ? risultati.filter(e => e.slug !== sorteggio) : risultati;
    setSorteggio(possibili[Math.floor(Math.random() * possibili.length)].slug);
  }

  return (
    <section id="prossime-sagre" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-12 sm:px-6 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-title text-titolo-sezione font-bold tracking-tight">Dove andiamo?</h2>
        <button type="button" aria-pressed={soloSalvati} className="agenda-pill flex items-center gap-2"
          onClick={() => { setSoloSalvati(!soloSalvati); cambiaFiltro(); }}>
          <Bookmark size={16} aria-hidden /> Salvati ({attiviSalvati})
        </button>
      </div>
      <div className="mt-6 grid gap-3 rounded-2xl border border-beige bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="agenda-campo">Cerca un evento o un paese
          <span className="relative block">
            <Search aria-hidden size={17} className="absolute top-3.5 left-3 text-muted" />
            <input type="search" value={cerca} placeholder="Nome o località" className="pl-9!"
              onChange={e => { setCerca(e.target.value); cambiaFiltro(); }} />
          </span>
        </label>
        <label className="agenda-campo">Provincia
          <select value={provincia} onChange={e => { setProvincia(e.target.value); cambiaFiltro(); }}>
            <option value="">Tutto l’Abruzzo</option>
            {province.map(p => <option key={p.sigla} value={p.sigla}>{p.nome}</option>)}
          </select>
        </label>
        <label className="agenda-campo">Quando
          <select value={periodo} onChange={e => { setPeriodo(e.target.value); cambiaFiltro(); }}>
            <option value="">Tutte le date</option><option value="oggi">Oggi</option><option value="weekend">Questo weekend</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Tipo di appuntamento">
        {Object.entries({ "": "Tutti", Sagra: "Sagre", Mercatino: "Mercatini", Evento: "Altri eventi" }).map(([valore, nome]) => (
          <button key={nome} type="button" className="agenda-pill" aria-pressed={tipo === valore}
            onClick={() => { setTipo(valore); cambiaFiltro(); }}>{nome}</button>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-beige pb-3">
        <p role="status" className="font-title text-xl">{risultati.length} {risultati.length === 1 ? "appuntamento" : "appuntamenti"}</p>
        {risultati.length > 0 && <button type="button" onClick={pesca} className="flex items-center gap-2 rounded-full px-2 py-2 text-sm font-bold text-primary-ink hover:underline">
          <Dices size={18} aria-hidden /> Scegli per me
        </button>}
      </div>
      <div aria-live="polite">{estratto && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink p-5 text-cream">
          <div><p className="text-sm">La tua prossima tappa</p><p className="mt-1 font-title text-2xl">{estratto.titolo}</p>
            <p className="text-sm">{[estratto.citta, estratto.date].filter(Boolean).join(" · ")}</p></div>
          <Link href={`/sagra/${estratto.slug}`} className="rounded-full bg-cream px-4 py-2 font-bold text-ink">Apri la scheda →</Link>
        </div>
      )}</div>
      <ul className="divide-y divide-beige">{risultati.slice(0, limite).map(e => (
        <li key={e.slug} className="flex items-center gap-2 py-2 sm:gap-4">
          <Link href={`/sagra/${e.slug}`} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 sm:gap-5">
            <span aria-hidden className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-beige bg-surface text-primary-ink">
              {e.giorno ? <><b className="font-title text-2xl leading-none">{e.giorno}</b><span className="mt-1 text-xs uppercase">{e.mese}</span></> : <CalendarDays size={20} />}
            </span>
            <span className="min-w-0"><span className="text-xs font-bold uppercase tracking-wide text-primary-ink">{e.tipo}</span>
              <span className="block font-title text-xl leading-tight font-bold group-hover:underline">{e.titolo}</span>
              <span className="mt-1 block text-sm text-muted">{[e.citta, e.provincia].filter(Boolean).join(" · ")} {e.citta && "—"} {e.date}</span>
            </span>
            <ArrowRight size={18} aria-hidden className="ml-auto hidden shrink-0 sm:block" />
          </Link>
          <button type="button" onClick={() => salva(e.slug)} aria-pressed={salvati.includes(e.slug)} aria-label={`Salva ${e.titolo}`}
            className="agenda-pill grid size-11 shrink-0 place-items-center p-0!"><Bookmark size={17} aria-hidden /></button>
        </li>
      ))}</ul>
      {!risultati.length && <div className="rounded-xl bg-surface px-5 py-7">
        <MapPin size={20} aria-hidden className="mb-3 text-primary-ink" />
        <p>{!disponibile ? "Il calendario è temporaneamente indisponibile." : soloSalvati && !attiviSalvati
          ? "Salva gli eventi con il segnalibro per ritrovarli qui su questo dispositivo."
          : eventi.length ? "Nessun appuntamento corrisponde alla tua ricerca." : "I prossimi appuntamenti compariranno qui appena in calendario."}</p>
        {(tipo || periodo || provincia || cerca || soloSalvati) && <button type="button" onClick={azzera} className="mt-3 font-bold text-primary-ink underline">Mostra tutti gli eventi</button>}
      </div>}
      {risultati.length > limite && <button type="button" className="agenda-pill mt-4 inline-flex items-center gap-2" onClick={() => setLimite(limite + 6)}>Mostra altri eventi <ArrowDown size={15} aria-hidden /></button>}
    </section>
  );
}
