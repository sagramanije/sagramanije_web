import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sessioneAdminValida } from "../../../lib/admin-auth";
import { db } from "../../../lib/db";
import { Wordmark } from "../../components/wordmark";
import ProgrammaForm, { type SagraProgramma } from "./programma-form";

export const metadata: Metadata = {
  title: "Inserisci programma",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

type SagraRiga = RowDataPacket & {
  id: number;
  nome: string;
  citta: string;
  data_inizio: string | null;
  data_fine: string | null;
};

async function getSagrePerProgramma(): Promise<SagraProgramma[]> {
  const [righe] = await db().execute<SagraRiga[]>(
    `SELECT
      id,
      nome_sagra AS nome,
      citta,
      DATE_FORMAT(data_inizio, '%Y-%m-%d') AS data_inizio,
      DATE_FORMAT(data_fine, '%Y-%m-%d') AS data_fine
    FROM sagre
    where regione = 'Abruzzo'
    ORDER BY
      CASE
        WHEN COALESCE(data_fine, data_inizio) >= CURDATE() THEN 0
        ELSE 1
      END,
      CASE
        WHEN COALESCE(data_fine, data_inizio) >= CURDATE() THEN data_inizio
      END ASC,
      data_inizio DESC,
      nome_sagra ASC`,
  );

  return righe.map((riga) => ({
    id: riga.id,
    nome: riga.nome,
    citta: riga.citta,
    dataInizio: riga.data_inizio,
    dataFine: riga.data_fine,
  }));
}

export default async function ProgrammaPage() {
  await connection();
  if (!(await sessioneAdminValida())) {
    redirect("/gestione-sagre");
  }

  const sagre = await getSagrePerProgramma();

  return (
    <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <Wordmark />
          <div className="mt-6">
            <Link
              href="/gestione-sagre"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
            >
              <ArrowLeft aria-hidden size={16} />
              Gestione sagre
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <CalendarPlus aria-hidden size={22} />
              </span>
              <div>
                <h1 className="font-title text-3xl leading-tight sm:text-4xl">
                  Inserisci programma
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Aggiungi manualmente le attività giorno per giorno.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-7 rounded-3xl bg-surface p-4 shadow-sm sm:mt-10 sm:p-8">
          <ProgrammaForm sagre={sagre} />
        </section>
      </div>
    </main>
  );
}
