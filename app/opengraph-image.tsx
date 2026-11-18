import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../lib/og";

import { temaNatalizio } from "../lib/modalita-natale";

// Anteprima di default: vale per ogni rotta che non ne definisca una propria.
export const alt = "Sagramanije — la guida alle piazze d’Abruzzo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  if (await temaNatalizio()) return ogCard({
    occhiello: "La guida di Natale", titolo: "Natale nelle piazze d’Abruzzo",
    sottotitolo: "Mercatini, sagre e feste di paese", natale: true,
  });
  return ogCard({
    occhiello: "Sagre in Abruzzo",
    titolo: "Trova la tua sagra",
    sottotitolo: "Sagre e feste di paese abruzzesi, su una mappa",
  });
}
