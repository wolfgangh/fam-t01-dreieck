import { useCallback, useId, useRef } from "react";
import { ACCENT } from "../lib/constants";
import { formatPct, formatPctPoints } from "../lib/format";
import {
  baryToCart,
  cartToBary,
  feasiblePolygon,
  lineHits,
  makeVerts,
  viewBox,
  type HalfPlane,
} from "../lib/geometry";
import type { MarketData } from "../lib/market";
import {
  evaluateModel,
  liqLine,
  mddLine,
  returnLine,
  type Weights,
} from "../lib/model";

type Props = {
  weights: Weights;
  onChange: (w: Weights) => void;
  locked: boolean;
  market: MarketData;
  bedarfEur: number;
  liqNeedEur: number;
  bergerReturn: number;
};

const SIZE = 420;
const PAD = 56;

export function Triangle({
  weights,
  onChange,
  locked,
  market,
  bedarfEur,
  liqNeedEur,
  bergerReturn,
}: Props) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const verts = makeVerts(SIZE, PAD);
  const vb = viewBox(SIZE, PAD);
  const model = evaluateModel(weights, market, bedarfEur, liqNeedEur);
  const pt = baryToCart(weights, verts);

  const studentReturn = model.minReturn;
  const rLineBerger = returnLine(market, bergerReturn);
  const rLineStudent =
    Math.abs(studentReturn - bergerReturn) > 0.0015
      ? returnLine(market, studentReturn)
      : null;
  const sLine = mddLine();
  const lLine = model.minLiq > 0.005 ? liqLine(model.minLiq) : null;

  const planes: HalfPlane[] = [
    { line: returnLine(market, model.minReturn), side: "ge" },
    { line: sLine, side: "le" },
  ];
  if (lLine) planes.push({ line: lLine, side: "ge" });
  const feas = feasiblePolygon(planes);

  const toSvg = (clientX: number, clientY: number): Weights | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const ptDom = new DOMPoint(clientX, clientY).matrixTransform(inv);
    return cartToBary({ x: ptDom.x, y: ptDom.y }, verts);
  };

  const move = useCallback(
    (clientX: number, clientY: number) => {
      if (locked) return;
      const w = toSvg(clientX, clientY);
      if (w) onChange(w);
    },
    [locked, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    move(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    move(e.clientX, e.clientY);
  };

  const nudge = (dx: number, dy: number) => {
    if (locked) return;
    onChange(cartToBary({ x: pt.x + dx, y: pt.y + dy }, verts));
  };

  const onKey = (e: React.KeyboardEvent<SVGGElement>) => {
    const step = e.shiftKey ? 18 : 8;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudge(-step, 0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nudge(step, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nudge(0, -step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nudge(0, step);
    }
  };

  const poly = (ws: Weights[]) =>
    ws
      .map((w) => {
        const p = baryToCart(w, verts);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");

  const lineSeg = (line: ReturnType<typeof returnLine>) => {
    const hits = lineHits(line);
    if (hits.length < 2) return null;
    const a = baryToCart(hits[0]!, verts);
    const b = baryToCart(hits[1]!, verts);
    return { a, b };
  };

  const tri = poly([
    { rendite: 1, sicherheit: 0, liquiditaet: 0 },
    { rendite: 0, sicherheit: 0, liquiditaet: 1 },
    { rendite: 0, sicherheit: 1, liquiditaet: 0 },
  ]);

  const hatchId = `${uid}-hatch`;
  const clipId = `${uid}-clip`;
  const bergerSeg = lineSeg(rLineBerger);
  const studentSeg = rLineStudent ? lineSeg(rLineStudent) : null;
  const mddSeg = lineSeg(sLine);
  const liqSeg = lLine ? lineSeg(lLine) : null;
  const failed = new Set(model.constraints.filter((c) => !c.ok).map((c) => c.id));

  return (
    <div className="triangle-wrap">
      <svg
        ref={svgRef}
        className={`triangle-svg${locked ? " is-locked" : ""}`}
        viewBox={vb}
        role="img"
        aria-label="Magisches Dreieck mit den Ecken Rendite, Sicherheit und Liquidität"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <defs>
          <pattern
            id={hatchId}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="#9D9D9C" strokeWidth="1.4" />
          </pattern>
          <clipPath id={clipId}>
            <polygon points={tri} />
          </clipPath>
        </defs>

        <polygon points={tri} fill="#ffffff" stroke="#1a1a1a" strokeWidth="2.2" />
        <polygon
          points={tri}
          fill={`url(#${hatchId})`}
          opacity="0.55"
          clipPath={`url(#${clipId})`}
        />
        {feas.length >= 3 ? (
          <polygon
            points={poly(feas)}
            fill="#ffffff"
            stroke={ACCENT}
            strokeWidth="2"
            clipPath={`url(#${clipId})`}
          />
        ) : null}

        {bergerSeg ? (
          <ConstraintStroke
            a={bergerSeg.a}
            b={bergerSeg.b}
            dashed={false}
            violated={failed.has("rendite") && !rLineStudent}
            label={`Ausschüttung ${formatPct(bergerReturn)}`}
          />
        ) : null}
        {studentSeg ? (
          <ConstraintStroke
            a={studentSeg.a}
            b={studentSeg.b}
            dashed
            violated={failed.has("rendite")}
            label={`Ihr Bedarf ${formatPct(studentReturn)}`}
          />
        ) : null}
        {mddSeg ? (
          <ConstraintStroke
            a={mddSeg.a}
            b={mddSeg.b}
            dashed={false}
            violated={failed.has("mdd")}
            label={`Drawdown ${formatPct(model.maxMdd)}`}
          />
        ) : null}
        {liqSeg ? (
          <ConstraintStroke
            a={liqSeg.a}
            b={liqSeg.b}
            dashed
            violated={failed.has("liquiditaet")}
            label={`Liquidität ${formatPct(model.minLiq)}`}
          />
        ) : null}

        <VertexLabel p={verts.rendite} title="Rendite" sub="Markt: Aktien-Ecke" anchor="middle" dy={-14} />
        <VertexLabel p={verts.sicherheit} title="Sicherheit" sub="Markt: Bund-Ecke" anchor="start" dy={22} dx={-8} />
        <VertexLabel p={verts.liquiditaet} title="Liquidität" sub="Markt: Kasse-Ecke" anchor="end" dy={22} dx={8} />

        <g
          tabIndex={locked ? -1 : 0}
          role="slider"
          aria-label="Gewichteter Punkt im magischen Dreieck"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(weights.rendite * 100)}
          aria-valuetext={`Rendite ${formatPctPoints(weights.rendite * 100)}, Sicherheit ${formatPctPoints(weights.sicherheit * 100)}, Liquidität ${formatPctPoints(weights.liquiditaet * 100)}`}
          aria-disabled={locked}
          onKeyDown={onKey}
          className="handle-group"
        >
          <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" className="handle-hit" />
          <circle
            cx={pt.x}
            cy={pt.y}
            r="11"
            fill="#ffffff"
            stroke={model.feasible ? "#1a1a1a" : ACCENT}
            strokeWidth="3"
          />
          {model.feasible ? (
            <path
              d={`M ${pt.x - 5} ${pt.y} l 3.2 3.4 7.2 -8`}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            <g stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round">
              <line x1={pt.x - 4.5} y1={pt.y - 4.5} x2={pt.x + 4.5} y2={pt.y + 4.5} />
              <line x1={pt.x + 4.5} y1={pt.y - 4.5} x2={pt.x - 4.5} y2={pt.y + 4.5} />
            </g>
          )}
        </g>
      </svg>
      {feas.length < 3 ? (
        <p className="empty-region">
          Bei diesem Bedarf ist der zulässige Bereich leer. Die drei Ziele
          sind gleichzeitig nicht erreichbar – das ist die Aussage des
          Dreiecks, nicht ein Bedienfehler.
        </p>
      ) : (
        <p className="sr-only">
          Weißer Bereich ohne Schraffur: zulässig. Schraffur: mindestens
          eine harte Linie verletzt.
        </p>
      )}
    </div>
  );
}

function ConstraintStroke({
  a,
  b,
  dashed,
  violated,
  label,
}: {
  a: { x: number; y: number };
  b: { x: number; y: number };
  dashed: boolean;
  violated: boolean;
  label: string;
}) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={ACCENT}
        strokeWidth={violated ? 4 : 2.6}
        strokeDasharray={dashed ? "7 5" : undefined}
        strokeLinecap="round"
      />
      <rect
        x={mx - 52}
        y={my - 11}
        width="104"
        height="18"
        rx="2"
        fill="#ffffff"
        stroke={violated ? ACCENT : "#9D9D9C"}
      />
      <text
        x={mx}
        y={my + 3}
        textAnchor="middle"
        className="line-label"
        fill={violated ? ACCENT : "#1a1a1a"}
      >
        {violated ? `verletzt · ${label}` : label}
      </text>
    </g>
  );
}

function VertexLabel({
  p,
  title,
  sub,
  anchor,
  dy,
  dx = 0,
}: {
  p: { x: number; y: number };
  title: string;
  sub: string;
  anchor: "start" | "middle" | "end";
  dy: number;
  dx?: number;
}) {
  return (
    <g>
      <text x={p.x + dx} y={p.y + dy} textAnchor={anchor} className="v-title">
        {title}
      </text>
      <text x={p.x + dx} y={p.y + dy + 14} textAnchor={anchor} className="v-sub">
        {sub}
      </text>
    </g>
  );
}
