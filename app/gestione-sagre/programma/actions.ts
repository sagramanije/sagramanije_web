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

type SagraDb = RowDataPacket & {
  data_inizio: string | null;
  data_fine: string | null;
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
    if (oraInizio && oraFine && oraFine < oraInizio) {
      throw new ErroreValidazione(
        `Nell’attività ${indice + 1} l’ora di fine precede quella di inizio.`,
      );
    }

    return {
      giorno: data(formData, `giorno_${indice}`),
      oraInizio,
      oraFine,
      titolo: testo(formData, `titolo_${indice}`, 255, true)!,
      descrizione: testo(formData, `descrizione_${indice}`, 20_000),
    };
  });
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
