const eur0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const pct2 = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num2 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateDe = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

export function formatEuro(value: number): string {
  if (!Number.isFinite(value)) return "– €";
  return eur0.format(value);
}

export function formatEuroReadable(value: number): string {
  if (!Number.isFinite(value)) return "– €";
  const abs = Math.abs(value);
  if (abs >= 1_000_000 && abs % 1_000_000 === 0) {
    const mio = value / 1_000_000;
    const mioTxt = new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: mio % 1 === 0 ? 0 : 1,
    }).format(mio);
    return `${mioTxt} Mio. €`;
  }
  return formatEuro(value);
}

export function formatPct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "– %";
  return pct2.format(ratio);
}

export function formatPctPoints(percentValue: number): string {
  if (!Number.isFinite(percentValue)) return "– %";
  return `${num2.format(percentValue)} %`;
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+02:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return dateDe.format(d);
}

export function formatYears(years: number, infinite: boolean): string {
  if (infinite || years >= 80) return "unendlich";
  if (years === 1) return "1 Jahr";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(years)} Jahre`;
}
