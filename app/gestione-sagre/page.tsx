import type { Metadata } from "next";
import { ClipboardCheck, LockKeyhole, LogOut, Plus } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { sessioneAdminValida } from "../../lib/admin-auth";
import { contaSagrePreProd } from "../../lib/sagre-pre-prod";
import { Wordmark } from "../components/wordmark";
import { esci } from "./actions";
import LoginForm from "./login-form";
import SagraForm from "./sagra-form";

export const metadata: Metadata = {
  title: "Gestione sagre",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function GestioneSagrePage() {
  // Password, segreto di sessione e cookie sono valori runtime: impediamo che
  // il login venga congelato come pagina statica durante la build.
  await connection();
  const autenticato = await sessioneAdminValida();

  if (!autenticato) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6">
        <section className="w-full max-w-md rounded-3xl bg-surface p-5 shadow-sm sm:p-8">
          <Wordmark />
          <div className="mt-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole aria-hidden size={24} />
          </div>
          <h1 className="mt-5 font-title text-3xl">Area riservata</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Inserisci la password amministrativa per gestire le sagre.
          </p>
          <LoginForm />
        </section>
      </main>
    );
  }

  const daRevisionare = await contaSagrePreProd();

  return (
    <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Wordmark />
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                <Plus aria-hidden size={22} strokeWidth={3} />
              </span>
              <div>
                <h1 className="font-title text-3xl leading-tight sm:text-4xl">
                  Nuova sagra
                </h1>
                <p className="mt-1 text-sm text-muted">
                  I dati vengono salvati direttamente nella tabella sagre.
                </p>
              </div>
            </div>
          </div>

          <form action={esci}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-beige bg-white px-4 py-2 text-sm font-bold transition hover:border-primary sm:w-auto"
            >
              <LogOut aria-hidden size={17} />
              Esci
            </button>
          </form>
        </header>

        <Link
          href="/gestione-sagre/revisione"
          className="mt-7 flex items-center justify-between gap-4 rounded-3xl bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardCheck aria-hidden size={22} />
            </span>
            <div>
              <p className="font-title text-lg">Revisione bozze</p>
              <p className="mt-0.5 text-sm text-muted">
                Convalida i dati importati in sagre_pre_prod prima che finiscano in sagre.
              </p>
            </div>
          </div>
          {daRevisionare > 0 ? (
            <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">
              {daRevisionare}
            </span>
          ) : null}
        </Link>

        <section className="mt-7 rounded-3xl bg-surface p-4 shadow-sm sm:p-8">
          <SagraForm />
        </section>
      </div>
    </main>
  );
}
