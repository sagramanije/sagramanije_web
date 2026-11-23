import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { nomeVietato } from "./nomi-vietati";

export type Riga = { nome: string; punti: number };
export type Classifica = { mese: string; migliori: Riga[]; precedente: Riga[]; mesePrecedente: string;
  personale: (Riga & { posizione: number }) | null };
type Valore = string | number;
type DatabaseLocale = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...args: Valore[]) => unknown[];
    run: (...args: Valore[]) => unknown;
  };
};
const locale = process.env.NODE_ENV === "development";
const tabella = "fornacella_classifica";
const colonne = `
  mese CHAR(7) NOT NULL, giocatore CHAR(36) NOT NULL,
  nome VARCHAR(24) NOT NULL, punti INTEGER NOT NULL,
  PRIMARY KEY (mese, giocatore)`;
const globals = globalThis as typeof globalThis & { fornacellaSqlite?: DatabaseLocale };
function archivioLocale() {
  if (!globals.fornacellaSqlite) {
    const sqlite = process.getBuiltinModule?.("node:sqlite") as { DatabaseSync: new (path: string) => DatabaseLocale } | undefined;
    if (!sqlite) throw new Error("La classifica di sviluppo richiede Node 22.13 o successivo.");
    const directory = join(process.cwd(), ".next", "cache");
    mkdirSync(directory, { recursive: true });
    const archivio = new sqlite.DatabaseSync(join(directory, "fornacella.sqlite"));
    archivio.exec(`CREATE TABLE IF NOT EXISTS ${tabella} (${colonne})`);
    globals.fornacellaSqlite = archivio;
  }
  return globals.fornacellaSqlite;
}
async function conTabellaMysql<T>(operazione: () => Promise<T>): Promise<T> {
  try {
    return await operazione();
  } catch (errore) {
    if (!(errore instanceof Error && "code" in errore && errore.code === "ER_NO_SUCH_TABLE")) throw errore;
    await db().query(`CREATE TABLE IF NOT EXISTS ${tabella} (${colonne},
      INDEX fornacella_punti (mese, punti)) DEFAULT CHARSET=utf8mb4`);
    return operazione();
  }
}
async function righe<T>(sql: string, args: Valore[]): Promise<T[]> {
  if (locale) return archivioLocale().prepare(sql).all(...args) as T[];
  const [result] = await conTabellaMysql(() => db().execute<RowDataPacket[]>(sql, args));
  return result as T[];
}
export async function classifica(mese: string, giocatore?: string): Promise<Classifica> {
  const prima = new Date(mese + "-01T12:00:00Z");
  prima.setUTCMonth(prima.getUTCMonth() - 1);
  const mesePrecedente = prima.toISOString().slice(0, 7);
  const top = `SELECT nome, punti FROM ${tabella} WHERE mese=? ORDER BY punti DESC, giocatore`;
  // Si legge qualche riga in più e si scartano i nomi vietati: copre anche
  // i punteggi salvati prima che il filtro esistesse.
  const pulite = (lista: Riga[], quante: number) => lista.filter(r => !nomeVietato(r.nome)).slice(0, quante);
  const [migliori, precedente, mia] = await Promise.all([
    righe<Riga>(top + " LIMIT 40", [mese]).then(r => pulite(r, 10)),
    righe<Riga>(top + " LIMIT 20", [mesePrecedente]).then(r => pulite(r, 3)),
    giocatore ? righe<Riga & { posizione: number }>(
      `SELECT s.nome, s.punti, 1 + (SELECT COUNT(*) FROM ${tabella} t WHERE t.mese=s.mese
       AND (t.punti>s.punti OR (t.punti=s.punti AND t.giocatore<s.giocatore))) AS posizione
       FROM ${tabella} s WHERE s.mese=? AND s.giocatore=?`, [mese, giocatore]) : [],
  ]);
  return { mese, migliori, mesePrecedente, precedente, personale: mia[0] ?? null };
}
export async function registra(mese: string, giocatore: string, nome: string, punti: number) {
  const insert = `INSERT INTO ${tabella} (mese, giocatore, nome, punti) VALUES (?, ?, ?, ?)`;
  const args = [mese, giocatore, nome, punti];
  if (locale) {
    archivioLocale().prepare(insert + " ON CONFLICT (mese, giocatore) DO UPDATE SET nome=excluded.nome, punti=excluded.punti WHERE excluded.punti >= punti").run(...args);
  } else {
    await conTabellaMysql(() => db().execute(insert + " ON DUPLICATE KEY UPDATE nome=IF(punti<=?, ?, nome), punti=GREATEST(punti, ?)", [...args, punti, nome, punti]));
  }
}
