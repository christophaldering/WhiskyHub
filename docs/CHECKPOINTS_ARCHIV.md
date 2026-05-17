# CaskSense — Checkpoint-Archiv

Ausgelagert aus `replit.md` am 17.05.2026 zur Token-Reduktion.
Cutoff: alle Checkpoints **vor dem 25.04.2026** stehen hier.
Neuere Checkpoints bleiben in `replit.md`.

---

## Checkpoint: "Score-Clamp" (21.04.2026)
Task #787: Normalisierte Scores (`normalized_score`, `normalized_nose`, `normalized_taste`, `normalized_finish`) werden jetzt durchgaengig auf [0,100] geklemmt. Neuer Helper `shared/score-utils.ts` (`clampNormalized`) wird in allen `?? overall * norm`-Pfaden in `server/storage.ts`, `server/routes.ts`, `server/archive-lifecycle.ts` angewendet. `normalizeDim` (Rating-Submit) und `normDim` (CSV-Import) clampen Roh- und normalisierten Wert. Frontend `ScoreBadge` und `BarRow` in `ExploreStatistics.tsx` clampen als letzte Verteidigung; `LabsHistoricalDetail` und `LabsTasteAnalytics` ebenso. Startup-Migration in `server/index.ts` korrigiert bestehende DB-Zeilen (idempotent), zusaetzliche SQL-Datei `migrations/0023_clamp_normalized_scores.sql`.

## Checkpoint: "Daily Report" (18.04.2026)
Automatisierter Tagesbericht per Mail an christoph.aldering@googlemail.com:
- **Modul `server/daily-report.ts`**: Sammelt Metriken (neue Teilnehmer/Tastings/Bewertungen/Journal-Eintraege, Page Views, eindeutige Besucher, Sessions, Top-Seiten, 7-Tage-Vergleich, Gesamtbestaende) und versendet stilisiertes HTML-Mail via Gmail-Connector.
- **Scheduler**: `startDailyReportScheduler()` in `server/index.ts` prueft alle 5 min ab 08:00 Europe/Berlin und sendet einmal pro Tag.
- **Idempotenz**: Neue Tabelle `daily_report_log` (PK = report_date) verhindert Doppelversand bei Instanz-Restarts via `INSERT ... ON CONFLICT DO NOTHING`.
- **Admin-Endpoints**: `POST /api/admin/daily-report/send` (manueller Trigger) und `GET /api/admin/daily-report/preview` (HTML-Vorschau im Browser) — beide nur fuer role=admin.
- **Override**: Empfaenger via `ADMIN_REPORT_EMAIL`-Env konfigurierbar.

## Checkpoint: "Feature-Tag" (17.04.2026)
Grosser Feature-Tag mit vielen UX-Verbesserungen umgesetzt und deployed:
- **Destillerie-Gruppierung**: Whiskys in Entdecken nach Destillerie gruppiert dargestellt.
- **Bibliothek-Tab-Kachel**: Neue Kachel im Bibliothek-Tab fuer schnellen Zugriff.
- **Info-Icons**: Info-Icons mit Erklaerungen an relevanten Stellen ergaenzt.
- **Connoisseur-Fix**: Anzeige- und Berechnungsfehler im Connoisseur-Bereich behoben.
- **Draft-Terminologie**: Einheitliche Begrifflichkeit fuer Entwuerfe ueber alle Flows.
- **Post-Rating-Flow**: Verbesserter Ablauf direkt nach Abgabe einer Bewertung.
- **Sammlung i18n**: DE/EN-Uebersetzungen im Sammlungsbereich vervollstaendigt.
- **Import-Fehlermeldung**: Verstaendlichere Fehlermeldungen beim Import.
- **Naechster-Draft-Button**: Button zum direkten Wechsel auf den naechsten Entwurf.

## Checkpoint: "Stabiler Tag" (16.04.2026)
Heute wieder einige wesentliche Funktionen weiterentwickelt — Programm lief bisher stabil! Tasks #565 (PIN/Passwort-Limit von 6 auf 64 Zeichen), #566 (Profil-Indizes nach Journal-Edit neu berechnen) und weitere Verbesserungen abgeschlossen und deployed.

## Checkpoint: "Vor Sprachanpassung" (11.04.2026)
Nav-Restructure abgeschlossen: Pairings + Benchmark von Meine Welt nach Entdecken verschoben, CommunityInsights von Entdecken nach Circle verschoben, BackLinks auf Root-Tabs entfernt, isActive-States fuer alle Routen korrigiert. Production deployed.

## Checkpoint: "iOS Capacitor API Fix" (05.04.2026)
iOS-App konnte nicht einloggen weil API-Calls relativ (`/api/...`) waren und im Capacitor-WebView ins Leere liefen. Fix: `client/src/lib/native.ts` mit Plattform-Detection (`@capacitor/core`), globalem Fetch-Interceptor (leitet `/api/...` auf `https://casksense.com/api/...` um wenn nativ), und `apiUrl()` Helper. CORS-Middleware in `server/index.ts` fuer Capacitor-Origins (`capacitor://localhost`, `ionic://localhost`, `http(s)://localhost:*`). Browser bleibt unveraendert (relative Pfade). Auth ist Header-basiert (`x-participant-id`), keine Cookie/Session-Probleme.

## Checkpoint: "Balance-Dimension entfernt" (04.04.2026)
Task #564: Balance-Spalte aus `ratings`-Tabelle in `shared/schema.ts` entfernt. DB-Migration ausgefuehrt. Bewertungsdimensionen jetzt nur noch Nose/Taste/Finish/Overall. Alle Doku-Dateien (replit.md, CaskSense-Projektstand.md, docs/CASKSENSE_DOCUMENTATION.md, docs/v2-notes.md, EXPORT_AUDIT.md, SYSTEM_STATUS.md) aktualisiert. Backward-kompatible Regex-Parser in LabsTasteDrams.tsx bleiben fuer alte Daten erhalten.

## Stable Milestone: "Feinschliff" (04.04.2026)
Feinheiten-Session: Tasks #540-#542 gemerged und deployed. Solo-Rating Speicher-Flow repariert (Draft-Save bleibt im Flow, POST/PATCH-Logik), Rating-Flow Auto-Scroll zu gewaehltem Abschnitt, Finalize-Button erst nach Overall-Bewertung. Alle Flows durchgetestet und stabil. Production live auf casksense.com.

## Stable Milestone: "Es laeuft" (28.03.2026)
All core features operational. Tasks #519-#539 merged and deployed. Explore page restructured (Bibliothek + paginated whisky list), Solo draft flow, Connoisseur PDF fix, Navigation restructure (Explore + Bibliothek), Community Insights, Deep-Rate fix, Geschmacksradar histories, Drams individual scores, Profile breakdowns crash fix, Benchmark UX cleanup. Production stable on casksense.com.

## Milestone: 23. Maerz 2026, 12:30 Uhr
Checkpoint nach intensiver Entwicklungsphase. 40+ Tasks abgeschlossen. Alles fast fertig.

### Auto-Handout Generator (Task #701)
Hosts can auto-generate a research-backed handout per tasting. Implementation:
- **Schema** (`shared/schema.ts`): three new tables — `distillery_profiles` (per-distillery encyclopedia cache, keyed by lowercased name), `whisky_profiles` (per-bottling cache, keyed by `wb:<id>` or `<distillery>|<name>`), and `tasting_auto_handouts` (per-tasting binding with selection, chapter order, image picks, language/tone/length, visibility). Shared JSON types: `AutoHandoutChapter`, `AutoHandoutSource`, `AutoHandoutImage`, `AutoHandoutSelection`, plus `AUTO_HANDOUT_CHAPTER_TYPES` constant (8 distillery chapters: Steckbrief, Geschichte, Stil, weniger_bekannt, Geheimtipps, Stories, Aktuelles, Kontroversen — and 4 whisky chapters: Steckbrief, Besonderes, Sensorik, Sammler).
- **Server pipeline** (`server/auto-handout/`): `research.ts` fetches Wikipedia DE+EN summaries + Commons media-list for images, plus web search via existing `lib/onlineSearch.ts` for blogs/news/forums, with timeout-safe fetch and HTML stripping. `condense.ts` calls OpenAI per chapter with structured JSON prompts that enforce inline `[n]` citations and a `confidence` field (high|medium|low). `index.ts` orchestrates ensure/refresh of profiles, per-chapter regeneration, and `assembleHandout(tastingId)` which joins tasting whiskies → cached profiles → ordered chapter refs with the host's selection overrides applied.
- **Routes** (`server/routes.ts`): `GET/POST/PATCH/DELETE /api/tastings/:id/auto-handout`, plus `/auto-handout/generate` (background job; returns immediately and polls), `/auto-handout/regenerate-chapter`, `/auto-handout/refresh-distillery`, and `GET /api/distillery-profiles` for the source library. New AI feature id `auto_handout` registered in `ai-settings.ts`.
- **Frontend**: `AutoHandoutManager` (host UI) renders next to the existing `TastingHandoutManager` in `LabsHost.tsx` — language/tone/length/visibility selectors, generate button with progress polling, per-chapter checkbox/edit/regenerate (tone+length), distillery image picker with license hints, and PDF export. `AutoHandoutViewer` renders in `LabsLive.tsx` as a collapsible "Zusatzinfos der App" block below any host-uploaded handout (the upload remains primary content). Visibility supports `always` or `after_first_reveal`.
- **PDF** (`client/src/components/auto-handout-pdf.ts`): jsPDF generator grouped by subject with per-group sources, confidence markers (`~`/`(?)`), and a closing notice page about source verification. Uses `saveJsPdf` from `lib/pdf.ts`.
