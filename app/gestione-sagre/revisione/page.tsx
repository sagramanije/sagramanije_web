import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sessioneAdminValida } from "../../../lib/admin-auth";
import { getSagrePreProd } from "../../../lib/sagre-pre-prod";
import { Wordmark } from "../../components/wordmark";
import ListaRevisione from "./lista-revisione";

export const metadata: Metadata = {
  title: "Revisione sagre",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function RevisioneSagrePage() {
  // Cookie di sessione e dati dal DB sono runtime: niente pagina statica in build.
  await connection();
  if (!(await sessioneAdminValida())) {
    redirect("/gestione-sagre");
  }

  const righe = await getSagrePreProd();

  return (
    <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header>
          <Wordmark />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/gestione-sagre"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
              >
                <ArrowLeft aria-hidden size={16} />
                Gestione sagre
              </Link>
              <h1 className="mt-2 font-title text-3xl leading-tight sm:text-4xl">
                Revisione bozze
              </h1>
              <p className="mt-1 text-sm text-muted">
                {righe.length === 0
                  ? "Nessuna bozza in attesa di revisione."
                  : `${righe.length} ${righe.length === 1 ? "bozza" : "bozze"} da sagre_pre_prod in attesa di convalida.`}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-7 sm:mt-10">
          <ListaRevisione righe={righe} />
        </section>
      </div>
    </main>
  );
}
