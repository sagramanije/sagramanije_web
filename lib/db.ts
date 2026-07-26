import "server-only";

import mysql, {
  type Pool,
  type PoolConnection,
  type PoolOptions,
} from "mysql2/promise";

const globalDb = globalThis as typeof globalThis & {
  sagramanijeMysqlPool?: Pool;
};

function variabileObbligatoria(nome: string): string {
  const valore = process.env[nome]?.trim();
  if (!valore) {
    throw new Error(
      `Variabile d'ambiente ${nome} mancante: configura MySQL prima di usare il database.`,
    );
  }
  return valore;
}

function interoDaEnv(
  nome: string,
  predefinito: number,
  minimo: number,
  massimo: number,
): number {
  const grezzo = process.env[nome]?.trim();
  if (!grezzo) return predefinito;

  const valore = Number(grezzo);
  if (!Number.isInteger(valore) || valore < minimo || valore > massimo) {
    throw new Error(
      `Variabile d'ambiente ${nome} non valida: atteso un intero tra ${minimo} e ${massimo}.`,
    );
  }
  return valore;
}

function booleanoDaEnv(nome: string, predefinito: boolean): boolean {
  const grezzo = process.env[nome]?.trim().toLowerCase();
  if (!grezzo) return predefinito;
  if (grezzo === "true" || grezzo === "1") return true;
  if (grezzo === "false" || grezzo === "0") return false;
  throw new Error(
    `Variabile d'ambiente ${nome} non valida: usa true oppure false.`,
  );
}

function configurazioneMysql(): PoolOptions {
  const usaSsl = booleanoDaEnv("DB_SSL", true);
  const ca = process.env.DB_SSL_CA?.trim();

  return {
    host: variabileObbligatoria("DB_HOST"),
    port: interoDaEnv("DB_PORT", 3306, 1, 65_535),
    database: variabileObbligatoria("DB_NAME"),
    user: variabileObbligatoria("DB_USER"),
    password: variabileObbligatoria("DB_PASSWORD"),
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: interoDaEnv("DB_CONNECTION_LIMIT", 3, 1, 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10_000,
    ssl: usaSsl
      ? {
          rejectUnauthorized: booleanoDaEnv(
            "DB_SSL_REJECT_UNAUTHORIZED",
            true,
          ),
          ...(ca ? { ca } : {}),
        }
      : undefined,
  };
}

/**
 * Pool MySQL condiviso dall'istanza Node.js corrente.
 *
 * In locale evita di creare nuovi pool durante gli hot reload; su Vercel viene
 * riutilizzato finché la stessa istanza serverless resta attiva.
 */
export function db(): Pool {
  globalDb.sagramanijeMysqlPool ??= mysql.createPool(configurazioneMysql());
  return globalDb.sagramanijeMysqlPool;
}

/** Esegue più operazioni sulla stessa connessione e la rilascia sempre. */
export async function conConnessioneDb<T>(
  operazione: (connessione: PoolConnection) => Promise<T>,
): Promise<T> {
  const connessione = await db().getConnection();
  try {
    return await operazione(connessione);
  } finally {
    connessione.release();
  }
}

/** Controllo interno da usare durante il collaudo, senza creare endpoint. */
export async function verificaConnessioneDb(): Promise<void> {
  await conConnessioneDb((connessione) => connessione.ping());
}
