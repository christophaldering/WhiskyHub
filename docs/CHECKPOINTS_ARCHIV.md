# CaskSense — Checkpoint-Archiv

Ausgelagert aus `replit.md` (mehrfach gepflegt). Letzte Erweiterung: 17.05.2026.
Cutoff: alle Checkpoints **vor dem 28.04.2026** stehen hier.
Neuere Checkpoints bleiben in `replit.md`.

---

## Checkpoint: "Live-Präsentation Story-Look" (26.04.2026)
Task #1041: Die Live-Präsentation (Labs → „Präsentieren", `client/src/labs/pages/LabsResultsPresent.tsx`) übernimmt jetzt die elegante CaskSense-Story-Optik (Playfair Display, Cream `#f0ebe3`, Gold `#c8a97e`).
- **Design-Tokens** als `STORY`-Konstante im Modul: cream/creamSecondary/creamMuted für Text-Hierarchie, gold/goldDark/goldBorder/goldTint für Akzente, plus `bodyFont` und Letter-Spacing-Defaults.
- **Atmosphären-Layer**: Wiederverwendbarer `<StoryGlowBackdrop>` (radialer goldener Glow) auf jeder Slide für die ruhige Story-Ambiance.
- **Cover-Backdrop-Lesbarkeit**: Cover-Bild auf Title-Slide jetzt `backdropOpacity 0.22` + dunklem Scrim 0.55 + radialer Vignette → cream/gold-Text bleibt überall WCAG-AA-tauglich.
- **Slide-Komponenten**: `CinematicTitleSlide`, `LineupSlide`, `TastersSlide`, `FunStatsSlide`, `TransitionSlide`, `WhiskySlide`, `WinnerRevealSlide`, `PodiumSlide`, `OutroSlide` — alle nutzen `labs-serif` (Playfair) für Display-Typo, Gold für Caps-Eyebrows/Zahlen-Highlights, cream/creamSecondary für Body. Glow-Pulse beim Sieger jetzt golden statt gelb.
- **Chrome**: Top-Bar (LIVE-Indikator, Akt-Label, Slide-Counter, Exit/Fullscreen) + Prev/Next-Pfeile + Dots in goldenem Tint mit Cream-Text statt grauem White-Alpha.
- **Out of Scope blieb**: Slide-Reihenfolge/-Inhalte, Sync-Logik, Host-Cockpit, Story-Landing-Page selbst, Teilnehmer-View `LabsLive.tsx`.

## Checkpoint: "Story-Editor geklärt" (26.04.2026)
Task #1039: Klare Definition zu Funktion, Zugriff und Zweck des Story-Editors (CMS Story-Builder). Volle Doku in `docs/STORY_EDITOR.md`.
- **Was er ist**: Block-basiertes CMS unter `/admin/cms` (Dashboard), `/admin/cms/:id` (Editor), `/admin/cms/:id/preview` (Vorschau). Baut auf der Storybuilder-Bibliothek auf. **Hinweis**: Die in älteren Notizen genannten Pfade `/admin/cms-editor/:slug` und `/admin/cms-preview/:slug` existieren nicht — die echten Routen verwenden die UUID `:id`.
- **Wer darf**: Ausschließlich `role === 'admin'` (Christoph). Doppelt geprüft (Frontend `isAdmin`-Gate + Backend-Rollencheck pro Endpoint).
- **Was er steuert**: Pflegbare Marketing-Seiten unter beliebigen Slugs. Slug `home` ist „magisch": sobald veröffentlicht, ersetzt er auf `/` die hartkodierte `landing-new.tsx` (siehe Routing-Logik in `client/src/pages/landing-cms.tsx`).
- **Status heute**: Es ist **keine `home`-Seite veröffentlicht**, also sehen Besucher weiterhin `landing-new.tsx`. Der Editor ist vorbereitet, aber öffentlich noch nicht aktiv.
- **Entscheidung**: Editor **bleibt produktiv**. Begründung: ist ausdrücklich Phase 1 des Storybuilder-Mehrphasenplans (Phasen #1020–#1024 als Drafts angelegt), Risiko = niedrig (admin-only, kapselt komplett unter `/admin/cms*`, Fallback `landing-new.tsx` bleibt als Sicherheitsnetz). Kein Aufräumen von Routen/Komponenten/`cms_pages`-Tabelle.
- **Anleitung für Christoph**: Schritt-für-Schritt (Anlegen, Bearbeiten, Vorschau, Veröffentlichen, Notfall-Fallback) in `docs/STORY_EDITOR.md` Abschnitt 8.

## Checkpoint: "Storybuilder Phase 1" (25.04.2026)
Task #1018 (Phase 1 von 6): Wiederverwendbare Block-basierte Storybuilder-Bibliothek als Fundament für Tasting-Story und LandingPage-CMS.
- **Schema**: `tastings.storyBlocks` (jsonb) plus drei neue Tabellen `cms_pages`, `story_versions`, `story_templates` in `shared/schema.ts`. DB synchronisiert per Direct-SQL (Rename-Prompt von drizzle-kit umgangen).
- **Bibliothek `client/src/storybuilder/`**: Modul-Layout mit `core/types.ts` (StoryDocument, StoryBlock, BlockDefinition mit Zod-Schema), `themes/` (registry + casksense-editorial in EB Garamond/Inter/Amber/Grain), `blocks/` (Registry mit Runtime-Validierung), `renderer/StoryRenderer.tsx` (Theme-Wrapping, Grain-Overlay, Validation-Warnings im Editor-Modus), `editor/StoryEditor.tsx` (3-Spalten: Block-Liste mit Reorder/Duplicate/Hide/Delete, Live-Preview, Properties-Panel).
- **5 generische Block-Typen**: `hero-cover`, `text-section` (mit Akt-Intro-Variante), `full-width-image`, `quote`, `divider` — alle mit Renderer + Editor-Panel + Zod-Payload-Schema.
- **Demo-Route `/storybuilder-demo`**: Vollständig funktionsfähiger Editor mit Seed-Inhalt zur Validierung.
- **Folge-Phasen** als Drafts: #1020 Editor-Vollausbau (DnD, TipTap, Auto-Save, +5 Blöcke), #1021 Versionen+Templates+KI, #1022 Tasting-Story-Migration, #1023 LandingPage-CMS, #1024 Cutover+Politur.

## Checkpoint: "Tasting-Story Cinematic Standalone Page" (25.04.2026)
Task #972: Die Tasting-Story wurde als cinematische Standalone-HTML-Seite neu umgesetzt.
- **`client/public/tasting-story/template.html`**: Vollständige self-contained HTML-Story-Seite mit EB Garamond + Inter, Ink/Amber-Palette, Film-Grain-Overlay, parallax Cover-Slide, Scroll-Reveal-Animationen und IntersectionObserver-basiertem Act-Nav.
- **`/tasting-story/:id` Server-Route** (in `server/routes.ts`): Liest das Template, injiziert die Tasting-ID als `<meta name="tasting-id">` und liefert die Seite aus.
- **React-Redirect**: `/labs/results/:id/story` in `client/src/App.tsx` leitet jetzt per `window.location.replace` direkt auf `/tasting-story/:id` weiter.
- **Host-Prompt UI**: Vor der ersten Generierung sieht der Host ein optionales Eingabefeld für Story-Kontext. Im Story-View gibt es einen "Story anpassen"-Button mit Regen-Panel.
- **`PATCH /api/tastings/:id/story-prompt`**: Speichert den Host-Prompt in `tasting.storyPrompt`, invalidiert den Story-Cache (setzt `storySlidesCache` + `storySlidesRatingCount` auf null).
- **`storyPrompt` Schema-Feld**: Neu in `shared/schema.ts` (Drizzle-Push ausgeführt).
- **AI-Injection**: `hostContext` (= `tasting.storyPrompt`) wird an den GPT-4o-mini-User-Content und den System-Prompt weitergegeben, damit die KI die Host-Hinweise als kreative Richtung nutzt.
- Alle Story-Sektionen: Cover-Slide, Akt I (Opening), Akt II (Whiskys), Akt III (Verkoster), Akt IV (Entdeckungen/Ranking), Akt V (Blind-Tasting optional), Akt VI (Sieger), Fotos, Finale.

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
