import {
  BERGER_MDD_RATIO,
  BERGER_PAYOUT_RATIO,
  MODEL_LIQ,
  MODEL_MDD,
  WEALTH_EUR,
} from "./constants";
import type { MarketData } from "./market";

export type Weights = {
  rendite: number;
  sicherheit: number;
  liquiditaet: number;
};

export type ConstraintId = "rendite" | "mdd" | "liquiditaet";

export type ConstraintEval = {
  id: ConstraintId;
  label: string;
  required: number;
  implied: number;
  ok: boolean;
  kind: "min" | "max";
  unit: "pct";
};

export type ModelResult = {
  impliedReturn: number;
  impliedMdd: number;
  impliedLiq: number;
  minReturn: number;
  maxMdd: number;
  minLiq: number;
  constraints: ConstraintEval[];
  feasible: boolean;
};

export function normalizeWeights(w: Weights): Weights {
  const r = Math.max(0, w.rendite);
  const s = Math.max(0, w.sicherheit);
  const l = Math.max(0, w.liquiditaet);
  const sum = r + s + l;
  if (sum <= 0) {
    return { rendite: 1 / 3, sicherheit: 1 / 3, liquiditaet: 1 / 3 };
  }
  return { rendite: r / sum, sicherheit: s / sum, liquiditaet: l / sum };
}

export function setWeight(
  current: Weights,
  key: keyof Weights,
  value: number,
): Weights {
  const next = Math.min(1, Math.max(0, value));
  const others = (["rendite", "sicherheit", "liquiditaet"] as const).filter(
    (k) => k !== key,
  );
  const first = others[0] ?? "sicherheit";
  const second = others[1] ?? "liquiditaet";
  const remain = 1 - next;
  const a = current[first];
  const b = current[second];
  const oSum = a + b;
  let na: number;
  let nb: number;
  if (oSum <= 1e-9) {
    na = remain / 2;
    nb = remain / 2;
  } else {
    na = remain * (a / oSum);
    nb = remain * (b / oSum);
  }
  return normalizeWeights({
    rendite: key === "rendite" ? next : first === "rendite" ? na : nb,
    sicherheit: key === "sicherheit" ? next : first === "sicherheit" ? na : nb,
    liquiditaet: key === "liquiditaet" ? next : first === "liquiditaet" ? na : nb,
  });
}

export function impliedReturn(w: Weights, market: MarketData): number {
  return (
    w.rendite * market.daxTrailing12m +
    w.sicherheit * market.bundYield +
    w.liquiditaet * market.cashRate
  );
}

export function impliedMdd(w: Weights): number {
  return (
    w.rendite * MODEL_MDD.rendite +
    w.sicherheit * MODEL_MDD.sicherheit +
    w.liquiditaet * MODEL_MDD.liquiditaet
  );
}

export function impliedLiq(w: Weights): number {
  return (
    w.rendite * MODEL_LIQ.rendite +
    w.sicherheit * MODEL_LIQ.sicherheit +
    w.liquiditaet * MODEL_LIQ.liquiditaet
  );
}

export function evaluateModel(
  w: Weights,
  market: MarketData,
  bedarfEur: number,
  liqNeedEur: number,
): ModelResult {
  const nw = normalizeWeights(w);
  const studentReturn = bedarfEur / WEALTH_EUR;
  const minReturn = Math.max(BERGER_PAYOUT_RATIO, studentReturn);
  const maxMdd = BERGER_MDD_RATIO;
  const minLiq = Math.max(0, liqNeedEur / WEALTH_EUR);

  const r = impliedReturn(nw, market);
  const m = impliedMdd(nw);
  const l = impliedLiq(nw);

  const constraints: ConstraintEval[] = [
    {
      id: "rendite",
      label: "Mindestausschüttung (Rendite-Linie)",
      required: minReturn,
      implied: r,
      ok: r + 1e-9 >= minReturn,
      kind: "min",
      unit: "pct",
    },
    {
      id: "mdd",
      label: "Maximaler Drawdown (Sicherheits-Linie)",
      required: maxMdd,
      implied: m,
      ok: m - 1e-9 <= maxMdd,
      kind: "max",
      unit: "pct",
    },
    {
      id: "liquiditaet",
      label: "Liquidität binnen 12 Monaten",
      required: minLiq,
      implied: l,
      ok: l + 1e-9 >= minLiq,
      kind: "min",
      unit: "pct",
    },
  ];

  return {
    impliedReturn: r,
    impliedMdd: m,
    impliedLiq: l,
    minReturn,
    maxMdd,
    minLiq,
    constraints,
    feasible: constraints.every((c) => c.ok),
  };
}

export type LineCoeff = { a: number; b: number; c: number; k: number };

export function returnLine(market: MarketData, minReturn: number): LineCoeff {
  return {
    a: market.daxTrailing12m,
    b: market.bundYield,
    c: market.cashRate,
    k: minReturn,
  };
}

export function mddLine(): LineCoeff {
  return {
    a: MODEL_MDD.rendite,
    b: MODEL_MDD.sicherheit,
    c: MODEL_MDD.liquiditaet,
    k: BERGER_MDD_RATIO,
  };
}

export function liqLine(minLiq: number): LineCoeff {
  return {
    a: MODEL_LIQ.rendite,
    b: MODEL_LIQ.sicherheit,
    c: MODEL_LIQ.liquiditaet,
    k: minLiq,
  };
}
