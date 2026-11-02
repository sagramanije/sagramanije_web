"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  MapPin,
  MapPinOff,
  Search,
} from "lucide-react";

/**
 * Mappatura anagrafica delle quattro province abruzzesi.
 */
export const PROVINCE_ABRUZZO: Record<
  string,
  { sigla: string; nome: string; capoluogo?: boolean }
> = {
  AQ: { sigla: "AQ", nome: "L’Aquila", capoluogo: true },
  CH: { sigla: "CH", nome: "Chieti" },
  PE: { sigla: "PE", nome: "Pescara" },
  TE: { sigla: "TE", nome: "Teramo" },
};

/**
 * Converte in modo difensivo una stringa numerica di coordinate in numero floating point.
 */
function parseCoordinata(valore: string | null | undefined): number | null {
  if (!valore) return null;
  const pulito = valore.trim().replace(",", ".");
  if (!pulito) return null;
  const num = Number(pulito);
  return Number.isFinite(num) ? num : null;
}

/**
 * Confini geografici approssimativi del territorio regionale abruzzese (WGS84).
 */
const CONFINI_ABRUZZO = {
  latMin: 41.6,
  latMax: 42.95,
  lonMin: 13.0,
  lonMax: 14.85,
};

type TipoAttendibilita = "valido" | "inversione" | "fuori_regione" | "mancante";

interface MappaVerificaLuogoProps {
  citta: string;
  provincia: string;
  lat: string;
  leng: string;
  onInvertiCoordinate?: () => void;
}

export default function MappaVerificaLuogo({
  citta,
  provincia,
  lat,
  leng,
  onInvertiCoordinate,
}: MappaVerificaLuogoProps) {
  const numLat = parseCoordinata(lat);
  const numLeng = parseCoordinata(leng);

  const haCoordinate =
    numLat !== null &&
    numLeng !== null &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLeng >= -180 &&
    numLeng <= 180 &&
    (numLat !== 0 || numLeng !== 0);

  // Verifica plausibilità e attendibilità geografica
  let attendibilita: TipoAttendibilita = "mancante";
  if (haCoordinate && numLat !== null && numLeng !== null) {
    // Caso frequente da scraper/geocoding automatici: latitudine e longitudine scambiate
    const probabileInversione =
      numLat >= CONFINI_ABRUZZO.lonMin &&
      numLat <= 15.0 &&
      numLeng >= CONFINI_ABRUZZO.latMin &&
      numLeng <= 43.5;

    if (probabileInversione) {
      attendibilita = "inversione";
    } else if (
      numLat >= CONFINI_ABRUZZO.latMin &&
      numLat <= CONFINI_ABRUZZO.latMax &&
      numLeng >= CONFINI_ABRUZZO.lonMin &&
      numLeng <= CONFINI_ABRUZZO.lonMax
    ) {
      attendibilita = "valido";
    } else {
      attendibilita = "fuori_regione";
    }
  }

  const infoProvincia = PROVINCE_ABRUZZO[provincia.toUpperCase().trim()];
  const cittaPulita = citta.trim();
  const queryCercaMaps = [cittaPulita, provincia ? `(${provincia})` : "", "Abruzzo"]
    .filter(Boolean)
    .join(" ");
  const linkCercaMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    queryCercaMaps || "Abruzzo",
  )}`;

  // Calcolo bounding box per l'embed OpenStreetMap con zoom mirato
  const deltaLat = 0.012;
  const deltaLon = 0.018;
  const minLon = (numLeng !== null ? numLeng - deltaLon : 0).toFixed(6);
  const minLat = (numLat !== null ? numLat - deltaLat : 0).toFixed(6);
  const maxLon = (numLeng !== null ? numLeng + deltaLon : 0).toFixed(6);
  const maxLat = (numLat !== null ? numLat + deltaLat : 0).toFixed(6);

  const urlEmbedOsm =
    haCoordinate && numLat !== null && numLeng !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${numLat}%2C${numLeng}`
      : null;

  const linkOsmDettaglio =
    haCoordinate && numLat !== null && numLeng !== null
      ? `https://www.openstreetmap.org/?mlat=${numLat}&mlon=${numLeng}#map=16/${numLat}/${numLeng}`
      : null;

  const linkGoogleMapsDiretto =
    haCoordinate && numLat !== null && numLeng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${numLat},${numLeng}`
      : null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-beige bg-beige/20 p-4 sm:p-5">
      {/* Intestazione card verifica */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-beige/80">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass size={18} aria-hidden />
          </span>
          <div>
            <h3 className="font-bold text-sm text-ink leading-tight">
              Verifica posizione e attendibilità geografica
            </h3>
            <p className="text-xs text-muted">
              Riscontro visivo della sagra prima del passaggio in produzione
            </p>
          </div>
        </div>

        {/* Badge stato attendibilità */}
        <div>
          {attendibilita === "valido" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <CheckCircle2 size={13} aria-hidden />
              Posizione coerente con l’Abruzzo
            </span>
          ) : attendibilita === "inversione" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <AlertTriangle size={13} aria-hidden />
              Possibile inversione coordinate
            </span>
          ) : attendibilita === "fuori_regione" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
              <AlertCircle size={13} aria-hidden />
              Coordinate fuori regione
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-muted border border-beige">
              <MapPinOff size={13} aria-hidden />
              Coordinate non rilevate
            </span>
          )}
        </div>
      </div>

      {/* Dettagli sintetici: Città, Provincia, Regione, Coordinate */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/80 p-3 border border-beige/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Luogo e Provincia
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-bold text-ink">
              {cittaPulita || "Comune non specificato"}
            </p>
            {provincia ? (
              <span className="rounded-md bg-beige/60 px-1.5 py-0.5 text-xs font-bold text-ink">
                {provincia}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {infoProvincia
              ? `Provincia di ${infoProvincia.nome}${
                  infoProvincia.capoluogo ? " (Capoluogo di Regione)" : ""
                }`
              : "Provincia non selezionata o non standard"}
            {" · "}Regione Abruzzo
          </p>
        </div>

        <div className="rounded-xl bg-white/80 p-3 border border-beige/60">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Coordinate WGS84 rilevate
          </p>
          <div className="mt-1 flex items-center gap-2">
            <MapPin size={14} className="text-primary shrink-0" aria-hidden />
            <p className="font-mono text-sm font-bold text-ink">
              {haCoordinate && numLat !== null && numLeng !== null
                ? `${numLat.toFixed(5)}, ${numLeng.toFixed(5)}`
                : "Coordinate mancanti"}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {haCoordinate && numLat !== null && numLeng !== null
              ? `Latitudine: ${numLat.toFixed(5)} · Longitudine: ${numLeng.toFixed(5)}`
              : "Inserisci latitudine e longitudine per localizzare l’evento"}
          </p>
        </div>
      </div>

      {/* Banner di avviso se c'è un'inversione di coordinate rilevata */}
      {attendibilita === "inversione" && onInvertiCoordinate ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-amber-700" aria-hidden />
            <span>
              La latitudine ({numLat}) e la longitudine ({numLeng}) sembrano invertite rispetto alle coordinate tipiche dell’Abruzzo.
            </span>
          </div>
          <button
            type="button"
            onClick={onInvertiCoordinate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700 transition"
          >
            <ArrowLeftRight size={13} aria-hidden />
            Inverti latitudine e longitudine
          </button>
        </div>
      ) : null}

      {/* Banner di avviso se le coordinate puntano fuori regione */}
      {attendibilita === "fuori_regione" ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-900 border border-rose-200">
          <AlertCircle size={15} className="shrink-0 text-rose-700" aria-hidden />
          <span>
            Attenzione: il punto indicato ({numLat?.toFixed(4)}, {numLeng?.toFixed(4)}) ricade all’esterno dei confini regionali dell’Abruzzo. Controlla il nome del comune omonimo o verifica la posizione.
          </span>
        </div>
      ) : null}

      {/* Visualizzazione mappa interattiva */}
      <div className="mt-3">
        {urlEmbedOsm ? (
          <div className="relative overflow-hidden rounded-xl border border-beige shadow-xs">
            <iframe
              title={`Mappa posizione ${cittaPulita || "sagra"}`}
              src={urlEmbedOsm}
              className="h-72 w-full sm:h-80 bg-white"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex h-52 w-full flex-col items-center justify-center rounded-xl border border-dashed border-beige bg-white/50 p-4 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-beige/60 text-muted">
              <MapPinOff size={20} aria-hidden />
            </span>
            <p className="mt-2 text-sm font-bold text-ink">
              Mappa non disponibile
            </p>
            <p className="mt-0.5 text-xs text-muted max-w-sm">
              Inserisci o correggi latitudine e longitudine nei campi soprastanti per visualizzare la posizione esatta della sagra.
            </p>
          </div>
        )}
      </div>

      {/* Azioni rapide di verifica e consultazione */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-beige/60 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {linkGoogleMapsDiretto ? (
            <a
              href={linkGoogleMapsDiretto}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 font-bold text-ink hover:text-primary border border-beige transition"
            >
              <ExternalLink size={12} aria-hidden />
              Apri su Google Maps
            </a>
          ) : null}

          {linkOsmDettaglio ? (
            <a
              href={linkOsmDettaglio}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 font-bold text-ink hover:text-primary border border-beige transition"
            >
              <ExternalLink size={12} aria-hidden />
              Apri su OpenStreetMap
            </a>
          ) : null}
        </div>

        <a
          href={linkCercaMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Search size={12} aria-hidden />
          Cerca comune su Google Maps
        </a>
      </div>
    </div>
  );
}

