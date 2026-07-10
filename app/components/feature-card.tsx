import type { LucideIcon } from "lucide-react";

// Ricalca src/components/info/feature-card.tsx dell'app: icona in un riquadro
// tinta del proprio colore al 13% (`${color}22`), titolo e descrizione.
export default function FeatureCard({
  icon: Icon,
  color,
  title,
  description,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-6">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}22` }}
      >
        <Icon size={26} strokeWidth={1.75} style={{ color }} />
      </span>
      <div>
        <h3 className="font-title text-xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}
