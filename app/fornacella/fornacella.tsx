"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { Flame, MessageCircle, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import type { Classifica, Riga } from "../../lib/classifica-fornacella";
import { braceCalda, DURATA, LIMITE_TOCCHI, meseDiGara, nomeMese, POSTI, Servizio, type Taglio, type Tocco } from "../../lib/fornacella";
import * as suoni from "./suoni";

type Biglietto = { inizio: number; mese: string; firma: string };
type Stato = "pronto" | "accensione" | "conto" | "gioco" | "fine";
const api = "/api/fornacella";
const TASTI: Record<string, number> = { "1": 0, "2": 1, "3": 2, a: 0, s: 1, d: 2 };

async function richiesta<T>(dati?: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(api, dati ? { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dati), signal, cache: "no-store" } : { signal, cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errore || "Connessione interrotta. Riprova.");
  return json;
}
function punti(n: number) { return n.toLocaleString("it-IT"); }
function recordLocale(mese: string, risultato = 0) {
  try {
    const key = "fornacella.record." + mese;
    const migliore = Math.max(Number(localStorage.getItem(key)) || 0, risultato);
    if (risultato) localStorage.setItem(key, String(migliore));
    return migliore;
  } catch { return risultato; }
}
function vibra(schema: number | number[]) {
  try { navigator.vibrate?.(schema); } catch { /* non supportato */ }
}

// Coordinate della scenografia calcolate una volta sola, con un generatore
// deterministico: server e browser producono lo stesso markup.
function generatore(seme: number) {
  let s = seme;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const tondo = (n: number) => Math.round(n * 100) / 100;
const caso = generatore(11);
const SCINTILLE = Array.from({ length: 20 }, () => ({
  x: tondo(4 + caso() * 92), durata: tondo(1.8 + caso() * 2.4), ritardo: tondo(-caso() * 4),
  deriva: tondo((caso() - .5) * 70), scala: tondo(.5 + caso() * .9),
}));
const BOKEH = Array.from({ length: 14 }, (_, i) => ({
  x: tondo(caso() * 100), y: tondo(18 + caso() * 40), r: tondo(14 + caso() * 46),
  tinta: ["#ffb35c", "#ff7a3d", "#ffe2a3", "#f25c54"][i % 4], ritardo: tondo(-caso() * 6),
}));
function lampadine(p0: number[], p1: number[], p2: number[], quante: number) {
  return Array.from({ length: quante }, (_, k) => {
    const t = (k + .5) / quante;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    return { x: tondo(x), y: tondo(y) };
  });
}
const LUMINARIE = [
  ...lampadine([0, 10], [250, 120], [500, 18], 11),
  ...lampadine([500, 18], [750, 120], [1000, 10], 11),
];

function Scena() {
  return <div className="scena" aria-hidden="true">
    <div className="scena-cielo" />
    {BOKEH.map((b, i) => <span key={i} className="bokeh" style={{ left: b.x + "%", top: b.y + "%",
      width: b.r, height: b.r, background: b.tinta, animationDelay: b.ritardo + "s" }} />)}
    <svg className="scena-paese" viewBox="0 0 1000 220" preserveAspectRatio="xMidYMax slice">
      <path d="M0 220V150l60-24 50 16 70-40 40 20V96l18-14 18 14v26l46-30 60 36 34-12 26 14V60l14-22 14 22v70l40-24 54 28 46-34 64 30 40-14 30 18 50-40 42 30 34-18 70 30 80-16v134Z" />
      {[[248, 118], [262, 118], [470, 150], [486, 150], [700, 148], [830, 160]].map(([x, y], i) =>
        <rect key={i} x={x} y={y} width="7" height="10" className="finestra" />)}
    </svg>
    <svg className="scena-luminarie" viewBox="0 0 1000 130" preserveAspectRatio="none">
      <path d="M0 10Q250 120 500 18Q750 120 1000 10" />
    </svg>
    <div className="scena-lampadine">
      {LUMINARIE.map((l, i) => <span key={i} style={{ left: l.x / 10 + "%", top: `calc(${l.y / 130} * var(--alt-luminarie))`,
        animationDelay: (i % 5) * -.7 + "s" }} data-tinta={i % 3} />)}
    </div>
    <div className="scena-fumo"><i /><i /><i /><i /></div>
  </div>;
}

function Pezzo({ taglio }: { taglio: Taglio }) {
  return <svg viewBox="0 0 12 40" className="pezzo" data-taglio={taglio} aria-hidden="true">
    <rect x="5.3" y="0" width="1.4" height="40" rx=".7" className="pezzo-stecco" />
    {[2, 9, 16, 23].map((y, i) => <rect key={y} x="1.2" y={y} width="9.6" height="6.4" rx="1.8"
      className={taglio === "classico" && i % 2 ? "pezzo-grasso" : "pezzo-carne"} />)}
  </svg>;
}

function Elenco({ righe, personale }: { righe: Riga[]; personale?: string }) {
  return <ol className="elenco">{righe.map((r, i) =>
    <li key={i} data-podio={i < 3 ? i + 1 : undefined} data-mio={personale === r.nome || undefined}>
      <span className="elenco-pos">{i + 1}</span><span className="elenco-nome">{r.nome}</span><b>{punti(r.punti)}</b>
    </li>)}</ol>;
}

function useConteggio(obiettivo: number, attivo: boolean) {
  const [valore, setValore] = useState(0);
  useEffect(() => {
    if (!attivo) return;
    let frame = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      setValore(Math.round(obiettivo * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(passo);
    };
    frame = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frame);
  }, [obiettivo, attivo]);
  return attivo ? valore : 0;
}

export default function Fornacella() {
  const [stato, setStato] = useState<Stato>("pronto");
  const [gara, setGara] = useState(() => new Servizio(0));
  const [, aggiorna] = useReducer(n => n + 1, 0);
  const [mese, setMese] = useState("");
  const [record, setRecord] = useState(0);
  const [lista, setLista] = useState<Classifica | null>(null);
  const [erroreLista, setErroreLista] = useState(false);
  const [nome, setNome] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [pubblicato, setPubblicato] = useState(false);
  const [salva, setSalva] = useState(false);
  const [ticket, setTicket] = useState<Biglietto | null>(null);
  const [conto, setConto] = useState(3);
  const [muto, setMuto] = useState(false);
  const [nuovoRecord, setNuovoRecord] = useState(false);
  const mosse = useRef<Tocco[]>([]);
  const inizio = useRef(0);
  const bloccato = useRef(false);
  const recordPrima = useRef(0);
  const avvio = useRef<AbortController | null>(null);
  const lettura = useRef<AbortController | null>(null);
  const traccia = useRef({ esiti: ["", "", ""], lati: [1, 1, 1], servite: 0, avvisoFino: 0 });

  function leggiLista() {
    lettura.current?.abort();
    const controller = new AbortController();
    lettura.current = controller;
    richiesta<Classifica>(undefined, controller.signal).then(dati => {
      if (controller.signal.aborted) return;
      setLista(dati);
      setMese(m => m || dati.mese);
      setErroreLista(false);
      if (dati.personale) setNome(n => n || dati.personale!.nome);
    }).catch(() => { if (!controller.signal.aborted) setErroreLista(true); });
  }
  useEffect(() => {
    void leggiLista();
    try {
      const salvato = localStorage.getItem("fornacella.muto") === "1";
      suoni.impostaMuto(salvato);
      if (salvato) queueMicrotask(() => setMuto(true));
    } catch { /* preferenza non disponibile */ }
    return () => { lettura.current?.abort(); avvio.current?.abort(); suoni.spegniCrepitio(); };
  }, []);

  function cambiaAudio() {
    const nuovo = !muto;
    setMuto(nuovo);
    suoni.impostaMuto(nuovo);
    if (!nuovo) suoni.preparaAudio();
    try { localStorage.setItem("fornacella.muto", nuovo ? "1" : "0"); } catch { /* ignora */ }
  }

  // Confronta lo stato del servizio con l'ultimo visto e suona gli eventi nuovi.
  function rileva(g: Servizio) {
    const t = traccia.current;
    g.spiedi.forEach((s, i) => {
      if (s.esito && s.esito !== t.esiti[i]) {
        if (s.esito.startsWith("+")) { suoni.servito(g.combo); vibra(12); }
        else { suoni.errore(); vibra([35, 40, 35]); }
      } else if (!s.esito && s.lato === 2 && t.lati[i] === 1) suoni.sfrigola();
      t.esiti[i] = s.esito;
      t.lati[i] = s.lato;
    });
    if (g.servite > t.servite) suoni.comanda();
    else if (g.avvisoFino !== t.avvisoFino && g.avviso === "Comanda scaduta") suoni.scaduta();
    t.servite = g.servite;
    t.avvisoFino = g.avvisoFino;
  }

  async function accendi() {
    if (bloccato.current) return;
    bloccato.current = true;
    suoni.preparaAudio();
    suoni.accendiCrepitio();
    setStato("accensione");
    setMessaggio("");
    setPubblicato(false);
    setTicket(null);
    const controller = new AbortController();
    avvio.current = controller;
    let stagione = meseDiGara();
    let scaduto = false;
    const timeout = window.setTimeout(() => { scaduto = true; controller.abort(); }, 4500);
    try {
      const biglietto = await richiesta<Biglietto>({ azione: "inizia" }, controller.signal);
      stagione = biglietto.mese;
      setTicket(biglietto);
    } catch {
      if (controller.signal.aborted && !scaduto) return;
      setMessaggio("Modalità allenamento: il record si salva solo su questo dispositivo.");
    } finally { clearTimeout(timeout); }
    if (controller.signal.aborted && !scaduto) return;
    setMese(stagione);
    const migliore = recordLocale(stagione);
    recordPrima.current = migliore;
    setRecord(migliore);
    setGara(new Servizio(braceCalda(stagione)));
    setConto(3);
    setStato("conto");
  }

  // Durante conto e servizio la pagina resta ferma sul banco (vedi .forno-bloccato).
  const bloccaScroll = stato === "conto" || stato === "gioco";
  useEffect(() => {
    if (!bloccaScroll) return;
    // Il banco sta tutto in un viewport partendo dall'alto: si torna in cima e poi si fissa il body.
    window.scrollTo(0, 0);
    document.documentElement.classList.add("forno-bloccato");
    return () => document.documentElement.classList.remove("forno-bloccato");
  }, [bloccaScroll]);

  // Conto alla rovescia: il cronometro del servizio parte solo al "Via!".
  useEffect(() => {
    if (stato !== "conto") return;
    suoni.tic();
    const t = window.setTimeout(() => {
      if (conto > 1) { setConto(conto - 1); return; }
      mosse.current = [];
      traccia.current = { esiti: ["", "", ""], lati: [1, 1, 1], servite: 0, avvisoFino: 0 };
      inizio.current = performance.now();
      suoni.tic(true);
      setStato("gioco");
    }, 680);
    return () => clearTimeout(t);
  }, [stato, conto]);

  useEffect(() => {
    if (stato !== "gioco") return;
    let frame = 0;
    function tick() {
      const tempo = Math.floor(performance.now() - inizio.current);
      if (tempo >= DURATA) {
        gara.avanza(DURATA);
        rileva(gara);
        setRecord(recordLocale(mese, gara.punti));
        setNuovoRecord(gara.punti > 0 && gara.punti > recordPrima.current);
        bloccato.current = false;
        suoni.spegniCrepitio();
        suoni.fischio();
        setStato("fine");
        return;
      }
      if (tempo - gara.tempo >= 32) { gara.avanza(tempo); rileva(gara); aggiorna(); }
      frame = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(frame);
  }, [stato, gara, mese]);

  function tocca(i: number, istante: number) {
    if (stato !== "gioco" || mosse.current.length >= LIMITE_TOCCHI) return;
    const tempo = Math.max(gara.tempo, Math.floor(istante - inizio.current));
    if (tempo >= DURATA) return;
    mosse.current.push([tempo, i]);
    gara.tocca(tempo, i);
    rileva(gara);
    aggiorna();
  }

  // Da tastiera: 1 2 3 (oppure A S D) per i tre spiedini.
  useEffect(() => {
    if (stato !== "gioco") return;
    function tasto(e: KeyboardEvent) {
      const posto = TASTI[e.key.toLowerCase()];
      if (posto === undefined || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      tocca(posto, e.timeStamp);
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
    // Durante il servizio stato e gara non cambiano; mosse e inizio sono ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stato, gara]);

  async function pubblica() {
    if (salva || !ticket) return;
    setSalva(true);
    setMessaggio("");
    try {
      const dati = await richiesta<Classifica>({ azione: "pubblica", ...ticket, nome, tocchi: mosse.current });
      lettura.current?.abort();
      setLista(dati);
      setErroreLista(false);
      setPubblicato(true);
    } catch (err) { setMessaggio(err instanceof Error ? err.message : "Riprova a pubblicare."); }
    finally { setSalva(false); }
  }

  const attivo = stato === "gioco";
  const accesa = stato === "accensione" || stato === "conto" || attivo;
  const finale = useConteggio(gara.punti, stato === "fine");
  const caldo = mese ? braceCalda(mese) : null;
  const resto = Math.max(0, DURATA - gara.tempo);
  const scadenza = Math.max(0, Math.ceil((Math.min(DURATA, gara.ordine.scadenza) - gara.tempo) / 1000));
  const ordine = [gara.ordine.classico ? gara.ordine.classico + (gara.ordine.classico === 1 ? " classico" : " classici") : "",
    gara.ordine.fegato ? gara.ordine.fegato + " al fegato" : ""].filter(Boolean).join(" + ");
  const stagioneLista = lista?.mese || mese;
  const faseCorrente = Math.floor(gara.tempo / 15000);
  const bannerFase = attivo && faseCorrente > 0 && gara.tempo - faseCorrente * 15000 < 1800;
  const bannerAvviso = attivo && gara.avvisoFino > gara.tempo;

  return <div className="forno-gioco" data-stato={stato}>
    <Scena />
    <section className="palco" aria-label="Banco di cottura">
      <div className="hud">
        <div className="hud-punti"><small>Punti</small><b>{punti(gara.punti)}</b></div>
        <div className="hud-tempo" data-urgente={attivo && resto <= 10_000}>
          <small>Servizio</small>
          <div className="miccia" aria-hidden="true"><span style={{ "--resto": resto / DURATA } as CSSProperties} /></div>
          <b>{Math.ceil(resto / 1000)}<span>s</span></b>
        </div>
        <div className="hud-combo" data-livello={attivo ? gara.combo : 1}>
          <Flame size={18} aria-hidden="true" /><b>×{gara.combo}</b><small>combo</small>
        </div>
        <button type="button" className="hud-audio" onClick={cambiaAudio}
          aria-label={muto ? "Attiva i suoni" : "Disattiva i suoni"} aria-pressed={!muto}>
          {muto ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
      </div>

      <div className="comanda">
        <div className="comanda-carta" key={gara.ordine.scadenza}>
          <small>Comanda · {gara.fase}</small>
          <div className="comanda-pezzi" aria-hidden="true">
            {Array.from({ length: gara.ordine.classico }, (_, k) => <Pezzo key={"c" + k} taglio="classico" />)}
            {Array.from({ length: gara.ordine.fegato }, (_, k) => <Pezzo key={"f" + k} taglio="fegato" />)}
          </div>
          <strong>{ordine}</strong>
          <span className="comanda-tempo" data-urgente={attivo && scadenza <= 3}>{scadenza}s</span>
        </div>
      </div>

      <div className="fornacella" data-accesa={accesa} data-fine={stato === "fine"}>
        <div className="fornacella-bagliore" aria-hidden="true" />
        <div className="fornacella-vasca" aria-hidden="true">
          <div className="fornacella-braci" />
        </div>
        <div className="fornacella-fronte" aria-hidden="true"><span>Fornacella</span></div>
        <div className="scintille" aria-hidden="true">
          {SCINTILLE.map((s, i) => <i key={i} style={{ left: s.x + "%", animationDuration: s.durata + "s",
            animationDelay: s.ritardo + "s", "--deriva": s.deriva + "px", "--scala": s.scala } as CSSProperties} />)}
        </div>
        {gara.spiedi.map((s, i) => {
          const progress = attivo && !s.esito ? gara.cottura(s) : 0;
          const pronto = attivo && !s.esito && progress >= s.soglia && progress < .94;
          const esito = !attivo || !s.esito ? "" : s.esito.startsWith("+") ? "servito" : s.esito === "Crudo!" ? "crudo" : "bruciato";
          const cotto = esito === "servito" ? .92 : esito === "bruciato" ? 1 : esito === "crudo" ? (s.lato === 1 ? .12 : .6)
            : Math.min(1, s.lato === 1 ? progress * .55 : .55 + progress * .45);
          const bruc = esito === "bruciato" ? 1 : esito ? 0 : Math.min(1, Math.max(0, (progress - .84) / .12));
          const azione = !attivo ? (stato === "conto" ? "Pronto" : "In attesa") : esito === "servito" ? "Servito!" : s.esito ||
            (pronto ? s.lato === 1 ? "Gira!" : "Servi!" : progress >= .94 ? "Tardi!" : s.lato === 1 ? "1º lato" : "2º lato");
          return <button key={i} type="button" disabled={!attivo} className="spiedo"
            onPointerDown={e => { if (e.button === 0) tocca(i, e.timeStamp); }}
            onClick={e => { if (e.detail === 0) tocca(i, e.timeStamp); }}
            data-pronto={pronto} data-esito={esito || undefined} data-lato={s.lato} data-taglio={s.taglio}
            data-caldo={i === caldo && accesa} aria-label={POSTI[i] + ", " + s.taglio + ", " + azione}
            aria-keyshortcuts={String(i + 1)}
            style={{ "--livello": Math.min(1, progress), "--soglia": s.soglia, "--cotto": cotto, "--bruc": bruc } as CSSProperties}>
            <span className="spiedo-cartellino">{s.taglio === "classico" ? "Classico" : "Fegato"}
              {i === caldo && <Flame size={13} aria-label="Brace viva" />}</span>
            <span className="spiedo-calore" aria-hidden="true" />
            <span className="spiedo-corpo" key={s.ciclo} aria-hidden="true">
              <span className="spiedo-stecco" />
              <span className="spiedo-carne"><i /><i /><i /><i /><i /><i /><i /></span>
              {attivo && <span className="spiedo-fumo"><i /><i /><i /></span>}
            </span>
            {esito && <span className="spiedo-esito" key={"e" + s.ciclo} aria-hidden="true">{s.esito}</span>}
            <span className="spiedo-comandi" aria-hidden="true">
              <span className="spiedo-barra" />
              <span className="spiedo-azione">{azione}</span>
              <kbd>{i + 1}</kbd>
            </span>
          </button>;
        })}
        {bannerFase && <div className="banner" data-tipo="fase" key={"fase" + faseCorrente} aria-hidden="true">
          <b>{gara.fase}!</b><span>Il servizio accelera</span></div>}
        {bannerAvviso && <div className="banner" key={gara.avvisoFino} aria-hidden="true"
          data-tipo={gara.avviso.startsWith("Comanda servita") ? "ok" : "ko"}><b>{gara.avviso}</b></div>}
        {attivo && gara.tempo < 700 && <div className="banner" data-tipo="via" aria-hidden="true"><b>Via!</b></div>}
      </div>

      <p role="status" className="forno-avviso">{attivo && gara.avvisoFino > gara.tempo ? gara.avviso :
        stato === "fine" ? `Servizio finito · ${gara.servite} ${gara.servite === 1 ? "comanda completata" : "comande completate"}` :
        attivo ? "Tocca Gira! quando la barra è nell'oro, poi Servi! sul secondo lato." :
        messaggio || "Tocca gli spiedini quando appare Gira! o Servi!"}</p>
      {attivo && messaggio && <p className="forno-allenamento">Allenamento</p>}

      {(stato === "pronto" || stato === "accensione") && <div className="sipario" data-tipo="intro">
        <div className="intro-carta">
          <p className="sipario-occhiello">Il gioco di Sagramanije</p>
          <h1>La Fornacella</h1>
          <p className="sipario-sotto">Hai 45 secondi per cuocere gli arrosticini e servire la piazza.</p>
          <ol className="passi">
            <li><span><b>Gira</b> lo spiedino quando la barra entra nella zona dorata.</span></li>
            <li><span><b>Servilo</b> sul secondo lato, prima che bruci.</span></li>
            <li><span><b>Completa la comanda</b> in tempo per il bonus.</span></li>
          </ol>
          <button className="forno-azione" disabled={stato === "accensione"} onClick={accendi}>
            <Flame size={19} aria-hidden="true" />{stato === "accensione" ? "Accensione…" : "Accendi la brace"}
          </button>
          <p className="sipario-nota">{stagioneLista ? "Classifica di " + nomeMese(stagioneLista) : "Classifica mensile"} · da tastiera 1 2 3</p>
        </div>
      </div>}

      {stato === "conto" && <div className="sipario" data-tipo="conto" aria-live="assertive">
        <span key={conto} className="conto">{conto}</span>
        <p>Scalda la brace…</p>
      </div>}

      {stato === "fine" && <div className="sipario" data-tipo="fine">
        <div className="fine-carta">
          <p className="sipario-occhiello">Servizio finito</p>
          <h2><span>{punti(finale)}</span> punti</h2>
          {nuovoRecord && <p className="fine-record"><Trophy size={16} aria-hidden="true" /> Nuovo record del mese!</p>}
          <dl className="fine-dati">
            <div><dt>Comande</dt><dd>{gara.servite}</dd></div>
            <div><dt>Record del mese</dt><dd>{punti(record)}</dd></div>
          </dl>
          {ticket && gara.punti > 0 && !pubblicato && <form onSubmit={e => { e.preventDefault(); void pubblica(); }}>
            <label>Soprannome in classifica
              <input value={nome} onChange={e => setNome(e.target.value)} required minLength={2} maxLength={24}
                autoComplete="nickname" placeholder="Es. Re dello spiedo" /></label>
            <button className="forno-secondario" disabled={salva}><Trophy size={17} aria-hidden="true" />
              {salva ? "Pubblicazione…" : "Pubblica il punteggio"}</button>
          </form>}
          {pubblicato && lista?.personale && <p role="status" className="fine-posto">
            Sei al <b>{lista.personale.posizione}º posto</b> con {punti(lista.personale.punti)} punti.</p>}
          {messaggio && <p role="status" className="fine-messaggio">{messaggio}</p>}
          <div className="fine-azioni">
            <button className="forno-azione" disabled={salva} onClick={accendi}>
              <RotateCcw size={18} aria-hidden="true" />Rigioca</button>
            <a className="forno-secondario" target="_blank" rel="noopener noreferrer"
              href={"https://wa.me/?text=" + encodeURIComponent(`Ho fatto ${punti(gara.punti)} punti alla Fornacella. Mi batti? ${window.location.origin}/fornacella`)}>
              <MessageCircle size={17} aria-hidden="true" />Sfida su WhatsApp</a>
          </div>
        </div>
      </div>}
    </section>

    <aside className="tabellone">
      <section className="tabellone-classifica" aria-labelledby="titolo-classifica">
        <header>
          <Trophy size={22} aria-hidden="true" />
          <div><h2 id="titolo-classifica">Classifica mensile</h2>
            <p>{stagioneLista ? nomeMese(stagioneLista) : "Stagione in corso"}</p></div>
        </header>
        {erroreLista ? <p>Classifica indisponibile. <button className="forno-link" onClick={leggiLista}>Riprova</button></p> :
          !lista ? <p className="tabellone-vuoto">Caricamento classifica…</p> : lista.migliori.length ?
            <Elenco righe={lista.migliori} personale={lista.personale?.nome} /> :
            <p className="tabellone-vuoto">Il podio è libero. Pubblica il tuo primo servizio.</p>}
        {lista?.personale && <p className="tabellone-mio">Il tuo posto · <b>{lista.personale.posizione}º</b> · {punti(lista.personale.punti)} punti</p>}
        {!!lista?.precedente.length && <details><summary>Podio di {nomeMese(lista.mesePrecedente)}</summary>
          <Elenco righe={lista.precedente} /></details>}
      </section>
      <details className="tabellone-regole"><summary>Come si gioca</summary>
        <p>Gira ogni spiedino e poi servilo quando la barra entra nella zona dorata. Tre cotture riuscite di fila portano la combo a ×3.</p>
        <p>Ogni 15 secondi il servizio accelera. Il fegato cuoce prima e completare una comanda in anticipo dà punti extra.</p>
        {caldo !== null && <p>Questo mese la brace sotto lo spiedino di {["sinistra", "centro", "destra"][caldo]} cuoce più in fretta. Il primo del mese inizia una nuova classifica.</p>}
        <p>Da computer puoi giocare con i tasti 1, 2 e 3 (oppure A, S e D).</p>
      </details>
    </aside>
  </div>;
}

