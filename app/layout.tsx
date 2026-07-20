import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { OG_DEFAULTS, SITE_URL } from "../lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Senza questo i campi relativi (canonical, og:url, og:image) finiscono nel
  // markup così come sono: i canonical restano relativi e le og:image si rompono.
  metadataBase: new URL(SITE_URL),
  // Le pagine passano il titolo "nudo": il suffisso del brand lo mette il template.
  title: {
    default: "Sagre in Abruzzo: l'app che te le trova vicino | Sagramanije",
    template: "%s | Sagramanije",
  },
  description:
    "Le sagre e le feste di paese dell'Abruzzo, su una mappa. Scopri cosa si mangia stasera a due passi da casa.",
  openGraph: OG_DEFAULTS,
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#fff7ee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${bricolage.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
