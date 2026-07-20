import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../lib/og";

// Anteprima di default: vale per ogni rotta che non ne definisca una propria.
export const alt = "Sagramanije — le sagre e le feste di paese dell'Abruzzo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    occhiello: "Sagre in Abruzzo",
    titolo: "Trova la tua sagra",
    sottotitolo: "Sagre e feste di paese abruzzesi, su una mappa",
  });
}
