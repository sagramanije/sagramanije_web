import "server-only";

import { lookup } from "node:dns/promises";
import type { IncomingMessage, OutgoingHttpHeaders } from "node:http";
import { request } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const RETI_NON_PUBBLICHE = new BlockList();

for (const [rete, prefisso] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  RETI_NON_PUBBLICHE.addSubnet(rete, prefisso, "ipv4");
}

for (const [rete, prefisso] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const) {
  RETI_NON_PUBBLICHE.addSubnet(rete, prefisso, "ipv6");
}

const HOST_LOCALI = new Set([
  "instance-data",
  "localhost",
  "metadata",
  "metadata.aws.internal",
  "metadata.azure.internal",
  "metadata.google.internal",
]);

function hostnameSenzaDelimitatori(hostname: string): string {
  return hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

function indirizzoPubblico(address: string): boolean {
  const famiglia = isIP(address);
  if (famiglia === 4) return !RETI_NON_PUBBLICHE.check(address, "ipv4");
  if (famiglia === 6) return !RETI_NON_PUBBLICHE.check(address, "ipv6");
  return false;
}

/**
 * Validazione sincrona usata anche durante il rendering delle pagine.
 * La verifica DNS, che richiede I/O, viene ripetuta e fissata nel fetch.
 */
export function normalizzaUrlHttpsPubblico(input: string | URL): URL | null {
  try {
    const url = new URL(input);
    const hostname = hostnameSenzaDelimitatori(url.hostname);
    const famigliaIp = isIP(hostname);

    if (
      url.protocol !== "https:" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      hostname === "" ||
      HOST_LOCALI.has(hostname) ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      (!famigliaIp && !hostname.includes(".")) ||
      (famigliaIp !== 0 && !indirizzoPubblico(hostname))
    ) {
      return null;
    }

    // Il fragment non viene inviato al server e non deve frammentare la cache.
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

async function indirizzoVerificato(
  hostname: string,
  signal: AbortSignal,
): Promise<{ address: string; family: 4 | 6 }> {
  signal.throwIfAborted();
  const risolti = await lookup(hostnameSenzaDelimitatori(hostname), {
    all: true,
    verbatim: true,
  });
  signal.throwIfAborted();

  if (
    risolti.length === 0 ||
    risolti.some((risolto) => !indirizzoPubblico(risolto.address))
  ) {
    throw new Error("La sorgente non risolve esclusivamente su IP pubblici");
  }

  // IPv4 per primo: alcuni origin espongono AAAA senza avere una connettività
  // IPv6 affidabile. La connessione resta fissata all'indirizzo già verificato.
  const scelto = risolti.find((risolto) => risolto.family === 4) ?? risolti[0];
  if (scelto.family !== 4 && scelto.family !== 6) {
    throw new Error("Famiglia IP non supportata");
  }
  return { address: scelto.address, family: scelto.family };
}

function richiestaFissata(
  url: URL,
  address: string,
  family: 4 | 6,
  headers: OutgoingHttpHeaders,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  const lookupFissato: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address, family }]);
    } else {
      callback(null, address, family);
    }
  };

  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        headers,
        lookup: lookupFissato,
        method: "GET",
        signal,
        servername: hostnameSenzaDelimitatori(url.hostname),
      },
      resolve,
    );
    req.once("error", reject);
    req.end();
  });
}

const STATUS_REDIRECT = new Set([301, 302, 303, 307, 308]);

/**
 * Scarica una risorsa HTTPS pubblica evitando che DNS rebinding o redirect
 * trasformino il proxy delle locandine in un client SSRF.
 */
export async function richiediUrlHttpsPubblico(
  input: string | URL,
  {
    headers = {},
    maxRedirects = 3,
    timeoutMs = 15_000,
  }: {
    headers?: OutgoingHttpHeaders;
    maxRedirects?: number;
    timeoutMs?: number;
  } = {},
): Promise<IncomingMessage> {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = normalizzaUrlHttpsPubblico(input);
  if (!url) throw new Error("URL HTTPS pubblico non valido");

  for (let redirect = 0; ; redirect += 1) {
    const { address, family } = await indirizzoVerificato(url.hostname, signal);
    const risposta = await richiestaFissata(
      url,
      address,
      family,
      headers,
      signal,
    );
    const status = risposta.statusCode ?? 0;

    if (!STATUS_REDIRECT.has(status)) return risposta;

    const location = risposta.headers.location;
    risposta.resume();
    if (!location || redirect >= maxRedirects) {
      throw new Error("Troppi redirect dalla sorgente della locandina");
    }

    url = normalizzaUrlHttpsPubblico(new URL(location, url));
    if (!url) throw new Error("Redirect verso una destinazione non pubblica");
  }
}
