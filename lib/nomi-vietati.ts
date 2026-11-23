import "server-only";

/**
 * Filtro dei soprannomi della classifica della Fornacella: niente parolacce,
 * bestemmie, insulti razzisti, omofobi o abilisti, niente riferimenti nazisti.
 *
 * Il controllo gira solo sul server (la lista non finisce nel bundle) e
 * confronta forme normalizzate, così non basta mascherare la parola:
 * - accenti e maiuscole spariscono, le lettere cirilliche/greche sosia diventano latine;
 * - le cifre e i simboli "leet" diventano lettere (c4zz0 → cazzo), oppure spariscono (n3gro e negro123);
 * - spazi, punti e trattini spariscono (c.a.z.z.o, s t r o n z o);
 * - le lettere ripetute si comprimono (cazzzzo, merdaaa).
 *
 * Due liste, per limitare i falsi positivi:
 * - RADICI: basta che compaiano dentro il nome (salvo le ECCEZIONI);
 * - PAROLE: vietate solo come parola intera, perché come sottostringa
 *   colpirebbero parole innocue (fica → magnifica, nazi → nazionale, anal → canale).
 */

const RADICI = [
  // parolacce e volgarità
  "cazz", "minchi", "fancul", "stronz", "coglion", "puttan", "mignott", "bagasc", "baldracc",
  "bocchin", "pompin", "sborr", "incul", "culo", "culatton", "merda", "segaiol", "sucamel",
  "bastard", "porcodi", "porcamadon", "dioporc", "diocan", "diomaial", "diobest", "dioboi",
  "madonnatroi", "madonnaputt", "cristodi",
  // insulti razzisti, omofobi, abilisti
  "negro", "negra", "negri", "negre", "negrett", "nigg", "nigga", "terron", "polenton", "zingar",
  "musogiall", "froci", "ricchion", "recchion", "handicappat", "mongoloid", "ritardat", "spastic",
  // nazismo e violenza
  "hitler", "mussolin", "nazist", "naziskin", "siegheil", "heilhitler", "auschwitz", "olocaust",
  "pedofil", "stupr",
  // inglese
  "fuck", "shit", "bitch", "cunt", "asshole", "dickhead", "cocksuck", "pussy", "whore", "slut",
  "retard", "wank", "twat", "faggot", "wetback", "tranny", "porn", "rapist", "penis", "vagin", "dildo",
];

const PAROLE = [
  "fica", "figa", "fighe", "fiche", "pene", "tette", "zinne", "troia", "troie", "zoccola", "zoccole",
  "finocchio", "finocchi", "suca", "sucami", "culi", "culona", "culone", "mongolo", "mongola",
  "puta", "putas", "puto", "nazi", "nazis", "duce", "heil", "sieg", "niga",
  "fag", "fags", "fuk", "fck", "fuq", "dick", "cock", "cum", "anal", "rape", "kike", "chink",
  "spic", "dyke", "coon", "paki", "gook",
];

// Parole innocue che contengono una radice vietata: vengono tolte prima del confronto.
const ECCEZIONI = [
  "negroni", "negrita", "negrar", "montenegr", "inculca", "binocul", "monocul", "culott",
  "ritardatari", "penisol", "shitak",
];

const SOSIA: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g",
  "@": "a", "$": "s", "!": "i", "€": "e", "|": "i", "k": "c",
  // cirillico e greco che sembrano latino
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j",
  "к": "c", "м": "m", "т": "t", "н": "h", "в": "b",
  "α": "a", "ε": "e", "ι": "i", "κ": "c", "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x",
};

function base(testo: string) {
  return testo.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}
/** Due letture del nome: con le cifre convertite in lettere e con le cifre tolte. */
function letture(testo: string) {
  const b = base(testo);
  const mappata = [...b].map(c => SOSIA[c] ?? c).join("");
  const senzaCifre = [...b].map(c => (/[0-9]/.test(c) ? "" : SOSIA[c] ?? c)).join("");
  return [mappata, senzaCifre];
}
const soloLettere = (s: string) => s.replace(/[^a-z]/g, "");
const comprimi = (s: string) => s.replace(/(.)\1+/g, "$1");
function togliEccezioni(s: string, eccezioni: string[]) {
  return eccezioni.reduce((t, e) => t.split(e).join("·"), s);
}

// Le liste passano dalla stessa normalizzazione dei nomi (es. "fuck" → "fucc").
const norma = (s: string) => soloLettere(letture(s)[0]);
const radici = RADICI.map(r => ({ piena: norma(r), compressa: comprimi(norma(r)) }));
const eccezioni = ECCEZIONI.map(norma);
const eccezioniCompresse = eccezioni.map(comprimi);
const parole = new Set(PAROLE.map(norma));
// Una parola senza doppie si riconosce anche allungata (culooo); quelle con doppie
// no, altrimenti "coon" compresso diventerebbe "con" e bloccherebbe "con".
const paroleSemplici = new Set([...parole].filter(p => comprimi(p) === p));

export function nomeVietato(nome: string): boolean {
  const grezzo = base(nome);
  if (/k\W*k\W*k/.test(grezzo) || /14\W*88/.test(grezzo)) return true;
  for (const lettura of letture(nome)) {
    const compatta = soloLettere(lettura);
    const piena = togliEccezioni(compatta, eccezioni);
    const compressa = togliEccezioni(comprimi(compatta), eccezioniCompresse);
    if (radici.some(r => piena.includes(r.piena) || compressa.includes(r.compressa))) return true;
    const pezzi = [compatta, ...lettura.split(/[^a-z]+/)].filter(Boolean);
    if (pezzi.some(p => parole.has(p) || paroleSemplici.has(comprimi(p)))) return true;
  }
  return false;
}
