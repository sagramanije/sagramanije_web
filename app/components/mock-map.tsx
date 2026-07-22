import { Calendar, MapPin, Navigation, X } from "lucide-react";
import { SAGRA_DETTAGLIO } from "../data";
import { MockHeader, MockSwitcher, MockTabBar } from "./mock-chrome";
import { PinMark } from "./wordmark";
import { StatusBar } from "./phone-frame";

// I colori vengono da assets/map/style.json dell'app (basemap OSM).
export function MapCanvas({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <rect width="280" height="400" fill="#f8f4f0" />
      <path d="M-20 300 q80 -40 150 10 t170 -20 v130 h-340 Z" fill="#DEE3CD" />
      <ellipse cx="55" cy="90" rx="70" ry="48" fill="#d8e8c8" />
      <ellipse cx="240" cy="215" rx="60" ry="45" fill="#d8e8c8" />
      <path
        d="M-10 150 q60 30 110 5 t90 25 t100 -15"
        stroke="#a0c8f0"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />
      <g stroke="#e9ac77" fill="none" strokeLinecap="round">
        <path d="M-10 250 q90 -30 160 20 t140 -10" strokeWidth="7" />
        <path d="M60 -10 v120 q0 40 45 60 t50 90 v150" strokeWidth="5" />
        <path d="M290 60 q-80 20 -110 70 t-120 60" strokeWidth="3.5" />
      </g>
      <g fill="#cfcdca" opacity="0.8">
        <rect x="150" y="40" width="18" height="14" rx="2" />
        <rect x="175" y="55" width="12" height="18" rx="2" />
        <rect x="195" y="35" width="22" height="12" rx="2" />
        <rect x="30" y="320" width="16" height="16" rx="2" />
        <rect x="55" y="330" width="20" height="12" rx="2" />
      </g>
    </svg>
  );
}

// Nell'app i cluster sono cerchi pieni col bordo bianco da 3px e il raggio che
// cresce col numero di sagre (layer "clusters" in components/index/map.tsx).
function Cluster({ count, className }: { count: number; className: string }) {
  const size = count >= 25 ? 52 : count >= 10 ? 40 : 32;

  return (
    <span
      className={`absolute flex items-center justify-center rounded-full bg-primary/90 text-xs font-bold text-white ring-[3px] ring-white ${className}`}
      style={{ width: size, height: size }}
    >
      {count}
    </span>
  );
}

export default function MockMap() {
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="px-5 pt-3">
        <MockHeader withTitle={false} />
        <div className="my-3 flex items-center justify-between">
          <span className="text-[11px] font-bold">
            <span className="text-primary-ink">12</span> sagre vicine
          </span>
          <MockSwitcher isMap />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <MapCanvas className="absolute inset-0 h-full w-full" />

        <Cluster count={12} className="left-[14%] top-[14%]" />
        <Cluster count={4} className="right-[16%] top-[36%]" />
        <PinMark className="absolute left-[46%] top-[28%] h-8 w-8 text-primary drop-shadow" />
        <PinMark className="absolute left-[28%] top-[48%] h-8 w-8 text-primary drop-shadow" />
        <PinMark className="absolute right-[30%] bottom-[42%] h-8 w-8 text-primary drop-shadow" />

        {/* card che compare al tap su un pin singolo */}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-surface p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <X size={16} className="absolute right-3 top-3 text-ink" />
          <h3 className="pr-6 font-title text-base leading-tight">
            {SAGRA_DETTAGLIO.nome}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warm">
            <MapPin size={11} strokeWidth={2.5} />
            {SAGRA_DETTAGLIO.citta}, {SAGRA_DETTAGLIO.provincia}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[11px] font-bold">
            <Calendar size={13} className="text-primary" />
            {SAGRA_DETTAGLIO.date}
          </p>
          <span className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[12px] font-bold text-white">
            <Navigation size={14} fill="currentColor" />
            Indicazioni
          </span>
        </div>
      </div>

      <MockTabBar active="sagre" />
    </div>
  );
}
