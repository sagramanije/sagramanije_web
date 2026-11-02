import type { Metadata } from "next";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sessioneAdminValida } from "../../../lib/admin-auth";
import { Wordmark } from "../../components/wordmark";
import { cercaSagreInDb } from "./actions";
import ModificaImmagineClient from "./modifica-immagine-client";

export const metadata: Metadata = {
  title: "Modifica immagine sagra",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function ModificaImmaginePage({ searchParams }: Props) {
  await connection();
  if (!(await sessioneAdminValida())) {
    redirect("/gestione-sagre");
  }

  const { id: idParam } = await searchParams;
  const idTarget = idParam ? Number(idParam) : undefined;
  const initialSelectedId =
    idTarget && Number.isInteger(idTarget) && idTarget > 0 ? idTarget : undefined;

  let initialSagre = await cercaSagreInDb("");

  // Se è stato passato un ID specifico non presente nelle prime sagre restituite, lo carichiamo ad hoc
  if (initialSelectedId && !initialSagre.some((s) => s.id === initialSelectedId)) {
    const sagreTrovate = await cercaSagreInDb(String(initialSelectedId));
    const sagraMirata = sagreTrovate.find((s) => s.id === initialSelectedId);
    if (sagraMirata) {
      initialSagre = [sagraMirata, ...initialSagre];
    }
  }

  return (
    <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
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
                <ImageIcon aria-hidden size={22} />
              </span>
              <div>
                <h1 className="font-title text-3xl leading-tight sm:text-4xl">
                  Modifica immagine
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Cerca una sagra per visualizzare, sostituire, caricare o rimuovere la sua locandina.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-7 sm:mt-10">
          <ModificaImmagineClient
            initialSagre={initialSagre}
            initialSelectedId={initialSelectedId}
          />
        </div>
      </div>
    </main>
  );
}

