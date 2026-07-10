import { ArrowLeft, Calendar, Navigation } from "lucide-react";
import { SAGRA_DETTAGLIO } from "../data";
import { MapCanvas } from "./mock-map";
import StripedPlaceholder from "./striped-placeholder";
import { PinMark } from "./wordmark";

export default function MockDetail() {
  return (
    <div className="relative h-full">
      <div className="relative h-[170px]">
        <StripedPlaceholder />
        {/* nell'app qui c'è la locandina sotto uno scrim rgba(0,0,0,0.35);
            senza foto lo alleggeriamo, altrimenti le strisce diventano fango */}
        <div className="absolute inset-0 bg-black/15" />
        <span className="absolute left-4 top-14 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90">
          <ArrowLeft size={18} />
        </span>
      </div>

      <div className="px-5 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold tracking-wide text-primary-ink">
            SAGRA
          </span>
          <span className="text-[11px] font-bold">{SAGRA_DETTAGLIO.distanza}</span>
        </div>

        <h3 className="mt-2 font-title text-xl leading-tight">
          {SAGRA_DETTAGLIO.nome}
        </h3>
        <p className="text-[11px] font-medium text-muted">
          {SAGRA_DETTAGLIO.citta}, {SAGRA_DETTAGLIO.provincia}
        </p>

        <div className="mt-4 inline-flex flex-col rounded-3xl bg-surface p-3.5">
          <Calendar size={18} className="text-primary" />
          <span className="mt-3 text-[11px] font-medium">QUANDO</span>
          <span className="text-[11px] font-bold">{SAGRA_DETTAGLIO.date}</span>
        </div>

        <h4 className="mt-4 font-title text-sm">La sagra</h4>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Due giorni di cortei storici, tamburi e tavolate nel centro di Sulmona.
        </p>

        <h4 className="mt-4 font-title text-sm">Dove</h4>
        <div className="relative mt-2 h-[88px] overflow-hidden rounded-2xl">
          <MapCanvas className="absolute inset-0 h-full w-full" />
          <PinMark className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary drop-shadow" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-cream px-5 pb-6 pt-3">
        <span className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-[13px] font-bold text-white">
          <Navigation size={15} />
          Come arrivare
        </span>
      </div>
    </div>
  );
}
