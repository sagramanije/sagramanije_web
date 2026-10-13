import "server-only";

import sharp from "sharp";

/**
 * Decodifica entità HTML e caratteri escape Unicode in stringhe JSON/HTML
 */
function decodificaStringa(valore: string): string {
  return valore
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .trim();
}

/**
 * Tenta di rimuovere i parametri di crop forzato quadrato (1:1) o dimensioni ridotte
 * generati da Meta CDN (Facebook / Instagram).
 */
export function rimuoviCropMetaCdn(urlStr: string): string {
  try {
    let pulito = urlStr;

    // Rimuove la direttiva di crop specifica per rettangoli stp=c[x].[y].[w].[h]a_
    if (/[?&]stp=.*?\bc\d+\.\d+\.\d+\.\d+a_/.test(pulito)) {
      pulito = pulito.replace(/(\bc\d+\.\d+\.\d+\.\d+a_)/g, "");
    }

    // Rimuove indicatori di crop quadrato nei percorsi /s640x640/ o simili
    pulito = pulito.replace(/\/(s\d+x\d+)\//g, "/");

    return pulito;
  } catch {
    return urlStr;
  }
}

/**
 * Estrae l'URL della locandina o foto principale da un post Instagram.
 */
async function estraiImmagineDaInstagram(postUrl: string): Promise<string[]> {
  const candidati: string[] = [];

  // Estrae lo shortcode (es. p/C-XYZ... o reel/C-XYZ...)
  const matchCode = /(?:instagram\.com\/(?:p|reel|tv)\/|instagr\.am\/p\/)([A-Za-z0-9_-]+)/i.exec(
    postUrl,
  );
  const shortcode = matchCode?.[1];

  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
  };

  const fbHeaders = {
    "User-Agent":
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  // 1. TENTATIVO VIA EMBED CAPTIONED: endpoint pubblico senza login che espone display_url HD e srcset non ritagliati
  if (shortcode) {
    try {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const resp = await fetch(embedUrl, {
        headers: browserHeaders,
        signal: AbortSignal.timeout(10_000),
      });

      if (resp.ok) {
        const html = await resp.text();

        // 1a. Cerca display_url nel payload JSON dell'embed
        const dUrls = [...html.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)];
        for (const m of dUrls) {
          const dec = decodificaStringa(m[1]);
          if (dec.startsWith("http") && !dec.includes("150x150") && !dec.includes("avatar")) {
            candidati.push(dec);
          }
        }

        // 1b. Cerca nei tag srcset dell'embed (preferendo la risoluzione più alta, es. 1080w)
        const srcsetMatches = [...html.matchAll(/srcset="([^"]+)"/g)];
        for (const sm of srcsetMatches) {
          const entries = sm[1].split(",").map((s) => s.trim());
          const parsed = entries
            .map((entry) => {
              const parts = entry.split(/\s+/);
              const url = decodificaStringa(parts[0]);
              const width = parts[1] ? parseInt(parts[1].replace(/\D/g, ""), 10) : 0;
              return { url, width };
            })
            .filter((p) => p.url.startsWith("http"));

          parsed.sort((a, b) => b.width - a.width);
          for (const item of parsed) {
            candidati.push(item.url);
          }
        }

        // 1c. Immagine principale EmbeddedMediaImage
        const imgTagMatch = /<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*src="([^"]+)"/i.exec(
          html,
        );
        if (imgTagMatch) {
          candidati.push(decodificaStringa(imgTagMatch[1]));
        }
      }
    } catch (err) {
      console.warn("[Instagram Embed] Tentativo fallito:", err);
    }
  }

  // 2. TENTATIVO VIA OPENGRAPH (con User-Agent facebookexternalhit)
  try {
    const cleanUrl = shortcode
      ? `https://www.instagram.com/p/${shortcode}/`
      : postUrl.split("?")[0];

    const resp = await fetch(cleanUrl, {
      headers: fbHeaders,
      signal: AbortSignal.timeout(8_000),
    });

    if (resp.ok) {
      const html = await resp.text();

      const ogMatches = [
        ...html.matchAll(
          /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/gi,
        ),
      ];
      for (const m of ogMatches) {
        candidati.push(decodificaStringa(m[1]));
      }

      const dUrls = [...html.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)];
      for (const m of dUrls) {
        const dec = decodificaStringa(m[1]);
        if (dec.startsWith("http")) candidati.push(dec);
      }
    }
  } catch (err) {
    console.warn("[Instagram OpenGraph] Tentativo fallito:", err);
  }

  return candidati;
}

/**
 * Estrae l'URL della locandina o foto principale da un post Facebook.
 */
async function estraiImmagineDaFacebook(postUrl: string): Promise<string[]> {
  const candidati: string[] = [];

  const fbHeaders = {
    "User-Agent":
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  try {
    const resp = await fetch(postUrl, {
      headers: fbHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (resp.ok) {
      const html = await resp.text();

      // OpenGraph secure_url e og:image
      const ogMatches = [
        ...html.matchAll(
          /<meta\s+(?:property|name)=["'](?:og:image:secure_url|og:image)["']\s+content=["']([^"']+)["']/gi,
        ),
      ];
      for (const m of ogMatches) {
        candidati.push(decodificaStringa(m[1]));
      }

      // Link rel="image_src"
      const linkImg = /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i.exec(
        html,
      );
      if (linkImg) {
        candidati.push(decodificaStringa(linkImg[1]));
      }

      // Pattern CDN scontent di Facebook nel testo HTML
      const scontentMatches = [
        ...html.matchAll(/https:\/\/[a-zA-Z0-9.\-_]*scontent[^"'\s<>]+/g),
      ];
      for (const m of scontentMatches.slice(0, 5)) {
        candidati.push(decodificaStringa(m[0]));
      }
    }
  } catch (err) {
    console.warn("[Facebook OpenGraph] Tentativo fallito:", err);
  }

  return candidati;
}

/**
 * Estrae l'URL della foto principale da qualsiasi pagina web generica (OpenGraph, Twitter card, ecc.).
 */
async function estraiImmagineDaPaginaGenerica(url: string): Promise<string[]> {
  const candidati: string[] = [];

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      return [url];
    }

    if (resp.ok) {
      const html = await resp.text();

      const ogMatches = [
        ...html.matchAll(
          /<meta\s+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image)["']\s+content=["']([^"']+)["']/gi,
        ),
      ];
      for (const m of ogMatches) {
        const u = decodificaStringa(m[1]);
        if (u) {
          try {
            candidati.push(new URL(u, url).href);
          } catch {
            candidati.push(u);
          }
        }
      }

      const linkImg = /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i.exec(
        html,
      );
      if (linkImg) {
        const u = decodificaStringa(linkImg[1]);
        try {
          candidati.push(new URL(u, url).href);
        } catch {
          candidati.push(u);
        }
      }
    }
  } catch (err) {
    console.warn("[Generico OpenGraph] Tentativo fallito:", err);
  }

  return candidati;
}

/**
 * Scarica i byte dell'immagine e ne convalida/normalizza il formato tramite sharp.
 */
async function scaricaEValidaImmagine(
  urlImmagine: string,
  referer?: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const resp = await fetch(urlImmagine, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      ...(referer ? { Referer: referer } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new Error(`Download fallito con codice HTTP ${resp.status}`);
  }

  const rawBytes = await resp.arrayBuffer();
  if (rawBytes.byteLength < 1024) {
    throw new Error("L'immagine scaricata è troppo piccola o vuota.");
  }

  const bufferIniziale = Buffer.from(rawBytes);
  const image = sharp(bufferIniziale);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Il file scaricato non è un'immagine valida.");
  }

  // Verifica se il formato è tra quelli direttamente supportati dallo storage (jpeg, png, webp)
  let mimeType = "image/jpeg";
  let bufferFinale = bufferIniziale;

  if (metadata.format === "jpeg") {
    mimeType = "image/jpeg";
  } else if (metadata.format === "png") {
    mimeType = "image/png";
  } else if (metadata.format === "webp") {
    mimeType = "image/webp";
  } else {
    // Per formati come avif, heic, gif o altri, convertiamo in WebP ad alta qualità
    bufferFinale = await image.webp({ quality: 90 }).toBuffer();
    mimeType = "image/webp";
  }

  return { buffer: bufferFinale, mimeType };
}

/**
 * Funzione principale: dato l'URL di un post social (Facebook, Instagram o qualsiasi link),
 * estrae la foto/locandina originale non tagliata e restituisce il buffer pronto per lo storage.
 */
export async function estraiImmagineDaLinkSocial(
  urlPost: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const urlPulito = urlPost.trim();
  if (!urlPulito) {
    throw new Error("Nessun link specificato.");
  }

  try {
    new URL(urlPulito);
  } catch {
    throw new Error("Il link fornito non è un URL valido.");
  }

  // Se è già un link diretto a un file immagine
  const isDirectImage = /\.(jpe?g|png|webp|avif|heic|heif)(\?.*)?$/i.test(
    urlPulito,
  );
  if (isDirectImage) {
    try {
      return await scaricaEValidaImmagine(urlPulito);
    } catch {
      // Procediamo con gli altri tentativi se il download diretto fallisce
    }
  }

  const isInstagram =
    urlPulito.includes("instagram.com") || urlPulito.includes("instagr.am");
  const isFacebook =
    urlPulito.includes("facebook.com") ||
    urlPulito.includes("fb.watch") ||
    urlPulito.includes("fb.com");

  let candidati: string[] = [];

  if (isInstagram) {
    candidati = await estraiImmagineDaInstagram(urlPulito);
  } else if (isFacebook) {
    candidati = await estraiImmagineDaFacebook(urlPulito);
  } else {
    candidati = await estraiImmagineDaPaginaGenerica(urlPulito);
  }

  // Se nessun candidato trovato, tenta come fallback generico
  if (candidati.length === 0) {
    candidati = await estraiImmagineDaPaginaGenerica(urlPulito);
  }

  // Se ancora vuoto, tenta direttamente l'URL stesso come immagine
  if (candidati.length === 0) {
    candidati = [urlPulito];
  }

  // Ordiniamo e de-croppiamo i candidati per dare priorità a quelli a piena risoluzione
  const candidatiOrdinati: string[] = [];
  const visti = new Set<string>();

  for (const c of candidati) {
    if (!c || visti.has(c)) continue;
    visti.add(c);

    // Se l'URL contiene parametri di crop Meta, proviamo prima la versione de-croppata
    const decroppato = rimuoviCropMetaCdn(c);
    if (decroppato !== c && !visti.has(decroppato)) {
      candidatiOrdinati.push(decroppato);
      visti.add(decroppato);
    }
    candidatiOrdinati.push(c);
  }

  let ultimoErrore: Error | null = null;

  for (const candUrl of candidatiOrdinati) {
    try {
      const risultato = await scaricaEValidaImmagine(candUrl, urlPulito);
      return risultato;
    } catch (err) {
      ultimoErrore = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `Impossibile recuperare l'immagine dal post social (${ultimoErrore?.message ?? "Nessuna immagine valida trovata"}). Verifica che il post sia pubblico e contenga una foto.`,
  );
}
