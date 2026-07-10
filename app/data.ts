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

export const EMAIL = "sagramanije@gmail.com";

// Da riempire quando gli store danno i link definitivi.
export const APP_STORE_URL = "#";
export const PLAY_STORE_URL = "#";
