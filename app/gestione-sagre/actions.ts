"use server";

import { randomBytes } from "node:crypto";
import type { ResultSetHeader } from "mysql2";
import { redirect } from "next/navigation";
import {
  configurazioneAdminCompleta,
  creaSessioneAdmin,
  eliminaSessioneAdmin,
  passwordAdminValida,
  sessioneAdminValida,
} from "../../lib/admin-auth";
import { db } from "../../lib/db";

export type StatoAzione = {
  esito: "idle" | "errore" | "successo";
  messaggio: string;
  id?: number;
};

class ErroreValidazione extends Error {}

function testo(
  formData: FormData,
  nome: string,
  massimo: number,
  obbligatorio = false,
): string | null {
  const grezzo = formData.get(nome);
  const valore = typeof grezzo === "string" ? grezzo.trim() : "";
  if (!valore) {
    if (obbligatorio) throw new ErroreValidazione(`Compila il campo ${nome}.`);
    return null;
  }
  if (valore.length > massimo) {
    throw new ErroreValidazione(
      `Il campo ${nome} non può superare ${massimo} caratteri.`,
    );
  }
  return valore;
}

function dataIso(formData: FormData, nome: string): string | null {
  const valore = testo(formData, nome, 10);
  if (!valore) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valore)) {
    throw new ErroreValidazione(`Il campo ${nome} non contiene una data valida.`);
  }
  const data = new Date(`${valore}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valore) {
    throw new ErroreValidazione(`Il campo ${nome} non contiene una data valida.`);
  }
  return valore;
}

function coordinata(
  formData: FormData,
  nome: "lat" | "leng",
  minimo: number,
  massimo: number,
): string | null {
  const valore = testo(formData, nome, 80);
  if (!valore) return null;
  const numero = Number(valore);
  if (!Number.isFinite(numero) || numero < minimo || numero > massimo) {
    throw new ErroreValidazione(`La coordinata ${nome} non è valida.`);
  }
  return String(numero);
}

function url(
  formData: FormData,
  nome: string,
  soloHttps: boolean,
): string | null {
  const valore = testo(formData, nome, 4_000);
  if (!valore) return null;
  try {
    const parsed = new URL(valore);
    const consentito = soloHttps
      ? parsed.protocol === "https:"
      : parsed.protocol === "https:" || parsed.protocol === "http:";
    if (!consentito) throw new Error();
    return parsed.href;
  } catch {
    throw new ErroreValidazione(`Il campo ${nome} non contiene un URL valido.`);
  }
}

function ora(formData: FormData): string | null {
  const valore = testo(formData, "ora_inizio", 20);
  if (!valore) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valore)) {
    throw new ErroreValidazione("L’orario di inizio non è valido.");
  }
  return valore;
}

export async function accedi(
  _stato: StatoAzione,
  formData: FormData,
): Promise<StatoAzione> {
  if (!configurazioneAdminCompleta()) {
    return {
      esito: "errore",
      messaggio:
        "Configura ADMIN_PASSWORD e ADMIN_SESSION_SECRET prima di accedere.",
    };
  }

  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    !passwordAdminValida(password)
  ) {
    // Piccolo ritardo uniforme per rendere meno efficace il brute force.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { esito: "errore", messaggio: "Password non corretta." };
  }

  await creaSessioneAdmin();
  redirect("/gestione-sagre");
}

export async function esci(): Promise<void> {
  await eliminaSessioneAdmin();
  redirect("/gestione-sagre");
}

export async function salvaSagra(
  _stato: StatoAzione,
  formData: FormData,
): Promise<StatoAzione> {
  if (!(await sessioneAdminValida())) {
    return {
      esito: "errore",
      messaggio: "La sessione è scaduta. Ricarica la pagina ed effettua l’accesso.",
    };
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

    const categoriaRicevuta = testo(formData, "category", 100) ?? "Sagra";
    const categoria = {
      sagra: "Sagra",
      evento: "Evento",
      altro: "Altro",
    }[categoriaRicevuta.toLowerCase()];
    if (!categoria) {
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

    const [risultato] = await db().execute<ResultSetHeader>(
      `INSERT INTO sagre (
        event_key, nome_sagra, data_inizio, data_fine, citta, provincia,
        lat, leng, locandina, link_pagina_ufficiale, category, descrizione,
        ora_inizio, regione
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      valori,
    );

    return {
      esito: "successo",
      messaggio: `Sagra salvata correttamente con ID ${risultato.insertId}.`,
      id: risultato.insertId,
    };
  } catch (errore) {
    if (errore instanceof ErroreValidazione) {
      return { esito: "errore", messaggio: errore.message };
    }
    console.error("Inserimento sagra fallito", errore);
    return {
      esito: "errore",
      messaggio:
        "Il database non ha accettato l’inserimento. Riprova o controlla i log.",
    };
  }
}

import { GoogleGenAI } from "@google/genai";
import {
  generaContenutoConRetry,
  messaggioErroreGemini,
  mimeTypeGemini,
} from "../../lib/gemini";
import { caricaLocandina } from "../../lib/locandina-storage";

export type DatiEstrattiSagra = {
  nomeSagra?: string;
  dataInizio?: string;
  dataFine?: string;
  oraInizio?: string;
  citta?: string;
  provincia?: string;
  linkPaginaUfficiale?: string;
  descrizione?: string;
};

export async function analizzaSagra(
  formData: FormData,
): Promise<{ esito: "successo"; dati: DatiEstrattiSagra; urlLocandina: string } | { esito: "errore"; messaggio: string }> {
  if (!(await sessioneAdminValida())) {
    return { esito: "errore", messaggio: "Sessione scaduta." };
  }

  const file = formData.get("locandina") as File | null;
  if (!file) return { esito: "errore", messaggio: "Nessun file caricato." };
  if (file.size > 10 * 1024 * 1024) {
    return {
      esito: "errore",
      messaggio: "La locandina supera il limite di 10 MB.",
    };
  }
  const mimeType = mimeTypeGemini(file);
  if (!mimeType) {
    return {
      esito: "errore",
      messaggio: "Formato non supportato. Usa PDF, PNG, JPEG, WebP, HEIC o HEIF.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { esito: "errore", messaggio: "Chiave Gemini mancante." };

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `Analizza la locandina allegata di una sagra/evento.
Estrai le informazioni principali e restituiscile rigorosamente come JSON (un singolo oggetto).
Campi richiesti:
- "nomeSagra": stringa (il nome principale)
- "dataInizio": stringa (YYYY-MM-DD, deducila se possibile, fai sempre riferimento all'anno corrente se non lo capisci)
- "dataFine": stringa (YYYY-MM-DD, deducila se c'è un periodo, se è un giorno solo metti la stessa data di inizio)
- "oraInizio": stringa (HH:MM, se presente)
- "citta": stringa (città in cui si svolge)
- "provincia": stringa (codice a 2 lettere, es. "TE", "AQ", "CH", "PE")
- "linkPaginaUfficiale": stringa (se c'è un sito web o pagina Facebook/Instagram indicata)
- "descrizione": stringa (una descrizione accattivante basata sulle info, max 600 caratteri)

Restituisci SOLO il JSON valido.`;

    const result = await generaContenutoConRetry(genAI, {
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: buffer.toString("base64"), mimeType } }] }],
      config: { responseMimeType: "application/json" },
    });

    const testoRisposta = result.text ?? "";
    const json = JSON.parse(testoRisposta);

    const dati: DatiEstrattiSagra = {
      nomeSagra: json.nomeSagra,
      dataInizio: json.dataInizio,
      dataFine: json.dataFine,
      oraInizio: json.oraInizio,
      citta: json.citta,
      provincia: json.provincia,
      linkPaginaUfficiale: json.linkPaginaUfficiale,
      descrizione: json.descrizione,
    };

    // Salviamo solo dopo un'analisi riuscita, così un errore AI non lascia
    // oggetti orfani nello storage scelto dall'amministratore.
    const urlLocandina = await caricaLocandina(
      buffer,
      mimeType,
      formData.get("destinazione_locandina"),
    );

    return { esito: "successo", dati, urlLocandina };
  } catch (error: unknown) {
    console.error("Errore analisi sagra", error);
    const dettaglio = error instanceof Error ? error.message : "";
    const messaggio =
      messaggioErroreGemini(error) ??
      (dettaglio
        ? `Errore: ${dettaglio}`
        : "Errore durante il caricamento o l'analisi.");
    return { esito: "errore", messaggio };
  }
}
