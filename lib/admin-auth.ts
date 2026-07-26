import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_ADMIN = "sagramanije_admin";
const DURATA_SESSIONE_MS = 8 * 60 * 60 * 1000;
const PERCORSO_ADMIN = "/gestione-sagre";

function confrontoCostante(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

function segretoSessione(): string | null {
  const segreto = process.env.ADMIN_SESSION_SECRET?.trim();
  return segreto && segreto.length >= 32 ? segreto : null;
}

function firma(payload: string, segreto: string): string {
  return createHmac("sha256", segreto).update(payload).digest("base64url");
}

export function passwordAdminValida(password: string): boolean {
  const attesa = process.env.ADMIN_PASSWORD ?? "";
  return Boolean(attesa) && confrontoCostante(password, attesa);
}

export function configurazioneAdminCompleta(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && Boolean(segretoSessione());
}

export async function creaSessioneAdmin(): Promise<void> {
  const segreto = segretoSessione();
  if (!segreto) throw new Error("ADMIN_SESSION_SECRET non configurata");

  const scadenza = Date.now() + DURATA_SESSIONE_MS;
  const payload = `v1.${scadenza}`;
  const token = `${payload}.${firma(payload, segreto)}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_ADMIN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(scadenza),
    path: PERCORSO_ADMIN,
  });
}

export async function sessioneAdminValida(): Promise<boolean> {
  const segreto = segretoSessione();
  if (!segreto) return false;

  const token = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!token) return false;

  const parti = token.split(".");
  if (parti.length !== 3 || parti[0] !== "v1") return false;

  const scadenza = Number(parti[1]);
  if (!Number.isFinite(scadenza) || scadenza <= Date.now()) return false;

  const payload = `${parti[0]}.${parti[1]}`;
  return confrontoCostante(parti[2], firma(payload, segreto));
}

export async function eliminaSessioneAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ADMIN, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    maxAge: 0,
    path: PERCORSO_ADMIN,
  });
}
