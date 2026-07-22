// Sagre reali estratte dal dataset dell'app (src/dataset/sagre_italia.json),
// tenute qui a mano: al sito serve giusto qualche esempio per i mockup.
export type SagraDemo = {
  nome: string;
  citta: string;
  provincia: string;
  date: string;
  distanza: string;
};

export const SAGRE_DEMO: SagraDemo[] = [
  {
    nome: "Sagra dell'Aglio Rosso",
    citta: "Campo Di Fano",
    provincia: "AQ",
    date: "10 lug - 11 lug",
    distanza: "740 m",
  },
  {
    nome: "Festival del Boscaiolo",
    citta: "Campotosto",
    provincia: "AQ",
    date: "11 lug - 12 lug",
    distanza: "8.42 km",
  },
  {
    nome: "Un Borgo di Birra",
    citta: "Civitella Del Tronto",
    provincia: "TE",
    date: "13 lug - 19 lug",
    distanza: "14.90 km",
  },
  {
    nome: "Sagra della Marrocca",
    citta: "Casalincontrada",
    provincia: "CH",
    date: "22 lug - 26 lug",
    distanza: "23.15 km",
  },
];

export const SAGRA_DETTAGLIO: SagraDemo = {
  nome: "Giostra Cavalleresca",
  citta: "Sulmona",
  provincia: "AQ",
  date: "25 lug - 26 lug",
  distanza: "31.08 km",
};

// Ricalca il programma dell'app (schermata sagra/[id]/attivita): giorni in
// ordine, e dentro ogni giorno le attività ordinate per orario.
export type AttivitaDemo = {
  inizio: string;
  fine?: string;
  titolo: string;
  descrizione?: string;
};

export const PROGRAMMA_DEMO: { giorno: string; attivita: AttivitaDemo[] }[] = [
  {
    giorno: "Sabato 25 luglio",
    attivita: [
      {
        inizio: "10:00",
        fine: "12:00",
        titolo: "Corteo storico per il centro",
        descrizione: "Sbandieratori e tamburini dei sette sestieri.",
      },
      {
        inizio: "17:30",
        titolo: "Benedizione dei cavalieri",
      },
      {
        inizio: "19:00",
        fine: "23:30",
        titolo: "Apertura stand gastronomici",
        descrizione: "Porchetta, primi tipici e specialità locali.",
      },
      {
        inizio: "21:30",
        titolo: "Concerto in piazza Garibaldi",
        descrizione: "Musica dal vivo fino a mezzanotte.",
      },
    ],
  },
  {
    giorno: "Domenica 26 luglio",
    attivita: [
      {
        inizio: "09:30",
        titolo: "Mercatino dell'artigianato",
        descrizione: "Banchi di prodotti tipici lungo il corso.",
      },
      {
        inizio: "12:30",
        fine: "15:00",
        titolo: "Pranzo sotto l'acquedotto",
        descrizione: "Menù degustazione a cura dei ristoratori del paese.",
      },
      {
        inizio: "17:00",
        titolo: "Giostra e premiazione",
        descrizione: "La sfida tra i cavalieri dei sestieri.",
      },
      { inizio: "23:00", titolo: "Spettacolo pirotecnico" },
    ],
  },
];

export const EMAIL = "sagramanije@gmail.com";

// Contitolari del trattamento (art. 26 GDPR): dietro l'app ci sono due persone
// fisiche, quindi l'informativa deve nominarle entrambe, non solo il marchio.
export const PRIVACY_OWNER = "Andrea Damiani/Matteo Di Blasio";
export const PRIVACY_UPDATED = "13 luglio 2026";

// Da riempire quando gli store danno i link definitivi.
export const APP_STORE_URL = "#";
export const PLAY_STORE_URL = "#";
