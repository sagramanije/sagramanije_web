"use server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { revalidatePath } from "next/cache";
import { sessioneAdminValida } from "../../../lib/admin-auth";
import { conConnessioneDb } from "../../../lib/db";

export type StatoProgramma = {
  esito: "idle" | "errore" | "successo";
  messaggio: string;
  salvataggio?: number;
};

export type AttivitaProgrammaAdmin = {
  id: number;
  giorno: string | null;
  oraInizio: string | null;
  oraFine: string | null;
  titolo: string;
  descrizione: string | null;
};

export type ProgrammaAdmin = {
  attivita: AttivitaProgrammaAdmin[];
  errore?: string;
};

type SagraDb = RowDataPacket & {
  data_inizio: string | null;
  data_fine: string | null;
};

type AttivitaDb = RowDataPacket & {
  id: number;
  giorno: string | null;
  ora_inizio: string | null;
  ora_fine: string | null;
  titolo: string;
  descrizione: string | null;
};

type VoceProgramma = {
  giorno: string;
  oraInizio: string | null;
  oraFine: string | null;
  titolo: string;
  descrizione: string | null;
};

class ErroreValidazione extends Error {}

function interoPositivo(formData: FormData, nome: string): number {
  const valore = Number(formData.get(nome));
  if (!Number.isInteger(valore) || valore <= 0) {
    throw new ErroreValidazione("Seleziona una sagra valida.");
  }
  return valore;
}

function testo(
  formData: FormData,
  nome: string,
  massimo: number,
  obbligatorio = false,
): string | null {
  const grezzo = formData.get(nome);
  const valore = typeof grezzo === "string" ? grezzo.trim() : "";
  if (!valore) {
    if (obbligatorio) {
      throw new ErroreValidazione("Compila tutti i titoli del programma.");
    }
    return null;
  }
  if (valore.length > massimo) {
    throw new ErroreValidazione(
      `Un campo del programma supera il limite di ${massimo} caratteri.`,
    );
  }
  return valore;
}

function data(formData: FormData, nome: string): string {
  const valore = testo(formData, nome, 10, true);
  if (!valore || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) {
    throw new ErroreValidazione("Inserisci una data valida per ogni attività.");
  }
  const parsed = new Date(`${valore}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== valore
  ) {
    throw new ErroreValidazione("Inserisci una data valida per ogni attività.");
  }
  return valore;
}

function orario(formData: FormData, nome: string): string | null {
  const valore = testo(formData, nome, 5);
  if (!valore) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valore)) {
    throw new ErroreValidazione("Uno degli orari inseriti non è valido.");
  }
  return valore;
}

function leggiVoci(formData: FormData): VoceProgramma[] {
  const totale = Number(formData.get("totale_attivita"));
  if (!Number.isInteger(totale) || totale < 1 || totale > 50) {
    throw new ErroreValidazione(
      "Il programma deve contenere da 1 a 50 attività.",
    );
  }

  return Array.from({ length: totale }, (_, indice) => {
    const oraInizio = orario(formData, `ora_inizio_${indice}`);
    const oraFine = orario(formData, `ora_fine_${indice}`);

    return {
      giorno: data(formData, `giorno_${indice}`),
      oraInizio,
      oraFine,
      titolo: testo(formData, `titolo_${indice}`, 255, true)!,
      descrizione: testo(formData, `descrizione_${indice}`, 20_000),
    };
  });
}

export async function caricaProgramma(
  idSagra: number,
): Promise<ProgrammaAdmin> {
  if (!(await sessioneAdminValida())) {
    return {
      attivita: [],
      errore: "La sessione è scaduta. Ricarica la pagina ed effettua l’accesso.",
    };
  }
  if (!Number.isInteger(idSagra) || idSagra <= 0) {
    return { attivita: [], errore: "La sagra selezionata non è valida." };
  }

  try {
    const [righe] = await conConnessioneDb((connessione) =>
      connessione.execute<AttivitaDb[]>(
        `SELECT
          id,
          DATE_FORMAT(giorno, '%Y-%m-%d') AS giorno,
          TIME_FORMAT(ora_inizio, '%H:%i') AS ora_inizio,
          TIME_FORMAT(ora_fine, '%H:%i') AS ora_fine,
          titolo,
          descrizione
        FROM attivita
        WHERE id_sagra = ?
        ORDER BY giorno ASC, ora_inizio ASC, id ASC`,
        [idSagra],
      ),
    );

    return {
      attivita: righe.map((riga) => ({
        id: riga.id,
        giorno: riga.giorno,
        oraInizio: riga.ora_inizio,
        oraFine: riga.ora_fine,
        titolo: riga.titolo,
        descrizione: riga.descrizione,
      })),
    };
  } catch (errore) {
    console.error("Lettura programma fallita", errore);
    return {
      attivita: [],
      errore: "Non è stato possibile caricare il programma già inserito.",
    };
  }
}

export async function salvaProgramma(
  _stato: StatoProgramma,
  formData: FormData,
): Promise<StatoProgramma> {
  if (!(await sessioneAdminValida())) {
    return {
      esito: "errore",
      messaggio:
        "La sessione è scaduta. Ricarica la pagina ed effettua l’accesso.",
    };
  }

  try {
    const idSagra = interoPositivo(formData, "id_sagra");
    const voci = leggiVoci(formData);

    await conConnessioneDb(async (connessione) => {
      await connessione.beginTransaction();
      try {
        const [sagre] = await connessione.execute<SagraDb[]>(
          `SELECT
            DATE_FORMAT(data_inizio, '%Y-%m-%d') AS data_inizio,
            DATE_FORMAT(data_fine, '%Y-%m-%d') AS data_fine
          FROM sagre
          WHERE id = ?
          LIMIT 1
          FOR SHARE`,
          [idSagra],
        );
        const sagra = sagre[0];
        if (!sagra) {
          throw new ErroreValidazione("La sagra selezionata non esiste più.");
        }

        const fineSagra = sagra.data_fine ?? sagra.data_inizio;
        for (const [indice, voce] of voci.entries()) {
          if (
            sagra.data_inizio &&
            voce.giorno < sagra.data_inizio
          ) {
            throw new ErroreValidazione(
              `La data dell’attività ${indice + 1} precede l’inizio della sagra.`,
            );
          }
          if (fineSagra && voce.giorno > fineSagra) {
            throw new ErroreValidazione(
              `La data dell’attività ${indice + 1} supera la fine della sagra.`,
            );
          }
        }

        const placeholders = voci.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
        const valori = voci.flatMap((voce) => [
          idSagra,
          voce.giorno,
          voce.oraInizio,
          voce.oraFine,
          voce.titolo,
          voce.descrizione,
        ]);

        await connessione.execute<ResultSetHeader>(
          `INSERT INTO attivita (
            id_sagra, giorno, ora_inizio, ora_fine, titolo, descrizione
          ) VALUES ${placeholders}`,
          valori,
        );
        await connessione.commit();
      } catch (errore) {
        await connessione.rollback();
        throw errore;
      }
    });

    revalidatePath("/sagra/[slug]", "page");
    return {
      esito: "successo",
      messaggio: `${voci.length} ${
        voci.length === 1 ? "attività salvata" : "attività salvate"
      } correttamente.`,
      salvataggio: Date.now(),
    };
  } catch (errore) {
    if (errore instanceof ErroreValidazione) {
      return { esito: "errore", messaggio: errore.message };
    }
    console.error("Inserimento programma fallito", errore);
    return {
      esito: "errore",
      messaggio:
        "Il database non ha accettato il programma. Riprova o controlla i log.",
    };
  }
}

import {
  FinishReason,
  GoogleGenAI,
} from "@google/genai";
import {
  generaContenutoConRetry,
  messaggioErroreGemini,
  mimeTypeGemini,
} from "../../../lib/gemini";

class ErroreRispostaAi extends Error {}

function normalizzaRispostaProgramma(testoRisposta: string): Partial<VoceProgramma>[] {
  let valore: unknown;

  try {
    valore = JSON.parse(testoRisposta);
  } catch {
    throw new ErroreRispostaAi(
      "L'AI ha restituito un programma incompleto. Riprova l'analisi della locandina.",
    );
  }

  if (!Array.isArray(valore)) {
    throw new ErroreRispostaAi("L'AI non ha restituito un elenco di attività valido.");
  }

  return valore.map((elemento) => {
    if (!elemento || typeof elemento !== "object") {
      throw new ErroreRispostaAi("Una delle attività restituite dall'AI non è valida.");
    }

    const item = elemento as Record<string, unknown>;
    return {
      giorno: typeof item.giorno === "string" ? item.giorno : undefined,
      oraInizio: typeof item.oraInizio === "string" ? item.oraInizio : undefined,
      oraFine: typeof item.oraFine === "string" ? item.oraFine : undefined,
      titolo:
        typeof item.titolo === "string" && item.titolo.trim()
          ? item.titolo
          : "Attività senza titolo",
      descrizione:
        typeof item.descrizione === "string" ? item.descrizione : undefined,
    };
  });
}

export async function analizzaLocandina(
  formData: FormData,
): Promise<{ esito: "successo"; data: Partial<VoceProgramma>[] } | { esito: "errore"; messaggio: string }> {
  if (!(await sessioneAdminValida())) {
    return {
      esito: "errore",
      messaggio: "La sessione è scaduta. Ricarica la pagina ed effettua l’accesso.",
    };
  }

  const file = formData.get("locandina") as File | null;
  if (!file) {
    return { esito: "errore", messaggio: "Nessun file caricato." };
  }
  const mimeType = mimeTypeGemini(file);
  if (!mimeType) {
    return {
      esito: "errore",
      messaggio: "Formato non supportato. Usa PDF, PNG, JPEG, WebP, HEIC o HEIF.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { esito: "errore", messaggio: "Chiave API Gemini mancante nel server." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `Analizza la locandina allegata di una sagra/evento.
Estrai il programma degli eventi e restituiscilo rigorosamente come JSON, che deve essere un array con un massimo di 50 oggetti.
Ogni oggetto deve avere questi campi esatti:
- "giorno": stringa (formato YYYY-MM-DD se riesci a dedurlo, se non capisci l'anno usa quello corrente, altrimenti stringa vuota o omettilo)
- "oraInizio": stringa (formato HH:MM, es. "19:00", se presente, altrimenti omettilo)
- "oraFine": stringa (formato HH:MM, se presente, altrimenti omettilo)
- "titolo": stringa (il titolo dell'evento, es. "Apertura Stand")
- "descrizione": stringa (fornisci una descrizione un po' più approfondita dell'evento basandoti sulle info della locandina, massimo 150 caratteri. Se non ci sono dettagli, omettilo)

Restituisci SOLO il JSON valido e nient'altro.`;

    let ultimoErrore: ErroreRispostaAi | undefined;

    for (let tentativo = 0; tentativo < 2; tentativo += 1) {
      const result = await generaContenutoConRetry(genAI, {
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: buffer.toString("base64"),
                  mimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.1,
        },
      });

      const candidato = result.candidates?.[0];
      if (candidato?.finishReason === FinishReason.MAX_TOKENS) {
        ultimoErrore = new ErroreRispostaAi(
          "Il programma estratto è troppo lungo ed è stato interrotto. Riprova con una locandina più leggibile.",
        );
        continue;
      }

      try {
        const data = normalizzaRispostaProgramma(result.text ?? "");
        return { esito: "successo", data };
      } catch (error) {
        if (!(error instanceof ErroreRispostaAi)) throw error;
        ultimoErrore = error;
      }
    }

    throw ultimoErrore ?? new ErroreRispostaAi("L'AI non ha restituito un programma valido.");
  } catch (error: unknown) {
    console.error("Errore analisi locandina", error);
    let messaggio = "Impossibile analizzare l'immagine. Riprova.";
    const dettaglio = error instanceof Error ? error.message : "";
    const messaggioGemini = messaggioErroreGemini(error);
    if (messaggioGemini) {
      messaggio = messaggioGemini;
    } else if (error instanceof ErroreRispostaAi) {
      messaggio = error.message;
    } else if (dettaglio) {
      messaggio = `Errore AI: ${dettaglio}`;
    }
    return { esito: "errore", messaggio };
  }
}
