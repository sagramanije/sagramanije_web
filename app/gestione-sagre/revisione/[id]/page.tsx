import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessioneAdminValida } from "../../../../lib/admin-auth";
import { getSagraPreProdById } from "../../../../lib/sagre-pre-prod";
import { Wordmark } from "../../../components/wordmark";
import RevisioneForm from "./revisione-form";

export const metadata: Metadata = {
  title: "Revisiona bozza",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

type Props = { params: Promise<{ id: string }> };

export default async function RevisioneSagraPage({ params }: Props) {
  // Cookie di sessione e dati dal DB sono runtime: niente pagina statica in build.
  await connection();
  if (!(await sessioneAdminValida())) {
    redirect("/gestione-sagre");
  }

  const { id } = await params;
  const idNumerico = Number(id);
  if (!Number.isInteger(idNumerico) || idNumerico <= 0) notFound();

  const bozza = await getSagraPreProdById(idNumerico);
  if (!bozza) notFound();

  return (
    <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <Wordmark />
          <Link
            href="/gestione-sagre/revisione"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
          >
            <ArrowLeft aria-hidden size={16} />
            Revisione bozze
          </Link>
          <h1 className="mt-2 font-title text-3xl leading-tight sm:text-4xl">
            {bozza.nome_sagra}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Bozza #{bozza.id} da sagre_pre_prod. Controlla e correggi i dati,
            poi convalida per trasferirli nella tabella sagre.
          </p>
        </header>

        {bozza.verifica_data_esito || bozza.verifica_data_fonte ? (
          <section className="mt-7 rounded-3xl bg-beige/60 p-4 text-sm sm:p-6">
            <p className="font-bold">Verifica delle date (dalla bozza)</p>
            {bozza.verifica_data_esito ? (
              <p className="mt-1 text-muted">Esito: {bozza.verifica_data_esito}</p>
            ) : null}
            {bozza.verifica_data_fonte ? (
              <p className="mt-1 break-words text-muted">
                Fonte: {bozza.verifica_data_fonte}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-7 rounded-3xl bg-surface p-4 shadow-sm sm:mt-7 sm:p-8">
          <RevisioneForm bozza={bozza} />
        </section>
      </div>
    </main>
  );
}
