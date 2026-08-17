export type MarketData = {
  bundYield: number;
  daxTrailing12m: number;
  cashRate: number;
  asOf: string;
  label: string;
  delayed: boolean;
  frequency: string;
  sources: {
    bundYield: string;
    daxTrailing12m: string;
    cashRate: string;
  };
  notes: string;
};

export type MarketStatus = "loading" | "ok" | "missing";

/** Eingebetteter Beispielstand, falls public/data/market.json fehlt. */
export const SEED_MARKET: MarketData = {
  bundYield: 0.032,
  daxTrailing12m: 0.1078,
  cashRate: 0.0225,
  asOf: "2026-08-17",
  label: "Beispielstand 17.08.2026",
  delayed: true,
  frequency: "daily/EOD",
  sources: {
    bundYield:
      "Deutsche Bundesbank, Reihe BBSSY, 10-jährige Bundesanleihe. Schlusskurs des Tages, gespeichert. Für die Lehre, nicht für den Handel.",
    daxTrailing12m:
      "Stooq, Schlusskurs des Tages. DAX-Rendite der letzten zwölf Monate, Beispielstand 03.08.2026, gespeichert. Marktstand, nicht Berger-Soll. Für die Lehre, nicht für den Handel.",
    cashRate:
      "EZB DFR 2,25 %. Schlusskurs des Tages, gespeichert. Für die Lehre, nicht für den Handel.",
  },
  notes:
    "Die Zahlen sind ein datierter Beispielstand vom 17.08.2026. Die DAX-Rendite der letzten zwölf Monate gilt zum 03.08.2026. Sie ersetzen keine Abfrage bei Bundesbank oder EZB. Sie sind nicht für Handelsentscheidungen gedacht.",
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asNumber(x: unknown, fallback: number): number {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}

function asString(x: unknown, fallback: string): string {
  return typeof x === "string" && x.trim() !== "" ? x : fallback;
}

function asBool(x: unknown, fallback: boolean): boolean {
  return typeof x === "boolean" ? x : fallback;
}

function hydrate(raw: unknown): MarketData | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.bundYield !== "number" || typeof raw.daxTrailing12m !== "number") {
    return null;
  }
  const sources = isRecord(raw.sources) ? raw.sources : {};
  return {
    bundYield: raw.bundYield,
    daxTrailing12m: raw.daxTrailing12m,
    cashRate: asNumber(raw.cashRate, raw.bundYield),
    asOf: asString(raw.asOf, SEED_MARKET.asOf),
    label: asString(raw.label, SEED_MARKET.label),
    delayed: asBool(raw.delayed, true),
    frequency: asString(raw.frequency, SEED_MARKET.frequency),
    sources: {
      bundYield: asString(sources.bundYield, SEED_MARKET.sources.bundYield),
      daxTrailing12m: asString(
        sources.daxTrailing12m,
        SEED_MARKET.sources.daxTrailing12m,
      ),
      cashRate: asString(sources.cashRate, SEED_MARKET.sources.cashRate),
    },
    notes: asString(raw.notes, SEED_MARKET.notes),
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
    const data = hydrate(json);
    if (!data) {
      return { data: SEED_MARKET, status: "missing" };
    }
    return { data, status: "ok" };
  } catch {
    return { data: SEED_MARKET, status: "missing" };
  }
}
