import "server-only";
import {
  type GenerateContentParameters,
  type GenerateContentResponse,
  type GoogleGenAI,
} from "@google/genai";

const TENTATIVI_MASSIMI = 3;
const ATTESA_BASE_MS = 800;

function attesa(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messaggioDi(errore: unknown): string {
  return errore instanceof Error ? errore.message : String(errore);
}

function eSovraccarico(errore: unknown): boolean {
  const messaggio = messaggioDi(errore).toLowerCase();
  return (
    messaggio.includes("503") ||
    messaggio.includes("overloaded") ||
    messaggio.includes("high demand")
  );
}

/**
 * In caso di picchi di traffico Gemini risponde 503 anche su richieste
 * valide: un paio di retry con backoff risolvono la maggior parte dei casi
 * senza dover disturbare chi sta compilando il form.
 */
export async function generaContenutoConRetry(
  client: GoogleGenAI,
  richiesta: GenerateContentParameters,
): Promise<GenerateContentResponse> {
  for (let tentativo = 1; tentativo <= TENTATIVI_MASSIMI; tentativo++) {
    try {
      return await client.models.generateContent(richiesta);
    } catch (errore) {
      if (!eSovraccarico(errore) || tentativo === TENTATIVI_MASSIMI) throw errore;
      await attesa(ATTESA_BASE_MS * tentativo);
    }
  }
  throw new Error("Richiesta a Gemini fallita dopo i tentativi previsti.");
}

/** Messaggio utente per i casi noti (quota, sovraccarico); null se non riconosciuto. */
export function messaggioErroreGemini(errore: unknown): string | null {
  const messaggio = messaggioDi(errore).toLowerCase();
  if (messaggio.includes("429") || messaggio.includes("quota")) {
    return "Limite richieste raggiunto su Gemini (Errore 429). Riprova tra qualche minuto.";
  }
  if (eSovraccarico(errore)) {
    return "Il modello Gemini è momentaneamente sovraccarico (Errore 503). Riprova tra qualche secondo.";
  }
  return null;
}
