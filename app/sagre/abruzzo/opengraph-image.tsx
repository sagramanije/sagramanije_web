import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../../../lib/og";

export const alt = "Il calendario delle sagre e delle feste di paese in Abruzzo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    occhiello: "Il calendario",
    titolo: "Sagre in Abruzzo",
    sottotitolo: "Mese per mese, con date, orari e paesi",
  });
}
