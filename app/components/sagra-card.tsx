import { Calendar, MapPin } from "lucide-react";
import type { SagraDemo } from "../data";
import StripedPlaceholder from "./striped-placeholder";

// Ricalca src/components/index/sagra-card.tsx dell'app.
export default function SagraCard({ sagra }: { sagra: SagraDemo }) {
  return (
    <article className="shrink-0 overflow-hidden rounded-3xl bg-surface">
      <div className="relative h-28">
        <StripedPlaceholder />
        <div className="relative flex items-start justify-between p-3.5">
          <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
            sagra
          </span>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold">
            {sagra.distanza}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="font-title text-lg leading-tight">{sagra.nome}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warm">
          <MapPin size={11} strokeWidth={2.5} />
          {sagra.citta}, {sagra.provincia}
        </p>
        <div className="my-2 h-px bg-warm/50" />
        <p className="flex items-center gap-2 text-[11px] font-bold">
          <Calendar size={13} className="text-primary" />
          {sagra.date}
        </p>
      </div>
    </article>
  );
}
