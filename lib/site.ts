/**
 * Origine pubblica del sito. Serve a Next per risolvere in URL assoluti i
 * campi relativi di metadata (canonical, og:url, og:image) e ai JSON-LD, che
 * per specifica vogliono URL assoluti.
 */
export const SITE_URL = "https://sagramanije.it";

/**
 * Campi Open Graph comuni a tutto il sito.
 * Vanno spalmati (`...OG_DEFAULTS`) in ogni pagina che dichiara un `openGraph`
 * suo: Next sostituisce in blocco l'oggetto del layout invece di fonderlo, e
 * senza questo la pagina perde site_name, locale e type.
 */
export const OG_DEFAULTS = {
  siteName: "Sagramanije",
  locale: "it_IT",
  type: "website",
} as const;
