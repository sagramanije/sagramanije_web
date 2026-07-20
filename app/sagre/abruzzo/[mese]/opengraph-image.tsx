import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../../../../lib/og";
import {
  getSagreAbruzzo,
  mesiConSagre,
  parseMeseSlug,
  sagreNelMese,
} from "../../../../lib/sagre";

export const alt = "Sagre in Abruzzo, mese per mese";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Senza questo la card verrebbe ridisegnata a ogni scraping social, invece che
// una volta in build come la pagina che accompagna.
export async function generateStaticParams() {
  try {
    return mesiConSagre(await getSagreAbruzzo()).map((m) => ({ mese: m.slug }));
  } catch {
    return [];
  }
}

function maiuscola(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Image({
  params,
}: {
  params: Promise<{ mese: string }>;
}) {
  const { mese: slug } = await params;
  const mese = parseMeseSlug(slug);

  // La rotta è già passata da notFound() se lo slug è malformato: qui il
  // fallback serve solo a non far esplodere la generazione dell'immagine.
  if (!mese) {
    return ogCard({
      occhiello: "Sagre in Abruzzo",
      titolo: "Il calendario delle sagre abruzzesi",
    });
  }

  let quante: number | null = null;
  try {
    quante = sagreNelMese(await getSagreAbruzzo(), mese).length;
  } catch {
    quante = null;
  }

  return ogCard({
    occhiello: "Sagre in Abruzzo",
    titolo: `${maiuscola(mese.nome)} ${mese.anno}`,
    sottotitolo: quante
      ? `${quante} sagre e feste di paese, con date e paesi`
      : "Tutte le sagre e le feste di paese, con date e paesi",
  });
}
