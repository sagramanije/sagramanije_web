import sharp from "sharp";
import {
  getSagreAbruzzo,
  locandinaOriginale,
  versioneLocandina,
} from "../../../lib/sagre";

// Proxy delle locandine: il browser vede solo /locandina/<id>, mai gli URL
// dei siti d'origine. Il file viene ridimensionato in WebP lato server e le
// sole due varianti consentite vengono messe in cache CDN.

export const runtime = "nodejs";
export const maxDuration = 30;

const VARIANTI = {
  card: { larghezza: 640, qualita: 70 },
  detail: { larghezza: 1280, qualita: 75 },
} as const;

type Variante = keyof typeof VARIANTI;

const MAX_BYTES_ORIGINALE = 25 * 1024 * 1024;
const CONTENT_TYPE_CONSENTITI = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// La risposta dell'API (3.4MB) supera il limite della data cache di Next:
// teniamo la mappa id → url in memoria di modulo, con TTL.
type Locandina = { url: string; versione: string };

let cache: { mappa: Map<number, Locandina>; scade: number } | null = null;
let inCorso: Promise<Map<number, Locandina>> | null = null;

async function mappaLocandine(forza = false): Promise<Map<number, Locandina>> {
  if (!forza && cache && Date.now() < cache.scade) return cache.mappa;
  inCorso ??= (async () => {
    const mappa = new Map<number, Locandina>();
    for (const s of await getSagreAbruzzo()) {
      const url = locandinaOriginale(s);
      if (url) mappa.set(s.id, { url, versione: versioneLocandina(url) });
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
      "X-Content-Type-Options": "nosniff",
      // Cache breve: se l'origine torna a rispondere, riproviamo presto.
      "Cache-Control": "public, max-age=300",
      "Vercel-CDN-Cache-Control": "public, max-age=3600",
    },
  });
}

function varianteRichiesta(req: Request): Variante | null {
  const variante = new URL(req.url).searchParams.get("variant");
  return variante === "card" || variante === "detail" ? variante : null;
}

async function leggiImmagine(
  body: ReadableStream<Uint8Array>,
): Promise<Buffer | null> {
  const reader = body.getReader();
  const parti: Uint8Array[] = [];
  let totale = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totale += value.byteLength;
    if (totale > MAX_BYTES_ORIGINALE) {
      await reader.cancel();
      return null;
    }
    parti.push(value);
  }

  return Buffer.concat(parti, totale);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return fallbackTrasparente();

  const versioneRichiesta = new URL(req.url).searchParams.get("v");
  if (versioneRichiesta && !/^[a-f0-9]{12}$/.test(versioneRichiesta)) {
    return fallbackTrasparente();
  }
  const variante = varianteRichiesta(req);
  if (!variante) return fallbackTrasparente();

  let locandina = (await mappaLocandine()).get(id);

  // Se la pagina conosce già una versione più recente di quella nella cache
  // in memoria del proxy, riallineiamo subito la mappa prima di scaricarla.
  if (versioneRichiesta && locandina?.versione !== versioneRichiesta) {
    locandina = (await mappaLocandine(true)).get(id);
  }
  if (
    !locandina ||
    !versioneRichiesta ||
    locandina.versione !== versioneRichiesta
  ) {
    return fallbackTrasparente();
  }

  let img: Response;
  try {
    img = await fetch(locandina.url, {
      headers: { "User-Agent": "Sagramanije/1.0 (+https://sagramanije.it)" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return fallbackTrasparente();
  }

  const contentType = (img.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const contentLength = Number(img.headers.get("content-length"));
  if (
    !img.ok ||
    !img.body ||
    !CONTENT_TYPE_CONSENTITI.has(contentType) ||
    (Number.isFinite(contentLength) && contentLength > MAX_BYTES_ORIGINALE)
  ) {
    return fallbackTrasparente();
  }

  const originale = await leggiImmagine(img.body);
  if (!originale) return fallbackTrasparente();

  let ottimizzata: Buffer;
  try {
    const config = VARIANTI[variante];
    ottimizzata = await sharp(originale, {
      failOn: "error",
      limitInputPixels: 50_000_000,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: config.larghezza,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: config.qualita,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer();
  } catch {
    return fallbackTrasparente();
  }

  return new Response(new Uint8Array(ottimizzata), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      // L'URL contiene l'hash dell'origine: se cambia la locandina cambia ?v.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Vercel-CDN-Cache-Control": "public, max-age=31536000",
    },
  });
}
