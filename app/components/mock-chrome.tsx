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

// Il filtro distanza dell'app è uno spiedino di arrosticino: lo stecco è la
// traccia, i cubetti sono le tacche da 5 km. Cotti (arancioni) fino a quello
// selezionato, crudi dopo; l'ultimo è il grasso e vale "illimitato".
// Vedi src/components/index/distance-filter.tsx.
const SKEWER = {
  stick: "#c69963",
  stickShade: "#a97c4f",
  rawMeat: "#f0c8b4",
  fat: "#f5e6cd",
} as const;

const CUBE_COUNT = 11; // da 5 km a 50 km con passo 5, più la tacca "illimitato"
const SELECTED = 4; // 25 km
// inclinazioni fisse per indice: i cubetti veri non sono mai allineati
const tilt = (i: number) => ((i * 37) % 15) - 7;

export function MockSlider() {
  return (
    <div className="mt-4">
      <div className="relative flex h-7 items-center">
        <div className="h-[5px] w-full rounded-full" style={{ backgroundColor: SKEWER.stick }} />
        <div
          className="absolute h-[5px] rounded-full"
          style={{ width: `${(SELECTED / (CUBE_COUNT - 1)) * 100}%`, backgroundColor: SKEWER.stickShade }}
        />
        {Array.from({ length: CUBE_COUNT }, (_, i) => {
          const isSelected = i === SELECTED;
          const isCooked = i <= SELECTED;
          const isFat = i === CUBE_COUNT - 1;
          const size = isSelected ? 17 : 12;

          return (
            <span
              key={i}
              className="absolute rounded-[3px]"
              style={{
                width: size,
                height: size,
                left: `${(i / (CUBE_COUNT - 1)) * 100}%`,
                backgroundColor: isFat
                  ? SKEWER.fat
                  : isCooked
                    ? "#ec5a35"
                    : SKEWER.rawMeat,
                opacity: isCooked ? 1 : 0.6,
                transform: `translateX(-50%) rotate(${tilt(i)}deg)`,
                ...(isSelected && {
                  border: "1px solid #ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }),
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>5 km</span>
        <span>Illimitato</span>
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
