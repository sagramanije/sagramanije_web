/** Le aperture si ricavano solo dalla lista esplicita pubblicata nella descrizione. */
export function contenutoScheda(descrizione: string | null, mercatino: boolean) {
  const giorni = new Set<string>();
  const specialita: string[] = [];
  const fonti = new Set<string>();
  const testo = (descrizione ?? "").replace(/\s*\|\s*Confermato anche da:\s*(https?:\/\/[^\s|]+)/gi, (_, url: string) => {
    fonti.add(url);
    return "";
  });
  const righe = testo.split(/\r?\n/).filter((riga) => {
    const date = mercatino && /^\s*Date dell['’]evento:\s*(.*?)\.?\s*$/i.exec(riga);
    if (date) {
      const valori = date[1].split(/\s*,\s*/);
      if (valori.every(dataIsoValida)) {
        valori.forEach((valore) => giorni.add(valore));
        return false;
      }
    }
    const piatti = !mercatino && /^\s*Specialità e piatti tipici:\s*(.+)$/i.exec(riga);
    if (piatti) {
      specialita.push(piatti[1].trim());
      return false;
    }
    return true;
  });
  const paragrafi = righe.join("\n").trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  // Anche le schede più vecchie raccontano spesso il piatto in un paragrafo libero.
  if (!mercatino && specialita.length === 0) {
    const indice = paragrafi.findIndex(p =>
      /\b(?:preparazione artigianale|ai fornelli|sulla (?:brace|fornacella)|condire|cottura|viene servit[oa]|sono servit[ei])\b/i.test(p)
    );
    if (indice >= 0) specialita.push(...paragrafi.splice(indice, 1));
  }
  // Solo una frase intera in copertina. I testi lunghi o a elenco restano nell’articolo.
  const apertura = specialita[0]?.match(/[.!?]\s+\S/) ? specialita : paragrafi;
  const prima = apertura[0] ?? "";
  const frase = prima.match(/^[^\n]+?[.!?](?=\s|$)/u)?.[0] ?? prima;
  let introduzione = "";
  if (frase && frase.length <= 220 && !frase.includes("\n")) {
    introduzione = frase;
    const seguito = prima.slice(frase.length).trim();
    if (seguito) apertura[0] = seguito;
    else apertura.shift();
  }
  return { introduzione, paragrafi, giorni: [...giorni].sort(), specialita, fonti: [...fonti] };
}

function dataIsoValida(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const data = new Date(iso + "T00:00:00Z");
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === iso;
}

export type MeseAperture = {
  chiave: string;
  mese: string;
  anno: string;
  intervalli: { dal: number; al: number }[];
};

export function mesiAperture(giorni: string[]): MeseAperture[] {
  const mesi: MeseAperture[] = [];
  for (const iso of giorni) {
    const chiave = iso.slice(0, 7);
    const giorno = Number(iso.slice(8));
    let mese = mesi.at(-1);
    if (mese?.chiave !== chiave) {
      mese = {
        chiave, anno: iso.slice(0, 4),
        mese: new Date(iso + "T00:00:00Z").toLocaleDateString("it-IT", { month: "long", timeZone: "UTC" }),
        intervalli: [],
      };
      mesi.push(mese);
    }
    const ultimo = mese.intervalli.at(-1);
    if (ultimo && giorno === ultimo.al + 1) ultimo.al = giorno;
    else mese.intervalli.push({ dal: giorno, al: giorno });
  }
  return mesi;
}
