import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../../../../lib/og";

// Card volutamente evergreen: niente conteggio né date, che cambiano ogni
// settimana e renderebbero l'anteprima subito vecchia nelle cache social.
export const alt = "Le sagre in Abruzzo di questo fine settimana";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({
    occhiello: "Sagre in Abruzzo",
    titolo: "Questo weekend",
    sottotitolo: "Cosa si mangia sabato e domenica, a due passi da casa",
  });
}
