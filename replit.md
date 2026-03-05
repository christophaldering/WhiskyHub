# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application for hosting and participating in collaborative whisky tastings. It provides tools for event creation, participant management, and structured whisky evaluation, including tasting progression, multi-act reveals with analytics, and personalized features like a whisky journal. The project aims to be a leading platform for structured whisky tasting, fostering a global community and providing sophisticated tools for enthusiasts.

### Terminology (enforced across the app)
- **Tasting** = an event/evening with multiple whiskies (replaces "Session" everywhere)
- **Line-up** = the ordered set of whiskies in a tasting
- **Dram** = a single whisky within a tasting ("Dram 3 von 7")
- **Eintrag** = a personal journal entry
- **Meine Whiskys / Meine Sammlung** = bottles you own/owned (Whiskybase CSV import)
- **Meine Drams** = everything you've ever tasted (from tastings, journal, personal notes)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application uses a TypeScript monorepo with client, server, and shared code, utilizing ESM modules. A shared `schema.ts` defines Drizzle ORM and Zod validation schemas.

### Frontend (`client/`)
The frontend is a React application built with Vite, Wouter for routing, TanStack React Query for server state, and Zustand for client-side state. UI components are built with shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a muted slate blue theme and light mode. Framer Motion is used for animations, Recharts for data visualizations, and react-i18next for internationalization (English and German). It includes PWA support. The application features a Dark Warm theme with centralized color tokens and shared styles, and specific typography for page titles. A theme toggle system (`themeVars.ts`) supports Dark Warm and Light Warm themes via CSS custom properties with extended semantic tokens: `elevated` (raised surface), `textSecondary`, `deltaPositive`/`deltaNegative` (comparison indicators), `tableRowHover`, `pillBg`/`pillText` (tab/pill styling), `focusRing`. Shared styles (`cardStyle`, `inputStyle`, `pageTitleStyle`, `sliderCSS`, `typo.*`) use CSS variables for automatic theme awareness. The `alpha()` helper enables CSS-variable-compatible opacity via `color-mix()`.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints and serving frontend assets in production. It supports an immediate listen startup for health checks and a loading page, with a `ready` flag indicating full application availability.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, and journal entries, using UUIDs for identifiers.

### Key Design Decisions
-   **Authentication**: Email + password login with optional display name, session persistence, and account management features including email and password changes, and password reset via email verification. Supports legacy bcrypt-hashed PINs and guest mode participation.
-   **Data Access Security**: Personal data endpoints require `x-participant-id` header validation. Non-owner requests return limited fields.
-   **Guest Account Upgrade**: Guests are prompted to upgrade their account after a tasting ends for better recovery.
-   **Shared Schema**: Ensures data consistency across the stack.
-   **Session State Machine**: Tastings progress through defined stages (draft, open, closed, reveal, archived) controlled by the host.
-   **Asynchronous Updates**: React Query polling provides near real-time updates for session data.
-   **Data Management**: Hosts can import whisky data and upload bottle photos.
-   **Public Landing Page**: Premium Apple-style landing page at `/` with 8 sections (Hero, Problem, Two Ways, Features, Experience Flow, Science, Advanced, CTA), Framer Motion scroll animations, and Playfair Display typography. Hero and CTA "Open App" buttons link to `/tasting` hub. Links to an 18-slide animated guided presentation at `/presentation` with unique illustrations per slide, keyboard/swipe navigation, and progress tracking.
-   **Tasting Features**: Includes whisky management, flight board, PDF export, blind mode, discussion panel, tasting note generator, and host-uploadable cover images.
-   **Personalization & Analytics**: Features participant profiles, a whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and a flavor wheel. Privacy-respecting per-tasting analytics are provided.
-   **Data Access Model**: Participants see their own ratings and anonymized group analytics; hosts see all individual ratings for their hosted tastings.
-   **Internationalization**: Fully migrated to react-i18next with `t()` calls — zero `isDE` ternaries remain. Supports German (DE) and English (EN). i18n keys in `client/src/lib/i18n.ts` (~8,050+ lines). All main page files verified: zero hardcoded UI strings remain (brand names like "CaskSense" excluded). Session sheet (login/account menu), tasting results page, and export dropdowns fully i18n-ized with `sessionSheet.*` and `tastingResults.*` key namespaces. PDF generation functions use `tp()` helper with `{ lng: lang }` to respect the passed language parameter. Admin panel and public landing page strings are English-only (internal/marketing). Language toggle (DE/EN) is prominently placed in the session menu (both signed-in and signed-out states).
-   **Host Tools**: Host briefing notes, tasting curation wizard, dashboard summary, AI curation, and manage tastings. PDF templates and data export consolidated into `/my-taste/downloads`. Sessions page (`/sessions`) includes List/Calendar toggle (calendar view embedded). `/tasting-calendar` redirects to `/sessions?view=calendar`.
-   **Whisky Bottle Thumbnails**: Displayed consistently across the UI when an `imageUrl` is available.
-   **Guided Tasting Polling**: Faster polling rates in guided tasting mode for near real-time updates.
-   **Communication**: Session invitations via email or QR codes.
-   **Knowledge Base**: Includes a Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **Rabbit Hole**: Deep-dive hub at `/discover/rabbit-hole` linking to Rating Models (`/method`), Statistical Engine (`/background`), and Research Notes (`/research`). All three pages wrapped in SimpleShell with BackButton fallback to the hub. NavCard in My Taste Knowledge section.
-   **AI Integration**: AI for bottle identification, content generation, market price estimation, tasting suggestions, and Whiskybase ID auto-fill lookup. Supports user-provided OpenAI API keys or platform-wide AI access.
-   **Whiskybase ID Lookup**: Entering a Whiskybase ID in the Log form auto-fills Name, Distillery, Age, ABV, Cask Type, and Price — first checks user's collection, then falls back to GPT-4o-mini. Rate-limited (10/min) and cached (1h).
-   **Barcode Scanner**: Camera-based barcode scanning (EAN-13/UPC-A) in the Log form identifies whisky bottles and auto-fills all fields including Whiskybase ID. Uses html5-qrcode library with manual code entry fallback. Rate-limited and cached.
-   **Collection Sync**: Whiskybase collection supports smart sync/diff via CSV re-upload.
-   **Tasting Hub (`/tasting`)**: 3-CTA layout: "Join Tasting" → `/enter`, "Host Tasting" → `/host`, separated by "ODER"/"OR" divider, then "Solo Dram verkosten" → `/log-simple`. "Laufende Tastings" section shows active tastings (status=open/reveal) with Continue button. No "Mehr" section. `/log-simple` route highlights the Tasting tab in nav.
-   **Host Wizard (Simple Mode)**: A 4-step inline wizard for creating sessions, adding whiskies, inviting participants, and running live tastings, with options for manual entry, AI identification, and CSV import.
-   **Tasting Results**: Displays ranked whiskies by average overall score after a tasting, with detailed breakdowns and multi-format export (CSV, Excel, PDF).
-   **Participant Tasting Room**: Dedicated view adapting to guided/free mode, blind settings, and reveal stages.
-   **Tasting Creation**: Supports single entry, list import, and AI-curated suggestions.
-   **Guest Mode**: Offers "Standard Naked" (persisted identity) and "Ultra Naked" (ephemeral identity) participation.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked (0), Self (1), and Full (2).
-   **Navigation Structure (Simple Mode)**: 2-tab bottom navigation (v2_two_tab): Tasting, My Taste. Controlled by `NAV_VERSION` in `client/src/lib/config.ts`. Central navigation config in `client/src/lib/navConfig.ts` (primaryTabs, myTasteLinks, tastingLinks). Bottom nav labels are i18n-ized via `nav.*` keys. Previous configs: `v2_simplified` (3-tab: Tasting, My Taste, Explore), `v1` (5-tab: Join, Log, Host, My Taste, Discover). Discover/Explore content absorbed into My Taste under Knowledge, Community, and About sections. Landing page controlled by `LANDING_VERSION` flag: `two_screen_start` shows 3 primary actions (Join, Add Dram, Host) + 2 secondary (My Taste, Settings); `legacy_menu` preserves old layout.
-   **Reusable Navigation Components**: `client/src/components/navigation/` contains `BackButton` (i18n-aware back nav with history fallback) and `PageHeader` (title + back + optional subtitle/actions). Re-exported from `client/src/components/back-button.tsx` for backward compatibility. `EmptyState` component at `client/src/components/ui/EmptyState.tsx` provides themed empty states with icon, title, description, and CTA button.
-   **Navigation Stack**: `client/src/lib/navStack.ts` — sessionStorage-based route stack (20-entry cap). `RouteTracker` in App.tsx pushes every navigation. BackButton priority: `?from=` param → `popRoute()` → `history.back()` → smart fallback (context-aware: `/my-taste` for My Taste sub-pages, `/tasting` for tasting routes). SimpleShell bottom back button uses same logic via `BackButtonBottom`.
-   **My Taste (Personal Dashboard)**: Personal whisky profile hub requiring email+password sign-in. V2 layout (`v2_experience_first`) sections: Meine Drams (My Drams, My Tastings), Analyse (CaskSense Profile, Analytics, Compare, Recommendations, Benchmark), Sammlung (Collection, Wishlist), Downloads & Export (`/my-taste/downloads` — unified PDF templates + data export), Wissen/Knowledge (Lexicon, Distilleries, Bottlers, Guide, Rabbit Hole), About. No primary "+ Add Dram" CTA on My Taste home — solo logging lives in Tasting tab. All subpages include BackButton for consistent navigation. Legacy layout restorable by setting flag to `"legacy"`. Terminology: "Journal" → "My Drams", "Tasting Recap" → "Meine Tastings" / "My Tastings", "Geschmacksprofil" / "Flavor Profile" → "Mein CaskSense Profil" / "My CaskSense Profile".
-   **Lazy Loading**: Rarely accessed pages (GuidedPresentation, LandingV2, FeatureTour, Tour, AdminPanel, SupportConsole, Background, News, Intro, Landing, SimpleFeedbackPage, SimpleTestPage) are lazy-loaded via React.lazy with a Suspense fallback spinner. Core navigation paths remain eager-loaded.
-   **Discover (External World Hub)**: Restructured into 4 sections via `DISCOVER_STRUCTURE` flag in `client/src/lib/config.ts`. V2 layout: Community (Taste Twins, Whisky Friends, Community Rankings, Activity Feed), Wissen (Lexicon, Distilleries, Independent Bottlers, Whisky Database), Planen (Tasting Guide, Templates), Über (About, Donate). Legacy layout restorable by setting flag to `"legacy"`. Recommendations removed from Discover (accessible via My Taste).
-   **V2 Dark Warm UI (`/app`)**: Redesigned UI with an Apple-clean aesthetic and a whisky-warm dark color palette, featuring a 5-tab navigation.
-   **Simple Mode (`/enter`, `/log-simple`, `/my-taste`)**: Minimal UI for first-time users with client-side rate limiting. `/log-simple` IdentifyPicker shows three large Apple-style action cards: "Foto analysieren" (Photo), "Datei importieren" (File Import: Excel/CSV/PDF/DOCX), "Manuell erfassen" (Manual Entry). AI privacy notice below cards. Analysis states: analyzing, finished, uncertain. File upload calls `/api/tastings/ai-import` and auto-fills fields. All styles use `v.*` theme tokens for dual Dark Warm + Light theme support. i18n keys under `logSimple.*` namespace with exact DE+EN copy.
-   **Whisky Identification**: AI-powered identification via photo (GPT-4o Vision OCR) or text description, using fuzzy matching.
-   **Admin Tools**: Features for managing test data, AI kill switch, and platform settings. Admin panel renders in a dedicated `AdminLayout` shell (no consumer sidebar/bottom-nav), accessible at `/admin` with Dark Warm theme and "Back to App" link.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For web fonts.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For reading and writing Excel files.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For storing uploaded images.
-   **GPT-4o**: For AI-powered features.
-   **Capacitor**: For wrapping the PWA as native mobile applications.