# FAM – Einheit T01 · Magisches Dreieck

Interaktives Labor zur Vorlesung **Financial Markets and Asset Management (FAM)**, OTH Regensburg, Fakultät Business and Management.

Fall: **Familienstiftung Berger** (12 Mio. €, Ausschüttung 3,00 % = 360.000 €, MDD-Grenze 10,00 % = 1.200.000 €).

Das Labor ersetzt weder die Handrechnung noch Excel. Es hat **ein** bewegliches Modell: das magische Dreieck.

## Pädagogische Absicht

1. Zuerst der **Handweg**. Formeln und drei Profilsätze stehen sichtbar. Studierende tippen eigene Zahlen (Bedarf, Horizont, Liquidität binnen 12 Monaten). Erst nach gültigem Bestätigen öffnet sich das Dreieck.
2. Danach ein Vergleich der Eingabe mit dem Berger-Soll. Keine richtige Animation vor dem Commit.
3. Im Dreieck (Rendite / Sicherheit / Liquidität) verschiebt ein Punkt die Gewichte. Die Summe bleibt 100 %. Harte Linien: Mindestausschüttung 3,00 % und maximaler Drawdown 10,00 %. Wer die Rendite-Ecke drückt, macht Sicherheit oder Liquidität unzulässig – Schraffur, Kreuz und der große Zustand FALSCH / RICHTIG sagen dasselbe.
4. Der Markt-Kasten (Bund-Rendite, DAX 12M) ist **nicht** das Stiftungsziel. Beschriftung: Markt / EOD / verzögert.
5. Abschluss: **eine** Moodle-Aufgabe und **ein** Merksatz. Kein Recap-Stakkato.

Merksatz: Nicht das Produkt bestimmt die Anlage, sondern das Profil.

## Lokal starten

Voraussetzung: Node.js 18 oder neuer.

    npm i && npm run dev

Der Entwicklungsserver zeigt eine lokale URL (üblich: http://localhost:5173/). Im Browser öffnen. Die App läuft vollständig offline aus public/data/market.json.

Produktionstest:

    npm run build
    npm run preview

Der Build muss ohne Fehler durchlaufen. Ausgabe liegt in dist/ und ist statisch (geeignet für GitHub Pages, base: ./ ).

## GitHub Pages

Das Repository ist für https://github.com/wolfgangh/fam-t01-dreieck vorgesehen. Dieses Paket enthält keinen Push und legt kein Remote an.

Typischer Weg nach dem ersten Push:

1. Repository-Settings, Pages, Source: GitHub Actions oder Branch main / Ordner docs.
2. Build: npm ci && npm run build
3. Publish-Ordner: dist.
4. Weil base auf ./ steht, funktionieren auch Projektseiten unter https://wolfgangh.github.io/fam-t01-dreieck/.

Optionale Action später: nach dem Build die Standard-Pages-Actions. Keine Secrets, kein Backend.

## Daten aktualisieren

Datei: public/data/market.json

- bundYield: 10-jährige Bund-Rendite als Dezimalzahl (3,20 % wird 0.032)
- daxTrailing12m: DAX-Gesamtrendite ca. 12 Monate, Dezimalzahl
- cashRate: Einlagefazilität der EZB, Dezimalzahl
- asOf / bundAsOf / daxAsOf / cashAsOf: ISO-Datum
- delayed: in der Lehre stets true
- sources: ehrliche Herkunftstexte

Bund (bevorzugt, öffentlich, ohne Schlüssel):

    https://api.statistiken.bundesbank.de/rest/data/BBSSY/D.REN.EUR.A630.000000WT1010.A?lastNObservations=5

Accept: text/csv. Zeitreihe: Rendite der jeweils jüngsten 10-jährigen Bundesanleihe.

EZB-Konvergenzzins 10J Deutschland (Monat, alternativ):

    https://data-api.ecb.europa.eu/service/data/IRS/M.DE.L.L40.CI.0000.EUR.N.Z?lastNObservations=3&format=csvdata

EZB-Einlagefazilität:

    https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.DFR.LEV?lastNObservations=1&format=csvdata

Die App holt nichts live im Browser. Fehlt die JSON-Datei, bleibt ein eingebetteter Beispielstand sichtbar (kein weißer Tod).

Die DAX-12M-Zahl in der mitgelieferten Datei ist ein datierter Beispielstand (03.08.2026, rund 10,78 %), kein Handels-Feed. Bund 3,20 % vom 17.08.2026 stammt von der Bundesbank-API (Bauzeitpunkt).

Optional später: GitHub Action, die market.json wöchentlich neu schreibt. Keine API-Schlüssel.

## Modellannahmen (sichtbar in der App)

Die drei Ecken sind ein Lehr-Mix, keine Prognose und keine Allokationsempfehlung.

- Rendite-Ecke: DAX 12M, Modell-MDD 30 %, in 12 Monaten verfügbar 15 %
- Sicherheit-Ecke: Bund 10J, Modell-MDD 8 %, verfügbar 60 %
- Liquidität-Ecke: Einlagefazilität, Modell-MDD 0 %, verfügbar 100 %

Gewichte wR + wS + wL = 1. Implizite Größen sind die gewichteten Summen. Zulässig nur, wenn Modellrendite mindestens max(3,00 %, Ihr Bedarf/Vermögen) ist, Modell-MDD höchstens 10,00 % und Modell-Liquidität mindestens Ihre 12-Monats-Quote.

## Barrierefreiheit und Betrieb

- Tastatur: Formular, Regler, Punkt im Dreieck (Pfeiltasten, Umschalt = größerer Schritt), sichtbarer Fokus.
- Information nicht nur über Farbe: Schraffur, Haken/Kreuz, Text RICHTIG / FALSCH.
- Touch: große Trefferflächen (44 px).
- Locale de-DE, Euro, Komma-Dezimalen, Prozente mit zwei Stellen.
- Kein Login, keine Cookies, kein Tracker, keine Analytics.
- CIP-PCs und Mobilgeräte: eine Spalte unter 860 px Breite.

## Lizenz

Siehe LICENSE: Lehre und akademische Nutzung. EOD- und Beispielstände nicht zum Handeln.

## Inhalt, der bewusst fehlt

Kein arithmetisch-geometrisches Mittel, kein Markowitz, kein NovaForge, keine FI-Inv-Personas, keine Dozentenlogistik.
