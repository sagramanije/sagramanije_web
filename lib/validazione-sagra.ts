import "server-only";

export class ErroreValidazione extends Error {}

export function testo(
  formData: FormData,
  nome: string,
  massimo: number,
  obbligatorio = false,
): string | null {
  const grezzo = formData.get(nome);
  const valore = typeof grezzo === "string" ? grezzo.trim() : "";
  if (!valore) {
    if (obbligatorio) throw new ErroreValidazione(`Compila il campo ${nome}.`);
    return null;
  }
  if (valore.length > massimo) {
    throw new ErroreValidazione(
      `Il campo ${nome} non può superare ${massimo} caratteri.`,
    );
  }
  return valore;
}

export function dataIso(formData: FormData, nome: string): string | null {
  const valore = testo(formData, nome, 10);
  if (!valore) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valore)) {
    throw new ErroreValidazione(`Il campo ${nome} non contiene una data valida.`);
  }
  const data = new Date(`${valore}T00:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valore) {
    throw new ErroreValidazione(`Il campo ${nome} non contiene una data valida.`);
  }
  return valore;
}

export function coordinata(
  formData: FormData,
  nome: "lat" | "leng",
  minimo: number,
  massimo: number,
): string | null {
  const valore = testo(formData, nome, 80);
  if (!valore) return null;
  const numero = Number(valore);
  if (!Number.isFinite(numero) || numero < minimo || numero > massimo) {
    throw new ErroreValidazione(`La coordinata ${nome} non è valida.`);
  }
  return String(numero);
}

export function url(
  formData: FormData,
  nome: string,
  soloHttps: boolean,
): string | null {
  const valore = testo(formData, nome, 4_000);
  if (!valore) return null;
  try {
    const parsed = new URL(valore);
    const consentito = soloHttps
      ? parsed.protocol === "https:"
      : parsed.protocol === "https:" || parsed.protocol === "http:";
    if (!consentito) throw new Error();
    return parsed.href;
  } catch {
    throw new ErroreValidazione(`Il campo ${nome} non contiene un URL valido.`);
  }
}

export function ora(formData: FormData): string | null {
  const valore = testo(formData, "ora_inizio", 20);
  if (!valore) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valore)) {
    throw new ErroreValidazione("L’orario di inizio non è valido.");
  }
  return valore;
}
