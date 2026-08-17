export type MarketData = {
  bundYield: number;
  daxTrailing12m: number;
  cashRate: number;
  asOf: string;
  bundAsOf: string;
  daxAsOf: string;
  cashAsOf: string;
  frequency: {
    bundYield: string;
    daxTrailing12m: string;
    cashRate: string;
  };
  delayed: boolean;
  label: string;
  sources: {
    bundYield: string;
    daxTrailing12m: string;
    cashRate: string;
  };
  notes: string;
};

export type MarketStatus = "loading" | "ok" | "fallback" | "missing";

export const SEED_MARKET: MarketData = {
  bundYield: 0.032,
  daxTrailing12m: 0.1078,
  cashRate: 0.0225,
  asOf: "2026-08-17",
  bundAsOf: "2026-08-17",
  daxAsOf: "2026-08-03",
  cashAsOf: "2026-06-17",
  frequency: {
    bundYield: "täglich (EOD)",
    daxTrailing12m: "Snapshot / Beispielstand",
    cashRate: "bei Änderung",
  },
  delayed: true,
  label: "Markt / EOD / verzögert",
  sources: {
    bundYield:
      "Deutsche Bundesbank, Zeitreihe BBSSY.D.REN.EUR.A630.000000WT1010.A – Rendite der jeweils jüngsten Bundesanleihe mit 10 Jahren Laufzeit. Zuletzt 3,20 % am 17.08.2026.",
    daxTrailing12m:
      "Beispielstand, nicht live: öffentlich berichtete DAX-Gesamtrendite über ca. 12 Monate zum 03.08.2026 (rund 10,78 %). Kein Handels-Feed.",
    cashRate:
      "EZB, Einlagefazilität (FM.B.U2.EUR.4F.KR.DFR.LEV), letzte Änderung 2,25 % am 17.06.2026.",
  },
  notes:
    "Lehre, nicht Handel. Eingebetteter Beispielstand, falls public/data/market.json fehlt.",
};

function isMarket(x: unknown): x is MarketData {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.bundYield === "number" &&
    typeof o.daxTrailing12m === "number" &&
    typeof o.cashRate === "number" &&
    typeof o.asOf === "string" &&
    typeof o.label === "string"
  );
}

function hydrate(raw: MarketData): MarketData {
  const freqRaw: unknown = (raw as { frequency?: unknown }).frequency;
  const frequency =
    typeof freqRaw === "object" && freqRaw !== null
      ? { ...SEED_MARKET.frequency, ...(freqRaw as MarketData["frequency"]) }
      : {
          ...SEED_MARKET.frequency,
          bundYield:
            typeof freqRaw === "string" ? freqRaw : SEED_MARKET.frequency.bundYield,
        };
  return {
    ...SEED_MARKET,
    ...raw,
    frequency,
    sources: { ...SEED_MARKET.sources, ...raw.sources },
    delayed: raw.delayed !== false,
  };
}

export async function loadMarket(): Promise<{
  data: MarketData;
  status: MarketStatus;
}> {
  try {
    const res = await fetch("./data/market.json", { cache: "no-store" });
    if (!res.ok) {
      return { data: SEED_MARKET, status: "missing" };
    }
    const json: unknown = await res.json();
    if (!isMarket(json)) {
      return { data: SEED_MARKET, status: "fallback" };
    }
    return { data: hydrate(json), status: "ok" };
  } catch {
    return { data: SEED_MARKET, status: "missing" };
  }
}
