import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PLAY_STORE_URL } from "../data";

export const metadata: Metadata = {
  title: "Scarica l'app",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
  },
};

// Pagina "ponte" senza contenuto proprio: da linkare da QR code o social bio,
// smista in base allo user agent e non serve mai HTML da indicizzare.
export default async function ScaricaPage() {
  const userAgent = (await headers()).get("user-agent") ?? "";

  // iOS resta in attesa della pubblicazione (vedi APP_STORE_URL in app/data.ts):
  // finché non c'è un link reale, tutto ciò che non è Android torna alla home.
  if (/android/i.test(userAgent)) {
    redirect(PLAY_STORE_URL);
  }

  redirect("/");
}
