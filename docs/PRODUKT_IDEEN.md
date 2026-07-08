# CaskSense — Produktideen-Backlog

> Angelegt 08.07.2026 nach Abschluss der Roadmap (Sicherheits-Audit, CI-Einführung,
> UI-Fixes, Wording-Vereinheitlichung). Ideen aus einer Review-Session mit Claude.
> Status: bewusst NICHT terminiert. Das Instrument darf erst messen.
> Vor jeder Umsetzung gilt der Workflow: prüfen → Safety-Tag → Hardprompt → CI.

## Leitgedanke

Die Infrastruktur ist dem Produkt voraus: Consent-System, Vokabular-Tracking mit
Modell-Label, Sensorische Signatur, k-anonyme Community-Vergleiche und die
Retaste-Mechanik liegen bereit und könnten mehr erzählen. Alle Ideen unten bauen
auf Vorhandenem auf und respektieren den Nordstern (nichts prägt den ersten
ehrlichen Eindruck am Glas vor).

## Die Ideen

### 1. Blind-Selbsttest — „Erkennst du dich wieder?"  (Favorit)
Einen bereits verkosteten Dram BLIND erneut verkosten — die App weiß welcher,
der Taster nicht. Erst nach dem ehrlichen Eindruck: Reveal + Gegenüberstellung
beider Verkostungen.
- Empirisch: Test-Retest-Reliabilität des eigenen Gaumens, spielerisch verpackt.
- Markt: misst kein anderes Tasting-Produkt.
- Nordstern: maximal konform — man weiß nicht einmal, was im Glas ist.
- Aufwand: klein; Retaste-Mechanik (cs_retaste_context) und Timeline
  (DramHistoryTimeline) existieren, es fehlt im Kern der Blind-Wrapper + Reveal.

### 2. Kalibrier-Anker
Ein persönlicher Referenz-Dram, z.B. quartalsweise wieder verkostet. Trennt
Gaumen-Entwicklung von Skalen-Drift — ohne Anker ist jede Verlaufsanalyse mit
Drift kontaminiert. Instrumente kalibriert man; CaskSense ist ein Instrument.

### 3. Sensorik-Experimente als Host-Werkzeug
Host-Modul „Experiment des Abends" mit strukturierten Mini-Designs:
- derselbe Whisky doppelt-blind in zwei Gläsern (Gruppen-Reliabilität),
- mit/ohne Wasser, zwei Temperaturen.
Erzeugt Gold-Standard-Daten statt Beobachtungsdaten; Kendall's W bekommt
experimentelles Futter. Ohne Audio → sauber an der §201-StGB-Grenze vorbei.

### 4. Erwartung vs. Eindruck
NACH dem ersten ehrlichen Eindruck eine optionale Mikro-Frage: „Was hättest du
bei diesem Etikett/Preis erwartet?" Über Monate entsteht die persönliche
Halo-Landkarte (Alterszahl, Destillerie, Preis). Reihenfolge schützt den
heiligen Moment — die Frage kommt IMMER erst nach dem Eindruck.

### 5. Wahrnehmungs-Verwandtschaften
k-anon-Infrastruktur im Nachgang sozial nutzen: „Du und [Freund] — 85%
Übereinstimmung bei Sherry-Fässern, bei Torf trennt ihr euch." Keine Rangliste,
kein Wettbewerb — eine Landkarte der Gaumen im Freundeskreis.

### 6. Der Jahresring
Einmal jährlich destilliert Cooper aus Story-Generierung, Vokabular-Leveln,
Signaturen und Timelines einen „Jahresring": Wortschatz-Reifung, entdeckte
Aromen, Signatur-Verschiebung. Spotify-Wrapped-Muster, aber mit Substanz —
in Cormorant auf #0B0906.

## Empfohlene Reihenfolge (falls es je losgeht)
1 (Blind-Selbsttest) → 2 (Anker, methodisch verwandt) → 6 (Jahresring, reine
Nachgang-Synthese) → 4 → 5 → 3 (größter Aufwand, braucht Host-UI).
