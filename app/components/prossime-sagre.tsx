import Link from "next/link";
import { getSagreAbruzzo } from "../../lib/sagre";
import EventCard from "./event-card";

// Le prossime sagre vere, dall'API dell'app. Se l'API è giù la home
// non deve rompersi: la sezione semplicemente non compare.
export default async function ProssimeSagre() {
  let prossime;
  try {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    prossime = (await getSagreAbruzzo())
      .filter((s) => (s.data_fine ?? s.data_inizio ?? oggi) >= oggi)
      .slice(0, 8);
  } catch {
    return null;
  }
  if (prossime.length === 0) return null;

  return (
    <section id="prossime-sagre" className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="font-title text-3xl sm:text-4xl">Le prossime sagre</h2>
            <p className="mt-3 max-w-xl text-muted">
              Qualcuna di quelle in calendario nei prossimi giorni, direttamente
              dall&apos;app.
            </p>
          </div>
          <Link
            href="/sagre/abruzzo"
            className="shrink-0 font-bold text-primary-ink hover:underline"
          >
            Tutte le sagre in Abruzzo →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-10 flex snap-x gap-6 overflow-x-auto pb-4">
          {prossime.map((s) => (
            <div key={s.slug} className="w-72 shrink-0 snap-start">
              <EventCard sagra={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
