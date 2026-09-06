"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  Sparkles,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";

interface SagraMeteoProps {
  lat: number;
  leng: number;
  citta: string | null;
  nomeSagra?: string;
  dataInizioStr: string | null; // formato YYYY-MM-DD
  dataFineStr: string | null;   // formato YYYY-MM-DD
  oraInizio?: string | null;
}

interface HourlyItem {
  hour: string;
  temp: number;
  weatherCode: number;
  rainProb: number;
}

interface DayWeather {
  dateStr: string;
  pillLabel: string;
  fullDateLabel: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainProbMax: number;
  windSpeedMax: number;
  eveningTemp: number | null;
  eveningHours: HourlyItem[];
  verdetto: {
    titolo: string;
    testo: string;
    tipo: "success" | "warning" | "caution" | "info";
  };
}

function getWeatherMeta(code: number, isNight = false) {
  switch (code) {
    case 0:
      return {
        label: isNight ? "Cielo limpido" : "Sereno",
        icon: isNight ? Moon : Sun,
        color: "text-amber-500",
      };
    case 1:
      return {
        label: "Prevalentemente sereno",
        icon: isNight ? Moon : Sun,
        color: "text-amber-500",
      };
    case 2:
      return {
        label: "Poco nuvoloso",
        icon: CloudSun,
        color: "text-amber-600",
      };
    case 3:
      return {
        label: "Coperto",
        icon: Cloud,
        color: "text-warm",
      };
    case 45:
    case 48:
      return {
        label: "Nebbia o foschia",
        icon: CloudFog,
        color: "text-warm",
      };
    case 51:
    case 53:
    case 55:
      return {
        label: "Pioviggine leggera",
        icon: CloudDrizzle,
        color: "text-blue",
      };
    case 61:
    case 63:
      return {
        label: "Pioggia",
        icon: CloudRain,
        color: "text-blue",
      };
    case 65:
      return {
        label: "Pioggia forte",
        icon: CloudRain,
        color: "text-blue-ink",
      };
    case 71:
    case 73:
    case 75:
      return {
        label: "Neve",
        icon: CloudSnow,
        color: "text-blue",
      };
    case 80:
    case 81:
    case 82:
      return {
        label: "Rovesci sparsi",
        icon: CloudRain,
        color: "text-blue",
      };
    case 95:
    case 96:
    case 99:
      return {
        label: "Temporale",
        icon: CloudLightning,
        color: "text-purple-600",
      };
    default:
      return {
        label: "Variabile",
        icon: CloudSun,
        color: "text-amber-600",
      };
  }
}

function computeVerdetto(
  eveningTemp: number | null,
  rainProb: number,
  windSpeed: number,
  weatherCode: number
) {
  if (weatherCode >= 95 || rainProb >= 60) {
    return {
      titolo: `Rischio pioggia elevato (${rainProb}%)`,
      testo:
        "Sono previste piogge: controlla i canali social della sagra per verificare se i tavoli sono al coperto e tieni un ombrello o k-way a portata di mano!",
      tipo: "warning" as const,
    };
  }

  if (rainProb >= 35) {
    return {
      titolo: `Possibilità di pioggia (${rainProb}%)`,
      testo:
        "Cielo un po' instabile: tieni d'occhio le nuvole prima di partire, ma non farti scappare la festa per quattro gocce!",
      tipo: "caution" as const,
    };
  }

  if (windSpeed >= 32) {
    return {
      titolo: `Attenzione alle raffiche (${windSpeed} km/h)`,
      testo:
        "Tira un bel vento sostenuto: occhio a bicchieri di plastica e tovaglioli sui tavoli di legno!",
      tipo: "info" as const,
    };
  }

  if (eveningTemp !== null && eveningTemp < 17) {
    return {
      titolo: `Fresco serale in arrivo (~${eveningTemp}°C)`,
      testo:
        "L'aria rinfresca veloce dopo il tramonto: 'na felpina o lu maglioncino sono d'obbligo appena cala il sole!",
      tipo: "info" as const,
    };
  }

  if (eveningTemp !== null && eveningTemp > 25) {
    return {
      titolo: `Serata estiva calda (~${eveningTemp}°C)`,
      testo:
        "Fa caldo anche di notte: maniche corte e tappa fissa alla cassa per birra gelata o vino locale!",
      tipo: "success" as const,
    };
  }

  return {
    titolo: eveningTemp ? `Serata ideale (~${eveningTemp}°C)` : "Clima perfetto per la piazza",
    testo:
      "Condizioni ottime per stare all'aperto: si sta una favola tra stand, profumo di brace e musica dal vivo.",
    tipo: "success" as const,
  };
}

export default function SagraMeteo({
  lat,
  leng,
  citta,
  nomeSagra,
  dataInizioStr,
  dataFineStr,
}: SagraMeteoProps) {
  const isInvalidCoords = !lat || !leng || isNaN(lat) || isNaN(leng);

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
  }).format(new Date());

  const dMax = new Date(todayStr);
  dMax.setDate(dMax.getDate() + 14);
  const maxForecastStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
  }).format(dMax);

  const tooFarInFuture = Boolean(dataInizioStr && dataInizioStr > maxForecastStr);

  const [loading, setLoading] = useState(() => !isInvalidCoords && !tooFarInFuture);
  const [error, setError] = useState(false);
  const [days, setDays] = useState<DayWeather[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    if (isInvalidCoords || tooFarInFuture) {
      return;
    }

    const tomorrow = new Date(todayStr);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
    }).format(tomorrow);

    const abortController = new AbortController();

    async function fetchWeather() {
      try {
        setLoading(true);
        setError(false);

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${leng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Europe%2FRome&forecast_days=14`;

        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error("Errore chiamata Open-Meteo");

        const data = await res.json();
        const dailyTimes: string[] = data.daily?.time ?? [];

        // Filtra i giorni che si sovrappongono alla sagra e sono da oggi in poi
        const validIndices: number[] = [];
        dailyTimes.forEach((dStr, idx) => {
          if (dStr < todayStr) return; // giorno passato
          if (dataInizioStr && dStr < dataInizioStr) return; // prima dell'inizio
          if (dataFineStr && dStr > dataFineStr) return; // dopo la fine
          validIndices.push(idx);
        });

        // Se non ci sono giorni sovrapposti (ad es. sagra senza date o range particolare),
        // prendiamo i primi giorni disponibili da oggi
        const finalIndices =
          validIndices.length > 0
            ? validIndices.slice(0, 5) // max 5 giorni di tab
            : dailyTimes
                .map((_, idx) => idx)
                .filter((idx) => dailyTimes[idx] >= todayStr)
                .slice(0, 3);

        const computedDays: DayWeather[] = finalIndices.map((idx) => {
          const dateStr = dailyTimes[idx];
          const dObj = new Date(`${dateStr}T12:00:00`);

          const weekday = dObj.toLocaleDateString("it-IT", { weekday: "short" });
          const dayNum = dObj.getDate();
          const monthShort = dObj.toLocaleDateString("it-IT", { month: "short" });
          const fullDateLabel = dObj.toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });

          let pillLabel = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${dayNum}`;
          if (dateStr === todayStr) pillLabel = `Oggi (${dayNum} ${monthShort})`;
          else if (dateStr === tomorrowStr) pillLabel = `Domani (${dayNum} ${monthShort})`;

          // Orari serali della sagra: 19, 20, 21, 22, 23
          const targetHours = [19, 20, 21, 22, 23];
          const eveningHours: HourlyItem[] = [];

          targetHours.forEach((hour) => {
            const timeTarget = `${dateStr}T${String(hour).padStart(2, "0")}:00`;
            const hIdx = data.hourly?.time?.indexOf(timeTarget);
            if (hIdx !== undefined && hIdx !== -1) {
              eveningHours.push({
                hour: `${hour}:00`,
                temp: Math.round(data.hourly.temperature_2m[hIdx]),
                weatherCode: data.hourly.weather_code[hIdx],
                rainProb: data.hourly.precipitation_probability?.[hIdx] ?? 0,
              });
            }
          });

          const eveningTemp =
            eveningHours.length > 0
              ? Math.round(
                  eveningHours.reduce((acc, curr) => acc + curr.temp, 0) /
                    eveningHours.length
                )
              : null;

          const rainProbMax = data.daily.precipitation_probability_max?.[idx] ?? 0;
          const windSpeedMax = Math.round(data.daily.wind_speed_10m_max?.[idx] ?? 0);
          const weatherCode =
            eveningHours.find((h) => h.hour === "21:00")?.weatherCode ??
            data.daily.weather_code?.[idx] ??
            0;

          const verdetto = computeVerdetto(
            eveningTemp,
            rainProbMax,
            windSpeedMax,
            weatherCode
          );

          return {
            dateStr,
            pillLabel,
            fullDateLabel,
            weatherCode,
            tempMax: Math.round(data.daily.temperature_2m_max?.[idx] ?? 0),
            tempMin: Math.round(data.daily.temperature_2m_min?.[idx] ?? 0),
            rainProbMax,
            windSpeedMax,
            eveningTemp,
            eveningHours,
            verdetto,
          };
        });

        setDays(computedDays);
        setSelectedDayIndex(0);
        setLoading(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchWeather();

    return () => abortController.abort();
  }, [lat, leng, dataInizioStr, dataFineStr, isInvalidCoords, todayStr, tooFarInFuture]);

  // Se la sagra è troppo in là nel tempo
  if (tooFarInFuture) {
    return (
      <section className="mt-8 overflow-hidden rounded-3xl bg-surface p-6 sm:p-7 border border-beige/60">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <CloudSun size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Meteo della sagra
            </p>
            <h2 className="font-title text-xl sm:text-2xl">
              Previsioni per l&apos;evento
            </h2>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-cream p-4 text-sm leading-relaxed text-muted">
          <Calendar size={18} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Le previsioni meteo dettagliate per questa sagra saranno disponibili
            circa <strong>10-14 giorni prima</strong> dell&apos;evento. Torna a
            trovarci a ridosso delle date per sapere che temperatura farà e se
            servirà lu maglioncino!
          </p>
        </div>
      </section>
    );
  }

  // Skeleton loading state (con testo semantico SSR per indicizzazione motori di ricerca)
  if (loading) {
    return (
      <section
        className="mt-8 rounded-3xl bg-surface p-6 sm:p-7 border border-beige/60"
        aria-labelledby="meteo-sagra-titolo"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 animate-pulse">
            <CloudSun size={24} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Che tempo fa?
            </p>
            <h2 id="meteo-sagra-titolo" className="font-title text-xl sm:text-2xl">
              Meteo e previsioni: {nomeSagra ?? "la sagra"} {citta ? `a ${citta}` : ""}
            </h2>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">
          Previsioni meteo per la sagra {nomeSagra ? `"${nomeSagra}"` : ""} {citta ? `a ${citta}` : ""}: temperature serali, probabilità di pioggia e vento per organizzare la serata.
        </p>
        <div className="mt-6 flex gap-2 animate-pulse">
          <div className="h-9 w-24 rounded-full bg-beige/60" />
          <div className="h-9 w-24 rounded-full bg-beige/40" />
        </div>
        <div className="mt-6 h-28 rounded-2xl bg-beige/30 animate-pulse" />
      </section>
    );
  }

  if (error || days.length === 0) {
    return null;
  }

  const currentDay = days[selectedDayIndex] ?? days[0];
  const weatherMeta = getWeatherMeta(currentDay.weatherCode, false);
  const WeatherIcon = weatherMeta.icon;

  const verdettoBg =
    currentDay.verdetto.tipo === "warning"
      ? "bg-red-500/10 border-red-200 text-red-950"
      : currentDay.verdetto.tipo === "caution"
        ? "bg-amber-500/10 border-amber-200 text-amber-950"
        : currentDay.verdetto.tipo === "info"
          ? "bg-blue-500/10 border-blue-200 text-blue-950"
          : "bg-green-500/10 border-green-200 text-emerald-950";

  const VerdettoIcon =
    currentDay.verdetto.tipo === "warning"
      ? AlertTriangle
      : currentDay.verdetto.tipo === "caution"
        ? Umbrella
        : currentDay.verdetto.tipo === "info"
          ? Thermometer
          : Sparkles;

  return (
    <section
      className="mt-8 overflow-hidden rounded-3xl bg-surface p-6 sm:p-7 border border-beige/60 shadow-xs"
      aria-labelledby="meteo-sagra-titolo"
    >
      {/* Intestazione */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <WeatherIcon size={24} className={weatherMeta.color} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Che tempo fa?
            </p>
            <h2 id="meteo-sagra-titolo" className="font-title text-xl sm:text-2xl">
              Meteo e previsioni: {nomeSagra ? `${nomeSagra} ` : ""}{citta ? `a ${citta}` : ""}
            </h2>
          </div>
        </div>

        <span className="text-xs font-medium text-muted capitalize">
          {currentDay.fullDateLabel}
        </span>
      </div>

      {/* Selettore giorni (se ce n'è più di uno) */}
      {days.length > 1 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {days.map((day, idx) => {
            const isActive = idx === selectedDayIndex;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDayIndex(idx)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "bg-beige/40 text-muted hover:bg-beige hover:text-ink"
                }`}
              >
                {day.pillLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Quadro principale meteo del giorno */}
      <div className="mt-6 rounded-2xl bg-cream p-5 sm:p-6 border border-beige/50">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Temperatura serale e icona principale */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs">
              <WeatherIcon size={36} className={weatherMeta.color} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-title text-4xl font-bold tracking-tight text-ink">
                  {currentDay.eveningTemp !== null
                    ? `${currentDay.eveningTemp}°C`
                    : `${currentDay.tempMax}°C`}
                </span>
                <span className="text-xs font-semibold uppercase text-muted">
                  {currentDay.eveningTemp !== null ? "Serata (ore 21)" : "Massima"}
                </span>
              </div>
              <p className="text-sm font-medium text-ink/80 mt-0.5">
                {weatherMeta.label}
              </p>
            </div>
          </div>

          {/* Statistiche compatte */}
          <div className="grid grid-cols-3 gap-3 divide-x divide-beige/80 border-t border-beige/60 pt-4 sm:border-t-0 sm:pt-0">
            <div className="px-2 first:pl-0">
              <span className="flex items-center gap-1 text-[11px] font-bold text-muted uppercase">
                <Thermometer size={13} className="text-primary" />
                Min / Max
              </span>
              <p className="mt-1 font-title text-sm font-bold sm:text-base">
                {currentDay.tempMin}° / {currentDay.tempMax}°
              </p>
            </div>

            <div className="px-2">
              <span className="flex items-center gap-1 text-[11px] font-bold text-muted uppercase">
                <Droplets size={13} className="text-blue" />
                Pioggia
              </span>
              <p className="mt-1 font-title text-sm font-bold sm:text-base">
                {currentDay.rainProbMax}%
              </p>
            </div>

            <div className="px-2">
              <span className="flex items-center gap-1 text-[11px] font-bold text-muted uppercase">
                <Wind size={13} className="text-warm" />
                Vento
              </span>
              <p className="mt-1 font-title text-sm font-bold sm:text-base">
                {currentDay.windSpeedMax} km/h
              </p>
            </div>
          </div>
        </div>

        {/* Timeline oraria della serata (19:00 - 23:00) */}
        {currentDay.eveningHours.length > 0 && (
          <div className="mt-6 border-t border-beige/70 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Come cambia nella serata
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {currentDay.eveningHours.map((hourItem) => {
                const hourMeta = getWeatherMeta(
                  hourItem.weatherCode,
                  hourItem.hour >= "21:00"
                );
                const HourIcon = hourMeta.icon;

                return (
                  <div
                    key={hourItem.hour}
                    className="flex flex-col items-center rounded-xl bg-white/80 p-2.5 text-center shadow-2xs"
                  >
                    <span className="text-[11px] font-medium text-muted">
                      {hourItem.hour}
                    </span>
                    <HourIcon
                      size={18}
                      className={`my-1.5 ${hourMeta.color}`}
                    />
                    <span className="font-title text-xs font-bold text-ink">
                      {hourItem.temp}°
                    </span>
                    {hourItem.rainProb > 20 && (
                      <span className="text-[9px] font-semibold text-blue mt-0.5">
                        {hourItem.rainProb}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Il verdetto della Pro Loco */}
      <div
        className={`mt-5 flex items-start gap-3.5 rounded-2xl border p-4 transition-colors ${verdettoBg}`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-2xs">
          <VerdettoIcon size={18} className="shrink-0 text-current" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">
            Il consiglio della Pro Loco
          </p>
          <p className="mt-0.5 font-title text-sm font-bold sm:text-base">
            {currentDay.verdetto.titolo}
          </p>
          <p className="mt-1 text-xs sm:text-sm leading-relaxed opacity-90">
            {currentDay.verdetto.testo}
          </p>
        </div>
      </div>

      {/* Attribuzione discreta */}
      <p className="mt-3 text-right text-[10px] text-muted">
        Previsioni fornite da Open-Meteo
      </p>
    </section>
  );
}
