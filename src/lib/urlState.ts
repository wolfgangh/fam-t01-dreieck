import { DEFAULT_WEIGHTS, WEALTH_EUR } from "./constants";
import { normalizeWeights, type Weights } from "./model";

export type LabState = {
  unlocked: boolean;
  bedarf: number;
  horizont: number;
  infiniteHorizon: boolean;
  liquiditaet: number;
  weights: Weights;
};

export const EMPTY_FORM = {
  bedarf: "",
  horizont: "",
  liquiditaet: "",
  liqMode: "eur" as "eur" | "pct",
};

export function defaultUnlockedState(): LabState {
  return {
    unlocked: true,
    bedarf: 360_000,
    horizont: 50,
    infiniteHorizon: true,
    liquiditaet: 1_200_000,
    weights: { ...DEFAULT_WEIGHTS },
  };
}

function num(v: string | null, fallback: number): number {
  if (v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function readUrl(): LabState | null {
  const q = new URLSearchParams(window.location.search);
  if (!q.has("bedarf") && !q.has("ok")) return null;
  const bedarf = num(q.get("bedarf"), 360_000);
  const horizont = num(q.get("horizont"), 50);
  const liq = num(q.get("liquiditaet"), 1_200_000);
  const wr = num(q.get("wr"), DEFAULT_WEIGHTS.rendite * 100) / 100;
  const ws = num(q.get("ws"), DEFAULT_WEIGHTS.sicherheit * 100) / 100;
  const wl = num(q.get("wl"), DEFAULT_WEIGHTS.liquiditaet * 100) / 100;
  const ok = q.get("ok") === "1";
  if (!(bedarf > 0) || !(liq >= 0) || !(horizont > 0)) return null;
  return {
    unlocked: ok,
    bedarf,
    horizont,
    infiniteHorizon: q.get("inf") === "1" || horizont >= 80,
    liquiditaet: liq,
    weights: normalizeWeights({
      rendite: wr,
      sicherheit: ws,
      liquiditaet: wl,
    }),
  };
}

export function writeUrl(state: LabState): void {
  const q = new URLSearchParams();
  q.set("bedarf", String(Math.round(state.bedarf)));
  q.set("horizont", String(Math.round(state.horizont * 10) / 10));
  q.set("liquiditaet", String(Math.round(state.liquiditaet)));
  q.set("wr", String(Math.round(state.weights.rendite * 100)));
  q.set("ws", String(Math.round(state.weights.sicherheit * 100)));
  q.set("wl", String(Math.round(state.weights.liquiditaet * 100)));
  if (state.infiniteHorizon) q.set("inf", "1");
  if (state.unlocked) q.set("ok", "1");
  const next = `${window.location.pathname}?${q.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

export function shareUrl(state: LabState): string {
  const url = new URL(window.location.href);
  const q = url.searchParams;
  q.set("bedarf", String(Math.round(state.bedarf)));
  q.set("horizont", String(Math.round(state.horizont * 10) / 10));
  q.set("liquiditaet", String(Math.round(state.liquiditaet)));
  q.set("wr", String(Math.round(state.weights.rendite * 100)));
  q.set("ws", String(Math.round(state.weights.sicherheit * 100)));
  q.set("wl", String(Math.round(state.weights.liquiditaet * 100)));
  if (state.infiniteHorizon) q.set("inf", "1");
  else q.delete("inf");
  if (state.unlocked) q.set("ok", "1");
  else q.delete("ok");
  return url.toString();
}

export function liqFromInput(value: number, mode: "eur" | "pct"): number {
  if (mode === "pct") return (value / 100) * WEALTH_EUR;
  return value;
}
