"use client";

import { MessageCircle, Navigation } from "lucide-react";

interface SagraBottomBarProps {
  nomeSagra: string;
  citta: string | null;
  provincia: string | null;
  dataFormatted: string;
  url: string;
  mapsUrl: string;
  conclusa: boolean;
}

export default function SagraBottomBar({
  nomeSagra,
  citta,
  provincia,
  dataFormatted,
  url,
  mapsUrl,
  conclusa,
}: SagraBottomBarProps) {
  const luogo = citta ? `${citta}${provincia ? ` (${provincia})` : ""}` : "Abruzzo";

  const messaggio = [
    `🍢 *Uagliù, andiamo a ${nomeSagra}?*`,
    `📍 *Dove:* ${luogo}`,
    `📅 *Quando:* ${dataFormatted}`,
    `🚗 *Mappa, orari e meteo:* ${url}`,
    "",
    "Chi viene stasera nella carovana? 🍻",
  ].join("\n");

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messaggio)}`;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t border-beige/80 bg-surface/95 p-3 px-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      role="region"
      aria-label="Azioni rapide sagra"
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        {/* Sintesi sagra a sinistra */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-title text-sm font-bold text-ink">
            {nomeSagra}
          </p>
          <p className="truncate text-xs font-semibold text-primary-ink">
            {dataFormatted}
          </p>
        </div>

        {/* Azioni rapide a destra */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Tasto Carovana WhatsApp */}
          {!conclusa && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-2xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-transform hover:bg-[#20bd5a] active:scale-95"
              aria-label="Invita la comitiva su WhatsApp"
            >
              <MessageCircle size={15} />
              <span>Carovana</span>
            </a>
          )}

          {/* Tasto Come arrivare */}
          {!conclusa && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-2xl bg-primary px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition-transform hover:bg-primary-ink active:scale-95"
            >
              <Navigation size={14} />
              <span>Mappa</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
