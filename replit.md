# CaskSense - Whisky Tasting Application

> Aeltere Checkpoints (vor dem 12.06.2026) sind nach `docs/CHECKPOINTS_ARCHIV.md` ausgelagert.

## Checkpoint: "Bewertungs-Flow-Politur II + Claim-Coverage + data-guard geklärt" (14.06.2026)
Kleiner Aufräum-/Ergänzungs-Block (deployed bzw. gepusht). Punkte:
- **Politur-Dreier (Commit `fdb7ae9`):** (1) „Zurück" im Eindruck/Tisch-Modus nur ab `phaseIdx > 0` (kein Editor-Verlassen auf der Nase; Phasen-zurück bleibt). (2) Modus-Chip-Label `v2.ratingModeChipCurrent`: „Aktuell"→„Modus" (DE), „Current"→„Mode" (EN) — bewusst kurz wegen Chip-Breite. (3) Im „freien Zweig" (Eindruck-Default, #1238) rendert der Modus-Chip jetzt per Portal (`freeChipSlotNode`, `chipInHeader`) ÜBER der Whisky-Karte statt in-flow darunter — analog zur Guided-Fläche.
- **Claim-Coverage (#2):** `GuestClaimPanel` (tone="app", gast-gegated) erscheint jetzt auch im Nicht-Guided-„closed/archived"-Branch von `LabsLive` (nach „View Results"). Damit erreichen auch Gäste ohne geführten Modus die Anmeldung in-place. Self-Gating unverändert: einmal geclaimt → überall weg.
- **data-guard geklärt (#3):** `_data_guard_snapshots` ist seit `d8047d5` BEWUSST in `shared/schema.ts` gelistet (Spalten exakt = `script/build.ts` CREATE), um `drizzle-kit push --force` (in `scripts/post-merge.sh`) am DROP zu hindern; das Drizzle-Objekt wird in KEINER Query benutzt (nur roh-SQL liest/schreibt). **NICHT entfernen** — die frühere Notiz „fix = aus schema.ts entfernen" war invertiert und hätte den Datenverlust ausgelöst.
- **RatingConsistencyCard (#7):** bleibt bewusst unverändert — „Consistency" ist hier (statistische Stabilität des Bewertungsverhaltens) technisch korrekt, kein Rename zu „Sensorische Signatur".
Offen / als eigene Schritte geplant: Session-Login nach Claim, wöchentliches Auto-Backup (Phase 2), Check-Feature Stufe 2c (Namenssuche/Barcode/Action-Buttons), Korrektur Tasting #29 (braucht DB-Zugriff + Klärung Ranking-vs-Score).

## Checkpoint: "Gast → Geschichte → Konto: Story-Freigabe, Story-CTA, Konto-Claim (Story + Abschluss)" (14.06.2026)
Zweiter und dritter Bauabschnitt des Nordstern-Fahrplans („Der Weg vom eingeladenen Gast zum nächsten Host") — WP 2 + WP 3 (inkl. 3-A) sowie die Umdeutung von WP 4 zu „Option 3", alle deployed und auf GitHub gesichert (Commits `758d78f`/`67354ae`, `fa35a71`/`74f655f`, `d8047d5`, `2e845ad`/`ecada04`, `ef593e9`/`357ece2`). Je byte-exakt abgenommen:
- **2a — Story-Freigabe beim Beenden:** `LabsHost.tsx` (End-Session-Dialog) + `server/routes.ts` + `i18n.ts`. Im Beenden-Dialog eine standardmäßig aktive Checkbox `storyOnEnd`; bei Beenden-mit-Haken erst `PATCH /api/tastings/:id/story-enabled {storyEnabled:true}`, dann schließen. Die `/story-enabled`-Route seedet zusätzlich Baseline-Blocks via `loadTastingStoryDocument` (datengetrieben über `buildInitialTastingStoryBlocks`, **ohne KI**, gleiche `registerRoutes`-Closure → zur Request-Zeit verfügbar). i18n `m2.host.endSessionStoryToggle`.
- **2b — Story-CTA am Abschluss:** `LabsLive.tsx` (`GuidedComplete`) + `i18n.ts`. Primärer CTA „Eure Geschichte ansehen" → `/tasting-story/:id` (Sparkles-Icon), sichtbar wenn `getStoryPdfAvailable(tasting, isHost)` (Status story-fähig && (isHost || storyEnabled)); „Ergebnisse" wird sekundär. Neuer Prop `storyAvailable`. i18n `liveUi.viewStory`.
- **3 — Konto-Claim (war bereits gebaut, `d8047d5`):** `RecapCard.tsx` (in `LabsTastingDetail`, sichtbar bei completed/reveal + currentParticipant) trägt den vollen Claim-Flow idle→code→done, gast-gegatet (`experienceLevel === "guest" && !email`), via `participantApi.claim/verify`. Backend `POST /api/participants/:id/claim` setzt email/pin/`experienceLevel="explorer"` am bestehenden Record (Bewertungen bleiben über `participantId`), entfernt das `#xxxx`-Suffix, schickt 6-stelligen Code. Lehre bestätigt: VOR dem Bauen prüfen, ob es schon existiert.
- **3-A — Claim am emotionalen Höhepunkt (Story-Ende):** neue Datei `client/src/labs/components/GuestClaimPanel.tsx` — eigenständig, selbst-gegatet (`if (!isGuest) return null`), Logik 1:1 wie RecapCard, eigene `story-*`-Testids. Eingebunden am Ende von `labs-tasting-story-view.tsx` (`useSession().pid`, `{pid && <GuestClaimPanel … />}`). Gating sicher: wer die Story sieht, ist Mitglied; Self-Gate zusätzlich. **RecapCard bewusst unberührt** (Weg 1 = neues Panel statt RecapCard-Umbau).
- **WP 4 → Option 3 — Claim am universellen Abschluss-Screen:** „Werde Host"-Nudge **verworfen** (Timing: Hosten ist geplante Zukunftsaktivität, kein Post-Tasting-Wind-down; Hosting ist ohnehin voll gebaut und **nicht gegatet** — `POST /api/tastings` ohne Level-Check, `/labs/host` + QuickStart). Wertvollerer Hebel: die Anmeldung muss auch Gäste erreichen, die weder Story noch Ergebnisse öffnen. Dafür `GuestClaimPanel` **theme-fähig** gemacht (neuer Prop `tone: "story" | "app"`, Default `story` = unverändert; `app` = `var(--labs-*)`, Playfair/Cormorant, `labs-input`/`labs-btn-primary`/`labs-btn-ghost`, `complete-*`-Testids) und in `GuidedComplete` eingebunden (gated `{participantId && …}`, `tone="app"`, `participantId={currentParticipant?.id}`). Self-Gating: der Claim kann an bis zu drei Stellen erscheinen (Abschluss/Story/Ergebnisse) und verschwindet nach erfolgtem Claim überall. Coverage: **Guided** = in-place am Abschluss (kein Tap); **Nicht-Guided** = „View Results" → RecapCard-Claim (WP 3).
Verfahren durchgehend: extern in Sandbox angewandte + verifizierte Diffs als Byte-Referenz, Hard Prompts mit null Freiheitsgraden, Agent-Commit-Verbot, Byte-Diff-Abnahme; Story-Tone nach dem Theme-Umbau byte-werte-identisch zum Original gegengeprüft. Bekannte/offene Nuancen: (a) nach dem Claim bleibt die Session technisch „Gast" (`signedIn=false`), aber `currentParticipant` ist gesetzt → Hosten/Weiter möglich; saubere Session-Elevation wäre separater Schliff am Claim. (b) Optionale echte Universal-Coverage: auch der Nicht-Guided-„closed"-Screen in-place (statt Umweg über Ergebnisse) — nicht nötig für den eingeladenen-Gast-Pfad. Damit ist der Nordstern-Bogen funktional vollständig: rein → mittendrin → orientiert → mit Geschichte raus → Konto sichern.

## Checkpoint: "Gast → mittendrin: Deep-Link, Live-Landung, Einstiegs-Banner" (14.06.2026)
Erster zusammenhängender Bauabschnitt des Nordstern-Fahrplans („Der Weg vom eingeladenen Gast zum nächsten Host") — WP 1a+1b, deployed und auf GitHub gesichert (Commits `467d276`, `96a1124`, `fd0d45b`/`afb8fd0`). Drei Schritte, je byte-exakt abgenommen:
- **1a-i — Gast-Eintritt via Invite-Link (ultra):** `LabsInvite.tsx`. Nicht-eingeloggter Empfänger eines Invite-Links wird bei `guestMode === "ultra"` per `useEffect` in den erprobten Gast-Flow (`/labs/join/{code}`) umgeleitet statt zum Sign-in gezwungen; `standard` verlangt weiter Konto (Host-Privatsphäre, **Variante A — bewusst keine Backend-Änderung**, die guest-join-Route mit 403-Sperre bleibt). Eingeloggter Accept landet bei laufendem Tasting im Live-Raum.
- **1a-ii — einheitliche Live-Raum-Landung im Code-/Gast-Pfad:** `LabsJoin.tsx`. `PendingTasting` um `status` erweitert, zentraler Helper `landAfter(id, status)` (`status === "open"` → `/labs/live/:id`, sonst `/labs/tastings/:id`). 7 Lande-Punkte umgestellt (4× `tasting.status`, 3× `pendingTasting.status`), `showAuthOrGuest` gibt `status` mit (2×). Invite-Accept-Pfad in der „Meine Einladungen"-Liste (kein `status` im `MyInvite`) bewusst weiter auf Detail — minor, später nachrüstbar.
- **1b — „Mittendrin"-Banner:** `LabsLive.tsx` (`GuidedStepView`) + `i18n.ts`. Steigt ein Nicht-Host ein, während der Host schon auf Dram ≥ 2 ist (`whiskyIndex >= 1` beim Mount), erscheint oben ein gold-getöntes Info-Banner (Stil wie `ResumeRatingBanner`, `Clock`-Icon) „Das Tasting läuft bereits / Du steigst bei Dram N von M ein". State nur beim Mount initialisiert → kein erneutes Feuern, wenn der Host weiterschaltet (das bleibt `interruptBanner`); Auto-Dismiss 7 s + Tap-to-Dismiss; Host sieht es nie. i18n-Keys `liveUi.joinedMidwayTitle`/`joinedMidwayHint` (DE+EN), „Dram" als Brand-Begriff erhalten.
Verfahren durchgehend: extern in Sandbox angewandte + verifizierte Diffs als Byte-Referenz, Hard Prompts mit null Freiheitsgraden, `git tag pre-…` vor jedem Eingriff, Agent-Commit-Verbot, Byte-Diff-Abnahme. Zweimal Agent-Scope-Halluzination („#4 / a–f / Cockpit-Chip" aus alter Session) sauber abgewehrt — Cockpit unangetastet. Offen auf der Roadmap: WP 2 (Story-Schleife), WP 3 (Konto-Claim), WP 4 („Werde Host").

## Checkpoint: "Bewertungs-Flow-Politur: Gesamt-Parität, Modus-Chip, Context-Bar" (14.06.2026)
Abschluss eines zusammenhängenden Politur-Blocks am Live-Bewertungsfluss (deployed, stabil). Vier Punkte:
- **Gesamt = volle Parität:** Die Phase "Gesamt"/overall zeigt jetzt denselben FlavorTags-Block wie Nase/Gaumen/Abgang (Aromen-Chips + "Weitere Aromen & Bewertungsmodelle" inkl. aller sechs Modelle Guide/Journey/Wheel/Compass/Radar/Describe). Entfernt: Early-Return `if (phaseId === "overall") return null` in `FlavorTags.tsx` + die `!== "overall"`-Gates in `GuidedRating`/`CompactRating`. `FlavourStudioSheet.dimension` auf `DimKey | "overall"` erweitert, Label "Gesamt/Overall", `studioDimension`-Fallback.
- **Modell-Term-Listen aus allen Sektionen:** Neuer Helper `secTerms(cat, section)` in `FlavourStudioSheet.tsx` (dedupliziert via Set); alle `cat[section]`-Zugriffe darauf umgestellt, sodass die Modelle bei "Gesamt" Terme aus Nase+Gaumen+Abgang ziehen statt nur Nase. `findTermCategory`-Schleifenvariable zu `sec` umbenannt.
- **Netzwerk-Boundary-Fix (29dbdbd):** Die `section`-Typ-Erweiterung leakte `"overall"` in POST `/api/labs/flavour-assist` (Backend-Zod `enum nose|palate|finish`) → 400. An beiden Request-Bodies auf `section === "overall" ? "nose" : section` eingeengt. Memory-Note `section-overall-boundary.md`. (Konsequenz: KI-Notizvorschläge bei "Gesamt" nutzen Nase-Vokabular — bewusste Pragmatik, Backend-Enum-Erweiterung wäre der saubere Folgeschritt.)
- **Modus-Chip & "Zurück":** Modus-Chip (RatingModeChip) vom Overlay in den Fluss (Weg B), Reihenfolge an RatingModeSelect angeglichen (Quick→Eindruck→Kompakt→Geführt), bei "Gesamt" Modelle freigeschaltet. Anschließend Chip per `createPortal` aus `RatingFlowV2` in die "Dram X / 12"-Context-Bar von `GuidedStepView` (Props `chipInHeader`/`chipPortalTarget`, ersetzt den dort redundanten Titel; andere Flächen behalten In-Flow-Chip). Redundanter "Zurück" in QuickRating entfernt (nur sichtbar bei `onSaveAsDraft` = Solo/Drams); TischRating-"Zurück" bleibt (Phasen-Navigation), Cockpit/Host bewusst unangetastet.
Verfahren durchgehend: extern verifizierte Hard Prompts, null Freiheitsgrade, Byte-Diff-Abnahme, Agent-Commit-Verbot.

## Checkpoint: "Stabiler Stand vor substanzieller Veränderung" (12.06.2026)
Bewusst gesetzter Referenz-/Rollback-Punkt VOR Beginn der Bauphase entlang des Fahrplans vom 12.06.2026 (Nordstern: „Der Weg vom eingeladenen Gast zum nächsten Host"). Produktion ist deployed und stabil. Stand dieses Checkpoints umfasst u.a.: Tisch-Modus Phase 1 (vierte Bewertungsform, Task #1223), EXIF/GPS-Sanitizer für Bild-Uploads (Tasks #1219/#1220), Check-Feature Stufe 1+2c, sowie die „Dein Abend"/„Your Evening" Abschluss-Karte am Tasting-Ende (Task #1225: eigene Score-Kurve, Top-Dram, K-anonyme Position relativ zur Runde ab 3 Bewertenden, blind-sicher, DE/EN). Als Nächstes geplant (Bauschlange, je genau ein aktives Element): WP 1 Restteile (a) Gast-Deep-Link und (b) „Mittendrin"-Banner — Teil (c) Abschluss-Karte ist mit #1225 bereits erledigt; danach WP 2 Story-Schleife, WP 3 Konto-Claim, WP 4 „Werde Host", anschließend Tisch-Modus Phase 2+3. Arbeitsverfahren ab hier: extern fertig entwickelter + validierter Code, Hard Prompt mit null Freiheitsgraden, Abweichungs-Protokoll, Abnahme per Byte-Diff; Standard `NODE_OPTIONS=--max-old-space-size=6144` für tsc.

## Brand Visual Direction (Standing Directive — until revoked, 25.04.2026)
Die LandingPage (`client/src/pages/landing-new.tsx`, Route `/`) MUSS visuell im Stil der Tasting-Story (`client/public/tasting-story/template.html`) gehalten werden — Wiedererkennungseffekt ist erklärtes Brand-Ziel:
- Display-Schrift: `EB Garamond` (Italic für narrative Akzente).
- Body-Schrift: `Inter`.
- Akzentfarbe Amber: `#C9A961` (mit Dim-Variante `#8E7640`).
- Subtiles Filmkorn-Overlay (SVG-`fractalNoise`, opacity ~0.04, `mix-blend-mode: overlay`) als Atmosphäre-Layer auf der gesamten Seite.
- Eyebrow-Labels: kleine, weit ausgesperrte Caps in Amber.
- Bei jeder zukünftigen Änderung an der LandingPage: dieses Set bewahren, nicht einzelne Komponenten in einen anderen Stil zurückwandern lassen. Gilt bis zum ausdrücklichen Widerruf durch den Nutzer.

## Overview
CaskSense is a web application designed to facilitate collaborative whisky tastings. It enables users to create events, manage participants, and conduct structured whisky evaluations with features like tasting progression, multi-act reveals with analytics, and personalized tools such as a whisky journal. The project aims to establish a leading platform for structured whisky tasting, fostering a global community and providing advanced tools for whisky enthusiasts. Key capabilities include comprehensive whisky management, personalized analytics, and AI-powered integrations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application is a TypeScript monorepo with separate client, server, and shared code using ESM modules. Data consistency is ensured via a shared `schema.ts` for Drizzle ORM and Zod validation.

### Frontend (`client/`)
The frontend is a React application built with Vite, Wouter for routing, TanStack React Query for server state, and Zustand for client state. UI components leverage shadcn/ui (New York style) based on Radix UI and Tailwind CSS, featuring a Dark Warm theme with centralized color tokens and support for a Light Warm theme. It incorporates Framer Motion for animations, Recharts for data visualization, and react-i18next for internationalization (English and German), supporting PWA features.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints and serving frontend assets in production.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, journal entries, communities, community memberships, historical_tastings, historical_tasting_entries, historical_personal_ratings, and user_activity_sessions, all identified by UUIDs. Data model notes: `whiskies` uses `caskType` (renamed from `cask_influence`), `distilledYear` (vintage removed), and numeric `abv`. `journal_entries` uses numeric `abv`/`price` (not text), no `body` or `vintage` columns. `whiskybase_collection` retains `vintage` for external data and has `country`/`region` columns. `wishlist_entries` has `country` column. `benchmark_entries` uses numeric `abv`. The `historical_tastings` table supports both imported legacy data (`origin_type='imported'`) and archived live tastings (`origin_type='live'`, with `origin_tasting_id` FK). Archive lifecycle: when a live tasting is archived, a snapshot is automatically created in historical_tastings + historical_tasting_entries with aggregated scores. Unified Archive API (`/api/archive/tastings`) serves both sources with role-based access control (`accessLevel`: full/aggregated/lineup_only/none). The `/api/labs/explore/whiskies` endpoint aggregates data from live tastings, journal entries, collection items, AND historical tasting entries.

### Key Design Decisions & Feature-Katalog
> Die ausführlichen Design-Entscheidungen, Labs-Seiten und Feature-Beschreibungen sind nach `docs/ARCHITEKTUR.md` ausgelagert (Token-Ersparnis). Bei Architektur-/Feature-Fragen dort nachschlagen.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For typography.
-   **Nodemailer**: For email notifications.
-   **ExcelJS**: For Excel file processing.
-   **qrcode**: For QR code generation.
-   **html5-qrcode**: For camera-based QR/barcode scanning.
-   **Replit Object Storage**: For image storage.
-   **GPT-4o / gpt-image-1**: For AI functionalities and image generation.
-   **AI Whisky Database**: ~1,580 curated whisky entries generated via GPT-4o-mini, stored in `journal_entries` with `source="casksense-database"`, `category` field, and `participantId="casksense-database-system"` (dedicated system participant in `participants` table). Covers 21 regions: Scotland (Speyside, Highland, Islay, Lowland, Campbeltown, Islands), Ireland, USA (Bourbon, Tennessee, Rye), Japan, Canada, India, Taiwan, Australia, Sweden, Germany, France, England, and more. Seeder script: `server/seed-whisky-db.ts` (run via `npx tsx server/seed-whisky-db.ts`, resumable/idempotent). Explore endpoint (`/api/labs/explore/whiskies`) uses `getCuratedDatabaseEntries()` (source-filtered) instead of `getAllJournalEntries()` to avoid exposing private user journal data.
-   **Recharts**: For data visualization.
-   **jsPDF**: For PDF generation.
-   **Framer Motion**: For animations.
-   **Capacitor**: For native mobile application wrapping.
