"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Users } from "lucide-react";

interface CarovanaWhatsAppProps {
  nomeSagra: string;
  citta: string | null;
  provincia: string | null;
  dataFormatted: string;
  url: string;
  className?: string;
}

export default function CarovanaWhatsApp({
  nomeSagra,
  citta,
  provincia,
  dataFormatted,
  url,
  className = "mt-8",
}: CarovanaWhatsAppProps) {
  const [copied, setCopied] = useState(false);

  const luogo = citta ? `${citta}${provincia ? ` (${provincia})` : ""}` : "Abruzzo";

  const messaggio = [
    `🍢 *Uagliù, andiamo a ${nomeSagra}?*`,
    `📍 *Dove:* ${luogo}`,
    `📅 *Quando:* ${dataFormatted}`,
    `🚗 *Mappa, orari e meteo:* ${url}`,
    "",
    "Chi ve, arspunnet però? 🍻",
  ].join("\n");

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messaggio)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messaggio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback se clipboard non accessibile
    }
  };

  return (
    <div className={`overflow-hidden rounded-3xl bg-surface p-6 sm:p-7 border border-beige/60 shadow-xs ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
          <Users size={22} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#128C7E]">
            Organizza la comitiva
          </p>
          <h2 className="font-title text-xl sm:text-2xl">
            Carovana WhatsApp
          </h2>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted leading-relaxed">
        Non andare alla sagra da solo: manda il messaggio pronto sul gruppo WhatsApp con link, date, mappa e previsioni meteo della serata!
      </p>

      {/* Anteprima messaggio */}
      <div className="mt-4 rounded-2xl bg-[#DCF8C6]/35 p-4 border border-[#25D366]/20 text-xs sm:text-sm text-ink/85 font-mono whitespace-pre-line leading-relaxed">
        {messaggio}
      </div>

      {/* Bottoni azione */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3.5 font-bold text-white shadow-xs transition-all hover:bg-[#20bd5a] hover:-translate-y-0.5"
        >
          <MessageCircle size={18} />
          WhatsApp
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-2xl bg-beige/40 px-5 py-3.5 text-sm font-bold text-ink transition-all hover:bg-beige cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={16} className="text-green font-bold" />
              <span className="text-green">Copiato!</span>
            </>
          ) : (
            <>
              <Copy size={16} className="text-muted" />
              <span>Copia</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
