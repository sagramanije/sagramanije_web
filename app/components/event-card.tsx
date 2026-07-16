import { Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Sagra } from "../../lib/sagre";
import { formatIntervallo, locandinaOriginale } from "../../lib/sagre";
import StripedPlaceholder from "./striped-placeholder";

// Card di una sagra vera (dall'API), nello stesso stile delle card mockup.
export default function EventCard({ sagra }: { sagra: Sagra }) {
  return (
    <Link
      href={`/sagra/${sagra.slug}`}
      className="block overflow-hidden rounded-3xl bg-surface transition-transform hover:-translate-y-1"
    >
      <div className="relative h-28">
        <StripedPlaceholder />
        {locandinaOriginale(sagra) ? (
          // Passa dal proxy /locandina/<id>: l'URL d'origine non arriva al browser.
          <Image
            src={`/locandina/${sagra.id}`}
            alt={`Locandina: ${sagra.nome_sagra}`}
            fill
            sizes="288px"
            className="object-cover"
          />
        ) : null}
        <div className="relative flex items-start justify-between p-4">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
            {sagra.category?.toLowerCase() ?? "sagra"}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-title text-lg leading-tight">{sagra.nome_sagra}</h3>
        {sagra.citta ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warm">
            <MapPin size={12} strokeWidth={2.5} />
            {sagra.citta}
            {sagra.provincia ? `, ${sagra.provincia}` : ""}
          </p>
        ) : null}
        <div className="my-3 h-px bg-warm/40" />
        <p className="flex items-center gap-2 text-xs font-bold">
          <Calendar size={14} className="shrink-0 text-primary" />
          {formatIntervallo(sagra)}
        </p>
      </div>
    </Link>
  );
}
