import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
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
  title: "Sagramanije — Trova la tua sagra",
  description:
    "Le sagre e le feste di paese dell'Abruzzo, su una mappa. Scopri cosa si mangia stasera a due passi da casa.",
  openGraph: {
    title: "Sagramanije — Trova la tua sagra",
    description:
      "Le sagre e le feste di paese dell'Abruzzo, su una mappa. Scopri cosa si mangia stasera a due passi da casa.",
    locale: "it_IT",
    type: "website",
  },
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
