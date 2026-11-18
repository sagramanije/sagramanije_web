import "server-only";
import type { RowDataPacket } from "mysql2";
import { unstable_cache } from "next/cache";
import { db } from "./db";

export const TAG_NATALE = "modalita-natale";
const PREDEFINITA = true;

function tabellaAssente(errore: unknown) {
  return errore instanceof Error && "code" in errore && errore.code === "ER_NO_SUCH_TABLE";
}

export async function leggiModalitaNatale(): Promise<boolean> {
  try {
    const [righe] = await db().query<(RowDataPacket & { attiva: number })[]>(
      "SELECT attiva FROM impostazioni_sito WHERE chiave = 'modalita_natale'",
    );
    return righe.length ? righe[0].attiva === 1 : PREDEFINITA;
  } catch (errore) {
    if (tabellaAssente(errore)) return PREDEFINITA;
    throw errore;
  }
}

const leggiTemaInCache = unstable_cache(leggiModalitaNatale, [TAG_NATALE], {
  tags: [TAG_NATALE],
  revalidate: 3600,
});

export async function temaNatalizio() {
  if (!process.env.DB_HOST) return PREDEFINITA;
  try {
    return await leggiTemaInCache();
  } catch {
    // Anche senza MySQL le pagine pubbliche possono usare il catalogo archiviato.
    return PREDEFINITA;
  }
}

export async function salvaModalitaNatale(attiva: boolean) {
  const sql = `INSERT INTO impostazioni_sito (chiave, attiva) VALUES ('modalita_natale', ?)
               ON DUPLICATE KEY UPDATE attiva = ?`;
  const valori = [attiva, attiva];
  try {
    await db().execute(sql, valori);
  } catch (errore) {
    if (!tabellaAssente(errore)) throw errore;
    await db().query(`CREATE TABLE IF NOT EXISTS impostazioni_sito (
      chiave VARCHAR(64) NOT NULL PRIMARY KEY,
      attiva TINYINT(1) NOT NULL
    )`);
    await db().execute(sql, valori);
  }
}
