import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APP_STORE_URL, PLAY_STORE_URL } from "../data";

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

  // I dispositivi mobili vanno allo store corretto; da desktop si torna alla
  // home, dove sono visibili entrambi i badge.
  if (/android/i.test(userAgent)) {
    redirect(PLAY_STORE_URL);
  }

  if (/iPad|iPhone|iPod|Macintosh.*Mobile/i.test(userAgent)) {
    redirect(APP_STORE_URL);
  }

  redirect("/");
}
