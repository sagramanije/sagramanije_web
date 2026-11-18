import { ArrowRight, CalendarDays, Compass, MapPin, Store, Sun, Snowflake } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MERCATINI_PATH } from "../../lib/site";

export default function Copertina({ natale }: { natale: boolean }) {
  const Simbolo = natale ? Snowflake : Sun;
  const percorsi = [
    { icona: CalendarDays, titolo: "Questo weekend", dettaglio: "Da venerdì a domenica", href: "/sagre/abruzzo/questo-weekend" },
    { icona: Store, titolo: "Mercatini di Natale", dettaglio: "Date, borghi e piazze", href: MERCATINI_PATH },
    { icona: Compass, titolo: "Tutte le sagre", dettaglio: "Il calendario per mese", href: "/sagre/abruzzo" },
  ];
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-6">
      <section className="copertina">
        <div className="copertina-testo">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary-ink">
            <Simbolo size={17} aria-hidden /> {natale ? "La guida di Natale" : "La guida alle sagre"}
          </p>
          <h1 className="titolo-copertina">
            {natale ? "Natale nelle" : "In festa nelle"}<br />piazze<br /><em>d’Abruzzo.</em>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted sm:text-lg">
            {natale ? "Segui le luci dei borghi abruzzesi. Trova i mercatini di Natale, scegli una data e apri la mappa per arrivare in piazza."
              : "Dagli arrosticini sulla brace alla musica in piazza. Trova le sagre e le feste di paese in Abruzzo e scegli dove andare."}
          </p>
          <Link href="#prossime-sagre" className="pulsante-guida">
            Trova un appuntamento <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <figure className="cartolina">
          <Image src={natale ? "/mercatini-abruzzo.webp" : "/sagra-abruzzo.webp"} alt={natale
            ? "Illustrazione di un mercatino tra le case in pietra, con il Gran Sasso innevato sullo sfondo"
            : "Illustrazione di una sagra tra bancarelle e bandierine ai piedi del Gran Sasso"}
            width={1500} height={1000} preload sizes="(min-width: 1024px) 600px, (min-width: 768px) 50vw, 100vw" />
          <figcaption><span><MapPin size={13} aria-hidden /> Abruzzo, Italia</span><Simbolo size={16} aria-hidden /></figcaption>
        </figure>
      </section>
      <nav aria-label="Esplora il calendario" className="percorsi">
        {percorsi.map(({ icona: Icona, titolo, dettaglio, href }) => (
          <Link href={href} key={href} className="group flex min-w-0 items-center gap-3 py-4 sm:py-5">
            <span className="icona-percorso"><Icona size={21} strokeWidth={1.65} aria-hidden /></span>
            <span className="flex-1"><strong className="block font-title text-lg">{titolo}</strong><span className="text-xs text-muted">{dettaglio}</span></span>
            <ArrowRight size={16} aria-hidden className="text-primary-ink transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
