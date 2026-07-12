import Image from "next/image";

// Il marchio: pin con arrosticino, bianco su arancione.
// pin-mark.png è solo la sagoma bianca (fondo trasparente): il colore arriva
// da bg-primary, così resta agganciato al token del tema.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center overflow-hidden rounded-[22%] bg-primary ${className}`}
    >
      <Image
        src="/pin-mark.png"
        alt=""
        width={363}
        height={540}
        className="h-[64%] w-auto"
        priority
      />
    </span>
  );
}

// Il pin della mappa (assets/map/pin.png dell'app), non il logo.
export function PinMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <path
        d="M16 2c-5.52 0-10 4.37-10 9.78 0 7.32 8.62 18.4 9 18.87a1.28 1.28 0 0 0 2 0c.38-.47 9-11.55 9-18.87C26 6.37 21.52 2 16 2Z"
        fill="currentColor"
      />
      <circle cx="16" cy="11.6" r="3.9" fill="#fff7ee" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className="font-title text-xl tracking-tight">Sagramanije</span>
    </span>
  );
}
