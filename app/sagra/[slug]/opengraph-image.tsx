import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "../../../lib/og";
import {
  formatIntervallo,
  getSagraBySlug,
  getSagreAbruzzo,
} from "../../../lib/sagre";

export const alt = "Sagre e feste di paese in Abruzzo";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Senza questo la card verrebbe ridisegnata a ogni scraping social, invece che
// una volta in build come la pagina che accompagna.
export async function generateStaticParams() {
  try {
    return (await getSagreAbruzzo()).map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Card generata da noi, non la locandina della fonte: quelle sono di terzi
  // e non ce le possiamo ripubblicare come anteprima social.
  let sagra;
  try {
    sagra = await getSagraBySlug(slug);
  } catch {
    sagra = undefined;
  }

  if (!sagra) {
    return ogCard({
      occhiello: "Sagre in Abruzzo",
      titolo: "Trova la tua sagra",
    });
  }

  const luogo = sagra.citta
    ? `${sagra.citta}${sagra.provincia ? ` (${sagra.provincia})` : ""}`
    : "Abruzzo";

  return ogCard({
    occhiello: luogo,
    titolo: sagra.nome_sagra,
    sottotitolo: formatIntervallo(sagra),
  });
}
