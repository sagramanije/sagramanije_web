import "server-only";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";

export type SagraPreProd = {
  id: number;
  nome_sagra: string;
  citta: string;
  provincia: string | null;
  regione: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  ora_inizio: string | null;
  lat: string | null;
  leng: string | null;
  category: string | null;
  descrizione: string | null;
  locandina: string | null;
  link_pagina_ufficiale: string | null;
  verifica_data_esito: string | null;
  verifica_data_fonte: string | null;
};

export type SagraPreProdRiga = Pick<
  SagraPreProd,
  | "id"
  | "nome_sagra"
  | "citta"
  | "provincia"
  | "data_inizio"
  | "data_fine"
  | "verifica_data_esito"
> & {
  /** True se in sagre esiste già una riga con stesso nome, città e data_inizio. */
  gia_presente: boolean;
};

// data_inizio/data_fine sono colonne DATE: senza DATE_FORMAT, mysql2 le
// restituisce come Date locali che JSON.stringify sposta di fuso in UTC.
const COLONNE_DATA =
  "DATE_FORMAT(data_inizio, '%Y-%m-%d') AS data_inizio, DATE_FORMAT(data_fine, '%Y-%m-%d') AS data_fine";

type RigaPreProdGrezza = Omit<SagraPreProdRiga, "gia_presente"> & {
  gia_presente: number;
};

/** Tutte le bozze in attesa di revisione, dalla più vicina alla più lontana. */
export async function getSagrePreProd(): Promise<SagraPreProdRiga[]> {
  const [righe] = await db().query<(RigaPreProdGrezza & RowDataPacket)[]>(
    `SELECT p.id, p.nome_sagra, p.citta, p.provincia, ${COLONNE_DATA}, p.verifica_data_esito,
      EXISTS (
        SELECT 1 FROM sagre s
        WHERE LOWER(TRIM(s.nome_sagra)) = LOWER(TRIM(p.nome_sagra))
          AND LOWER(TRIM(s.citta)) = LOWER(TRIM(p.citta))
          AND s.data_inizio <=> p.data_inizio
      ) AS gia_presente
     FROM sagre_pre_prod p
     ORDER BY p.data_inizio IS NULL, p.data_inizio ASC`,
  );
  return righe.map((riga) => ({
    id: riga.id,
    nome_sagra: riga.nome_sagra,
    citta: riga.citta,
    provincia: riga.provincia,
    data_inizio: riga.data_inizio,
    data_fine: riga.data_fine,
    verifica_data_esito: riga.verifica_data_esito,
    gia_presente: Boolean(riga.gia_presente),
  }));
}

export async function contaSagrePreProd(): Promise<number> {
  const [righe] = await db().query<(RowDataPacket & { totale: number })[]>(
    "SELECT COUNT(*) AS totale FROM sagre_pre_prod",
  );
  return righe[0].totale;
}

export async function getSagraPreProdById(
  id: number,
): Promise<SagraPreProd | null> {
  const [righe] = await db().query<(SagraPreProd & RowDataPacket)[]>(
    `SELECT id, nome_sagra, citta, provincia, regione, ${COLONNE_DATA},
            ora_inizio, lat, leng, category, descrizione, locandina,
            link_pagina_ufficiale, verifica_data_esito, verifica_data_fonte
     FROM sagre_pre_prod
     WHERE id = ?`,
    [id],
  );
  return righe[0] ?? null;
}
