import "server-only";
import * as z from "zod";
import { SAGRE_REVALIDATE } from "./sagre";

const API_BASE_URL = process.env.SAGRE_API_BASE_URL;

const AttivitaApi = z.object({
  id: z.number(),
  giorno: z.coerce.date(),
  ora_inizio: z.string().nullable().catch(null),
  ora_fine: z.string().nullable().catch(null),
  titolo: z.string(),
  descrizione: z.string().nullable().catch(null),
});

const GiornoProgrammaApi = z.object({
  giorno: z.coerce.date(),
  attivita: z.array(AttivitaApi),
});

const ProgrammaApi = z.object({
  giorni: z.array(GiornoProgrammaApi),
});

export type Attivita = z.infer<typeof AttivitaApi>;
export type GiornoProgramma = z.infer<typeof GiornoProgrammaApi>;

/**
 * Il programma della sagra, dalla stessa API usata dall'app.
 *
 * L'endpoint è la fonte di verità: l'elenco /sagre/vicine non espone in modo
 * affidabile ha_attivita. Un programma assente o un errore dell'API non devono
 * impedire alla pagina della sagra di essere pubblicata.
 */
export async function getProgrammaSagra(id: number): Promise<GiornoProgramma[]> {
  if (!API_BASE_URL) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/sagre/${id}/attivita`, {
      next: { revalidate: SAGRE_REVALIDATE },
    });
    if (!res.ok) return [];

    const parsed = ProgrammaApi.safeParse(await res.json());
    if (!parsed.success) return [];

    return parsed.data.giorni.filter((giorno) => giorno.attivita.length > 0);
  } catch {
    return [];
  }
}
