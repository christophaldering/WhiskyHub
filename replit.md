# CaskSense - Whisky Tasting Application

> Aeltere Checkpoints (vor dem 12.06.2026) sind nach `docs/CHECKPOINTS_ARCHIV.md` ausgelagert.

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
