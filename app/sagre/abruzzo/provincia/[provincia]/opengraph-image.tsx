import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../../../../../lib/og";
import {
  eConclusa,
  getSagreAbruzzo,
  PROVINCE,
  provinciaDaSlug,
  sagreDiProvincia,
} from "../../../../../lib/sagre";

export const alt = "Sagre e feste di paese, provincia per provincia in Abruzzo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return PROVINCE.map((p) => ({ provincia: p.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ provincia: string }>;
}) {
  const { provincia: slug } = await params;
  const prov = provinciaDaSlug(slug);

  if (!prov) {
    return ogCard({ occhiello: "Sagre in Abruzzo", titolo: "Trova la tua sagra" });
  }

  let quante: number | null = null;
  try {
    quante = sagreDiProvincia(await getSagreAbruzzo(), prov).filter(
      (s) => !eConclusa(s),
    ).length;
  } catch {
    quante = null;
  }

  return ogCard({
    occhiello: "Sagre in Abruzzo",
    titolo: `Provincia di ${prov.nome}`,
    sottotitolo:
      quante && quante > 0
        ? `${quante} sagre e feste di paese in programma`
        : "Sagre e feste di paese, con date e paesi",
  });
}
