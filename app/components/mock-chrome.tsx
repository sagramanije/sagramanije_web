import {
  CalendarDays,
  Info,
  MapPin,
  PartyPopper,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
} from "lucide-react";

export function MockHeader({ withTitle = true }: { withTitle?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-base font-medium text-primary">
        <MapPin size={16} strokeWidth={2.5} />
        Sulmona, AQ
      </p>
      {withTitle ? (
        <div className="mt-0.5 flex items-center justify-between">
          <h3 className="font-title text-[26px] leading-tight">
            Trova la tua sagra
          </h3>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
            <Info size={15} className="text-muted" />
          </span>
        </div>
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

// Dalla 1.2.1 periodo e distanza sono chip orizzontali. Lo spiedino per il
// raggio compare nel foglio modale solo dopo il tap su "Distanza".
export function MockFilters({
  activeDate = "all",
  distance,
  scrolled = false,
}: {
  activeDate?: "all" | "today" | "weekend";
  distance?: number;
  scrolled?: boolean;
}) {
  const options = [
    { value: "all", label: "Tutte", Icon: UtensilsCrossed },
    { value: "today", label: "Oggi", Icon: CalendarDays },
    { value: "weekend", label: "Weekend", Icon: PartyPopper },
  ] as const;

  return (
    <div className="mt-3 flex gap-1.5 overflow-hidden whitespace-nowrap">
      {options.map(({ value, label, Icon }, index) => {
        if (scrolled && index === 0) return null;
        const selected = value === activeDate;

        return (
          <span
            key={value}
            className={`flex shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 py-2 text-[10px] font-bold ${
              selected
                ? "border-primary bg-primary text-white"
                : "border-[#eadaca] bg-surface text-muted"
            }`}
          >
            <Icon size={13} />
            {label}
          </span>
        );
      })}
      <span
        className={`flex shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 py-2 text-[10px] font-bold ${
          distance
            ? "border-primary bg-primary text-white"
            : "border-[#eadaca] bg-surface text-muted"
        }`}
      >
        <SlidersHorizontal size={13} />
        {distance ? `Entro ${distance} km` : "Distanza"}
      </span>
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
