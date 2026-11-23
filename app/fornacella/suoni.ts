// Effetti sonori sintetizzati con Web Audio: niente file da scaricare.
// Il contesto nasce solo dopo un gesto dell'utente (Accendi la brace),
// come chiedono i browser, e ogni chiamata è innocua se l'audio non c'è.

type Ctx = { audio: AudioContext; uscita: GainNode; rumore: AudioBuffer; crepitio?: number };
let ctx: Ctx | null = null;
let muto = false;

function rumoreBianco(audio: AudioContext) {
  const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const dati = buffer.getChannelData(0);
  for (let i = 0; i < dati.length; i++) dati[i] = Math.random() * 2 - 1;
  return buffer;
}

export function preparaAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) return;
      const audio = new Audio();
      const uscita = audio.createGain();
      uscita.gain.value = muto ? 0 : .7;
      uscita.connect(audio.destination);
      ctx = { audio, uscita, rumore: rumoreBianco(audio) };
    }
    if (ctx.audio.state === "suspended") void ctx.audio.resume();
  } catch { ctx = null; }
}

export function impostaMuto(valore: boolean) {
  muto = valore;
  if (ctx) ctx.uscita.gain.setTargetAtTime(valore ? 0 : .7, ctx.audio.currentTime, .05);
}

function soffio(durata: number, frequenza: number, volume: number, tipo: BiquadFilterType = "highpass", ritardo = 0) {
  if (!ctx || muto) return;
  const { audio, uscita, rumore } = ctx;
  const t = audio.currentTime + ritardo;
  const sorgente = audio.createBufferSource();
  sorgente.buffer = rumore;
  sorgente.loop = true;
  const filtro = audio.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.value = frequenza;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, t + durata);
  sorgente.connect(filtro).connect(gain).connect(uscita);
  sorgente.start(t, Math.random() * .5);
  sorgente.stop(t + durata + .05);
}

function nota(frequenza: number, durata: number, volume: number, ritardo = 0, forma: OscillatorType = "sine") {
  if (!ctx || muto) return;
  const { audio, uscita } = ctx;
  const t = audio.currentTime + ritardo;
  const osc = audio.createOscillator();
  osc.type = forma;
  osc.frequency.value = frequenza;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, t + durata);
  osc.connect(gain).connect(uscita);
  osc.start(t);
  osc.stop(t + durata + .05);
}

/** Lo sfrigolio dello spiedino girato sulla brace. */
export function sfrigola() { soffio(.55, 3200, .22); soffio(.3, 900, .08, "bandpass"); }

/** Arrosticino servito: un tintinnio che sale con la combo. */
export function servito(combo: number) {
  const base = [880, 988, 1175][Math.min(2, Math.max(0, combo - 1))];
  nota(base, .35, .16, 0, "triangle");
  nota(base * 1.5, .4, .08, .05, "sine");
}

/** Comanda completata: arpeggio da campanello del banco. */
export function comanda() {
  [784, 988, 1175, 1568].forEach((f, i) => nota(f, .5, .13, i * .07, "triangle"));
}

/** Crudo o bruciato: un tonfo sordo e una fiammata. */
export function errore() {
  nota(140, .3, .28, 0, "sawtooth");
  nota(95, .35, .22, .04, "sine");
  soffio(.4, 600, .16, "lowpass");
}

/** Comanda scaduta: due note che scendono. */
export function scaduta() { nota(523, .22, .12, 0, "square"); nota(392, .32, .1, .14, "square"); }

/** Fine del servizio. */
export function fischio() { nota(1318, .22, .12); nota(1046, .45, .12, .2); }

/** Conto alla rovescia prima del servizio. */
export function tic(ultimo = false) { nota(ultimo ? 1046 : 660, ultimo ? .4 : .12, .14, 0, "triangle"); }

/** Il crepitio di fondo della brace: piccoli schiocchi a caso finché resta accesa. */
export function accendiCrepitio() {
  if (!ctx || ctx.crepitio) return;
  const schiocco = () => {
    if (!ctx) return;
    if (!muto) soffio(.03 + Math.random() * .06, 1500 + Math.random() * 3500, .04 + Math.random() * .1, "bandpass");
    ctx.crepitio = window.setTimeout(schiocco, 60 + Math.random() * 380);
  };
  schiocco();
}

export function spegniCrepitio() {
  if (ctx?.crepitio) { clearTimeout(ctx.crepitio); ctx.crepitio = undefined; }
}
