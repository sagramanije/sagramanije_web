import { formatIntervallo, getSagreAbruzzo, locandinaProxyUrl } from "../../lib/sagre";
import RouletteSagra, { type SagraRouletteItem } from "./roulette-sagra";

export default async function SezioneRoulette() {
  let attive;
  try {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const sagre = await getSagreAbruzzo();
    attive = sagre.filter((s) => (s.data_fine ?? s.data_inizio ?? oggi) >= oggi);
  } catch {
    return null;
  }

  if (attive.length === 0) return null;

  const items: SagraRouletteItem[] = attive.map((s) => ({
    id: s.id,
    nome_sagra: s.nome_sagra,
    slug: s.slug,
    citta: s.citta,
    provincia: s.provincia,
    category: s.category,
    locandinaUrl: locandinaProxyUrl(s, "card"),
    dataFormatted: formatIntervallo(s),
  }));

  return (
    <section id="roulette" className="mx-auto max-w-6xl px-6 py-12">
      <RouletteSagra sagre={items} />
    </section>
  );
}
