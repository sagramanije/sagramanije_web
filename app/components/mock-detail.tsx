import { ArrowLeft, Calendar, ChevronRight, MapPin } from "lucide-react";
import { SAGRA_DETTAGLIO } from "../data";
import { MapCanvas } from "./mock-map";
import StripedPlaceholder from "./striped-placeholder";
import { PinMark } from "./wordmark";

// Ricalca src/app/sagra/[id].tsx dell'app: hero alto, foglio crema che ci sale
// sopra e barra fissa in basso con "Come arrivare".
export default function MockDetail() {
  return (
    <div className="relative h-full">
      <div className="relative h-[210px]">
        <StripedPlaceholder />
        {/* nell'app qui c'è la locandina sotto uno scrim rgba(0,0,0,0.35);
            senza foto lo alleggeriamo, altrimenti le strisce diventano fango */}
        <div className="absolute inset-0 bg-black/15" />
        <span className="absolute left-4 top-14 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90">
          <ArrowLeft size={18} />
        </span>
      </div>

      <div className="-mt-9 rounded-3xl bg-cream px-5 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-bold tracking-wide text-primary-ink">
            SAGRA
          </span>
          <span className="text-[11px] font-bold">{SAGRA_DETTAGLIO.distanza}</span>
        </div>

        <h3 className="mt-3 font-title text-xl leading-tight">
          {SAGRA_DETTAGLIO.nome}
        </h3>
        <p className="text-[11px] font-medium text-muted">
          {SAGRA_DETTAGLIO.citta}, {SAGRA_DETTAGLIO.provincia}
        </p>

        {/* scorciatoia al programma: c'è solo per le sagre che ce l'hanno */}
        <div className="mt-4 flex items-center justify-between rounded-3xl bg-surface px-3 py-3.5 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
              <Calendar size={18} className="text-primary" />
            </span>
            <div>
              <p className="text-[11px] font-bold">{SAGRA_DETTAGLIO.date}</p>
              <p className="font-title text-base leading-tight">
                Programma completo
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="shrink-0 text-muted" />
        </div>

        <h4 className="mt-4 font-title text-sm">La sagra</h4>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          Due giorni di cortei storici, tamburi e tavolate nel centro di Sulmona.
        </p>

        <h4 className="mt-4 font-title text-sm">Dove</h4>
        <div className="relative mt-2 h-[70px] overflow-hidden rounded-2xl">
          <MapCanvas className="absolute inset-0 h-full w-full" />
          <PinMark className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary drop-shadow" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-surface px-5 pb-6 pt-4">
        <span className="mx-auto flex w-2/3 items-center justify-center gap-2 rounded-3xl bg-primary py-3.5 text-[13px] font-bold text-white">
          <MapPin size={15} />
          Come arrivare
        </span>
      </div>
    </div>
  );
}
