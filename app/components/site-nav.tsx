import Link from "next/link";
import { APP_STORE_URL } from "../data";
import { Wordmark } from "./wordmark";

export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-cream/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Percorsi assoluti, non semplici ancore: la nav vive anche fuori dalla home (es. /privacy). */}
        <Link href="/" aria-label="Sagramanije, vai alla home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-8">
          <ul className="hidden gap-8 text-sm font-semibold text-muted sm:flex">
            <li>
              <Link href="/sagre/abruzzo" className="hover:text-ink">
                Sagre in Abruzzo
              </Link>
            </li>
            <li>
              <Link href="/#come-funziona" className="hover:text-ink">
                Come funziona
              </Link>
            </li>
            <li>
              <Link href="/#schermate" className="hover:text-ink">
                Schermate
              </Link>
            </li>
            <li>
              <Link href="/#chi-siamo" className="hover:text-ink">
                Chi siamo
              </Link>
            </li>
          </ul>
          <a
            href={APP_STORE_URL}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Scarica l&apos;app
          </a>
        </div>
      </nav>
    </header>
  );
}
