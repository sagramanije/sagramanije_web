import { Info, MapPin, Search, UtensilsCrossed } from "lucide-react";

export function MockHeader({ withTitle = true }: { withTitle?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-base font-medium text-primary">
        <MapPin size={16} strokeWidth={2.5} />
        Sulmona, AQ
      </p>
      {withTitle ? (
        <h3 className="mt-0.5 font-title text-[26px] leading-tight">
          Trova la tua sagra
        </h3>
      ) : null}
    </div>
  );
}

export function MockSearch() {
  return (
    <div className="flex items-center gap-2 rounded-3xl bg-surface px-3.5 py-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
      <Search size={16} className="shrink-0 text-muted" />
      <span className="truncate text-[13px] text-muted">
        Cerca sagre, città o piatti...
      </span>
    </div>
  );
}

export function MockSlider() {
  return (
    <div className="mt-4">
      <div className="relative flex h-4 items-center">
        <div className="h-1.5 w-full rounded-full bg-[#e0e1e6]" />
        <div className="absolute h-1.5 w-1/2 rounded-full bg-primary" />
        <div className="absolute left-1/2 h-[18px] w-[18px] -translate-x-1/2 rounded-full bg-primary shadow" />
      </div>
      <p className="mt-1.5 text-[11px] font-bold">
        Nel raggio di: <span className="text-primary-ink">25 km</span>
      </p>
    </div>
  );
}

export function MockSwitcher({ isMap }: { isMap: boolean }) {
  return (
    <div className="flex rounded-xl bg-beige p-1 text-[11px] font-bold">
      <span
        className={`rounded-xl px-3 py-1.5 ${
          isMap ? "" : "bg-surface text-primary-ink"
        }`}
      >
        Lista
      </span>
      <span
        className={`rounded-xl px-3 py-1.5 ${
          isMap ? "bg-surface text-primary-ink" : ""
        }`}
      >
        Mappa
      </span>
    </div>
  );
}

export function MockTabBar({ active }: { active: "sagre" | "info" }) {
  return (
    <div className="mt-auto flex items-start justify-around border-t border-black/5 bg-surface/80 pb-5 pt-2.5 backdrop-blur">
      <span
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          active === "sagre" ? "text-primary-ink" : "text-muted"
        }`}
      >
        <UtensilsCrossed size={20} strokeWidth={2} />
        Sagre
      </span>
      <span
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          active === "info" ? "text-primary-ink" : "text-muted"
        }`}
      >
        <Info size={20} strokeWidth={2} />
        Info
      </span>
    </div>
  );
}
