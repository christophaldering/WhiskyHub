# CaskSense — Arbeitsanweisung für Claude

TypeScript-Monorepo (ESM): `client/` React+Vite · `server/` Express 5 · `shared/` Drizzle-Schema + Zod.
Postgres via Drizzle. Entstanden auf Replit, läuft weiterhin dort — daraus folgen ein paar Eigenheiten, siehe unten.

## Zuerst lesen

| Datei | Wofür |
|---|---|
| `.agents/memory/MEMORY.md` | **Immer zuerst.** Zwölf teuer bezahlte Fallen, jede mit Detaildatei. Verhindert Wiederholungsfehler. |
| `replit.md` | Architektur-Referenz und Checkpoint-Historie. Die inhaltlich dichteste Datei im Repo. |
| `docs/ARCHITEKTUR.md` | Vertiefung. `docs/CHECKPOINTS_ARCHIV.md` für ältere Stände. |
| `routes_list.txt` | Überblick über die API-Endpunkte, ohne `server/routes.ts` zu öffnen. |

## Befehle (verifiziert 28.08.2026)

```bash
npm run dev          # Server + Vite, NODE_ENV=development
npm run check        # tsc — schlägt fehl, das ist erwartet, siehe tsc-Baseline
npm run test:unit    # Vitest, 112 Tests in 9 Dateien, ~8s
npm run test:all     # unit + api + e2e + smoke
npm run build        # tsx script/build.ts
npm run db:push      # drizzle-kit push
```

`npm run test:unit` braucht `DATABASE_URL` gesetzt (Dummy genügt, zwei Tests importieren `server/db.ts`, verbinden aber nie):

```bash
DATABASE_URL=postgresql://ci:ci@localhost:5432/ci_dummy npx vitest run --config vitest.config.ts \
  --exclude "tests/unit/community-access.test.ts"
```

`tests/unit/community-access.test.ts` braucht einen laufenden Server auf Port 5000 und ist deshalb aus der CI ausgeschlossen. Kein echter Unit-Test.

## Zwei Fallen bei `npm install`

**1. Das Lockfile zeigt auf Replits internen Proxy.** 142 `resolved`-URLs stehen auf `http://package-firewall.replit.local/npm/…` — außerhalb von Replit nicht erreichbar, `npm install` bricht mit `E405` ab. Vor dem Install umschreiben (genau das tut auch die CI):

```bash
sed -i 's|http://package-firewall.replit.local/npm/|https://registry.npmjs.org/|g' package-lock.json
```

Diese Änderung **nicht committen** — Replit schreibt sie beim nächsten eigenen Install ohnehin zurück.

**2. `tsc` braucht mehr Heap als Node per Default gibt.** Bei dieser Codebasegröße läuft `tsc --noEmit` in einen OOM und meldet dann fälschlich *null* Fehler. Immer mit Limit aufrufen:

```bash
NODE_OPTIONS="--max-old-space-size=6144" npx tsc
```

## tsc-Baseline: 413 — Ratsche, nur abwärts

`.github/workflows/ci.yml` hält `TSC_BASELINE: 413`. Die CI schlägt fehl, sobald die Fehlerzahl darüber steigt. Verteilung: 298 in `server/routes.ts`, 20 in `server/storage.ts`, Rest verstreut.

- Neuer Code darf **keinen** neuen Typfehler erzeugen.
- Wer Fehler abbaut, senkt die Zahl in `ci.yml` im selben PR.
- Die Zahl nie erhöhen, um einen Build grün zu bekommen.

## Architekturregeln

- **Alle Features gehören nach `client/src/labs/`.** `labs-v2/`, `labs-apple/`, `components/m2/`, `pages/m2/`, `v2/`, `lab-dark/` sind archiviert und gelöscht. Nicht neu anlegen, nicht referenzieren. Legacy-Routen leiten über `SmartRedirectToLabs` in `App.tsx` um.
- Theme-Tokens: `client/src/labs/theme/tokens.ts` und `labs-theme.css`. Keine Hex-Werte direkt in Komponenten.
- Schema-Änderungen immer in `shared/schema.ts` **plus** idempotente Startup-Migration in `server/index.ts` (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`). Replits Deploy-Migrator ist nicht verlässlich — insbesondere verschluckt er `gin_trgm_ops`, weshalb alle Trigram-Indexe von `server/search-init.ts` angelegt werden.
- i18n: jede neue UI-Zeichenkette in `client/src/lib/i18n.ts` in **beiden** Sprachblöcken (EN + DE). Sprachmischung ist ein wiederkehrender Fehler.

## Stehende Gestaltungsvorgabe (bis Widerruf)

Die LandingPage (`client/src/pages/landing-new.tsx`, Route `/`) bleibt im Stil der Tasting-Story (`client/public/tasting-story/template.html`): Display `EB Garamond` (Italic für narrative Akzente), Body `Inter`, Amber `#C9A961` (dim `#8E7640`), Filmkorn-Overlay (SVG `fractalNoise`, opacity ~0.04, `mix-blend-mode: overlay`), Eyebrow-Labels als weit ausgesperrte Caps in Amber. Bei jeder Änderung dieses Set bewahren.

## Große Dateien — mit Bedacht anfassen

`server/routes.ts` 30.557 Zeilen · `client/src/lib/i18n.ts` 20.146 · `server/storage.ts` 5.452 · `shared/schema.ts` 1.886.

Nie ganz einlesen. Mit `grep`/`Glob` die Stelle suchen, gezielt lesen, gezielt editieren. Neue Endpunkte gehören perspektivisch in eigene Module (`server/funnel-routes.ts` ist das Vorbild), nicht ans Ende von `routes.ts`.

## Do not

- Keine Whiskybase-ID, kein Score, keine Bewertung erfinden oder schätzen. Wenn eine Quelle fehlt: `null` und ehrlich melden. Siehe `claude/WB-ID-Befund` im Projekt.
- Keine echten Nutzerdaten in Tests, Fixtures oder Logs. `journal_entries` enthält private Einträge — der Explore-Endpunkt filtert deshalb auf `source="casksense-database"`.
- Keine Tracking-Cookies, kein localStorage für Tracking, keine IP-Speicherung, kein Fingerprinting. Das Funnel-System ist bewusst cookie-frei und rein aggregiert; diese Garantie steht in der Datenschutzerklärung.
- `attached_assets/` (1,2 GB) nicht erweitern. Neue Binärdateien gehören in Object Storage, nicht ins Repo.
- Editor-Temporärdateien nicht committen. `server/.routes.ts.WBUI4sak_NxMRc-48DOp7~` liegt versehentlich im Repo und sollte gelöscht werden.

## Arbeitsweise

- Vor größeren Änderungen erst einen Plan vorlegen, nicht sofort implementieren.
- Nach jeder Änderung: `NODE_OPTIONS="--max-old-space-size=6144" npx tsc` und die Unit-Tests laufen lassen. Behauptungen über Funktionsfähigkeit nur nach tatsächlicher Ausführung.
- Neue Erkenntnisse, die künftige Sessions vor einem Fehler bewahren, als Datei in `.agents/memory/` ablegen und in `MEMORY.md` verlinken — im selben Format wie die bestehenden Einträge.
- Antworten und Commit-Messages auf Deutsch, Code und Bezeichner auf Englisch.
