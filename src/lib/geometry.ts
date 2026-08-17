import type { LineCoeff, Weights } from "./model";

export type Pt = { x: number; y: number };

export type TriangleVerts = {
  rendite: Pt;
  sicherheit: Pt;
  liquiditaet: Pt;
};

export function makeVerts(size: number, pad: number): TriangleVerts {
  const h = (size * Math.sqrt(3)) / 2;
  return {
    rendite: { x: pad + size / 2, y: pad },
    sicherheit: { x: pad, y: pad + h },
    liquiditaet: { x: pad + size, y: pad + h },
  };
}

export function baryToCart(w: Weights, v: TriangleVerts): Pt {
  return {
    x:
      w.rendite * v.rendite.x +
      w.sicherheit * v.sicherheit.x +
      w.liquiditaet * v.liquiditaet.x,
    y:
      w.rendite * v.rendite.y +
      w.sicherheit * v.sicherheit.y +
      w.liquiditaet * v.liquiditaet.y,
  };
}

export function cartToBary(p: Pt, v: TriangleVerts): Weights {
  const R = v.rendite;
  const S = v.sicherheit;
  const L = v.liquiditaet;
  const det = (S.y - L.y) * (R.x - L.x) + (L.x - S.x) * (R.y - L.y);
  if (Math.abs(det) < 1e-12) {
    return { rendite: 1 / 3, sicherheit: 1 / 3, liquiditaet: 1 / 3 };
  }
  const r = ((S.y - L.y) * (p.x - L.x) + (L.x - S.x) * (p.y - L.y)) / det;
  const s = ((L.y - R.y) * (p.x - L.x) + (R.x - L.x) * (p.y - L.y)) / det;
  const l = 1 - r - s;
  return clampBary({ rendite: r, sicherheit: s, liquiditaet: l });
}

export function clampBary(w: Weights): Weights {
  const r = Math.max(0, w.rendite);
  const s = Math.max(0, w.sicherheit);
  const l = Math.max(0, w.liquiditaet);
  const sum = r + s + l;
  if (sum <= 0) {
    return { rendite: 1 / 3, sicherheit: 1 / 3, liquiditaet: 1 / 3 };
  }
  return { rendite: r / sum, sicherheit: s / sum, liquiditaet: l / sum };
}

function onEdge(zero: keyof Weights, line: LineCoeff): Weights | null {
  const { a, b, c, k } = line;
  if (zero === "liquiditaet") {
    const den = a - b;
    if (Math.abs(den) < 1e-12) return null;
    const r = (k - b) / den;
    const s = 1 - r;
    if (r >= -1e-6 && s >= -1e-6 && r <= 1 + 1e-6 && s <= 1 + 1e-6) {
      return clampBary({ rendite: r, sicherheit: s, liquiditaet: 0 });
    }
  }
  if (zero === "sicherheit") {
    const den = a - c;
    if (Math.abs(den) < 1e-12) return null;
    const r = (k - c) / den;
    const l = 1 - r;
    if (r >= -1e-6 && l >= -1e-6 && r <= 1 + 1e-6 && l <= 1 + 1e-6) {
      return clampBary({ rendite: r, sicherheit: 0, liquiditaet: l });
    }
  }
  if (zero === "rendite") {
    const den = b - c;
    if (Math.abs(den) < 1e-12) return null;
    const s = (k - c) / den;
    const l = 1 - s;
    if (s >= -1e-6 && l >= -1e-6 && s <= 1 + 1e-6 && l <= 1 + 1e-6) {
      return clampBary({ rendite: 0, sicherheit: s, liquiditaet: l });
    }
  }
  return null;
}

export function lineHits(line: LineCoeff): Weights[] {
  const pts: Weights[] = [];
  const keys: (keyof Weights)[] = ["rendite", "sicherheit", "liquiditaet"];
  for (const z of keys) {
    const p = onEdge(z, line);
    if (p) pts.push(p);
  }
  return uniqueWeights(pts);
}

function uniqueWeights(pts: Weights[]): Weights[] {
  const out: Weights[] = [];
  for (const p of pts) {
    const dup = out.some(
      (q) =>
        Math.abs(q.rendite - p.rendite) < 1e-4 &&
        Math.abs(q.sicherheit - p.sicherheit) < 1e-4,
    );
    if (!dup) out.push(p);
  }
  return out;
}

function lineIntersect(l1: LineCoeff, l2: LineCoeff): Weights | null {
  const A1 = l1.a - l1.c;
  const B1 = l1.b - l1.c;
  const C1 = l1.k - l1.c;
  const A2 = l2.a - l2.c;
  const B2 = l2.b - l2.c;
  const C2 = l2.k - l2.c;
  const det = A1 * B2 - A2 * B1;
  if (Math.abs(det) < 1e-12) return null;
  const r = (C1 * B2 - C2 * B1) / det;
  const s = (A1 * C2 - A2 * C1) / det;
  const l = 1 - r - s;
  if (r < -1e-6 || s < -1e-6 || l < -1e-6) return null;
  if (r > 1 + 1e-6 || s > 1 + 1e-6 || l > 1 + 1e-6) return null;
  return clampBary({ rendite: r, sicherheit: s, liquiditaet: l });
}

function satisfies(
  w: Weights,
  lines: { line: LineCoeff; side: "ge" | "le" }[],
): boolean {
  for (const { line, side } of lines) {
    const v = line.a * w.rendite + line.b * w.sicherheit + line.c * w.liquiditaet;
    if (side === "ge" && v + 1e-6 < line.k) return false;
    if (side === "le" && v - 1e-6 > line.k) return false;
  }
  return true;
}

export type HalfPlane = { line: LineCoeff; side: "ge" | "le" };

export function feasiblePolygon(planes: HalfPlane[]): Weights[] {
  const candidates: Weights[] = [
    { rendite: 1, sicherheit: 0, liquiditaet: 0 },
    { rendite: 0, sicherheit: 1, liquiditaet: 0 },
    { rendite: 0, sicherheit: 0, liquiditaet: 1 },
  ];
  for (const p of planes) {
    candidates.push(...lineHits(p.line));
  }
  for (let i = 0; i < planes.length; i += 1) {
    for (let j = i + 1; j < planes.length; j += 1) {
      const left = planes[i];
      const right = planes[j];
      if (!left || !right) continue;
      const hit = lineIntersect(left.line, right.line);
      if (hit) candidates.push(hit);
    }
  }
  const kept = uniqueWeights(candidates.filter((w) => satisfies(w, planes)));
  if (kept.length < 3) return kept;
  const cx = kept.reduce((acc, w) => acc + w.rendite, 0) / kept.length;
  const cy = kept.reduce((acc, w) => acc + w.sicherheit, 0) / kept.length;
  kept.sort((p, q) => {
    const ap = Math.atan2(p.sicherheit - cy, p.rendite - cx);
    const aq = Math.atan2(q.sicherheit - cy, q.rendite - cx);
    return ap - aq;
  });
  return kept;
}

export function viewBox(size: number, pad: number): string {
  const h = (size * Math.sqrt(3)) / 2;
  return `0 0 ${size + pad * 2} ${h + pad * 2}`;
}
