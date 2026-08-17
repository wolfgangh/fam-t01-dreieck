# FAM T01 – Magisches Dreieck

Interaktives Labor zur Einheit T01, Kurs Financial Markets and Asset Management (FAM), OTH Regensburg.

Fall: Familienstiftung Berger, 12.000.000 €, Ausschüttung 3,00 % = 360.000 €, MDD 10,00 % = 1.200.000 €.

## Start

- Abhängigkeiten: `npm i`
- Entwicklung: `npm run dev`
- Bau: `npm run build` (TypeScript-Check plus Vite, Ordner dist)
- Vorschau: `npm run preview`

## GitHub Pages

`.github/workflows/pages.yml` baut bei Push auf main und veröffentlicht dist/ (upload-pages-artifact und deploy-pages). Quelle im Repository: Settings, Pages, GitHub Actions. vite.config.ts setzt base auf './'.

Kein Remote wird angelegt. Ein Push ist Ihre Entscheidung.

## Didaktische Absicht

1. Situation zuerst (wer, Eurobeträge).
2. HANDWEG: drei Zahlen selbst tippen. Felder nicht mit Kanon-Zahlen vorausgefüllt.
3. Nach Bestätigen: Quoten gegen 12.000.000 € und Berger-Soll. Dann öffnet sich das Dreieck.
4. Drei Slider, Summe 100 %. Harte Linien 3,00 % und 10,00 %. Große Zustände FALSCH / RICHTIG.
5. Marktbox aus public/data/market.json (Beispielstand, EOD/delayed, nicht Berger-Soll). Fehlt die Datei: ruhiger Hinweis, Labor bleibt bedienbar.
6. Zurücksetzen leert und sperrt. Kanon-Zahlen einsetzen füllt 360000 / 10 / 1200000, verlangt weiter das Bestätigen.
7. URL nach Freigabe: bedarf, horizont, liquiditaet, wr, ws, wl.
8. Ein Merksatz, eine Moodle-Aufgabe. Keine Recap-Liste.

Sie-Form. de-DE-Zahlen. Kein Live-Markt-API.

## Daten – nicht für den Handel

public/data/market.json ist ein Beispielstand vom 17.08.2026: Bund 10J 3,20 % (Deutsche Bundesbank BBSSY 10-jährige Bundesanleihe, EOD cached), EZB DFR / Kasse 2,25 %, DAX trailing 12M 10,78 % (Stooq EOD cached, Beispielstand 03.08.2026), delayed true, Frequenz daily/EOD. Markt/EOD/delayed, nicht Berger-Soll.

Lehre, kein Kursfeed. Das Dreieck ist ein Lehr-Modell (Ecken-Drawdowns 30 % / 8 % / 0 %), kein Optimierer.

## Lizenz

CC BY-NC 4.0, Lehre. Siehe LICENSE.

Prof. Dr. Wolfgang Hößl · FAM · Einheit T01
