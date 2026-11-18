import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../../../lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Il calendario dei mercatini di Natale in Abruzzo";

export default function Image() {
  return ogCard({
    occhiello: "La guida di Natale", titolo: "Mercatini di Natale in Abruzzo",
    sottotitolo: "Date, borghi e piazze sul calendario di Sagramanije",
    natale: true,
  });
}
