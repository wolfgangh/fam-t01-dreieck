export const WEALTH_EUR = 12_000_000;
export const BERGER_PAYOUT_EUR = 360_000;
export const BERGER_PAYOUT_RATIO = BERGER_PAYOUT_EUR / WEALTH_EUR;
export const BERGER_MDD_EUR = 1_200_000;
export const BERGER_MDD_RATIO = BERGER_MDD_EUR / WEALTH_EUR;

/** Modell-Drawdown der drei Ecken – Annahmen, keine Prognose. */
export const MODEL_MDD = {
  rendite: 0.3,
  sicherheit: 0.08,
  liquiditaet: 0,
} as const;

/** Anteil, der binnen 12 Monaten ohne Notverkauf verfügbar ist. */
export const MODEL_LIQ = {
  rendite: 0.15,
  sicherheit: 0.6,
  liquiditaet: 1,
} as const;

export const DEFAULT_WEIGHTS = {
  rendite: 0.15,
  sicherheit: 0.6,
  liquiditaet: 0.25,
} as const;

export const ACCENT = "#C22E0C";
export const GRAU = "#9D9D9C";
