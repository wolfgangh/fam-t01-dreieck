import { useEffect, useMemo, useState } from "react";
import { Triangle } from "./components/Triangle";
import {
  BERGER_MDD_EUR,
  BERGER_MDD_RATIO,
  BERGER_PAYOUT_EUR,
  BERGER_PAYOUT_RATIO,
  DEFAULT_WEIGHTS,
  WEALTH_EUR,
} from "./lib/constants";
import {
  formatEuro,
  formatEuroReadable,
  formatIsoDate,
  formatPct,
  formatPctPoints,
  formatYears,
} from "./lib/format";
import {
  loadMarket,
  SEED_MARKET,
  type MarketData,
  type MarketStatus,
} from "./lib/market";
import { evaluateModel, setWeight, type Weights } from "./lib/model";
import { isTyped, parseDeNumber } from "./lib/parse";
import {
  defaultUnlockedState,
  EMPTY_FORM,
  liqFromInput,
  readUrl,
  shareUrl,
  writeUrl,
} from "./lib/urlState";

export default function App() {
  const [market, setMarket] = useState<MarketData>(SEED_MARKET);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>("loading");
  const [form, setForm] = useState(EMPTY_FORM);
  const [unlocked, setUnlocked] = useState(false);
  const [bedarf, setBedarf] = useState(BERGER_PAYOUT_EUR);
  const [horizont, setHorizont] = useState(50);
  const [infiniteHorizon, setInfiniteHorizon] = useState(false);
  const [liquiditaet, setLiquiditaet] = useState(BERGER_MDD_EUR);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadMarket().then((res) => {
      if (!alive) return;
      setMarket(res.data);
      setMarketStatus(res.status);
    });
    const fromUrl = readUrl();
    if (fromUrl) {
      setUnlocked(fromUrl.unlocked);
      setBedarf(fromUrl.bedarf);
      setHorizont(fromUrl.horizont);
      setInfiniteHorizon(fromUrl.infiniteHorizon);
      setLiquiditaet(fromUrl.liquiditaet);
      setWeights(fromUrl.weights);
      if (fromUrl.unlocked) {
        setForm({
          bedarf: String(fromUrl.bedarf),
          horizont: fromUrl.infiniteHorizon ? "unendlich" : String(fromUrl.horizont),
          liquiditaet: String(fromUrl.liquiditaet),
          liqMode: "eur",
        });
      }
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    writeUrl({
      unlocked,
      bedarf,
      horizont,
      infiniteHorizon,
      liquiditaet,
      weights,
    });
  }, [unlocked, bedarf, horizont, infiniteHorizon, liquiditaet, weights]);

  const liveBedarf = parseDeNumber(form.bedarf);
  const liveHorizont =
    form.horizont.trim().toLowerCase() === "unendlich"
      ? 99
      : parseDeNumber(form.horizont);
  const liveLiqRaw = parseDeNumber(form.liquiditaet);
  const liveLiq =
    liveLiqRaw === null ? null : liqFromInput(liveLiqRaw, form.liqMode);

  const model = useMemo(
    () => evaluateModel(weights, market, bedarf, liquiditaet),
    [weights, market, bedarf, liquiditaet],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTyped(form.bedarf) || !isTyped(form.horizont) || !isTyped(form.liquiditaet)) {
      setFormError("Bitte alle drei Felder selbst ausfüllen. Die Kanonzahlen stehen oben – tippen Sie sie, wenn Sie den Berger-Fall rechnen.");
      return;
    }
    if (liveBedarf === null || liveBedarf <= 0) {
      setFormError("Der jährliche Euro-Bedarf muss eine positive Zahl sein (de-DE, z. B. 360.000).");
      return;
    }
    if (liveHorizont === null || liveHorizont <= 0) {
      setFormError("Der Horizont muss in Jahren positiv sein oder „unendlich“ lauten.");
      return;
    }
    if (liveLiq === null || liveLiq < 0) {
      setFormError("Der Liquiditätsbedarf muss null oder positiv sein.");
      return;
    }
    if (liveLiq > WEALTH_EUR) {
      setFormError("Der Liquiditätsbedarf kann das Vermögen von 12 Mio. € nicht übersteigen.");
      return;
    }
    setFormError(null);
    setBedarf(liveBedarf);
    setHorizont(liveHorizont);
    setInfiniteHorizon(
      form.horizont.trim().toLowerCase() === "unendlich" || liveHorizont >= 80,
    );
    setLiquiditaet(liveLiq);
    setUnlocked(true);
  };

  const resetCanon = () => {
    const next = defaultUnlockedState();
    setBedarf(next.bedarf);
    setHorizont(next.horizont);
    setInfiniteHorizon(next.infiniteHorizon);
    setLiquiditaet(next.liquiditaet);
    setWeights({ ...DEFAULT_WEIGHTS });
    setForm({
      bedarf: "360000",
      horizont: "unendlich",
      liquiditaet: "1200000",
      liqMode: "eur",
    });
    setUnlocked(true);
    setFormError(null);
  };

  const copyLink = async () => {
    const url = shareUrl({
      unlocked,
      bedarf,
      horizont,
      infiniteHorizon,
      liquiditaet,
      weights,
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Link kopieren:", url);
    }
  };

  return (
    <div className="page">
      <a className="skip" href="#handweg">
        Zum Handweg
      </a>
      <header className="top">
        <p className="brand">
          OTH Regensburg · Fakultät Business and Management
        </p>
        <h1>FAM – Financial Markets and Asset Management | Einheit T01</h1>
        <p className="lead">Das magische Dreieck · Familienstiftung Berger</p>
        <MarketStrip status={marketStatus} market={market} />
      </header>

      <main>
        <section className="card" aria-labelledby="sit-h">
          <h2 id="sit-h">Situation</h2>
          <p className="who">
            <strong>Familienstiftung Berger</strong>, gemeinnützig. Satzung:
            reale Substanz erhalten, jährlich 3,00&nbsp;% der
            Jahresanfangssumme an Förderprojekte ausschütten. Horizont
            unendlich. Der Stiftungsrat tagt nach dem Geschäftsjahr.
          </p>
          <div className="stats" role="list">
            <div className="stat" role="listitem">
              <div className="stat-k">Vermögen</div>
              <div className="stat-v">{formatEuroReadable(WEALTH_EUR)}</div>
              <div className="stat-s">{formatEuro(WEALTH_EUR)}</div>
            </div>
            <div className="stat" role="listitem">
              <div className="stat-k">Ausschüttung p.&nbsp;a.</div>
              <div className="stat-v">{formatEuro(BERGER_PAYOUT_EUR)}</div>
              <div className="stat-s">{formatPct(BERGER_PAYOUT_RATIO)} des Vermögens</div>
            </div>
            <div className="stat" role="listitem">
              <div className="stat-k">MDD-Grenze</div>
              <div className="stat-v">{formatEuroReadable(BERGER_MDD_EUR)}</div>
              <div className="stat-s">{formatPct(BERGER_MDD_RATIO)} Drawdown, darüber Begründung vor dem Rat</div>
            </div>
          </div>
          <p>
            Die Ausschüttung soll nicht aus Substanzverkäufen in einem Crash
            kommen. Ein junger Sparplan ohne jährlichen Entnahmezwang stünde
            im Dreieck anders – die Stiftung muss jedes Jahr zahlen.
          </p>
        </section>

        <section className="card" aria-labelledby="prof-h">
          <h2 id="prof-h">Drei Sätze zum Profil</h2>
          <ol className="sentences">
            <li>
              <strong>Rendite.</strong> Ohne {formatPct(BERGER_PAYOUT_RATIO)}{" "}
              auf {formatEuroReadable(WEALTH_EUR)} fehlen{" "}
              {formatEuro(BERGER_PAYOUT_EUR)} für den Stiftungszweck.
            </li>
            <li>
              <strong>Sicherheit.</strong> Mehr als {formatEuroReadable(BERGER_MDD_EUR)}{" "}
              zwischenzeitlicher Verlust ({formatPct(BERGER_MDD_RATIO)}) ist
              für den Stiftungsrat nicht tragbar.
            </li>
            <li>
              <strong>Liquidität.</strong> Was binnen zwölf Monaten zu zahlen
              ist, darf nicht in einer Lage stecken, die nur mit Notverkauf
              flüssig wird.
            </li>
          </ol>
          <div className="formulas" aria-label="Formeln">
            <p>
              Ausschüttungsquote = Bedarf / Vermögen
              <br />
              {formatEuro(BERGER_PAYOUT_EUR)} / {formatEuro(WEALTH_EUR)} = {formatPct(BERGER_PAYOUT_RATIO)}
            </p>
            <p>
              MDD-Grenze = Drawdown / Vermögen
              <br />
              {formatEuro(BERGER_MDD_EUR)} / {formatEuro(WEALTH_EUR)} = {formatPct(BERGER_MDD_RATIO)}
            </p>
            <p>
              Liquiditätsquote = Bedarf<sub>12M</sub> / Vermögen
            </p>
          </div>
          <p className="note">
            Das Labor ersetzt weder die Handrechnung noch Excel. Es zeigt nur,
            dass die drei Ecken nicht gleichzeitig zu haben sind.
          </p>
        </section>

        <section className="card" id="handweg" aria-labelledby="hand-h">
          <h2 id="hand-h">Handweg – Ihre Zahlen zuerst</h2>
          <p>
            Tragen Sie drei eigene Werte ein. Die Berger-Sollzahlen stehen in
            der Situation – wenn Sie den Kanonfall rechnen, tippen Sie sie
            selbst. Erst nach dem Bestätigen öffnet sich das Dreieck. Eine
            „richtige“ Animation gibt es vorher nicht.
          </p>
          <form onSubmit={onSubmit} noValidate>
            <div className="grid3">
              <label>
                <span>Jährlicher Euro-Bedarf / Ausschüttung</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  name="bedarf"
                  placeholder="z. B. 360000"
                  value={form.bedarf}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bedarf: e.target.value }))
                  }
                  aria-describedby="bedarf-hint"
                />
                <span id="bedarf-hint" className="hint">
                  Euro, de-DE. Leer lassen und raten gilt nicht.
                </span>
              </label>
              <label>
                <span>Horizont in Jahren</span>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  name="horizont"
                  placeholder="z. B. 50 oder unendlich"
                  value={form.horizont}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, horizont: e.target.value }))
                  }
                  aria-describedby="horizont-hint"
                />
                <span id="horizont-hint" className="hint">
                  Ein langer Horizont lockert die jährliche Ausschüttung nicht.
                </span>
              </label>
              <div>
                <span className="lbl">Liquiditätsbedarf binnen 12 Monaten</span>
                <div className="seg" role="group" aria-label="Einheit Liquidität">
                  <label className={form.liqMode === "eur" ? "on" : ""}>
                    <input
                      type="radio"
                      name="liqMode"
                      checked={form.liqMode === "eur"}
                      onChange={() =>
                        setForm((f) => ({ ...f, liqMode: "eur" }))
                      }
                    />
                    Euro
                  </label>
                  <label className={form.liqMode === "pct" ? "on" : ""}>
                    <input
                      type="radio"
                      name="liqMode"
                      checked={form.liqMode === "pct"}
                      onChange={() =>
                        setForm((f) => ({ ...f, liqMode: "pct" }))
                      }
                    />
                    Anteil in %
                  </label>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  name="liquiditaet"
                  placeholder={form.liqMode === "eur" ? "z. B. 1200000" : "z. B. 10"}
                  value={form.liquiditaet}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, liquiditaet: e.target.value }))
                  }
                  aria-describedby="liq-hint"
                />
                <span id="liq-hint" className="hint">
                  Mittel, die ohne Notverkauf verfügbar sein müssen.
                </span>
              </div>
            </div>

            <ImpliedPreview
              bedarf={liveBedarf}
              horizont={liveHorizont}
              horizontRaw={form.horizont}
              liq={liveLiq}
            />

            {formError ? (
              <p className="error" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="actions">
              <button type="submit" className="btn-primary">
                Zahlen bestätigen und Dreieck öffnen
              </button>
            </div>
          </form>
        </section>

        {unlocked ? (
          <Comparison
            bedarf={bedarf}
            horizont={horizont}
            infiniteHorizon={infiniteHorizon}
            liquiditaet={liquiditaet}
          />
        ) : null}

        <section
          className={`card stage${unlocked ? "" : " is-locked"}`}
          aria-labelledby="tri-h"
        >
          <h2 id="tri-h">Ein Modell: das magische Dreieck</h2>
          {!unlocked ? (
            <div className="lock" role="status">
              <p>
                <strong>Zuerst der Handweg.</strong> Das Dreieck bleibt
                gesperrt, bis Sie eigene Zahlen bestätigt haben. Das Labor
                rechnet nicht für Sie vor.
              </p>
            </div>
          ) : null}

          <div className={`stage-grid${unlocked ? "" : " dimmed"}`}>
            <Triangle
              weights={weights}
              onChange={setWeights}
              locked={!unlocked}
              market={market}
              bedarfEur={unlocked ? bedarf : BERGER_PAYOUT_EUR}
              liqNeedEur={unlocked ? liquiditaet : BERGER_MDD_EUR}
              bergerReturn={BERGER_PAYOUT_RATIO}
            />
            <aside className="side">
              <Verdict modelOk={unlocked && model.feasible} locked={!unlocked} />
              {unlocked ? (
                <>
                  <Sliders
                    weights={weights}
                    onChange={setWeights}
                    modelReturn={model.impliedReturn}
                    modelMdd={model.impliedMdd}
                    modelLiq={model.impliedLiq}
                  />
                  <ul className="checks">
                    {model.constraints.map((c) => (
                      <li key={c.id} className={c.ok ? "ok" : "bad"}>
                        <span className="mark" aria-hidden="true">
                          {c.ok ? "✓" : "✕"}
                        </span>
                        <span>
                          <strong>{c.ok ? "gehalten" : "verletzt"}:</strong>{" "}
                          {c.label}. Modell {formatPct(c.implied)}, Grenze{" "}
                          {c.kind === "min" ? "mindestens" : "höchstens"}{" "}
                          {formatPct(c.required)}.
                        </span>
                      </li>
                    ))}
                  </ul>
                  <MarketCorner market={market} />
                  <div className="actions">
                    <button type="button" className="btn-ghost" onClick={resetCanon}>
                      Kanon wiederherstellen
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => void copyLink()}>
                      {copied ? "Link kopiert" : "Link kopieren"}
                    </button>
                  </div>
                  <p className="hint">
                    Reset setzt 12 Mio. €, 3,00&nbsp;% Ausschüttung und
                    10,00&nbsp;% MDD. Der Link trägt Bedarf, Horizont,
                    Liquidität und Gewichte.
                  </p>
                </>
              ) : (
                <p className="hint">
                  Nach dem Bestätigen ziehen Sie den Punkt oder die drei
                  Regler. Mehr Rendite macht Sicherheit oder Liquidität
                  unzulässig – die Schraffur und die Linie zeigen das.
                </p>
              )}
            </aside>
          </div>
        </section>

        <section className="card" aria-labelledby="task-h">
          <h2 id="task-h">Aufgabe (Moodle)</h2>
          <p>
            Setzen Sie die Kanonzahlen der Familienstiftung Berger
            ({formatEuro(BERGER_PAYOUT_EUR)} Bedarf, Horizont unendlich,{" "}
            {formatEuro(BERGER_MDD_EUR)} Liquidität binnen 12 Monaten).
            Verschieben Sie den Punkt so weit zur Rendite-Ecke, bis die
            Sicherheitslinie verletzt ist. Rechnen Sie von Hand oder in Excel
            für diese Gewichte die Modellrendite und den Modell-Drawdown nach
            den angegebenen Ecken-Annahmen. Geben Sie beide Ergebnisse mit
            zwei Nachkommastellen ein und begründen Sie in drei Sätzen, warum
            ein höheres Renditegewicht die Sicherheitslinie verletzt –
            unabhängig vom Produktnamen.
          </p>
        </section>

        <section className="merke" aria-labelledby="merke-h">
          <h2 id="merke-h">Merksatz</h2>
          <p>
            „Nicht das Produkt bestimmt die Anlage, sondern das Profil.“
          </p>
        </section>
      </main>

      <footer>
        <p>Prof. Dr. Wolfgang Hößl · FAM · Einheit T01</p>
        <p className="src">
          Datenquelle: {market.label}. Bund {formatPct(market.bundYield)} (
          {formatIsoDate(market.bundAsOf)}, Bundesbank, EOD). DAX 12M{" "}
          {formatPct(market.daxTrailing12m)} ({formatIsoDate(market.daxAsOf)},{" "}
          {market.frequency.daxTrailing12m}). Einlagefazilität{" "}
          {formatPct(market.cashRate)} ({formatIsoDate(market.cashAsOf)}, EZB).
          Delayed: {market.delayed ? "ja" : "nein"}. Lehre, nicht Handel.
        </p>
      </footer>
    </div>
  );
}

function MarketStrip({
  status,
  market,
}: {
  status: MarketStatus;
  market: MarketData;
}) {
  if (status === "loading") {
    return (
      <p className="strip" role="status">
        Marktdatei wird gelesen …
      </p>
    );
  }
  if (status === "missing") {
    return (
      <p className="strip warn" role="status">
        Marktdatei fehlt – eingebetteter Beispielstand aktiv ({formatIsoDate(market.asOf)}).
        Kein leerer Bildschirm.
      </p>
    );
  }
  if (status === "fallback") {
    return (
      <p className="strip warn" role="status">
        Marktdatei unvollständig – Beispielstand aktiv ({formatIsoDate(market.asOf)}).
      </p>
    );
  }
  return (
    <p className="strip" role="status">
      {market.label}: Bund 10J {formatPct(market.bundYield)} · DAX 12M{" "}
      {formatPct(market.daxTrailing12m)} · Stand {formatIsoDate(market.asOf)} ·{" "}
      nicht das Stiftungsziel
    </p>
  );
}

function ImpliedPreview({
  bedarf,
  horizont,
  horizontRaw,
  liq,
}: {
  bedarf: number | null;
  horizont: number | null;
  horizontRaw: string;
  liq: number | null;
}) {
  const hasAny = bedarf !== null || horizont !== null || liq !== null;
  if (!hasAny) {
    return (
      <p className="preview empty">
        Sobald Sie tippen, erscheinen hier die Quoten gegen 12 Mio. € – ohne
        Wertung gegen das Berger-Soll.
      </p>
    );
  }
  const inf =
    horizontRaw.trim().toLowerCase() === "unendlich" ||
    (horizont !== null && horizont >= 80);
  return (
    <div className="preview" aria-live="polite">
      <h3>Implizite Quoten (noch ohne Soll-Vergleich)</h3>
      <ul>
        <li>
          Bedarf / Vermögen:{" "}
          {bedarf !== null
            ? `${formatEuro(bedarf)} → ${formatPct(bedarf / WEALTH_EUR)}`
            : "–"}
        </li>
        <li>
          Horizont:{" "}
          {horizont !== null ? formatYears(horizont, inf) : "–"}
        </li>
        <li>
          Liquidität / Vermögen:{" "}
          {liq !== null
            ? `${formatEuro(liq)} → ${formatPct(liq / WEALTH_EUR)}`
            : "–"}
        </li>
        <li>
          MDD-Grenze der Stiftung (Formel, nicht Ihre Eingabe):{" "}
          {formatEuro(BERGER_MDD_EUR)} → {formatPct(BERGER_MDD_RATIO)}
        </li>
      </ul>
    </div>
  );
}

function Comparison({
  bedarf,
  horizont,
  infiniteHorizon,
  liquiditaet,
}: {
  bedarf: number;
  horizont: number;
  infiniteHorizon: boolean;
  liquiditaet: number;
}) {
  const samePay = Math.abs(bedarf - BERGER_PAYOUT_EUR) < 1;
  const sameLiq = Math.abs(liquiditaet - BERGER_MDD_EUR) < 1;
  return (
    <section className="card" aria-labelledby="cmp-h">
      <h2 id="cmp-h">Ihre Eingabe gegen Berger-Soll</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Größe</th>
              <th>Ihre Eingabe</th>
              <th>Berger-Soll</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Jährlicher Bedarf</td>
              <td>
                {formatEuro(bedarf)} ({formatPct(bedarf / WEALTH_EUR)})
              </td>
              <td>
                {formatEuro(BERGER_PAYOUT_EUR)} ({formatPct(BERGER_PAYOUT_RATIO)})
              </td>
            </tr>
            <tr>
              <td>Horizont</td>
              <td>{formatYears(horizont, infiniteHorizon)}</td>
              <td>unendlich – die jährliche Pflicht bleibt</td>
            </tr>
            <tr>
              <td>Liquidität 12M</td>
              <td>
                {formatEuro(liquiditaet)} ({formatPct(liquiditaet / WEALTH_EUR)})
              </td>
              <td>
                {formatEuro(BERGER_MDD_EUR)} als harte MDD-Größe (
                {formatPct(BERGER_MDD_RATIO)})
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        {samePay && sameLiq
          ? "Ihre Zahlen entsprechen dem Berger-Soll. Der Horizont ändert die jährliche Ausschüttung nicht."
          : "Abweichungen sind zulässig – dann gilt Ihre Rendite-Linie zusätzlich zur Berger-Linie von 3,00 %. Die MDD-Linie bleibt 10,00 %."}
      </p>
    </section>
  );
}

function Verdict({ modelOk, locked }: { modelOk: boolean; locked: boolean }) {
  if (locked) {
    return (
      <div className="verdict idle" aria-live="polite">
        <span className="verdict-k">Zustand</span>
        <span className="verdict-v">gesperrt</span>
        <p>Kein RICHTIG/FALSCH, bevor Sie Zahlen bestätigt haben.</p>
      </div>
    );
  }
  if (modelOk) {
    return (
      <div className="verdict yes" aria-live="polite">
        <span className="verdict-k">Zustand</span>
        <span className="verdict-v">RICHTIG</span>
        <p>
          Der Punkt liegt im zulässigen Bereich. Alle harten Linien sind
          gehalten.
        </p>
      </div>
    );
  }
  return (
    <div className="verdict no" aria-live="polite">
      <span className="verdict-k">Zustand</span>
      <span className="verdict-v">FALSCH</span>
      <p>
        Mindestens eine harte Linie ist verletzt. Die Schraffur und das Kreuz
        am Punkt markieren dasselbe – nicht die Farbe allein.
      </p>
    </div>
  );
}

function Sliders({
  weights,
  onChange,
  modelReturn,
  modelMdd,
  modelLiq,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
  modelReturn: number;
  modelMdd: number;
  modelLiq: number;
}) {
  const rows: { key: keyof Weights; label: string }[] = [
    { key: "rendite", label: "Rendite" },
    { key: "sicherheit", label: "Sicherheit" },
    { key: "liquiditaet", label: "Liquidität" },
  ];
  return (
    <div className="sliders">
      {rows.map((row) => (
        <label key={row.key}>
          <span>
            {row.label}{" "}
            <strong>{formatPctPoints(weights[row.key] * 100)}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(weights[row.key] * 100)}
            onChange={(e) =>
              onChange(setWeight(weights, row.key, Number(e.target.value) / 100))
            }
            aria-valuetext={`${row.label} ${formatPctPoints(weights[row.key] * 100)}`}
          />
        </label>
      ))}
      <p className="hint">
        Summe stets 100&nbsp;%. Modellrendite {formatPct(modelReturn)}, 
        Modell-MDD {formatPct(modelMdd)}, Modell-Liquidität {formatPct(modelLiq)}.
        Annahmen an den Ecken, keine Prognose.
      </p>
    </div>
  );
}

function MarketCorner({ market }: { market: MarketData }) {
  return (
    <div className="market-box">
      <h3>Markt – nicht das Stiftungsziel</h3>
      <p className="hint">
        {market.label}. Die Ecken des Dreiecks nutzen diese Sätze als
        Modellannahme, nicht als Soll der Stiftung.
      </p>
      <ul>
        <li>
          Bund 10J: <strong>{formatPct(market.bundYield)}</strong> ·{" "}
          {formatIsoDate(market.bundAsOf)} · {market.frequency.bundYield}
        </li>
        <li>
          DAX 12M: <strong>{formatPct(market.daxTrailing12m)}</strong> ·{" "}
          {formatIsoDate(market.daxAsOf)} · {market.frequency.daxTrailing12m}
        </li>
        <li>
          Kasse / Einlagefazilität: <strong>{formatPct(market.cashRate)}</strong> ·{" "}
          {formatIsoDate(market.cashAsOf)}
        </li>
      </ul>
    </div>
  );
}
