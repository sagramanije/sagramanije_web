import "server-only";

import sharp from "sharp";

/**
 * Decodifica entità HTML e caratteri escape Unicode/JSON.
 */
export function decodificaStringa(valore: string): string {
  if (!valore) return "";
  let res = valore
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003C/gi, "<")
    .replace(/\\u003E/gi, ">")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .trim();

  if (
    (res.startsWith('"') && res.endsWith('"')) ||
    (res.startsWith("'") && res.endsWith("'"))
  ) {
    res = res.slice(1, -1).trim();
  }
  return res;
}

/**
 * Estrae lo shortcode da qualsiasi URL Instagram valido, inclusi quelli che
 * contengono l'username del profilo prima di /p/ (es. instagram.com/nome_profilo/p/SHORTCODE/)
 * o parametri di query/share.
 */
export function estraiShortcodeInstagram(url: string): string | null {
  if (!url) return null;
  // Cattura il segmento dopo /p/, /reel/, /reels/ o /tv/
  const m = /(?:\/|^)(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i.exec(url);
  if (m?.[1]) return m[1];

  // Fallback per URL abbreviati instagr.am/p/XYZ
  const m2 = /instagr\.am\/p\/([A-Za-z0-9_-]+)/i.exec(url);
  if (m2?.[1]) return m2[1];

  return null;
}

/**
 * Genera varianti dello shortcode per risolvere ambiguità visive comuni
 * tra caratteri simili nei font sans-serif (es. 'l' minuscola vs 'I' maiuscola, '1', '0' vs 'O').
 */
export function generaVariantiShortcode(code: string): string[] {
  const varianti: string[] = [code];
  const aggiungi = (v: string) => {
    if (v && v.length === code.length && !varianti.includes(v)) {
      varianti.push(v);
    }
  };

  // Scambia 'l' (elle minuscola) con 'I' (i maiuscola)
  if (code.includes("l")) {
    aggiungi(code.replace(/l/g, "I"));
  }
  // Scambia 'I' (i maiuscola) con 'l' (elle minuscola)
  if (code.includes("I")) {
    aggiungi(code.replace(/I/g, "l"));
  }
  // Scambia '1' con 'l' o 'I'
  if (code.includes("1")) {
    aggiungi(code.replace(/1/g, "l"));
    aggiungi(code.replace(/1/g, "I"));
  }
  // Scambia '0' e 'O'
  if (code.includes("0")) {
    aggiungi(code.replace(/0/g, "O"));
  }
  if (code.includes("O")) {
    aggiungi(code.replace(/O/g, "0"));
  }

  return varianti;
}

/**
 * Converte uno shortcode Instagram nel relativo Media ID decimale.
 */
export function shortcodeToMediaId(shortcode: string): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    id = id * BigInt(64) + BigInt(index);
  }
  return id.toString();
}

/**
 * Rileva se un URL di Meta CDN (Instagram / Facebook) contiene parametri
 * di ritaglio (crop 1:1 o bounding box quadrato forzato).
 */
export function haParametriCrop(urlStr: string): boolean {
  if (!urlStr) return false;
  // Direttiva di crop esplicita per rettangoli su Meta CDN: stp=c[x].[y].[w].[h]a_
  if (/[?&]stp=[^&]*\bc\d+\.\d+\.\d+\.\d+a_/i.test(urlStr)) return true;
  // Dimensionamento forzato a quadrato nei percorsi CDN
  if (/\/(s\d+x\d+)\//i.test(urlStr)) return true;
  if (/_(s\d+x\d+)[._]/i.test(urlStr)) return true;
  // Query parameter di ritaglio quadrato
  if (/[?&]stp=[^&]*\bs\d+x\d+\b/i.test(urlStr)) return true;
  return false;
}

/**
 * Tenta di rimuovere i parametri di crop forzato (se possibile senza invalidare la firma HMAC).
 */
export function rimuoviCropMetaCdn(urlStr: string): string {
  try {
    let pulito = urlStr;
    if (/[?&]stp=.*?\bc\d+\.\d+\.\d+\.\d+a_/.test(pulito)) {
      pulito = pulito.replace(/(\bc\d+\.\d+\.\d+\.\d+a_)/g, "");
    }
    pulito = pulito.replace(/\/(s\d+x\d+)\//g, "/");
    return pulito;
  } catch {
    return urlStr;
  }
}

interface CandidatoFoto {
  url: string;
  priorita: number;
  larghezzaPresunta?: number;
  altezzaPresunta?: number;
  fonte: string;
}

function aggiungiCandidato(
  lista: CandidatoFoto[],
  urlGrezzo: string,
  prioritaBase: number,
  fonte: string,
  larghezza?: number,
  altezza?: number,
): void {
  const url = decodificaStringa(urlGrezzo);
  if (!url || !url.startsWith("http")) return;

  // Esclude avatar, icone, gif o tracking pixel
  if (
    url.includes("/150x150/") ||
    url.includes("/s150x150/") ||
    url.includes("/p50x50/") ||
    url.includes("/s50x50/") ||
    url.includes("safe_image.php") ||
    url.includes("blank.gif") ||
    url.includes("/rsrc.php/")
  ) {
    return;
  }

  let priorita = prioritaBase;
  const isCropped = haParametriCrop(url);
  if (isCropped) {
    // I ritagli forzati hanno priorità bassissima di riserva
    priorita = Math.min(priorita, 50);
  } else if (larghezza && altezza) {
    if (altezza > larghezza * 1.05) {
      // Locandina verticale (es. 4:5, 1080x1350 o 1572w): priorità massima
      priorita += 800;
    }
    priorita += Math.min(400, Math.floor((larghezza * altezza) / 10_000));
  } else if (larghezza) {
    priorita += Math.min(400, larghezza);
  }

  lista.push({
    url,
    priorita,
    larghezzaPresunta: larghezza,
    altezzaPresunta: altezza,
    fonte,
  });
}

/**
 * Estrae le immagini e le risoluzioni non tagliate presenti nei tag <img> e <source>
 * dell'embed di Instagram (specialmente da class="EmbeddedMediaImage" e attributo srcset).
 */
function estraiImmaginiDaHtmlEmbed(
  html: string,
  candidati: CandidatoFoto[],
  fonte: string,
): boolean {
  let trovataNonCroppata = false;

  // 1. Cerca il tag EmbeddedMediaImage principale dell'embed
  const imgMatches = html.matchAll(
    /<img[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/gi,
  );
  for (const m of imgMatches) {
    const tag = m[0];

    // Estrae l'attributo srcset (contiene le varie risoluzioni: 1572w, 1080w, 720w, ecc.)
    const srcsetMatch = /srcset="([^"]+)"/i.exec(tag);
    if (srcsetMatch) {
      const rawEntries = srcsetMatch[1].split(",");
      for (const entry of rawEntries) {
        const parti = entry.trim().split(/\s+/);
        if (parti.length >= 1) {
          const u = decodificaStringa(parti[0]);
          const w = parti[1]
            ? parseInt(parti[1].replace(/\D/g, ""), 10)
            : undefined;
          if (u && u.startsWith("http")) {
            const isCropped = haParametriCrop(u);
            if (!isCropped) {
              trovataNonCroppata = true;
            }
            // Gli URL in srcset che NON contengono crop (es. stp=dst-jpg_e35_tt6) sono le versioni originali
            const priorita = isCropped ? 50 : 2000 + (w ?? 0);
            aggiungiCandidato(
              candidati,
              u,
              priorita,
              `${fonte}:EmbeddedMediaImage:srcset:${w ?? "auto"}`,
              w,
            );
          }
        }
      }
    }

    // Estrae src
    const srcMatch = /src="([^"]+)"/i.exec(tag);
    if (srcMatch) {
      const u = decodificaStringa(srcMatch[1]);
      if (u && u.startsWith("http")) {
        const isCropped = haParametriCrop(u);
        if (!isCropped) trovataNonCroppata = true;
        const priorita = isCropped ? 40 : 1800;
        aggiungiCandidato(
          candidati,
          u,
          priorita,
          `${fonte}:EmbeddedMediaImage:src`,
        );
      }
    }
  }

  // 2. Cerca altri attributi srcset o src con CDN scontent
  const allSrcsets = html.matchAll(/(?:srcset|src)="([^"]+)"/gi);
  for (const m of allSrcsets) {
    const attrVal = m[1];
    if (attrVal.includes(",")) {
      const rawEntries = attrVal.split(",");
      for (const entry of rawEntries) {
        const parti = entry.trim().split(/\s+/);
        if (parti.length >= 1) {
          const u = decodificaStringa(parti[0]);
          const w = parti[1]
            ? parseInt(parti[1].replace(/\D/g, ""), 10)
            : undefined;
          if (u && u.startsWith("http") && u.includes("scontent")) {
            const isCropped = haParametriCrop(u);
            if (!isCropped) trovataNonCroppata = true;
            const priorita = isCropped ? 30 : 1200 + (w ?? 0);
            aggiungiCandidato(candidati, u, priorita, `${fonte}:srcset`, w);
          }
        }
      }
    } else {
      const u = decodificaStringa(attrVal);
      if (u && u.startsWith("http") && u.includes("scontent")) {
        const isCropped = haParametriCrop(u);
        if (!isCropped) trovataNonCroppata = true;
        const priorita = isCropped ? 30 : 1100;
        aggiungiCandidato(candidati, u, priorita, `${fonte}:src`);
      }
    }
  }

  return trovataNonCroppata;
}

/**
 * Scansiona payload JSON/HTML per chiavi display_resources, display_url o candidates
 */
function analizzaPayloadJsonInstagram(
  testo: string,
  candidati: CandidatoFoto[],
  fonte: string,
): void {
  // 1. display_resources
  const resMatches = testo.matchAll(
    /(?:\\?"|&quot;)display_resources(?:\\?"|&quot;)\s*:\s*\[([\s\S]*?)\]/gi,
  );
  for (const rm of resMatches) {
    const blocco = rm[1];
    const oggetti = blocco.split(/\}(?:\s*,\s*\{|\s*\])/);
    for (const ogg of oggetti) {
      const srcM =
        /(?:\\?"|&quot;)src(?:\\?"|&quot;)\s*:\s*(?:\\?"|&quot;)(https:[^"'\\]+)/i.exec(
          ogg,
        );
      const wM =
        /(?:\\?"|&quot;)config_width(?:\\?"|&quot;)\s*:\s*(\d+)/i.exec(ogg);
      const hM =
        /(?:\\?"|&quot;)config_height(?:\\?"|&quot;)\s*:\s*(\d+)/i.exec(ogg);
      if (srcM) {
        const w = wM ? parseInt(wM[1], 10) : undefined;
        const h = hM ? parseInt(hM[1], 10) : undefined;
        aggiungiCandidato(
          candidati,
          srcM[1],
          1500,
          `${fonte}:display_resources`,
          w,
          h,
        );
      }
    }
  }

  // 2. image_versions2 candidates
  const candMatches = testo.matchAll(
    /(?:\\?"|&quot;)candidates(?:\\?"|&quot;)\s*:\s*\[([\s\S]*?)\]/gi,
  );
  for (const cm of candMatches) {
    const blocco = cm[1];
    const oggetti = blocco.split(/\}(?:\s*,\s*\{|\s*\])/);
    for (const ogg of oggetti) {
      const urlM =
        /(?:\\?"|&quot;)url(?:\\?"|&quot;)\s*:\s*(?:\\?"|&quot;)(https:[^"'\\]+)/i.exec(
          ogg,
        );
      const wM =
        /(?:\\?"|&quot;)width(?:\\?"|&quot;)\s*:\s*(\d+)/i.exec(ogg);
      const hM =
        /(?:\\?"|&quot;)height(?:\\?"|&quot;)\s*:\s*(\d+)/i.exec(ogg);
      if (urlM) {
        const w = wM ? parseInt(wM[1], 10) : undefined;
        const h = hM ? parseInt(hM[1], 10) : undefined;
        aggiungiCandidato(
          candidati,
          urlM[1],
          1500,
          `${fonte}:candidates`,
          w,
          h,
        );
      }
    }
  }

  // 3. display_url
  const dUrls = testo.matchAll(
    /(?:\\?"|&quot;)display_url(?:\\?"|&quot;)\s*:\s*(?:\\?"|&quot;)(https:[^"'\\]+)/gi,
  );
  for (const m of dUrls) {
    aggiungiCandidato(candidati, m[1], 1300, `${fonte}:display_url`);
  }
}

/**
 * Estrae l'URL della locandina o foto principale da un post Instagram
 * garantendo la massima risoluzione e preservando l'inquadratura originale (non ritagliata).
 */
async function estraiImmagineDaInstagram(
  postUrl: string,
): Promise<CandidatoFoto[]> {
  const candidati: CandidatoFoto[] = [];

  const shortcodeIniziale = estraiShortcodeInstagram(postUrl);
  const variantiShortcode = shortcodeIniziale
    ? generaVariantiShortcode(shortcodeIniziale)
    : [];

  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
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

  // 1. TENTATIVO VIA EMBED CAPTIONED PER OGNI VARIANTE DELLO SHORTCODE
  // È l'endpoint pubblico più ricco di metadati completi (srcset fino a 1572w non tagliati)
  for (const code of variantiShortcode) {
    try {
      const embedUrl = `https://www.instagram.com/p/${code}/embed/captioned/`;
      const resp = await fetch(embedUrl, {
        headers: browserHeaders,
        signal: AbortSignal.timeout(10_000),
      });

      if (resp.ok) {
        const html = await resp.text();

        // Se l'embed dice che il post è rotto o rimosso (spesso accade con varianti errate di 'l' vs 'I')
        if (
          html.includes("EmbedBrokenMedia") ||
          html.includes("ebmMessage") ||
          html.includes("The link to this photo or video may be broken")
        ) {
          continue;
        }

        // Estrae le immagini non ritagliate da <img class="EmbeddedMediaImage" ... srcset="...">
        const trovata = estraiImmaginiDaHtmlEmbed(html, candidati, `embed:${code}`);
        analizzaPayloadJsonInstagram(html, candidati, `embed_json:${code}`);

        // Se abbiamo trovato le immagini ad alta risoluzione non croppate nell'embed, possiamo interrompere il ciclo varianti
        if (trovata) {
          break;
        }
      }
    } catch (err) {
      console.warn(`[Instagram Embed ${code}] Tentativo non riuscito:`, err);
    }
  }

  // 2. TENTATIVO VIA API PUBBLICA INSTAGRAM WEB APP (/api/v1/media/${mediaId}/info/)
  for (const code of variantiShortcode) {
    try {
      const mediaId = shortcodeToMediaId(code);
      if (mediaId && mediaId !== "0") {
        const apiUrl = `https://www.instagram.com/api/v1/media/${mediaId}/info/`;
        const resp = await fetch(apiUrl, {
          headers: {
            ...browserHeaders,
            "X-IG-App-ID": "936619743392459",
            Accept: "*/*",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "X-Requested-With": "XMLHttpRequest",
            Referer: `https://www.instagram.com/p/${code}/`,
          },
          signal: AbortSignal.timeout(8_000),
        });

        if (resp.ok) {
          const dati = (await resp.json()) as {
            items?: Array<{
              carousel_media?: Array<{
                image_versions2?: {
                  candidates?: Array<{
                    url: string;
                    width: number;
                    height: number;
                  }>;
                };
              }>;
              image_versions2?: {
                candidates?: Array<{
                  url: string;
                  width: number;
                  height: number;
                }>;
              };
            }>;
          };
          const item = dati?.items?.[0];
          if (item) {
            const mediaSelezionato = item.carousel_media?.[0] ?? item;
            const cands = mediaSelezionato.image_versions2?.candidates ?? [];
            for (const c of cands) {
              if (c?.url) {
                aggiungiCandidato(
                  candidati,
                  c.url,
                  1800,
                  "api:image_versions2",
                  c.width,
                  c.height,
                );
              }
            }
            if (candidati.length > 0) break;
          }
        }
      }
    } catch (err) {
      console.warn(`[Instagram API ${code}] Tentativo non riuscito:`, err);
    }
  }

  // 3. TENTATIVO VIA OPENGRAPH (con User-Agent facebookexternalhit)
  try {
    const canonicalCode = variantiShortcode[0] ?? shortcodeIniziale;
    const cleanUrl = canonicalCode
      ? `https://www.instagram.com/p/${canonicalCode}/`
      : postUrl.split("?")[0];

    const resp = await fetch(cleanUrl, {
      headers: fbHeaders,
      signal: AbortSignal.timeout(8_000),
    });

    if (resp.ok) {
      const html = await resp.text();
      estraiImmaginiDaHtmlEmbed(html, candidati, "opengraph_html");
      analizzaPayloadJsonInstagram(html, candidati, "opengraph_json");

      const ogMatches = [
        ...html.matchAll(
          /<meta\s+(?:property|name)=["'](?:og:image:secure_url|og:image)["']\s+content=["']([^"']+)["']/gi,
        ),
      ];
      for (const m of ogMatches) {
        // og:image di Instagram è tipicamente ritagliato a 1:1, quindi tenuto a priorità bassa
        aggiungiCandidato(candidati, m[1], 50, "instagram:og:image");
      }
    }
  } catch (err) {
    console.warn("[Instagram OpenGraph] Tentativo fallito:", err);
  }

  return candidati;
}

/**
 * Estrae l'URL della locandina o foto principale da un post Facebook
 * preservando la versione a piena risoluzione non ritagliata.
 */
async function estraiImmagineDaFacebook(
  postUrl: string,
): Promise<CandidatoFoto[]> {
  const candidati: CandidatoFoto[] = [];

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

      // Cerca chiavi JSON per immagini originali/complete
      const jsonImagePatterns = [
        /(?:\\?"|&quot;)(?:full_image|original_image|photo_image)(?:\\?"|&quot;)\s*:\s*\{[\s\S]*?(?:\\?"|&quot;)(?:uri|url)(?:\\?"|&quot;)\s*:\s*(?:\\?"|&quot;)(https:[^"'\\]+)/gi,
        /(?:\\?"|&quot;)image(?:\\?"|&quot;)\s*:\s*\{[\s\S]*?(?:\\?"|&quot;)uri(?:\\?"|&quot;)\s*:\s*(?:\\?"|&quot;)(https:[^"'\\]+)/gi,
      ];

      for (const pat of jsonImagePatterns) {
        for (const m of html.matchAll(pat)) {
          aggiungiCandidato(candidati, m[1], 1500, "facebook:json_image");
        }
      }

      // Pattern CDN scontent di Facebook nel testo HTML
      const scontentMatches = [
        ...html.matchAll(
          /https:\\\/\\\/[a-zA-Z0-9.\-_]*scontent[^"'\s<>]+\.(?:jpe?g|png|webp)[^"'\s<>]*/g,
        ),
        ...html.matchAll(
          /https:\/\/[a-zA-Z0-9.\-_]*scontent[^"'\s<>]+\.(?:jpe?g|png|webp)[^"'\s<>]*/g,
        ),
      ];
      for (const m of scontentMatches) {
        aggiungiCandidato(candidati, m[0], 1200, "facebook:scontent_raw");
      }

      // OpenGraph secure_url e og:image
      const ogMatches = [
        ...html.matchAll(
          /<meta\s+(?:property|name)=["'](?:og:image:secure_url|og:image)["']\s+content=["']([^"']+)["']/gi,
        ),
      ];
      for (const m of ogMatches) {
        aggiungiCandidato(candidati, m[1], 200, "facebook:og:image");
      }

      // Link rel="image_src"
      const linkImg =
        /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i.exec(html);
      if (linkImg) {
        aggiungiCandidato(candidati, linkImg[1], 180, "facebook:image_src");
      }
    }
  } catch (err) {
    console.warn("[Facebook OpenGraph] Tentativo fallito:", err);
  }

  return candidati;
}

/**
 * Estrae l'URL della foto principale da qualsiasi pagina web generica.
 */
async function estraiImmagineDaPaginaGenerica(
  url: string,
): Promise<CandidatoFoto[]> {
  const candidati: CandidatoFoto[] = [];

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      aggiungiCandidato(candidati, url, 1000, "generica:direct_image");
      return candidati;
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
            aggiungiCandidato(
              candidati,
              new URL(u, url).href,
              400,
              "generica:og_image",
            );
          } catch {
            aggiungiCandidato(candidati, u, 400, "generica:og_image");
          }
        }
      }

      const linkImg =
        /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i.exec(html);
      if (linkImg) {
        const u = decodificaStringa(linkImg[1]);
        try {
          aggiungiCandidato(
            candidati,
            new URL(u, url).href,
            350,
            "generica:image_src",
          );
        } catch {
          aggiungiCandidato(candidati, u, 350, "generica:image_src");
        }
      }
    }
  } catch (err) {
    console.warn("[Generico OpenGraph] Tentativo fallito:", err);
  }

  return candidati;
}

interface DettagliImmagineScaricata {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  isPortrait: boolean;
  isSquare: boolean;
  hasCrop: boolean;
  score: number;
}

/**
 * Calcola il punteggio di idoneità di una locandina:
 * - Dà priorità assoluta alle immagini complete e non croppate
 * - Premia fortemente il formato verticale (tipico delle locandine con data, programma, intestazione e piè di pagina)
 * - Penalizza i ritagli quadrati 1:1 o immagini con parametri di crop CDN espliciti
 */
function calcolaPunteggioImmagine(
  width: number,
  height: number,
  hasCrop: boolean,
  isPortrait: boolean,
  isSquare: boolean,
): number {
  let score = width * height;

  if (isPortrait) {
    // Locandina verticale (es. 4:5, 1080x1350 o 1572w): contiene l'intera locandina
    score *= 3.0;
  } else if (isSquare) {
    // Ritaglio quadrato 1:1: taglia le locandine verticali
    score *= 0.25;
  }

  if (hasCrop) {
    // Presenza di crop directive (es. stp=c...a_)
    score *= 0.1;
  }

  return score;
}

/**
 * Scarica i byte grezzi di una risorsa immagine con timeout.
 */
async function scaricaBuffer(
  urlImmagine: string,
  referer?: string,
): Promise<Buffer> {
  const resp = await fetch(urlImmagine, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
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

  return Buffer.from(rawBytes);
}

/**
 * Funzione principale: dato l'URL di un post social (Facebook, Instagram o qualsiasi link),
 * individua ed estrae la foto/locandina completa e originale (non ritagliata)
 * e restituisce il buffer pronto per lo storage.
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
      const raw = await scaricaBuffer(urlPulito);
      const meta = await sharp(raw).metadata();
      if (meta.width && meta.height) {
        let mimeType = "image/jpeg";
        let bufferFinale = raw;
        if (meta.format === "jpeg") {
          mimeType = "image/jpeg";
        } else if (meta.format === "png") {
          mimeType = "image/png";
        } else if (meta.format === "webp") {
          mimeType = "image/webp";
        } else {
          const bufferWebp = await sharp(raw).webp({ quality: 90 }).toBuffer();
          bufferFinale = Buffer.from(bufferWebp);
          mimeType = "image/webp";
        }
        return { buffer: bufferFinale, mimeType };
      }
    } catch {
      // Procediamo con gli altri estrattori se il download diretto fallisce
    }
  }

  const isInstagram =
    urlPulito.includes("instagram.com") || urlPulito.includes("instagr.am");
  const isFacebook =
    urlPulito.includes("facebook.com") ||
    urlPulito.includes("fb.watch") ||
    urlPulito.includes("fb.com");

  let candidati: CandidatoFoto[] = [];

  if (isInstagram) {
    candidati = await estraiImmagineDaInstagram(urlPulito);
  } else if (isFacebook) {
    candidati = await estraiImmagineDaFacebook(urlPulito);
  } else {
    candidati = await estraiImmagineDaPaginaGenerica(urlPulito);
  }

  // Fallback generico se nessun candidato è stato individuato
  if (candidati.length === 0) {
    candidati = await estraiImmagineDaPaginaGenerica(urlPulito);
  }

  if (candidati.length === 0) {
    aggiungiCandidato(candidati, urlPulito, 100, "url_stesso");
  }

  // Ordina i candidati per priorità decrescente e deduplica per URL
  const mappaUrl = new Map<string, CandidatoFoto>();
  for (const c of candidati) {
    const normalizzato = c.url.trim();
    if (!normalizzato) continue;
    const esistente = mappaUrl.get(normalizzato);
    if (!esistente || esistente.priorita < c.priorita) {
      mappaUrl.set(normalizzato, c);
    }
  }
  const candidatiOrdinati = [...mappaUrl.values()].sort(
    (a, b) => b.priorita - a.priorita,
  );

  let migliorRisultato: DettagliImmagineScaricata | null = null;
  let ultimoErrore: Error | null = null;
  let tentativiValidi = 0;
  const MAX_TENTATIVI_VALIDI = 6;

  for (const cand of candidatiOrdinati) {
    try {
      const raw = await scaricaBuffer(cand.url, urlPulito);
      const image = sharp(raw);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) continue;
      if (metadata.width < 150 || metadata.height < 150) continue;

      tentativiValidi++;

      const width = metadata.width;
      const height = metadata.height;
      const aspectRatio = width / height;
      const isPortrait = height > width * 1.05;
      const isSquare =
        Math.abs(width - height) <= 4 ||
        (aspectRatio >= 0.97 && aspectRatio <= 1.03);
      const hasCrop = haParametriCrop(cand.url);

      // Normalizzazione formato per lo storage
      let mimeType = "image/jpeg";
      let bufferFinale = raw;
      if (metadata.format === "jpeg") {
        mimeType = "image/jpeg";
      } else if (metadata.format === "png") {
        mimeType = "image/png";
      } else if (metadata.format === "webp") {
        mimeType = "image/webp";
      } else {
        const bufferWebp = await image.webp({ quality: 90 }).toBuffer();
        bufferFinale = Buffer.from(bufferWebp);
        mimeType = "image/webp";
      }

      const score = calcolaPunteggioImmagine(
        width,
        height,
        hasCrop,
        isPortrait,
        isSquare,
      );

      const dettaglio: DettagliImmagineScaricata = {
        buffer: bufferFinale,
        mimeType,
        width,
        height,
        aspectRatio,
        isPortrait,
        isSquare,
        hasCrop,
        score,
      };

      // VITTORIA IMMEDIATA: se troviamo una locandina verticale ad alta risoluzione senza crop
      if (!hasCrop && isPortrait && width >= 600 && height >= 750) {
        return { buffer: dettaglio.buffer, mimeType: dettaglio.mimeType };
      }

      // Se troviamo un banner/immagine orizzontale full-resolution senza crop
      if (!hasCrop && !isSquare && (width >= 1000 || height >= 1000)) {
        return { buffer: dettaglio.buffer, mimeType: dettaglio.mimeType };
      }

      if (!migliorRisultato || score > migliorRisultato.score) {
        migliorRisultato = dettaglio;
      }

      // Se abbiamo già trovato una candidata eccellente non croppata, non serve testare all'infinito
      if (
        tentativiValidi >= MAX_TENTATIVI_VALIDI &&
        migliorRisultato &&
        !migliorRisultato.hasCrop &&
        !migliorRisultato.isSquare
      ) {
        break;
      }
    } catch (err) {
      ultimoErrore = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (migliorRisultato) {
    return {
      buffer: migliorRisultato.buffer,
      mimeType: migliorRisultato.mimeType,
    };
  }

  throw new Error(
    `Impossibile recuperare l'immagine completa dal post social (${ultimoErrore?.message ?? "Nessuna immagine valida trovata"}). Verifica che il post sia pubblico e contenga una foto.`,
  );
}
