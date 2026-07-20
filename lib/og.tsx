import { ImageResponse } from "next/og";

// Dimensione canonica delle anteprime social (Facebook, WhatsApp, X, Telegram).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Palette allineata a app/globals.css.
const CREMA = "#fff7ee";
const ARANCIONE = "#ec5a35";
const INCHIOSTRO = "#000000";
const SPENTO = "#60646c";

type Props = {
  /** Riga piccola in alto, in maiuscoletto arancione. */
  occhiello: string;
  /** Il testo grosso: si adatta da solo alle stringhe lunghe. */
  titolo: string;
  /** Riga di dettaglio sotto il titolo (date, numero di sagre…). */
  sottotitolo?: string;
};

/**
 * Card social del sito. Satori supporta solo flexbox e un sottoinsieme di CSS
 * (niente grid), e ogni contenitore con più figli vuole un display esplicito.
 */
export function ogCard({ occhiello, titolo, sottotitolo }: Props) {
  // I titoli lunghi (nomi di sagre chilometrici) devono rimpicciolirsi, o
  // sbordano dalla card: Satori non sa fare il fit automatico del testo.
  const corpo = titolo.length > 55 ? 62 : titolo.length > 34 ? 76 : 94;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: CREMA,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: ARANCIONE,
            }}
          >
            {occhiello}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: corpo,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: INCHIOSTRO,
            }}
          >
            {titolo}
          </div>

          {sottotitolo ? (
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 34,
                color: SPENTO,
              }}
            >
              {sottotitolo}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 64,
              height: 8,
              borderRadius: 4,
              backgroundColor: ARANCIONE,
            }}
          />
          <div
            style={{
              display: "flex",
              marginLeft: 20,
              fontSize: 30,
              fontWeight: 700,
              color: INCHIOSTRO,
            }}
          >
            sagramanije.it
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
