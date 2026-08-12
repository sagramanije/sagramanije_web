import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { Client as MinioClient } from "minio";

export const DESTINAZIONI_LOCANDINA = ["minio", "cloudinary"] as const;
export type DestinazioneLocandina = (typeof DESTINAZIONI_LOCANDINA)[number];

const ESTENSIONI_PER_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function envObbligatoria(nome: string): string {
  const valore = process.env[nome]?.trim();
  if (!valore) {
    throw new Error(`Configurazione storage incompleta: manca ${nome}.`);
  }
  return valore;
}

function destinazioneValida(
  valore: FormDataEntryValue | null,
): DestinazioneLocandina {
  if (
    typeof valore !== "string" ||
    !DESTINAZIONI_LOCANDINA.includes(valore as DestinazioneLocandina)
  ) {
    throw new Error("Destinazione della locandina non valida.");
  }
  return valore as DestinazioneLocandina;
}

function urlEndpointMinio(): URL {
  const grezzo = envObbligatoria("MINIO_ENDPOINT");
  const url = new URL(grezzo.includes("://") ? grezzo : `https://${grezzo}`);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("MINIO_ENDPOINT deve usare http oppure https.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("MINIO_ENDPOINT deve contenere solo schema, host e porta.");
  }
  return url;
}

function percorsoPubblico(base: string, nomeOggetto: string): string {
  const url = new URL(base.endsWith("/") ? base : `${base}/`);
  if (url.protocol !== "https:") {
    throw new Error("MINIO_PUBLIC_URL deve essere un URL HTTPS.");
  }
  const percorso = nomeOggetto.split("/").map(encodeURIComponent).join("/");
  return new URL(percorso, url).href;
}

async function caricaSuMinio(
  buffer: Buffer,
  mimeType: string,
  estensione: string,
): Promise<string> {
  const endpoint = urlEndpointMinio();
  const bucket = envObbligatoria("MINIO_BUCKET");
  const client = new MinioClient({
    endPoint: endpoint.hostname,
    port: endpoint.port
      ? Number(endpoint.port)
      : endpoint.protocol === "https:"
        ? 443
        : 80,
    useSSL: endpoint.protocol === "https:",
    accessKey: envObbligatoria("MINIO_ACCESS_KEY"),
    secretKey: envObbligatoria("MINIO_SECRET_KEY"),
  });

  const oggi = new Date();
  const nomeOggetto = [
    String(oggi.getUTCFullYear()),
    String(oggi.getUTCMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${estensione}`,
  ].join("/");

  await client.putObject(bucket, nomeOggetto, buffer, buffer.length, {
    "Content-Type": mimeType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  const basePubblica =
    process.env.MINIO_PUBLIC_URL?.trim() || `${endpoint.origin}/${bucket}`;
  return percorsoPubblico(basePubblica, nomeOggetto);
}

async function caricaSuCloudinary(buffer: Buffer): Promise<string> {
  cloudinary.config({
    cloud_name: envObbligatoria("CLOUDINARY_CLOUD_NAME"),
    api_key: envObbligatoria("CLOUDINARY_API_KEY"),
    api_secret: envObbligatoria("CLOUDINARY_API_SECRET"),
  });

  const risultato = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "home", resource_type: "auto" },
      (errore, risposta) => {
        if (errore) reject(errore);
        else if (!risposta) {
          reject(new Error("Cloudinary non ha restituito l'URL del file."));
        }
        else resolve(risposta);
      },
    );
    stream.end(buffer);
  });

  return risultato.secure_url;
}

export async function caricaLocandina(
  buffer: Buffer,
  mimeType: string,
  destinazioneInput: FormDataEntryValue | null,
): Promise<string> {
  const destinazione = destinazioneValida(destinazioneInput);
  const estensione = ESTENSIONI_PER_MIME[mimeType];
  if (!estensione) throw new Error("Il formato del file non può essere salvato.");

  return destinazione === "minio"
    ? caricaSuMinio(buffer, mimeType, estensione)
    : caricaSuCloudinary(buffer);
}
