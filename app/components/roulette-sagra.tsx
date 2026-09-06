"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Dices, MapPin, Sparkles, Trophy } from "lucide-react";
import StripedPlaceholder from "./striped-placeholder";

export interface SagraRouletteItem {
  id: number;
  nome_sagra: string;
  slug: string;
  citta: string | null;
  provincia: string | null;
  category: string;
  locandinaUrl: string | null;
  dataFormatted: string;
}

interface RouletteSagraProps {
  sagre: SagraRouletteItem[];
}

export default function RouletteSagra({ sagre }: RouletteSagraProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentPick, setCurrentPick] = useState<SagraRouletteItem | null>(null);
  const [winner, setWinner] = useState<SagraRouletteItem | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filtra sagre con dati validi
  const pool = sagre.length > 0 ? sagre : [];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const spinRoulette = () => {
    if (isSpinning || pool.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    setShowConfetti(false);

    let speed = 50;
    let step = 0;
    const totalSteps = 22; // Circa 2.5 - 3 secondi di giro

    function tick() {
      const randomIdx = Math.floor(Math.random() * pool.length);
      setCurrentPick(pool[randomIdx]);
      step++;

      if (step < totalSteps) {
        // Rallenta gradualmente negli ultimi step
        if (step > totalSteps - 10) speed += 35;
        if (step > totalSteps - 5) speed += 70;
        if (step > totalSteps - 2) speed += 150;
        timerRef.current = setTimeout(tick, speed);
      } else {
        // Scelta finale
        const finalWinner = pool[randomIdx];
        setWinner(finalWinner);
        setIsSpinning(false);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }

    tick();
  };

  const displaySagra = winner ?? currentPick;
  const locandina = displaySagra?.locandinaUrl ?? null;

  return (
    <section
      id="roulette-sagra"
      className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#ec5a35]/10 via-cream to-surface p-6 sm:p-10 border-2 border-primary/20 shadow-sm"
      aria-label="Roulette delle sagre"
    >
      {/* Coriandoli animati in CSS puro */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-3 w-3 rounded-full opacity-90 animate-bounce"
              style={{
                left: `${(i * 3.7) % 100}%`,
                top: `${(i * 7) % 80}%`,
                backgroundColor: ["#ec5a35", "#3f9d6b", "#3c87f7", "#f59e0b", "#ec4899"][
                  i % 5
                ],
                transform: `rotate(${i * 24}deg)`,
                animationDuration: `${1.2 + (i % 5) * 0.3}s`,
                animationDelay: `${(i % 4) * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold text-primary-ink">
          <Dices size={15} />
          NON SAI DOVE ANDARE STASERA?
        </span>

        <h2 className="mt-3 font-title text-3xl sm:text-4xl text-ink">
          Tocc&apos; a &apos;ndà — La Roulette della Sagra
        </h2>

        <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
          Indeciso tra arrosticini, porchetta o timballo? Premi il pulsante e
          lascia scegliere al destino abruzzese!
        </p>

        {/* Display della sagra selezionata o in rotazione */}
        <div className="mt-8">
          {displaySagra ? (
            <div
              className={`mx-auto max-w-md overflow-hidden rounded-3xl bg-surface border-2 transition-all duration-300 ${
                winner
                  ? "border-primary shadow-lg scale-102 ring-4 ring-primary/10"
                  : "border-beige/80 shadow-xs"
              }`}
            >
              {/* Locandina */}
              <div className="relative h-36 w-full overflow-hidden bg-beige/40">
                <StripedPlaceholder />
                {locandina ? (
                  <Image
                    src={locandina}
                    alt={displaySagra.nome_sagra}
                    fill
                    sizes="448px"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute left-3 top-3">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-xs">
                    {displaySagra.category?.toLowerCase() ?? "sagra"}
                  </span>
                </div>
                {winner && (
                  <div className="absolute right-3 top-3">
                    <span className="flex items-center gap-1 rounded-full bg-green px-3 py-1 text-xs font-bold text-white shadow-xs animate-pulse">
                      <Trophy size={13} />
                      Scelta del destino!
                    </span>
                  </div>
                )}
              </div>

              {/* Informazioni */}
              <div className="p-5 text-left">
                <h3 className="font-title text-xl font-bold leading-tight text-ink">
                  {displaySagra.nome_sagra}
                </h3>

                {displaySagra.citta && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warm">
                    <MapPin size={13} strokeWidth={2.5} className="text-primary" />
                    {displaySagra.citta}
                    {displaySagra.provincia ? ` (${displaySagra.provincia})` : ""} — Abruzzo
                  </p>
                )}

                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink/80">
                  <Calendar size={13} className="text-primary" />
                  {displaySagra.dataFormatted}
                </p>

                {/* Azioni quando c'è il vincitore */}
                {winner && !isSpinning && (
                  <div className="mt-5 flex gap-2">
                    <Link
                      href={`/sagra/${winner.slug}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition-transform hover:-translate-y-0.5"
                    >
                      <Sparkles size={16} />
                      Andiamo qui! →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-36 max-w-md items-center justify-center rounded-3xl border-2 border-dashed border-beige bg-surface/60 p-6 text-muted">
              <p className="text-sm font-medium">
                🎲 Clicca sul pulsante qui sotto per far girare la ruota!
              </p>
            </div>
          )}
        </div>

        {/* Pulsante di lancio */}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={spinRoulette}
            disabled={isSpinning || pool.length === 0}
            className={`flex items-center gap-2.5 rounded-2xl px-8 py-4 font-title text-lg font-bold text-white shadow-md transition-all cursor-pointer ${
              isSpinning
                ? "bg-primary/70 cursor-not-allowed animate-pulse"
                : "bg-primary hover:bg-primary-ink hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            <Dices size={22} className={isSpinning ? "animate-spin" : ""} />
            {isSpinning
              ? "Tocc' a 'ndà... 🎡"
              : winner
                ? "Gira ancora! 🎲"
                : "Tocc' a 'ndà! (Gira la ruota) 🎲"}
          </button>
        </div>
      </div>
    </section>
  );
}
