import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { classifica, registra } from "../../../lib/classifica-fornacella";
import { nomeVietato } from "../../../lib/nomi-vietati";
import { braceCalda, DURATA, LIMITE_TOCCHI, meseDiGara, Servizio } from "../../../lib/fornacella";

const COOKIE = "fornacella_giocatore";
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const memoria = globalThis as typeof globalThis & { firmaFornacella?: Buffer };
function firma(giocatore: string, inizio: number) {
  let chiave: string | Buffer | undefined = process.env.FORNACELLA_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!chiave && process.env.NODE_ENV === "development") chiave = memoria.firmaFornacella ??= randomBytes(32);
  if (!chiave) throw new Error("Configurare FORNACELLA_SECRET per le partite in classifica.");
  return createHmac("sha256", chiave).update(`fornacella-v1:${giocatore}:${inizio}`).digest("hex");
}
function risposta(dati: unknown, status = 200) {
  return NextResponse.json(dati, { status, headers: { "Cache-Control": "private, no-store" } });
}
function identita(request: NextRequest) {
  const id = request.cookies.get(COOKIE)?.value;
  return id && UUID.test(id) ? id : undefined;
}
export async function GET(request: NextRequest) {
  try { return risposta(await classifica(meseDiGara(), identita(request))); }
  catch (errore) {
    console.error("Lettura classifica Fornacella", errore);
    return risposta({ errore: "La classifica è temporaneamente indisponibile." }, 503);
  }
}
export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return risposta({ errore: "Formato non valido." }, 415);
  const raw = await request.text();
  if (raw.length > 32000) return risposta({ errore: "Partita troppo grande." }, 413);
  let dati;
  try { dati = JSON.parse(raw); } catch { return risposta({ errore: "Dati non validi." }, 400); }
  if (!dati || typeof dati !== "object") return risposta({ errore: "Dati non validi." }, 400);
  const id = identita(request);
  try {
    if (dati.azione === "inizia") {
      const giocatore = id ?? randomUUID();
      const inizio = Date.now();
      const res = risposta({ inizio, mese: meseDiGara(new Date(inizio)), firma: firma(giocatore, inizio) });
      res.cookies.set(COOKIE, giocatore, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
        path: "/api/fornacella", maxAge: 365 * 86400 });
      return res;
    }
    const { inizio, tocchi, nome } = dati;
    if (dati.azione !== "pubblica" || !id || !Number.isSafeInteger(inizio) || typeof dati.firma !== "string" ||
      !/^[a-f0-9]{64}$/.test(dati.firma) || !timingSafeEqual(Buffer.from(dati.firma), Buffer.from(firma(id, inizio)))) {
      return risposta({ errore: "Partita non riconosciuta. Avvia un nuovo servizio." }, 400);
    }
    const eta = Date.now() - inizio;
    if (eta < DURATA || eta > 3600_000) return risposta({ errore: "Partita in corso o scaduta." }, 400);
    if (typeof nome !== "string" || !/^[\p{L}\p{N} _.-]{2,24}$/u.test(nome.trim())) {
      return risposta({ errore: "Scegli un soprannome di 2–24 caratteri con lettere, numeri, spazi, punti o trattini." }, 400);
    }
    if (nomeVietato(nome)) {
      return risposta({ errore: "Questo soprannome non è ammesso: niente parolacce né insulti. Scegline un altro." }, 400);
    }
    if (!Array.isArray(tocchi) || tocchi.length > LIMITE_TOCCHI) return risposta({ errore: "Partita non valida." }, 400);
    const mese = meseDiGara(new Date(inizio));
    const servizio = new Servizio(braceCalda(mese));
    for (const tocco of tocchi) {
      if (!Array.isArray(tocco) || tocco.length !== 2) return risposta({ errore: "Tocco non valido." }, 400);
      const [tempo, posto] = tocco;
      if (!Number.isInteger(tempo) || tempo < servizio.tempo || tempo >= DURATA ||
        !Number.isInteger(posto) || posto < 0 || posto > 2) return risposta({ errore: "Tocco non valido." }, 400);
      servizio.tocca(tempo, posto);
    }
    if (!servizio.punti) return risposta({ errore: "Servi almeno un arrosticino per entrare in classifica." }, 400);
    await registra(mese, id, nome.trim(), servizio.punti);
    return risposta(await classifica(mese, id));
  } catch (errore) {
    console.error("Partita Fornacella", errore);
    return risposta({ errore: "Classifica indisponibile. Riprova tra poco." }, 503);
  }
}
