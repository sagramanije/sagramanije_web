"use server";

import { randomBytes } from "node:crypto";
import type { ResultSetHeader } from "mysql2";
import { redirect } from "next/navigation";
import { sessioneAdminValida } from "../../../lib/admin-auth";
import { conConnessioneDb } from "../../../lib/db";
import {
  coordinata,
  dataIso,
  ErroreValidazione,
  ora,
  testo,
  url,
} from "../../../lib/validazione-sagra";

export type StatoAzione = {
  esito: "idle" | "errore" | "successo";
  messaggio: string;
};

/**
 * Convalida una bozza: inserisce i dati (validati) in sagre e rimuove la
 * riga corrispondente da sagre_pre_prod, nella stessa transazione — se una
 * delle due operazioni fallisce non deve restare né duplicata né persa.
 */
export async function convalidaSagra(
  _stato: StatoAzione,
  formData: FormData,
): Promise<StatoAzione> {
  if (!(await sessioneAdminValida())) {
    return {
      esito: "errore",
      messaggio: "La sessione è scaduta. Ricarica la pagina ed effettua l’accesso.",
    };
  }

  const preProdId = Number(formData.get("pre_prod_id"));
  if (!Number.isInteger(preProdId) || preProdId <= 0) {
    return { esito: "errore", messaggio: "Bozza non valida." };
  }

  try {
    const nomeSagra = testo(formData, "nome_sagra", 255, true);
    const citta = testo(formData, "citta", 150, true);
    const dataInizio = dataIso(formData, "data_inizio");
    const dataFine = dataIso(formData, "data_fine");
    if (dataInizio && dataFine && dataFine < dataInizio) {
      throw new ErroreValidazione(
        "La data di fine non può precedere quella di inizio.",
      );
    }

    const provincia = testo(formData, "provincia", 100);
    if (provincia && !["AQ", "CH", "PE", "TE"].includes(provincia)) {
      throw new ErroreValidazione("La provincia selezionata non è valida.");
    }

    const categoria = testo(formData, "category", 100) ?? "sagra";
    if (!["sagra", "Evento", "Altro"].includes(categoria)) {
      throw new ErroreValidazione("La categoria selezionata non è valida.");
    }

    const valori = [
      randomBytes(32).toString("hex"),
      nomeSagra,
      dataInizio,
      dataFine,
      citta,
      provincia,
      coordinata(formData, "lat", -90, 90),
      coordinata(formData, "leng", -180, 180),
      url(formData, "locandina", true),
      url(formData, "link_pagina_ufficiale", false),
      categoria,
      testo(formData, "descrizione", 20_000),
      ora(formData),
      "Abruzzo",
    ];

    await conConnessioneDb(async (connessione) => {
      await connessione.beginTransaction();
      try {
        await connessione.execute<ResultSetHeader>(
          `INSERT INTO sagre (
            event_key, nome_sagra, data_inizio, data_fine, citta, provincia,
            lat, leng, locandina, link_pagina_ufficiale, category, descrizione,
            ora_inizio, regione
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          valori,
        );

        const [eliminazione] = await connessione.execute<ResultSetHeader>(
          "DELETE FROM sagre_pre_prod WHERE id = ?",
          [preProdId],
        );
        if (eliminazione.affectedRows === 0) {
          throw new Error(
            "La bozza risulta già rimossa: forse convalidata da un'altra sessione.",
          );
        }

        await connessione.commit();
      } catch (errore) {
        await connessione.rollback();
        throw errore;
      }
    });
  } catch (errore) {
    if (errore instanceof ErroreValidazione) {
      return { esito: "errore", messaggio: errore.message };
    }
    console.error("Convalida sagra fallita", errore);
    return {
      esito: "errore",
      messaggio:
        "Il database non ha accettato la convalida. Riprova o controlla i log.",
    };
  }

  redirect("/gestione-sagre/revisione");
}

/** Elimina una bozza da sagre_pre_prod senza trasferirla in sagre. */
export async function eliminaBozza(
  _stato: StatoAzione,
  formData: FormData,
): Promise<StatoAzione> {
  if (!(await sessioneAdminValida())) {
    return {
      esito: "errore",
      messaggio: "La sessione è scaduta. Ricarica la pagina ed effettua l’accesso.",
    };
  }

  const preProdId = Number(formData.get("pre_prod_id"));
  if (!Number.isInteger(preProdId) || preProdId <= 0) {
    return { esito: "errore", messaggio: "Bozza non valida." };
  }

  try {
    const [risultato] = await conConnessioneDb((connessione) =>
      connessione.execute<ResultSetHeader>(
        "DELETE FROM sagre_pre_prod WHERE id = ?",
        [preProdId],
      ),
    );
    if (risultato.affectedRows === 0) {
      return {
        esito: "errore",
        messaggio:
          "La bozza risulta già rimossa: forse eliminata da un'altra sessione.",
      };
    }
  } catch (errore) {
    console.error("Eliminazione bozza fallita", errore);
    return {
      esito: "errore",
      messaggio:
        "Il database non ha accettato l'eliminazione. Riprova o controlla i log.",
    };
  }

  redirect("/gestione-sagre/revisione");
}
