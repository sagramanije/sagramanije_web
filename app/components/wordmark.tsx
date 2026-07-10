// Il marchio: tendone da sagra su fondo terracotta.
// Stesso disegno di app/icon.svg (la favicon) e public/logo.svg.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={className}>
      <rect x="0" y="0" width="512" height="512" rx="112" fill="#C1583D" />
      <path
        d="M185,158 L327,158 L382,263 L350.5,295 L319,263 L287.5,295 L256,263 L224.5,295 L193,263 L161.5,295 L130,263 Z"
        fill="#FBF6EF"
      />
      <rect x="148" y="300" width="16" height="55" rx="3" fill="#FBF6EF" />
      <rect x="348" y="300" width="16" height="55" rx="3" fill="#FBF6EF" />
    </svg>
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
      <LogoMark className="h-8 w-8 rounded-[0.45rem]" />
      <span className="font-title text-xl tracking-tight">Sagramanije</span>
    </span>
  );
}
