import { APP_STORE_URL, PLAY_STORE_URL } from "../data";

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-current" aria-hidden>
      <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.79-3.33.79-.68 0-1.74-.77-2.87-.75-1.47.02-2.84.86-3.6 2.18-1.54 2.67-.39 6.62 1.1 8.79.74 1.06 1.61 2.25 2.76 2.2 1.11-.04 1.53-.71 2.87-.71 1.34 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.15.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.35-3.53M14.9 5.36c.61-.74 1.02-1.77.91-2.79-.88.03-1.94.58-2.57 1.32-.56.65-1.06 1.7-.92 2.7.98.08 1.98-.5 2.58-1.23" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
      <polygon points="3,2.5 13.5,12 3,21.5" fill="#00d3ff" />
      <polygon points="3,2.5 17.5,9.2 13.5,12" fill="#00f076" />
      <polygon points="17.5,9.2 21,12 17.5,14.8 13.5,12" fill="#ffce00" />
      <polygon points="3,21.5 13.5,12 17.5,14.8" fill="#ff3a44" />
    </svg>
  );
}

function Badge({
  href,
  eyebrow,
  name,
  children,
}: {
  href: string;
  eyebrow: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-white transition-transform hover:-translate-y-0.5"
    >
      {children}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-wide text-white/70">
          {eyebrow}
        </span>
        <span className="mt-1 font-title text-base">{name}</span>
      </span>
    </a>
  );
}

export default function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {/* <Badge href={APP_STORE_URL} eyebrow="Scarica su" name="App Store">
        <AppleGlyph />
      </Badge> */}
      <Badge href={PLAY_STORE_URL} eyebrow="Disponibile su" name="Google Play">
        <PlayGlyph />
      </Badge>
    </div>
  );
}
