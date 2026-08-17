import "./style.css";
import {
  formatEuro,
  formatPct,
  formatPctPoints,
  formatYears,
  parseDeNumber,
} from "./format";
import { loadMarket, type MarketData, type MarketStatus } from "./market";
import {
  BERGER_LIQ_EUR,
  BERGER_LIQ_RATIO,
  BERGER_PAYOUT_EUR,
  BERGER_PAYOUT_RATIO,
  DEFAULT_WEIGHTS,
  WEALTH_EUR,
  bindTrianglePointer,
  evaluateModel,
  renderTriangleMarkup,
  setWeight,
  verdictCopy,
  weightLabel,
  type Weights,
} from "./triangle";

type FormValues = {
  bedarf: number;
  horizont: number;
  liquiditaet: number;
};

const CANON: FormValues = {
  bedarf: 360_000,
  horizont: 10,
  liquiditaet: 360_000,
};

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const ui = {
  form: must<HTMLFormElement>("handweg-form"),
  bedarf: must<HTMLInputElement>("bedarf"),
  horizont: must<HTMLInputElement>("horizont"),
  liquiditaet: must<HTMLInputElement>("liquiditaet"),
  formError: must<HTMLParagraphElement>("form-error"),
  formHint: must<HTMLParagraphElement>("form-hint"),
  compare: must<HTMLElement>("compare"),
  compareBody: must<HTMLElement>("compare-body"),
  compareNote: must<HTMLElement>("compare-note"),
  lock: must<HTMLElement>("triangle-lock"),
  host: must<HTMLElement>("triangle-host"),
  region: must<HTMLElement>("triangle-region"),
  sliderR: must<HTMLInputElement>("slider-r"),
  sliderS: must<HTMLInputElement>("slider-s"),
  sliderL: must<HTMLInputElement>("slider-l"),
  valR: must<HTMLElement>("val-r"),
  valS: must<HTMLElement>("val-s"),
  valL: must<HTMLElement>("val-l"),
  verdict: must<HTMLElement>("verdict"),
  marketBox: must<HTMLElement>("market-box"),
  mixCard: must<HTMLElement>("mix-card"),
  footerMeta: must<HTMLElement>("footer-meta"),
  reset: must<HTMLButtonElement>("reset"),
  canon: must<HTMLButtonElement>("canon"),
};

let unlocked = false;
let values: FormValues | null = null;
let weights: Weights = { ...DEFAULT_WEIGHTS };
let market: MarketData | null = null;

function readForm(): FormValues | string {
  const bedarf = parseDeNumber(ui.bedarf.value);
  const horizont = parseDeNumber(ui.horizont.value);
  const liquiditaet = parseDeNumber(ui.liquiditaet.value);
  if (bedarf === null || horizont === null || liquiditaet === null) {
    return "Bitte alle drei Felder ausfüllen. Zahlen im deutschen Format: 360000 oder 360.000.";
  }
  if (!(bedarf > 0)) return "Der jährliche Euro-Bedarf muss größer als 0 sein.";
  if (!(horizont > 0) || horizont > 120) {
    return "Der Horizont muss zwischen 1 und 120 Jahren liegen.";
  }
  if (!(liquiditaet > 0)) return "Der Liquiditätsbedarf muss größer als 0 sein.";
  return { bedarf, horizont, liquiditaet };
}

function writeUrl(): void {
  if (!unlocked || !values) {
    const clean = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", clean);
    return;
  }
  const q = new URLSearchParams();
  q.set("bedarf", String(Math.round(values.bedarf)));
  q.set("horizont", String(Math.round(values.horizont * 10) / 10));
  q.set("liquiditaet", String(Math.round(values.liquiditaet)));
  q.set("wr", String(Math.round(weights.wr * 100)));
  q.set("ws", String(Math.round(weights.ws * 100)));
  q.set("wl", String(Math.round(weights.wl * 100)));
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${q.toString()}${window.location.hash}`,
  );
}

function readUrl(): { values: FormValues; weights: Weights } | null {
  const q = new URLSearchParams(window.location.search);
  if (!q.has("bedarf") || !q.has("horizont") || !q.has("liquiditaet")) return null;
  const bedarf = Number(q.get("bedarf"));
  const horizont = Number(q.get("horizont"));
  const liquiditaet = Number(q.get("liquiditaet"));
  if (!(bedarf > 0) || !(horizont > 0) || !(liquiditaet > 0)) return null;
  const wr = Number(q.get("wr") ?? "33") / 100;
  const ws = Number(q.get("ws") ?? "33") / 100;
  const wl = Number(q.get("wl") ?? "34") / 100;
  return {
    values: { bedarf, horizont, liquiditaet },
    weights: { wr, ws, wl },
  };
}

function fillInputs(v: FormValues | null): void {
  if (!v) {
    ui.bedarf.value = "";
    ui.horizont.value = "";
    ui.liquiditaet.value = "";
    return;
  }
  ui.bedarf.value = String(Math.round(v.bedarf));
  ui.horizont.value = String(v.horizont);
  ui.liquiditaet.value = String(Math.round(v.liquiditaet));
}

function renderCompare(v: FormValues): void {
  const needRatio = v.bedarf / WEALTH_EUR;
  const liqRatio = v.liquiditaet / WEALTH_EUR;
  ui.compareBody.innerHTML = `
    <tr>
      <th scope="row">Jährlicher Euro-Bedarf</th>
      <td>${formatEuro(v.bedarf)} · ${formatPct(needRatio)} von 12.000.000 €</td>
      <td>${formatEuro(BERGER_PAYOUT_EUR)} · ${formatPct(BERGER_PAYOUT_RATIO)}</td>
    </tr>
    <tr>
      <th scope="row">Horizont</th>
      <td>${formatYears(v.horizont, v.horizont >= 80)}</td>
      <td>Unendlich für die Stiftung. Im Handweg rechnen Sie mit 10 Jahren.</td>
    </tr>
    <tr>
      <th scope="row">Liquidität binnen 12 Monaten</th>
      <td>${formatEuro(v.liquiditaet)} · ${formatPct(liqRatio)} von 12.000.000 €</td>
      <td>${formatEuro(BERGER_LIQ_EUR)} · ${formatPct(BERGER_LIQ_RATIO)}</td>
    </tr>
  `;
  let note: string;
  if (Math.abs(needRatio - BERGER_PAYOUT_RATIO) < 0.0005 && Math.abs(liqRatio - BERGER_LIQ_RATIO) < 0.0005) {
    note =
      "Ihre Quoten treffen das Berger-Soll. Die durchgezogenen Linien im Dreieck bleiben hart: 3,00 % Mindest-Rendite und 10,00 % maximaler Drawdown.";
  } else if (needRatio > BERGER_PAYOUT_RATIO + 0.0005) {
    note =
      "Ihr Euro-Bedarf liegt über dem Berger-Soll. Die durchgezogene Linie im Dreieck bleibt 3,00 %. Eine höhere Ausschüttung müsste der Stiftungsrat extra beschließen.";
  } else {
    note =
      "Ihre Quoten weichen vom Berger-Soll ab. Vergleichen Sie die Spalten, bevor Sie das Dreieck verschieben. Die durchgezogenen Linien bleiben 3,00 % und 10,00 %.";
  }
  if (v.horizont >= 80) {
    note += " Ein Horizont von 80 Jahren oder mehr erscheint in der Tabelle als unendlich.";
  }
  ui.compareNote.textContent = note;
}

function setSlidersEnabled(on: boolean): void {
  ui.sliderR.disabled = !on;
  ui.sliderS.disabled = !on;
  ui.sliderL.disabled = !on;
  ui.region.setAttribute("aria-disabled", on ? "false" : "true");
}

function formatPctPlain(percentValue: number): string {
  return formatPctPoints(percentValue).replace(/\s*%$/, "");
}

function paintMix(model: ReturnType<typeof evaluateModel>): void {
  if (!unlocked) {
    ui.mixCard.hidden = true;
    return;
  }
  const rendite = formatPctPlain(weights.wr * 100);
  const sicherheit = formatPctPlain(weights.ws * 100);
  const liquiditaet = formatPctPlain(weights.wl * 100);
  const modellRendite = formatPctPlain(model.impliedReturn * 100);
  const modellDrawdown = formatPctPlain(model.impliedMdd * 100);
  ui.mixCard.hidden = false;
  ui.mixCard.innerHTML = `
    <h2 id="mix-title">Ihre Position</h2>
    <p>An dieser Stelle halten Sie ${rendite} Prozent Aktien, ${sicherheit} Prozent Bund und ${liquiditaet} Prozent Kasse.</p>
    <p>Die modellierte Rendite an diesem Punkt beträgt ${modellRendite} Prozent. Sie mischt die drei Marktgrößen Aktien, Bund und Kasse, die unter Markt stehen.</p>
    <p>Der modellierte Drawdown an diesem Punkt beträgt ${modellDrawdown} Prozent. Drawdown ist der Weg vom Höchststand nach unten, der größte zwischenzeitliche Verlust.</p>
    <p>Die Liquidität an diesem Punkt ist der Kasse-Anteil: ${liquiditaet} Prozent. Dieser Teil soll ohne Notverkauf verfügbar sein.</p>
  `;
}

function paintTriangle(): void {
  const data = market;
  if (!data || !values) {
    ui.host.innerHTML = "";
    ui.mixCard.hidden = true;
    return;
  }
  const model = evaluateModel(weights, data, values.liquiditaet, values.bedarf);
  ui.host.innerHTML = renderTriangleMarkup(weights, model, data, !unlocked);
  paintMix(model);
  const v = verdictCopy(model);
  ui.verdict.className = `verdict${v.ok ? "" : " is-false"}`;
  ui.verdict.innerHTML = `<span class="verdict-word">${v.word}</span><p>${v.text}</p>`;
  ui.verdict.hidden = !unlocked;
  ui.sliderR.value = String(Math.round(weights.wr * 100));
  ui.sliderS.value = String(Math.round(weights.ws * 100));
  ui.sliderL.value = String(Math.round(weights.wl * 100));
  ui.valR.textContent = formatPct(weights.wr);
  ui.valS.textContent = formatPct(weights.ws);
  ui.valL.textContent = formatPct(weights.wl);
  ui.sliderR.setAttribute("aria-valuetext", weightLabel(weights));
}

function unlock(v: FormValues, nextWeights?: Weights): void {
  values = v;
  if (nextWeights) weights = nextWeights;
  unlocked = true;
  ui.compare.classList.remove("hidden");
  renderCompare(v);
  ui.lock.hidden = true;
  setSlidersEnabled(true);
  paintTriangle();
  writeUrl();
}

function lockEmpty(): void {
  unlocked = false;
  values = null;
  weights = { ...DEFAULT_WEIGHTS };
  fillInputs(null);
  ui.formError.textContent = "";
  ui.formHint.textContent = "";
  ui.compare.classList.add("hidden");
  ui.lock.hidden = false;
  ui.verdict.hidden = true;
  ui.mixCard.hidden = true;
  setSlidersEnabled(false);
  if (market) {
    const dummy: FormValues = CANON;
    const model = evaluateModel(weights, market, dummy.liquiditaet, dummy.bedarf);
    ui.host.innerHTML = renderTriangleMarkup(weights, model, market, true);
  }
  writeUrl();
}

function renderMarket(data: MarketData, status: MarketStatus): void {
  ui.footerMeta.textContent = "Beispielstand 17.08.2026. Nicht das Berger-Soll.";
  if (status === "loading") {
    ui.marketBox.innerHTML = `<p>Marktdaten werden gelesen.</p>`;
    return;
  }
  if (status === "missing") {
    ui.marketBox.innerHTML = `
      <p class="market-error">Die Marktdatei fehlt oder ist unlesbar. Das Labor arbeitet mit dem eingebetteten Beispielstand weiter. Es werden keine aktuellen Kurse geladen. Eingebetteter Stand: Bund ${formatPctPlain(data.bundYield * 100)} Prozent. DAX der letzten zwölf Monate ${formatPctPlain(data.daxTrailing12m * 100)} Prozent. EZB Deposit Facility Rate ${formatPctPlain(data.cashRate * 100)} Prozent.</p>
    `;
    return;
  }
  ui.marketBox.innerHTML = `
    <p>Was Sie hier sehen, ist ein Beispielstand, kein Auftrag der Stiftung Berger. Die drei Zahlen füllen die Ecken des Lehr-Modells. Sie ersetzen nicht das Berger-Soll von 3,00 Prozent Ausschüttung und 10,00 Prozent Drawdown.</p>
    <p>Die Bund-Rendite beträgt ${formatPctPlain(data.bundYield * 100)} Prozent. Sie steht an der Sicherheits-Ecke. Quelle: Deutsche Bundesbank, Reihe BBSSY, 10-jährige Bundesanleihe. Schlusskurs des Tages, gespeichert. Beispielstand 17.08.2026.</p>
    <p>Die DAX-Rendite der letzten zwölf Monate beträgt ${formatPctPlain(data.daxTrailing12m * 100)} Prozent. Sie steht an der Aktien-Ecke. Quelle: Stooq, Schlusskurs des Tages, gespeichert. Diese Zwölfmonatszahl gilt zum 03.08.2026.</p>
    <p>Die Kasse folgt dem Einlagensatz der EZB, dem Deposit Facility Rate. Er beträgt ${formatPctPlain(data.cashRate * 100)} Prozent. Er steht an der Liquiditäts-Ecke. Beispielstand 17.08.2026.</p>
    <p>Die drei Sätze ersetzen keine Abfrage bei Bundesbank oder EZB. Sie sind nicht für Handelsentscheidungen gedacht.</p>
  `;
}

function onSlider(key: keyof Weights, raw: string): void {
  if (!unlocked) return;
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  weights = setWeight(weights, key, n / 100);
  paintTriangle();
  writeUrl();
}

async function boot(): Promise<void> {
  const loaded = await loadMarket();
  market = loaded.data;
  renderMarket(market, loaded.status);

  ui.host.tabIndex = 0;
  bindTrianglePointer(
    ui.host,
    () => !unlocked,
    (w) => {
      if (!unlocked) return;
      weights = w;
      paintTriangle();
      writeUrl();
    },
    () => weights,
  );

  ui.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const parsed = readForm();
    if (typeof parsed === "string") {
      ui.formError.textContent = parsed;
      ui.formHint.textContent = "";
      return;
    }
    ui.formError.textContent = "";
    ui.formHint.textContent = "";
    unlock(parsed);
  });

  ui.reset.addEventListener("click", () => {
    lockEmpty();
  });

  ui.canon.addEventListener("click", () => {
    fillInputs(CANON);
    ui.formError.textContent = "";
    ui.formHint.textContent =
      "Die Berger-Zahlen stehen in den Feldern. Bestätigen Sie das Profil. Das Dreieck öffnet sich erst danach.";
    ui.bedarf.focus();
  });

  ui.sliderR.addEventListener("input", () => onSlider("wr", ui.sliderR.value));
  ui.sliderS.addEventListener("input", () => onSlider("ws", ui.sliderS.value));
  ui.sliderL.addEventListener("input", () => onSlider("wl", ui.sliderL.value));

  const fromUrl = readUrl();
  if (fromUrl) {
    fillInputs(fromUrl.values);
    unlock(fromUrl.values, fromUrl.weights);
  } else {
    lockEmpty();
  }
}

void boot();
