# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application designed to facilitate collaborative whisky tastings. It enables users to create events, manage participants, and conduct structured whisky evaluations. Key features include tasting progression, multi-act reveals with analytics, and personalized tools like a whisky journal. The project aims to establish a leading platform for structured whisky tasting, fostering a global community and providing advanced tools for whisky enthusiasts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application is built as a TypeScript monorepo, separating client, server, and shared code using ESM modules. Data consistency is maintained through a shared `schema.ts` for Drizzle ORM and Zod validation.

### Frontend (`client/`)
The frontend is a React application utilizing Vite, Wouter for routing, TanStack React Query for server state management, and Zustand for client-side state. UI components are built with shadcn/ui (New York style) based on Radix UI and Tailwind CSS, featuring a Dark Warm theme with centralized color tokens and support for a Light Warm theme via CSS custom properties. It includes Framer Motion for animations, Recharts for data visualization, and react-i18next for internationalization (English and German). The application supports PWA features.

### Backend (`server/`)
The backend is an Express 5 HTTP server, providing RESTful API endpoints and serving frontend assets in production. It supports immediate startup for health checks.

### Database
PostgreSQL serves as the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, and journal entries, identified by UUIDs.

### Key Design Decisions
-   **Authentication**: Email and password login with session persistence, account management, and password reset functionality. Supports guest mode participation.
-   **Data Access Security**: Enforces `x-participant-id` header validation for personal data and limits field exposure for non-owner requests.
-   **Shared Schema**: Ensures consistent data definitions across the frontend and backend.
-   **Session State Machine**: Tastings transition through defined stages (draft, open, closed, reveal, archived) managed by the host.
-   **Asynchronous Updates**: Utilizes React Query polling for near real-time updates of session data.
-   **Public Landing Page**: Features an Apple-style landing page with Framer Motion scroll animations and a guided presentation.
-   **Tasting Features**: Includes comprehensive whisky management, flight board, PDF export, blind mode, discussion panel, tasting note generator, and host-uploadable cover images.
-   **Personalization & Analytics**: Offers participant profiles, a whisky journal, achievement badges, personal flavor profiles, whisky recommendations, side-by-side comparisons, and privacy-respecting per-tasting analytics.
-   **Internationalization**: Fully migrated to react-i18next, supporting German and English, with all UI strings internationalized. Full terminology enforcement pass completed: canonical labels (Tastings/Taste/Circle/Profile nav tabs; Joyn/Host/Solo action cards) enforced systemwide in EN+DE. Legacy DE terms replaced: "Gastgeber"→"Host", "Verkostung(en)"→"Tasting(s)", "Beitreten"/"Join"→"Joyn" in all button/label contexts.
-   **Host Tools**: Provides host briefing notes, a tasting curation wizard, dashboard summary, and manage tastings functionalities.
-   **AI Integration**: Incorporates AI for bottle identification, content generation, market price estimation, tasting suggestions, and Whiskybase ID auto-fill lookup, supporting user-provided or platform-wide OpenAI API keys.
-   **Whiskybase ID Lookup & Barcode Scanner**: Enables auto-filling whisky details via Whiskybase ID input or camera-based barcode scanning, with rate limiting and caching.
-   **Collection Sync**: Supports smart synchronization of Whiskybase collections via CSV re-upload.
-   **Tasting Hub (`/tasting`)**: Central hub for joining, hosting, or logging solo drams, displaying active tastings.
-   **Host Wizard (Simple Mode)**: A streamlined 4-step wizard for creating sessions, adding whiskies, inviting participants, and running live tastings.
-   **Tasting Results**: Displays ranked whiskies by average overall score, with detailed breakdowns and multi-format export options.
-   **Guest Mode**: Offers "Standard Naked" (persisted identity) and "Ultra Naked" (ephemeral identity) participation.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked, Self, and Full.
-   **Navigation Structure (Simple Mode)**: Features a 2-tab bottom navigation (`v2_two_tab`) with "Tasting" and "Taste" sections, configurable via `NAV_VERSION` flag.
-   **Taste (Personal Dashboard)**: A personal whisky profile hub requiring sign-in, with sections for drams, analytics, collection, downloads, and knowledge base. Apple-style naming: no possessive "My"/"Mein"/"Meine" in any labels.
-   **Lazy Loading**: Pages less frequently accessed are lazy-loaded using React.lazy.
-   **Discover (External World Hub)**: Organized into sections for Community, Knowledge, Planning, and About.
-   **V2 Dark Warm UI (`/app`)**: Redesigned UI with an Apple-clean aesthetic and a whisky-warm dark color palette.
-   **Simple Mode (`/enter`, `/log-simple`, `/my-taste`)**: Minimalist UI for new users, featuring AI-powered whisky identification via photo or text, and file import.
-   **Admin Tools**: Provides functionalities for managing test data, AI kill switch, and platform settings, accessible via a dedicated `/admin` route.

### Module 2 (`/m2/*`) — Full Feature Parity
Fully self-contained parallel UI sharing the same backend, auth, and database. NO cross-links to the old app — all navigation stays within `/m2/*`. 3-tab bottom nav (Tasting | Taste | People) with M2-specific profile menu. Top action cards use branded labels: Joyn | Host | Solo.

#### Core Components
- `Module2Shell.tsx` — Main layout with header (logo, profile button, notification bell, "What's New" banner, PWA install prompt), 3-tab bottom nav, session-change listener, ErrorBoundary, pull-to-refresh, Toast provider
- `M2BackButton.tsx` — Navigation guard ensuring all back-navigation stays within `/m2/*` via `isM2Route()` check
- `M2ProfileMenu.tsx` — Full auth menu: sign in, register, forgot PIN/reset, email verification, guest mode, theme toggle, language toggle, sign out. Admin link only visible for admin role.
- `M2Feedback.tsx` — Shared `M2Loading` (unified gold spinner) and `M2Error` (error with retry button) components used across all M2 pages

#### Tastings Tab (`/m2/tastings/*`) — 11 pages
- `M2TastingsHome` — Status filter (Draft/Open/Closed/Archived) with count badges, time filter, HOST badge, calendar view toggle, reveal status badges
- `M2TastingsJoin` — Code entry + QR code scanner (html5-qrcode camera), direct join via URL
- `M2TastingsHost` — Full 4-step wizard: Step 1 (title/date/location/blind mode), Step 2 (whisky CRUD + reorder + image upload), Step 3 (QR code/link/email invitations), Step 4 (live control: dram selection, blind reveal, guided mode, results toggle, settings, duplicate/delete/transfer)
- `M2TastingsSolo` — Full dram logger: AI photo/text identification, barcode scanner, Whiskybase lookup, 5-dimension rating (Nose/Taste/Finish/Balance/Overall) with auto-calculate, flavor chips, dimension notes, metadata fields, multi-photo, confidence badges, offline localStorage with queue retry
- `M2TastingSession` — Lobby with cover image, participant list, tasting code + QR display
- `M2HostControl` — Status control, blind reveal steps (Name→Details→Image), guided mode advance, AI highlights, live whisky management (add/edit/delete)
- `M2TastingPlay` — Full 5-dimension rating with auto-calculate + manual override, debounced auto-save (800ms), progress pills, rating prompt, group average, guided "Waiting for Host", dynamic scale, whisky image/details, status badge, guest upgrade prompt, ambient sound toggle, haptic feedback on slider
- `M2TastingResults` — Ranked whiskies, Gold/Silver/Bronze medals, score breakdown bars, PDF/Excel/CSV export (branded), link to recap, confetti animation on #1
- `M2TastingRecap` — Top rated, most divisive, participant highlights, horizontal bar chart (Recharts), share text clipboard, branded PDF/print
- `M2HostDashboard` — Analytics summary, calendar, top whiskies leaderboard, score charts (Recharts bars), quick links, invitations panel

#### Taste Tab (`/m2/taste/*`) — 13 pages
- `M2TasteHome` — Taste Snapshot (Stability/Exploration/Smoke Affinity/Tastings), AI insight, analytics preview with unlock progression, links to ALL sub-pages, Log Dram button, Knowledge/Community/About sections
- `M2TasteProfile` — Radar chart (Recharts), "Your Style" + "Sweet Spot", Stability Badge, benchmarking (Friends/Global), breakdown by Region/Cask/Peat
- `M2TasteAnalytics` — Taste Evolution line chart, Rating Consistency/Stability Score, statistical breakdown (Avg/StdDev/Range/Count), unlock progression
- `M2TasteDrams` — Filter tabs (All/Solo/Tasting), search, Add Dram button, detail view, edit/delete entries
- `M2TasteCollection` — CSV/Excel import, collection sync (diff preview), AI price estimation, statistics (count/value/status), search/filter/sort, status filter, "Tasted it" shortcut
- `M2TasteCompare` — Community delta table (Your Score vs Platform Median), radar chart overlay (up to 3), CSV export, filters/pagination
- `M2TasteBenchmark` — AI document extraction (PDF/Excel/image/text), library categorization, bulk-add to Library/Wishlist/Journal
- `M2TasteWheel` — Multi-layered aroma wheel (8 categories + subcategories, Recharts pie), NLP text mining from journal, flavor stats
- `M2TasteRecommendations` — Weighted matching (Region 35%/Cask 25%/Peat 25%/Community 15%), interactive filter toggles, match percentages
- `M2TastePairings` — AI food pairing per tasting, pairing scores + "Why" reasons, tasting selection
- `M2TasteWishlist` — Priority management (High/Medium/Low), AI bottle scanner, AI "Why Interesting", one-click transfer to Journal
- `M2TasteDownloads` — Printable tasting sheets/mats (PDF), data export (CSV/Excel/ZIP), multilingual templates
- `M2TasteSettings` — Account management (email/PIN), theme toggle, language switch, profile (name/photo/bio), taste defaults, AI key config, account deletion

#### Circle Tab (`/m2/circle`) — 1 page with 5 tabs
- Rankings (live community scores), Taste Twins (match percentages), Leaderboard, Activity Feed, Friends (CRUD)

#### Discover (`/m2/discover/*`) — 14 pages
- Hub, Lexicon, Distilleries (list+map), Bottlers, Templates, Guide, AI Curation, Research, Rabbit Hole, Vocabulary, About, Donate, Activity, Community

#### Admin (`/m2/admin`) — 1 page with 10 tabs
- Participants/roles, Tastings/sessions, Online users, AI controls (kill switch), Newsletter (AI-generated), Changelog, Cleanup, Analytics, Settings, Feedback

#### Legal (`/m2/impressum`, `/m2/privacy`)
- Impressum and Privacy Policy pages

#### All M2 pages use:
- `v.*` CSS variable theme tokens (no hardcoded colors)
- `Module2Shell` wrapper with 3-tab bottom nav
- `M2BackButton` with M2-only navigation guard
- i18n translations with `m2.*` namespace + fallback strings
- `data-testid` attributes on all interactive/display elements
- Same backend API endpoints as classic app

### Test Suite
Comprehensive test framework using Vitest with 4 tiers:
-   **Unit tests** (`tests/unit/`): Module2Shell rendering, M2BackButton fallback logic, M2ProfileMenu auth flow, theme token validation, i18n coverage. Config: `vitest.config.ts` (jsdom, @vitejs/plugin-react). Run: `npm run test:unit`.
-   **API tests** (`tests/api/`): Health endpoint, auth signin, tastings CRUD. Config: `vitest.config.api.ts` (node). Run: `npm run test:api`.
-   **E2E tests** (`tests/e2e/`): Fetch-based route verification for all `/m2/*` and existing routes, auth flow integration. Config: `vitest.config.e2e.ts` (node). Run: `npm run test:e2e`.
-   **Smoke tests** (`tests/smoke.ts`): CLI script checking server health, DB, auth, M2 routing. Run: `npm run test:smoke`.
-   **Full suite**: `npm run test:all` (unit + api + e2e + smoke). 79 tests total.
-   **Test data**: `npm run db:seed:test` creates test user (`test.m2@casksense.local`) and test tasting with 3 whiskies. Cleanup: `npx tsx server/cleanup-test.ts`.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For typography.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For Excel file processing.
-   **qrcode**: For generating QR codes.
-   **html5-qrcode**: For camera-based QR/barcode scanning.
-   **Replit Object Storage**: For image storage.
-   **GPT-4o**: For AI functionalities.
-   **Recharts**: For data visualization (radar charts, bar charts, pie charts, line charts).
-   **jsPDF**: For PDF generation (results, recap, tasting sheets).
-   **Framer Motion**: For animations.
-   **Capacitor**: For native mobile application wrapping.
