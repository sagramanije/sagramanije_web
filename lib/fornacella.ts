export const DURATA = 45_000;
export const LIMITE_TOCCHI = 1500;
export type Taglio = "classico" | "fegato";
export type Tocco = [tempo: number, posto: number];

const FASI = [
  { nome: "Avvio", attesa: 12000, classici: 2, fegati: 0, classico: 2360, fegato: 0, soglia: .60 },
  { nome: "Piazza piena", attesa: 11500, classici: 1, fegati: 1, classico: 2190, fegato: 1790, soglia: .64 },
  { nome: "Rush", attesa: 10500, classici: 1, fegati: 2, classico: 1990, fegato: 1580, soglia: .68 },
];

export function meseDiGara(data = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit" }).format(data);
}

export function nomeMese(mese: string) {
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(mese + "-15T12:00:00Z"));
}

export function braceCalda(mese: string) {
  return (Number(mese.slice(-2)) - 1) % 3;
}

export const POSTI = ["sinistra", "centrale", "destra"];
type Spiedo = {
  taglio: Taglio; lato: number; inizio: number; durata: number; soglia: number;
  ciclo: number; esito: string;
};
type Comanda = { classico: number; fegato: number; scadenza: number };
function fase(tempo: number) {
  return FASI[Math.min(2, Math.floor(tempo / 15000))];
}
function comanda(tempo: number): Comanda {
  const f = fase(tempo);
  return { classico: f.classici, fegato: f.fegati, scadenza: tempo + f.attesa };
}

// Sia il browser sia il server avanzano agli stessi istanti di cottura,
// indipendentemente dalla frequenza di aggiornamento dello schermo.
export class Servizio {
  readonly spiedi: Spiedo[];
  ordine = comanda(0);
  tempo = 0;
  punti = 0;
  serie = 0;
  servite = 0;
  avviso = "";
  avvisoFino = 0;
  constructor(readonly caldo: number) {
    this.spiedi = POSTI.map((_, i) => this.prepara(i, 1, i * 475));
  }
  get fase() { return fase(this.tempo).nome; }
  get combo() { return Math.max(1, Math.min(3, this.serie)); }

  private prepara(posto: number, ciclo: number, inizio: number): Spiedo {
    const f = fase(inizio);
    const fegato = f.fegato > 0 && (posto === 1 || (posto === 2 && ciclo % 2 === 0));
    const durata = (fegato ? f.fegato : f.classico) + posto * 125;
    return { taglio: fegato ? "fegato" : "classico", lato: 1, inizio, ciclo,
      durata: Math.round(durata * (posto === this.caldo ? .85 : 1)), soglia: f.soglia, esito: "" };
  }
  private messaggio(testo: string) {
    this.avviso = testo;
    this.avvisoFino = this.tempo + 1600;
  }
  private ritira(s: Spiedo, buono: boolean, esito: string) {
    this.serie = buono ? this.serie + 1 : 0;
    s.esito = esito;
    s.inizio = this.tempo;
    s.durata = 460;
    if (!buono) return;
    const punti = this.combo * 100;
    s.esito = "+" + punti;
    this.punti += punti;
    if (!this.ordine[s.taglio]) return;
    this.ordine[s.taglio]--;
    if (this.ordine.classico + this.ordine.fegato === 0) {
      const bonus = 250 + 20 * Math.floor((this.ordine.scadenza - this.tempo) / 1000);
      this.punti += bonus;
      this.servite++;
      this.messaggio("Comanda servita! +" + bonus);
      this.ordine = comanda(this.tempo);
    }
  }
  avanza(fino: number) {
    const fine = Math.min(DURATA, Math.max(this.tempo, fino));
    for (;;) {
      const cambio = Math.min(this.ordine.scadenza, ...this.spiedi.map(s => s.inizio + s.durata));
      if (cambio > fine || cambio >= DURATA) break;
      this.tempo = cambio;
      if (this.ordine.scadenza === cambio) {
        this.messaggio("Comanda scaduta");
        this.ordine = comanda(cambio);
      }
      this.spiedi.forEach((s, i) => {
        if (s.inizio + s.durata !== cambio) return;
        if (s.esito) this.spiedi[i] = this.prepara(i, s.ciclo + 1, cambio);
        else this.ritira(s, false, "Bruciato!");
      });
    }
    this.tempo = fine;
  }
  cottura(s: Spiedo) { return Math.max(0, (this.tempo - s.inizio) / s.durata); }
  tocca(tempo: number, posto: number) {
    this.avanza(tempo);
    const s = this.spiedi[posto];
    if (this.tempo >= DURATA || this.tempo < s.inizio || s.esito) return;
    const cottura = this.cottura(s);
    if (cottura < s.soglia || cottura >= .94) this.ritira(s, false, cottura < s.soglia ? "Crudo!" : "Bruciato!");
    else if (s.lato === 1) {
      s.lato = 2;
      s.inizio = this.tempo;
      s.durata = Math.round(s.durata * .82);
    } else this.ritira(s, true, "");
  }
}
