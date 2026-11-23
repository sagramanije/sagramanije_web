import Link from "next/link";
import { ArrowDownToLine, Flame } from "lucide-react";
import { MERCATINI_PATH } from "../../lib/site";
import { Wordmark } from "./wordmark";

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-beige bg-cream/95 backdrop-blur">
      <nav aria-label="Navigazione principale" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-5 sm:px-6">
        <Link href="/" aria-label="Sagramanije, vai alla home" className="py-3.5"><Wordmark /></Link>
        <div className="order-last flex w-full justify-between gap-3 border-t border-beige py-2.5 text-xs font-bold text-muted sm:order-none sm:w-auto sm:gap-5 sm:border-0 sm:text-sm lg:gap-8">
          <Link href="/sagre/abruzzo" className="hover:text-primary-ink">Calendario sagre</Link>
          <Link href={MERCATINI_PATH} className="hover:text-primary-ink">Mercatini di Natale</Link>
          <Link href="/#prossime-sagre" className="hidden hover:text-primary-ink lg:inline">Esplora</Link>
          <Link href="/fornacella" className="flex items-center gap-1 text-primary-ink hover:text-ink">
            <Flame size={14} aria-hidden /> Gioca
          </Link>
        </div>
        <Link href="/scarica" className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-cream hover:bg-primary-ink sm:text-sm">
          Scarica l’app <ArrowDownToLine size={15} aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
