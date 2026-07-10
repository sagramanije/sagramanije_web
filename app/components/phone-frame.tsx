import type { ReactNode } from "react";

export default function PhoneFrame({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <figure className={`flex shrink-0 flex-col items-center gap-4 ${className}`}>
      <div className="w-[300px] rounded-[2.75rem] bg-[#141414] p-[10px] shadow-[0_40px_70px_-25px_rgba(0,0,0,0.45)]">
        <div className="relative h-[620px] overflow-hidden rounded-[2.25rem] bg-cream">
          <div className="absolute left-1/2 top-2.5 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-[#141414]" />
          {children}
        </div>
      </div>
      {label ? (
        <figcaption className="font-title text-sm text-muted">{label}</figcaption>
      ) : null}
    </figure>
  );
}

export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pb-1 pt-3.5 text-[11px] font-bold">
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 18 12" className="h-2.5 w-4 fill-ink" aria-hidden>
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" opacity="0.3" />
        </svg>
        <svg viewBox="0 0 26 12" className="h-2.5 w-6" aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3"
            className="fill-none stroke-ink"
            strokeOpacity="0.4"
          />
          <rect x="2.5" y="2.5" width="14" height="7" rx="1.5" className="fill-ink" />
          <path d="M23 4v4a2.2 2.2 0 0 0 0-4Z" className="fill-ink" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}
