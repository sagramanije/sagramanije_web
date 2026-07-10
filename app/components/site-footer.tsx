import { EMAIL } from "../data";
import { Wordmark } from "./wordmark";

export default function SiteFooter() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <div className="flex flex-col gap-1 text-sm text-muted sm:items-end">
          <a href={`mailto:${EMAIL}`} className="font-semibold text-blue-ink">
            {EMAIL}
          </a>
          <p>Sagre e feste di paese dell&apos;Abruzzo.</p>
        </div>
      </div>
    </footer>
  );
}
