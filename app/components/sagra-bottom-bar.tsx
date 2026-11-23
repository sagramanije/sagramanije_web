"use client";

import { MessageCircle, Navigation } from "lucide-react";

interface SagraBottomBarProps {
  nomeSagra: string;
  citta: string | null;
  provincia: string | null;
  dataFormatted: string;
  url: string;
  mapsUrl: string;
}

export default function SagraBottomBar({
  nomeSagra,
  citta,
  provincia,
  dataFormatted,
  url,
  mapsUrl,
}: SagraBottomBarProps) {
  const luogo = citta ? `${citta}${provincia ? ` (${provincia})` : ""}` : "Abruzzo";

  const messaggio = [
    `🍢 *Uagliù, andiamo a ${nomeSagra}?*`,
    `📍 *Dove:* ${luogo}`,
    `📅 *Quando:* ${dataFormatted}`,
    `🚗 *Mappa, orari e meteo:* ${url}`,
    "",
    "Chi viene con la carovana? 🍻",
  ].join("\n");

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messaggio)}`;

  return (
    <div
      className="evento-barra fixed bottom-0 inset-x-0 z-40 border-t border-beige bg-cream/95 px-4 pt-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
      role="region"
      aria-label="Azioni rapide evento"
    >
      <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-beige bg-surface px-2 text-sm font-bold text-ink hover:border-ink"
          aria-label="Invita la comitiva su WhatsApp"
        >
          <MessageCircle size={15} />
          <span>Carovana</span>
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-2 text-sm font-bold text-cream hover:bg-primary-ink"
        >
          <Navigation size={14} />
          <span>Come arrivare</span>
        </a>
      </div>
    </div>
  );
}
