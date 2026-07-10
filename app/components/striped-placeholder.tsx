// Replica del placeholder dell'app (src/components/index/image-placeholder.tsx).
// Là è un pattern SVG con tile 45.254px: fondo primary @ 0.07 e triangoli @ 0.15
// sovrapposti. Le due opacità composite danno 0.07 e ~0.21, e le diagonali a 45°
// hanno periodo 45.254/√2 = 32px, cioè bande da 16px.
const STRIPES =
  "repeating-linear-gradient(135deg," +
  "rgba(236,90,53,0.21) 0 16px," +
  "rgba(236,90,53,0.07) 16px 32px)";

export default function StripedPlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 ${className}`}
      style={{ backgroundImage: STRIPES }}
    />
  );
}
