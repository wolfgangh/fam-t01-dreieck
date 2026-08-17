import { formatPct, formatPctPoints } from "./format";
import type { MarketData } from "./market";

export const WEALTH_EUR = 12_000_000;
export const BERGER_PAYOUT_EUR = 360_000;
export const BERGER_PAYOUT_RATIO = 0.03;
export const BERGER_MDD_EUR = 1_200_000;
export const BERGER_MDD_RATIO = 0.1;
export const ACCENT = "#C22E0C";
export const GRAU = "#9D9D9C";

/** Modell-Drawdown der drei Ecken – Lehrannahme, keine Prognose. */
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

export type Weights = {
  wr: number;
  ws: number;
  wl: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  wr: 1 / 3,
  ws: 1 / 3,
  wl: 1 / 3,
};

export type ModelEval = {
  impliedReturn: number;
  impliedMdd: number;
  impliedLiq: number;
  minReturn: number;
  maxMdd: number;
  minLiq: number;
  returnOk: boolean;
  mddOk: boolean;
  liqOk: boolean;
  feasible: boolean;
};

export type Pt = { x: number; y: number };

export type TriangleVerts = {
  rendite: Pt;
  sicherheit: Pt;
  liquiditaet: Pt;
};

export type LineCoeff = { a: number; b: number; c: number; k: number };

const SIZE = 420;
const PAD = 58;

export function normalizeWeights(w: Weights): Weights {
  const r = Math.max(0, w.wr);
  const s = Math.max(0, w.ws);
  const l = Math.max(0, w.wl);
  const sum = r + s + l;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return { wr: r / sum, ws: s / sum, wl: l / sum };
}

export function setWeight(current: Weights, key: keyof Weights, value: number): Weights {
  const next = Math.min(1, Math.max(0, value));
  const keys: Array<keyof Weights> = ["wr", "ws", "wl"];
  const others = keys.filter((k) => k !== key);
  const k0 = others[0];
  const k1 = others[1];
  if (k0 === undefined || k1 === undefined) {
    return normalizeWeights(current);
  }
  const remain = 1 - next;
  const a = current[k0];
  const b = current[k1];
  const oSum = a + b;
  const na = oSum <= 1e-9 ? remain / 2 : remain * (a / oSum);
  const nb = oSum <= 1e-9 ? remain / 2 : remain * (b / oSum);
  const nextW: Weights = { wr: current.wr, ws: current.ws, wl: current.wl };
  nextW[key] = next;
  nextW[k0] = na;
  nextW[k1] = nb;
  return normalizeWeights(nextW);
}

export function evaluateModel(
  w: Weights,
  market: MarketData,
  liqNeedEur: number,
): ModelEval {
  const nw = normalizeWeights(w);
  const impliedReturn =
    nw.wr * market.daxTrailing12m +
    nw.ws * market.bundYield +
    nw.wl * market.cashRate;
  const impliedMdd =
    nw.wr * MODEL_MDD.rendite +
    nw.ws * MODEL_MDD.sicherheit +
    nw.wl * MODEL_MDD.liquiditaet;
  const impliedLiq =
    nw.wr * MODEL_LIQ.rendite +
    nw.ws * MODEL_LIQ.sicherheit +
    nw.wl * MODEL_LIQ.liquiditaet;
  const minReturn = BERGER_PAYOUT_RATIO;
  const maxMdd = BERGER_MDD_RATIO;
  const minLiq = Math.max(0, liqNeedEur / WEALTH_EUR);
  const returnOk = impliedReturn + 1e-9 >= minReturn;
  const mddOk = impliedMdd - 1e-9 <= maxMdd;
  const liqOk = impliedLiq + 1e-9 >= minLiq;
  return {
    impliedReturn,
    impliedMdd,
    impliedLiq,
    minReturn,
    maxMdd,
    minLiq,
    returnOk,
    mddOk,
    liqOk,
    feasible: returnOk && mddOk,
  };
}

export function makeVerts(size = SIZE, pad = PAD): TriangleVerts {
  const h = (size * Math.sqrt(3)) / 2;
  return {
    rendite: { x: pad + size / 2, y: pad },
    sicherheit: { x: pad, y: pad + h },
    liquiditaet: { x: pad + size, y: pad + h },
  };
}

export function viewBox(size = SIZE, pad = PAD): string {
  const h = (size * Math.sqrt(3)) / 2;
  return `0 0 ${size + pad * 2} ${h + pad * 2 + 8}`;
}

export function baryToCart(w: Weights, v: TriangleVerts): Pt {
  return {
    x: w.wr * v.rendite.x + w.ws * v.sicherheit.x + w.wl * v.liquiditaet.x,
    y: w.wr * v.rendite.y + w.ws * v.sicherheit.y + w.wl * v.liquiditaet.y,
  };
}

export function cartToBary(p: Pt, v: TriangleVerts): Weights {
  const R = v.rendite;
  const S = v.sicherheit;
  const L = v.liquiditaet;
  const det = (S.y - L.y) * (R.x - L.x) + (L.x - S.x) * (R.y - L.y);
  if (Math.abs(det) < 1e-12) return { ...DEFAULT_WEIGHTS };
  const r = ((S.y - L.y) * (p.x - L.x) + (L.x - S.x) * (p.y - L.y)) / det;
  const s = ((L.y - R.y) * (p.x - L.x) + (R.x - L.x) * (p.y - L.y)) / det;
  return normalizeWeights({ wr: r, ws: s, wl: 1 - r - s });
}

function onEdge(zero: keyof Weights, line: LineCoeff): Weights | null {
  const { a, b, c, k } = line;
  if (zero === "wl") {
    const den = a - b;
    if (Math.abs(den) < 1e-12) return null;
    const r = (k - b) / den;
    const s = 1 - r;
    if (r >= -1e-6 && s >= -1e-6 && r <= 1 + 1e-6 && s <= 1 + 1e-6) {
      return normalizeWeights({ wr: r, ws: s, wl: 0 });
    }
  }
  if (zero === "ws") {
    const den = a - c;
    if (Math.abs(den) < 1e-12) return null;
    const r = (k - c) / den;
    const l = 1 - r;
    if (r >= -1e-6 && l >= -1e-6 && r <= 1 + 1e-6 && l <= 1 + 1e-6) {
      return normalizeWeights({ wr: r, ws: 0, wl: l });
    }
  }
  if (zero === "wr") {
    const den = b - c;
    if (Math.abs(den) < 1e-12) return null;
    const s = (k - c) / den;
    const l = 1 - s;
    if (s >= -1e-6 && l >= -1e-6 && s <= 1 + 1e-6 && l <= 1 + 1e-6) {
      return normalizeWeights({ wr: 0, ws: s, wl: l });
    }
  }
  return null;
}

function uniqueWeights(pts: Weights[]): Weights[] {
  const out: Weights[] = [];
  for (const p of pts) {
    const dup = out.some(
      (q) => Math.abs(q.wr - p.wr) < 1e-4 && Math.abs(q.ws - p.ws) < 1e-4,
    );
    if (!dup) out.push(p);
  }
  return out;
}

export function lineHits(line: LineCoeff): Weights[] {
  const pts: Weights[] = [];
  for (const z of ["wr", "ws", "wl"] as const) {
    const p = onEdge(z, line);
    if (p) pts.push(p);
  }
  return uniqueWeights(pts);
}

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

function lineSeg(
  line: LineCoeff,
  verts: TriangleVerts,
): { a: Pt; b: Pt } | null {
  const hits = lineHits(line);
  if (hits.length < 2) return null;
  return { a: baryToCart(hits[0]!, verts), b: baryToCart(hits[1]!, verts) };
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function constraintStroke(
  seg: { a: Pt; b: Pt },
  label: string,
  violated: boolean,
): string {
  const { a, b } = seg;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const stroke = ACCENT;
  const width = violated ? 4 : 2.4;
  return `
    <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" />
    <rect x="${(mx - 58).toFixed(1)}" y="${(my - 11).toFixed(1)}" width="116" height="18" rx="2" fill="#ffffff" stroke="${ACCENT}" />
    <text x="${mx.toFixed(1)}" y="${(my + 3).toFixed(1)}" text-anchor="middle" class="line-label" fill="${stroke}">${escapeAttr(label)}</text>
  `;
}

export function renderTriangleMarkup(
  weights: Weights,
  model: ModelEval,
  market: MarketData,
  locked: boolean,
): string {
  const verts = makeVerts();
  const vb = viewBox();
  const pt = baryToCart(weights, verts);
  const rSeg = lineSeg(returnLine(market, BERGER_PAYOUT_RATIO), verts);
  const dSeg = lineSeg(mddLine(), verts);
  const tri = [
    baryToCart({ wr: 1, ws: 0, wl: 0 }, verts),
    baryToCart({ wr: 0, ws: 0, wl: 1 }, verts),
    baryToCart({ wr: 0, ws: 1, wl: 0 }, verts),
  ]
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const handleStroke = model.feasible ? "#1a1a1a" : ACCENT;
  const mark = model.feasible
    ? `<path d="M ${pt.x - 5} ${pt.y} l 3.2 3.4 7.2 -8" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" />`
    : `<g stroke="${ACCENT}" stroke-width="2.2" stroke-linecap="round">
        <line x1="${pt.x - 4.5}" y1="${pt.y - 4.5}" x2="${pt.x + 4.5}" y2="${pt.y + 4.5}" />
        <line x1="${pt.x + 4.5}" y1="${pt.y - 4.5}" x2="${pt.x - 4.5}" y2="${pt.y + 4.5}" />
      </g>`;

  return `
    <svg class="triangle-svg${locked ? " is-locked" : ""}" viewBox="${vb}" role="img" aria-label="Magisches Dreieck mit den Ecken Rendite, Sicherheit und Liquidität">
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="${GRAU}" stroke-width="1.4" />
        </pattern>
        <clipPath id="tri-clip"><polygon points="${tri}" /></clipPath>
      </defs>
      <polygon points="${tri}" fill="#ffffff" stroke="#1a1a1a" stroke-width="2.2" />
      ${model.feasible ? "" : `<polygon points="${tri}" fill="url(#hatch)" opacity="0.5" clip-path="url(#tri-clip)" />`}
      ${rSeg ? constraintStroke(rSeg, `Ausschüttung ${formatPct(BERGER_PAYOUT_RATIO)}`, !model.returnOk) : ""}
      ${dSeg ? constraintStroke(dSeg, `Drawdown ${formatPct(BERGER_MDD_RATIO)}`, !model.mddOk) : ""}
      <text x="${verts.rendite.x}" y="${verts.rendite.y - 16}" text-anchor="middle" class="v-title">Rendite</text>
      <text x="${verts.rendite.x}" y="${verts.rendite.y - 2}" text-anchor="middle" class="v-sub">Markt: Aktien-Ecke</text>
      <text x="${verts.sicherheit.x - 6}" y="${verts.sicherheit.y + 20}" text-anchor="start" class="v-title">Sicherheit</text>
      <text x="${verts.sicherheit.x - 6}" y="${verts.sicherheit.y + 34}" text-anchor="start" class="v-sub">Markt: Bund-Ecke</text>
      <text x="${verts.liquiditaet.x + 6}" y="${verts.liquiditaet.y + 20}" text-anchor="end" class="v-title">Liquidität</text>
      <text x="${verts.liquiditaet.x + 6}" y="${verts.liquiditaet.y + 34}" text-anchor="end" class="v-sub">Markt: Kasse-Ecke</text>
      <g class="handle-group" ${locked ? 'aria-disabled="true"' : ""}>
        <circle cx="${pt.x}" cy="${pt.y}" r="18" fill="transparent" />
        <circle cx="${pt.x}" cy="${pt.y}" r="11" fill="#ffffff" stroke="${handleStroke}" stroke-width="3" />
        ${mark}
      </g>
    </svg>
  `;
}

export function bindTrianglePointer(
  host: HTMLElement,
  getLocked: () => boolean,
  onChange: (w: Weights) => void,
  getWeights: () => Weights,
): void {
  const verts = makeVerts();
  let dragging = false;
  host.tabIndex = 0;

  const toWeights = (clientX: number, clientY: number): Weights | null => {
    const svg = host.querySelector("svg");
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const p = new DOMPoint(clientX, clientY).matrixTransform(inv);
    return cartToBary({ x: p.x, y: p.y }, verts);
  };

  host.addEventListener("pointerdown", (e) => {
    if (getLocked()) return;
    dragging = true;
    host.setPointerCapture(e.pointerId);
    host.focus();
    const w = toWeights(e.clientX, e.clientY);
    if (w) onChange(w);
  });
  host.addEventListener("pointermove", (e) => {
    if (!dragging || getLocked()) return;
    const w = toWeights(e.clientX, e.clientY);
    if (w) onChange(w);
  });
  host.addEventListener("pointerup", () => {
    dragging = false;
  });
  host.addEventListener("keydown", (e) => {
    if (getLocked()) return;
    const step = (e.shiftKey ? 5 : 1) / 100;
    const current = getWeights();
    let next: Weights | null = null;
    if (e.key === "ArrowUp") {
      next = setWeight(current, "wr", current.wr + step);
    } else if (e.key === "ArrowDown") {
      next = setWeight(current, "wr", current.wr - step);
    } else if (e.key === "ArrowLeft") {
      next = setWeight(current, "ws", current.ws + step);
    } else if (e.key === "ArrowRight") {
      next = setWeight(current, "wl", current.wl + step);
    }
    if (next) {
      e.preventDefault();
      onChange(next);
    }
  });
}

export function verdictCopy(model: ModelEval): { word: string; text: string; ok: boolean } {
  if (model.feasible) {
    return {
      word: "RICHTIG",
      ok: true,
      text: `Beide Berger-Linien sind eingehalten. Modell-Rendite ${formatPct(model.impliedReturn)} liegt mindestens bei ${formatPct(model.minReturn)}. Modell-Drawdown ${formatPct(model.impliedMdd)} bleibt unter ${formatPct(model.maxMdd)}.`,
    };
  }
  const parts: string[] = [];
  if (!model.returnOk) {
    parts.push(
      `Die Mindest-Rendite von ${formatPct(model.minReturn)} wird verfehlt (Modell ${formatPct(model.impliedReturn)}). Mehr Gewicht auf Rendite nötig – auf Kosten von Sicherheit oder Liquidität.`,
    );
  }
  if (!model.mddOk) {
    parts.push(
      `Die 10,00 %-Drawdown-Linie ist überschritten (Modell ${formatPct(model.impliedMdd)}). Sicherheit und Liquidität werden zu stark gequetscht.`,
    );
  }
  return {
    word: "FALSCH",
    ok: false,
    text: parts.join(" "),
  };
}

export function weightLabel(w: Weights): string {
  return `Rendite ${formatPctPoints(w.wr * 100)}, Sicherheit ${formatPctPoints(w.ws * 100)}, Liquidität ${formatPctPoints(w.wl * 100)}`;
}
