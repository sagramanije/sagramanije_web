import { getArchivioSagreAbruzzo, toISO } from "../../../lib/sagre";

// Serve sempre il dato fresco: la GitHub Action che legge questa rotta gira
// una volta al giorno e non deve trovarsi in mano una copia di ieri.
export const revalidate = 0;

/**
 * L'archivio aggiornato: sagre in cartellone + già archiviate, con gli slug
 * definitivi. La GitHub Action salva questa risposta in data/archivio-sagre.json
 * e la committa, così la logica degli slug vive in un posto solo (lib/sagre.ts)
 * invece di essere riscritta in uno script a parte che può divergere.
 */
export async function GET() {
  const sagre = await getArchivioSagreAbruzzo();

  return Response.json({
    aggiornato: new Date().toISOString(),
    sagre: sagre.map((s) => ({
      ...s,
      // Le date tornano stringhe ISO: il JSON dell'archivio deve poter essere
      // riletto dallo stesso schema che legge la risposta dell'API.
      data_inizio: s.data_inizio ? toISO(s.data_inizio) : null,
      data_fine: s.data_fine ? toISO(s.data_fine) : null,
    })),
  });
}
