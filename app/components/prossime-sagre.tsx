import { eConclusa, eMercatino, formatIntervallo, getSagreAbruzzo, PROVINCE, toISO, weekendCorrente } from "../../lib/sagre";
import Agenda, { type Appuntamento } from "./agenda";

export default async function ProssimeSagre() {
  const giornoItaliano = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  // Le date del catalogo sono giorni di calendario, memorizzati a mezzanotte locale.
  const oggi = new Date(giornoItaliano + "T00:00:00");
  const weekend = weekendCorrente(oggi);
  const catalogo = await getSagreAbruzzo().catch(() => null);
  const eventi: Appuntamento[] = (catalogo ?? []).filter(s => !eConclusa(s, oggi)).map(s => ({
    slug: s.slug,
    titolo: s.nome_sagra,
    citta: s.citta,
    provincia: s.provincia?.trim().toUpperCase() ?? "",
    tipo: eMercatino(s) ? "Mercatino" : s.category.trim().toLowerCase() === "sagra" ? "Sagra" : "Evento",
    date: formatIntervallo(s),
    giorno: s.data_inizio?.getDate() ?? null,
    mese: s.data_inizio?.toLocaleString("it-IT", { month: "short" }) ?? "",
    oggi: !!s.data_inizio && s.data_inizio <= oggi,
    weekend: !!s.data_inizio && s.data_inizio <= weekend.fine && (s.data_fine ?? s.data_inizio) >= weekend.inizio,
  }));
  return <Agenda key={toISO(oggi)} eventi={eventi} province={PROVINCE} disponibile={catalogo !== null} />;
}
