"use server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { revalidatePath } from "next/cache";
import { sessioneAdminValida } from "../../../lib/admin-auth";
import { db } from "../../../lib/db";
import {
  caricaLocandina,
  eliminaLocandinaDaMinio,
  type DestinazioneLocandina,
} from "../../../lib/locandina-storage";
import { estraiImmagineDaLinkSocial } from "../../../lib/social-image-extractor";

export type SagraImmagineItem = {
  id: number;
  nome_sagra: string;
  citta: string;
  provincia: string | null;
  regione: string | null;
  locandina: string | null;
  link_pagina_ufficiale: string | null;
  data_inizio: string | null;
  data_fine: string | null;
};

export type RisultatoOperazioneImmagine =
  | {
      esito: "successo";
      urlLocandina: string | null;
      messaggio: string;
    }
  | {
      esito: "errore";
      messaggio: string;
    };

const COLONNE_DATA =
  "DATE_FORMAT(data_inizio, '%Y-%m-%d') AS data_inizio, DATE_FORMAT(data_fine, '%Y-%m-%d') AS data_fine";

const TIPI_MIME_CONSENTITI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/**
 * Normalizza il tipo MIME basandosi sull'intestazione o sull'estensione del nome file.
 */
function determinaMimeType(file: File): string | null {
  const tipo = file.type.toLowerCase().trim();
  if (tipo && TIPI_MIME_CONSENTITI[tipo]) {
    return tipo;
  }

  const estensione = file.name.split(".").pop()?.toLowerCase();
  switch (estensione) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
}

/**
 * Recupera l'URL attuale della locandina di una sagra per eventuale pulizia storage.
 */
async function recuperaLocandinaAttuale(idSagra: number): Promise<string | null> {
  const [righe] = await db().execute<
    (RowDataPacket & { locandina: string | null })[]
  >("SELECT locandina FROM sagre WHERE id = ?", [idSagra]);
  return righe[0]?.locandina ?? null;
}

/**
 * Esegue la ricerca testuale o puntuale per ID tra le sagre registrate.
 */
export async function cercaSagreInDb(query: string): Promise<SagraImmagineItem[]> {
  if (!(await sessioneAdminValida())) {
    throw new Error("Sessione non valida o scaduta.");
  }

  const termine = query.trim();

  if (!termine) {
    const [righe] = await db().query<
      (SagraImmagineItem & RowDataPacket)[]
    >(
      `SELECT id, nome_sagra, citta, provincia, regione, locandina, link_pagina_ufficiale, ${COLONNE_DATA}
       FROM sagre
       ORDER BY
         CASE
           WHEN COALESCE(data_fine, data_inizio) >= CURDATE() THEN 0
           ELSE 1
         END,
         CASE
           WHEN COALESCE(data_fine, data_inizio) >= CURDATE() THEN data_inizio
         END ASC,
         data_inizio DESC,
         nome_sagra ASC
       LIMIT 60`,
    );
    return righe;
  }

  const idNumerico = Number(termine);
  const eNumero = Number.isInteger(idNumerico) && idNumerico > 0;
  const patternLike = `%${termine}%`;

  const [righe] = await db().query<
    (SagraImmagineItem & RowDataPacket)[]
  >(
    `SELECT id, nome_sagra, citta, provincia, regione, locandina, link_pagina_ufficiale, ${COLONNE_DATA}
     FROM sagre
     WHERE
       ${eNumero ? "id = ? OR " : ""}
       nome_sagra LIKE ?
       OR citta LIKE ?
       OR provincia = ?
     ORDER BY
       CASE
         WHEN COALESCE(data_fine, data_inizio) >= CURDATE() THEN 0
         ELSE 1
       END,
       CASE
         WHEN COALESCE(data_fine, data_inizio) >= CURDATE() THEN data_inizio
       END ASC,
       data_inizio DESC,
       nome_sagra ASC
     LIMIT 50`,
    eNumero
      ? [idNumerico, patternLike, patternLike, termine.toUpperCase()]
      : [patternLike, patternLike, termine.toUpperCase()],
  );

  return righe;
}

/**
 * Aggiorna direttamente l'URL della locandina nel database.
 */
export async function aggiornaLocandinaUrl({
  idSagra,
  nuovoUrl,
}: {
  idSagra: number;
  nuovoUrl: string;
}): Promise<RisultatoOperazioneImmagine> {
  if (!(await sessioneAdminValida())) {
    return { esito: "errore", messaggio: "Sessione scaduta." };
  }

  if (!Number.isInteger(idSagra) || idSagra <= 0) {
    return { esito: "errore", messaggio: "Identificativo sagra non valido." };
  }

  const urlPulito = nuovoUrl.trim();
  if (!urlPulito) {
    return { esito: "errore", messaggio: "Inserisci un URL valido." };
  }

  try {
    const urlValidato = new URL(urlPulito);
    if (urlValidato.protocol !== "https:") {
      return {
        esito: "errore",
        messaggio: "L'URL della locandina deve utilizzare il protocollo HTTPS.",
      };
    }
  } catch {
    return { esito: "errore", messaggio: "L'indirizzo web inserito non è valido." };
  }

  try {
    const vecchiaLocandina = await recuperaLocandinaAttuale(idSagra);

    const [risultato] = await db().execute<ResultSetHeader>(
      "UPDATE sagre SET locandina = ? WHERE id = ?",
      [urlPulito, idSagra],
    );

    if (risultato.affectedRows === 0) {
      return { esito: "errore", messaggio: "Sagra non trovata." };
    }

    if (vecchiaLocandina && vecchiaLocandina !== urlPulito) {
      await eliminaLocandinaDaMinio(vecchiaLocandina);
    }

    revalidatePath("/sagre");
    revalidatePath(`/locandina/${idSagra}`);

    return {
      esito: "successo",
      urlLocandina: urlPulito,
      messaggio: "URL della locandina salvato con successo.",
    };
  } catch (errore) {
    console.error("Errore durante l'aggiornamento dell'URL della locandina:", errore);
    return {
      esito: "errore",
      messaggio: "Errore durante il salvataggio nel database.",
    };
  }
}

/**
 * Carica un nuovo file di locandina nello storage (MinIO / Cloudinary) e aggiorna la sagra.
 */
export async function caricaEImpostaLocandina(
  formData: FormData,
): Promise<RisultatoOperazioneImmagine> {
  if (!(await sessioneAdminValida())) {
    return { esito: "errore", messaggio: "Sessione scaduta." };
  }

  const idSagra = Number(formData.get("id_sagra"));
  if (!Number.isInteger(idSagra) || idSagra <= 0) {
    return { esito: "errore", messaggio: "Identificativo sagra non valido." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { esito: "errore", messaggio: "Seleziona un file da caricare." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      esito: "errore",
      messaggio: "Il file supera il limite massimo consentito di 10 MB.",
    };
  }

  const mimeType = determinaMimeType(file);
  if (!mimeType) {
    return {
      esito: "errore",
      messaggio: "Formato non supportato. Usa PNG, JPG, JPEG, WebP, HEIC o PDF.",
    };
  }

  const destinazione = (formData.get("destinazione") as DestinazioneLocandina) || "minio";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const urlLocandina = await caricaLocandina(buffer, mimeType, destinazione);

    const vecchiaLocandina = await recuperaLocandinaAttuale(idSagra);

    const [risultato] = await db().execute<ResultSetHeader>(
      "UPDATE sagre SET locandina = ? WHERE id = ?",
      [urlLocandina, idSagra],
    );

    if (risultato.affectedRows === 0) {
      return { esito: "errore", messaggio: "Sagra non trovata." };
    }

    if (vecchiaLocandina && vecchiaLocandina !== urlLocandina) {
      await eliminaLocandinaDaMinio(vecchiaLocandina);
    }

    revalidatePath("/sagre");
    revalidatePath(`/locandina/${idSagra}`);

    return {
      esito: "successo",
      urlLocandina,
      messaggio: "Locandina caricata e associata alla sagra con successo.",
    };
  } catch (errore) {
    console.error("Errore durante il caricamento della locandina:", errore);
    return {
      esito: "errore",
      messaggio:
        errore instanceof Error
          ? errore.message
          : "Errore durante il caricamento del file.",
    };
  }
}

/**
 * Estrae la foto/locandina da un link social o web, la salva nello storage e aggiorna la sagra.
 */
export async function estraiEImpostaLocandinaDaSocial({
  idSagra,
  urlSocial,
  destinazione = "minio",
}: {
  idSagra: number;
  urlSocial: string;
  destinazione?: DestinazioneLocandina;
}): Promise<RisultatoOperazioneImmagine> {
  if (!(await sessioneAdminValida())) {
    return { esito: "errore", messaggio: "Sessione scaduta." };
  }

  if (!Number.isInteger(idSagra) || idSagra <= 0) {
    return { esito: "errore", messaggio: "Identificativo sagra non valido." };
  }

  const link = urlSocial.trim();
  if (!link) {
    return { esito: "errore", messaggio: "Inserisci il link del post o della pagina." };
  }

  try {
    const { buffer, mimeType } = await estraiImmagineDaLinkSocial(link);
    const urlLocandina = await caricaLocandina(buffer, mimeType, destinazione);

    const vecchiaLocandina = await recuperaLocandinaAttuale(idSagra);

    const [risultato] = await db().execute<ResultSetHeader>(
      "UPDATE sagre SET locandina = ? WHERE id = ?",
      [urlLocandina, idSagra],
    );

    if (risultato.affectedRows === 0) {
      return { esito: "errore", messaggio: "Sagra non trovata." };
    }

    if (vecchiaLocandina && vecchiaLocandina !== urlLocandina) {
      await eliminaLocandinaDaMinio(vecchiaLocandina);
    }

    revalidatePath("/sagre");
    revalidatePath(`/locandina/${idSagra}`);

    return {
      esito: "successo",
      urlLocandina,
      messaggio: "Immagine estratta e salvata come locandina con successo.",
    };
  } catch (errore) {
    console.error("Errore estrazione immagine da link social:", errore);
    return {
      esito: "errore",
      messaggio:
        errore instanceof Error
          ? errore.message
          : "Impossibile estrarre l'immagine dal link specificato.",
    };
  }
}

/**
 * Rimuove l'associazione della locandina dalla sagra e ripulisce lo storage se necessario.
 */
export async function rimuoviLocandina({
  idSagra,
}: {
  idSagra: number;
}): Promise<RisultatoOperazioneImmagine> {
  if (!(await sessioneAdminValida())) {
    return { esito: "errore", messaggio: "Sessione scaduta." };
  }

  if (!Number.isInteger(idSagra) || idSagra <= 0) {
    return { esito: "errore", messaggio: "Identificativo sagra non valido." };
  }

  try {
    const vecchiaLocandina = await recuperaLocandinaAttuale(idSagra);

    const [risultato] = await db().execute<ResultSetHeader>(
      "UPDATE sagre SET locandina = NULL WHERE id = ?",
      [idSagra],
    );

    if (risultato.affectedRows === 0) {
      return { esito: "errore", messaggio: "Sagra non trovata." };
    }

    if (vecchiaLocandina) {
      await eliminaLocandinaDaMinio(vecchiaLocandina);
    }

    revalidatePath("/sagre");
    revalidatePath(`/locandina/${idSagra}`);

    return {
      esito: "successo",
      urlLocandina: null,
      messaggio: "Locandina rimossa correttamente.",
    };
  } catch (errore) {
    console.error("Errore durante la rimozione della locandina:", errore);
    return {
      esito: "errore",
      messaggio: "Errore durante la rimozione della locandina dal database.",
    };
  }
}
