import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Wordmark } from "../components/wordmark";
import { OG_DEFAULTS } from "../../lib/site";
import Fornacella from "./fornacella";
import "./fornacella.css";

const titolo = "La Fornacella, il gioco degli arrosticini abruzzesi";
const descrizione = "Cuoci gli arrosticini, gestisci le comande e sfida la classifica mensile di Sagramanije in un servizio di 45 secondi.";
export const metadata: Metadata = {
  title: titolo, description: descrizione, alternates: { canonical: "/fornacella" },
  openGraph: { ...OG_DEFAULTS, title: titolo, description: descrizione, url: "/fornacella" },
};
// La pagina è notturna: la barra del browser su mobile si intona alla scena.
export const viewport: Viewport = { themeColor: "#0e0a12" };

export default function Pagina() {
  return <main className="forno">
    <nav aria-label="Navigazione" className="forno-nav">
      <Link href="/" aria-label="Sagramanije, home"><Wordmark /></Link>
      <Link href="/sagre/abruzzo/questo-weekend">Sagre del weekend</Link>
    </nav>
    <Fornacella />
  </main>;
}
