import { getSagreAbruzzo, locandinaOriginale } from "../../../lib/sagre";

// Proxy delle locandine: il browser vede solo /locandina/<id>, mai gli URL
// dei siti d'origine. Il file viene scaricato lato server e messo in cache CDN.

// La risposta dell'API (3.4MB) supera il limite della data cache di Next:
// teniamo la mappa id → url in memoria di modulo, con TTL.
let cache: { mappa: Map<number, string>; scade: number } | null = null;
let inCorso: Promise<Map<number, string>> | null = null;

async function mappaLocandine(): Promise<Map<number, string>> {
  if (cache && Date.now() < cache.scade) return cache.mappa;
  inCorso ??= (async () => {
    const mappa = new Map<number, string>();
    for (const s of await getSagreAbruzzo()) {
      const url = locandinaOriginale(s);
      if (url) mappa.set(s.id, url);
    }
    cache = { mappa, scade: Date.now() + 6 * 60 * 60 * 1000 };
    return mappa;
  })().finally(() => {
    inCorso = null;
  });
  return inCorso;
}

// PNG 1×1 trasparente: quando l'origine non ha più l'immagine, la card
// lascia trasparire il placeholder a strisce invece dell'icona rotta.
const PNG_TRASPARENTE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function fallbackTrasparente() {
  return new Response(new Uint8Array(PNG_TRASPARENTE), {
    headers: {
      "Content-Type": "image/png",
      // Cache breve: se l'origine torna a rispondere, riproviamo presto.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return fallbackTrasparente();

  const url = (await mappaLocandine()).get(id);
  if (!url) return fallbackTrasparente();

  let img: Response;
  try {
    img = await fetch(url, {
      headers: { "User-Agent": "Sagramanije/1.0 (+https://sagramanije.it)" },
    });
  } catch {
    return fallbackTrasparente();
  }

  const contentType = img.headers.get("content-type") ?? "image/jpeg";
  if (!img.ok || !img.body || !contentType.startsWith("image/")) {
    return fallbackTrasparente();
  }

  return new Response(img.body, {
    headers: {
      "Content-Type": contentType,
      // Un giorno nel browser, una settimana in CDN: le locandine non cambiano.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
    },
  });
}
