# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application for hosting and participating in collaborative whisky tasting sessions. It allows hosts to create events, invite participants, and guide them through a structured whisky evaluation. Participants rate whiskies, and the host manages session progression through various stages, including a multi-act reveal phase with analytics and charts. The platform aims to provide an engaging experience for whisky enthusiasts to share, compare, and deepen their understanding of whisky through session management, personalized analytics, and a comprehensive whisky journal. The project envisions becoming the leading platform for structured whisky tasting, fostering a global community and offering sophisticated tools for both casual and expert enthusiasts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application uses a monorepo structure with client, server, and shared code, all built with TypeScript and ESM modules. A shared `schema.ts` file defines Drizzle ORM and Zod validation schemas for data consistency.

### Frontend (`client/`)
The frontend is a React application built with Vite, using Wouter for routing, TanStack React Query for server state management, and Zustand for client-side state. The UI is developed with shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a custom muted slate blue theme and light mode. Framer Motion handles animations, Recharts provides data visualizations, and react-i18next is used for internationalization (English and German). Fonts are Playfair Display and Inter. PWA support is included for installability and offline access. UI elements adapt dynamically to chosen rating scales (5/10/20/100 points). All users get the full feature set regardless of experience level.

### Backend (`server/`)
The backend is an Express 5 HTTP server that provides RESTful API endpoints. It serves frontend assets in production and integrates with the Vite development server. Participant identification is managed client-side.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, and journal entries, using UUIDs for identifiers.

### Key Design Decisions
-   **Authentication**: Participant authentication uses a name and a mandatory 4-digit PIN. Account deletion anonymizes personal data while preserving ratings.
-   **Shared Schema**: A single source of truth for database schema and validation ensures consistency across the stack.
-   **Session State Machine**: Tastings progress through defined stages (draft, open, closed, reveal, archived) with host-controlled advancement and a multi-act reveal stage for results.
-   **Asynchronous Updates**: React Query polling enables near real-time updates for session data.
-   **Data Import & Management**: Hosts can import whisky data from spreadsheets and upload bottle photos, stored in Replit Object Storage.
-   **Tasting Features**: Includes whisky management, flight board view, PDF export of tasting menus, blind mode, discussion panel, tasting note generator, and host-uploadable cover images. Host delegation allows transferring host roles.
-   **Personalization & Analytics**: Features participant profiles, a whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and a flavor wheel. Privacy-respecting per-tasting analytics are provided, showing aggregated group statistics alongside individual participant data. Platform-wide analytics (measurement quality, predictive validity, AI analysis) are admin-only.
-   **Data Access Model**: Participants see their own ratings + anonymized group analytics for tastings they attended. Hosts see all individual ratings for their hosted tastings. Platform-wide cross-tasting analytics and exports are admin-only. Consent notice at login informs participants about data visibility.
-   **Data Export Permissions**: Three-tier system with PIN verification. Own-level (all users): profile, journal, wishlist, collection, friends. Extended-level (host/admin): bundled tasting ratings across all sessions. Admin-level: full data export. Friends export excludes email addresses for non-admins.
-   **Internationalization**: Only German (DE) and English (EN) are actively supported and selectable. Other language files exist as fallback but are hidden from the language selector.
-   **Host Tools**: Host briefing notes, a tasting curation wizard, calendar view, and a dashboard summary.
-   **Communication**: Session invitations via email or QR codes, with a friend activity feed and configurable tasting reminders.
-   **Knowledge Base**: Includes a Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **AI Integration**: AI-powered bottle identification for journal entries and AI-powered newsletter content generation. AI bottle scan results are cached for efficiency. AI-powered market price estimation for collection items (rate-limited to 1x/week for non-admins). AI-powered tasting suggestions from own collection.
-   **Collection Sync**: Whiskybase collection supports smart sync/diff via CSV re-upload. Shows new, removed, and changed items with per-item decision making (add/keep/delete/update). Price estimation with "KI-geschätzt" badge, manual override available. Rate limit: 1x/week for regular users, unlimited for admin.
-   **Tasting Creation**: Multiple whisky input methods — single entry, list import (Excel/CSV), from own Whiskybase collection, AI-curated suggestions from collection (horizontal/vertical/contrast/mixed themes). Curation wizard supports "From My Collection" source toggle.
-   **Guest Mode**: Two guest participation flavors controlled per-session by host via `guestMode` field ("standard" default, "ultra"). **Standard Naked**: Participant identity persisted in Zustand/localStorage for resume on same device; duplicate prevention via reused participantId; hint banner shown. **Ultra Naked**: Ephemeral in-memory participant (not persisted to Zustand); refresh loses progress; warning banner shown in welcome + rating screens; ranking hidden in RecapScreen. Host toggles guestMode in EditTastingDialog alongside blindMode/ratingScale. Naked Tasting supports three UI modes: Flow (default, timeline with collapsible dram cards), Focus (one dram at a time, card deck pattern), and Journal (structured document with tabs). Mode is stored as `uiMode` in Zustand store (localStorage-persisted), configurable in profile settings and switchable in the naked tasting header. All modes share the same `RatingSliders` and `useRatingState` components — no duplicated business logic. Naked routes (`/naked/:code`) render outside `<Layout>`, ensuring zero sidebar/bottom-nav leakage.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override. Full 4-dimension rating for all users.
-   **Context Level**: Three-tier data visibility control within active tasting sessions. Level 0 (Naked) shows only rating inputs and own notes. Level 1 (Self) adds personal progress and AI whisky insights. Level 2 (Full) shows community analytics, discussion panel, reflection panel, and attendee roster. Persisted in client store. Switcher UI in tasting room header. Default is 0 (Naked).
-   **Experience Levels**: Removed. All users get the full experience. No feature gating by level. Only role-based restrictions remain (admin panel, whisky database access).
-   **Navigation Structure (v3 Tasting-Centric)**: Desktop sidebar has 6 sections with ≤13 links (excluding admin): Jetzt (/now → redirects to active sessions), Tastings (Lobby /tasting, Sessions /tasting/sessions, Calendar /tasting/calendar), Journal (/my/journal, Collection /my/collection, Wishlist /my/wishlist), Entdecken (Discover /discover, Distilleries /discover/distilleries, Community /discover/community), Profil (Profile /profile, Account /profile/account, Help /profile/help), Admin (/admin, admin-only). Old sections PRO/WISSEN/ÜBER removed as top-level sections; their items consolidated into tabbed pages: /my/journal handles tasted/compare/recap/analytics/benchmark/export tabs, /discover consolidates lexicon/research as sections, /discover/distilleries has map/bottlers tabs, /discover/community has friends/twins/rankings/leaderboard/activity tabs, /profile/help has help/about/features/donate tabs. Mobile bottom nav: 5 tabs (Jetzt, Sessions, Journal, Entdecken, Profil). All old routes preserved as redirect aliases (e.g. /comparison → /my/journal?tab=compare). Whisky Database (/discover/database) remains gated to host/admin/whitelisted but removed from sidebar.
-   **Whisky Library**: Formerly "Benchmark-Analyse", now a tabbed library with Import, Tastingnotizen, Auswertungen, Artikel, and Sonstiges tabs. Post-upload classification dialog routes extracted data to library (with category), wishlist, or tasted whiskies. Uses `libraryCategory` field on benchmark_entries.
-   **Data Source Tracking**: Journal entries have a `source` field (casksense/imported/whiskybase). "Meine verkosteten Whiskys" and "Mein Whisky-Profil" pages include data source filters. CaskSense session data is default; imported/external data only shown when actively enabled by the user.
-   **Whisky Profile Page**: Renamed from "Geschmacksprofil" to "Mein Whisky-Profil" with 3 distinct tabs: "Geschmacksanalyse" (radar chart, region/peat/cask breakdowns, top list), "Whisky-Profil" (statistical analysis, rating behavior), "Aromarad" (flavor wheel). Each analytics section has explanatory descriptions in DE/EN.
-   **Participant Deduplication**: Backend calculations (global averages, platform analytics, host dashboard, admin stats) deduplicate participants by (name, pin) combination to avoid double-counting the same person across multiple tastings.
-   **About the Method**: Tasting methodology content integrated into the About page's Overview tab as compact cards, replacing the standalone `/about-method` page.
-   **Admin AI Profiles**: Admin panel includes PIN-protected AI participant profiles. Admin must re-enter their PIN to unlock GPT-4o-generated 2-3 sentence profiles for all participants, covering taste preferences, rating behavior, and sensory science insights. Anonymized participants shown with alias names only.
-   **Admin Settings**: Centralized platform settings in admin panel: What's New banner toggle with custom text, registration open/closed, guest mode, maintenance mode, email notifications. Settings stored in `app_settings` key-value table. Banner controlled by server settings instead of hardcoded version.
-   **Test Data Management**: Tastings can be flagged as "test data" (isTestData field). Test-flagged tastings are excluded from platform analytics and global averages. Admin can toggle per-tasting or use bulk cleanup filters (title pattern, date, participant count). Bulk cleanup supports preview, mark-as-test, and permanent delete actions.
-   **AI Kill Switch**: Admin can disable AI features globally or per-feature via settings. Frontend uses `useAIStatus` hook (`client/src/hooks/use-ai-status.ts`) to poll `/api/ai-status` and disable AI buttons with tooltip messages and warning banners when AI is off. Affected areas: journal scan, wishlist scan, focused tasting insights, photo tasting analyze, library upload, newsletter generation, AI participant profiles.
-   **Spectator/Watch Mode**: View-only access to live tasting sessions via tokenized links. Host enables per-session in EditTastingDialog with toggles for viewerEnabled, viewerLiveOnly, viewerAllowAverages, viewerAllowRanking. Token generated server-side (crypto.randomBytes 32 bytes). Watch screen (`/watch/:token`) renders outside Layout (no sidebar/nav), polls `GET /api/watch/:token` every 3s, shows group averages and dram ranking. Security: no participant names/IDs, no individual ratings, no notes, no write access. Blind safety enforced server-side via revealIndex/revealStep. 3-second server-side cache. Host UI includes copy-link button and QR code (using existing qrcode library). i18n keys in `sessionSettings.viewer*` (host UI) and `watchScreen.*` (watch page) for DE/EN.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For web fonts.
-   **Nodemailer**: For sending email notifications and invitations.
-   **ExcelJS**: For reading and writing Excel files.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For storing uploaded images.
-   **GPT-4o**: For AI-powered features like bottle identification and content generation.
-   **Capacitor**: For wrapping the PWA as native iOS and Android applications.

## Ideas / Future Features

-   **Live Status Dashboard**: Show online participants count, active/planned/completed tastings summary, and friends' online status on the Home page. Includes heartbeat-based presence tracking, friend online indicators, and direct contact options (email, profile link, tasting invite). Requires new server-side session tracking system.