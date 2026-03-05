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
The frontend is a React application built with Vite, Wouter for routing, TanStack React Query for server state, and Zustand for client-side state. UI components are built with shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a muted slate blue theme and light mode. Framer Motion is used for animations, Recharts for data visualizations, and react-i18next for internationalization (English and German). It includes PWA support. The application features a Dark Warm theme with centralized color tokens and shared styles, and specific typography for page titles. A theme toggle system (`themeVars.ts`) supports Dark Warm and Light Warm themes via CSS custom properties. Shared styles (`cardStyle`, `inputStyle`, `pageTitleStyle`, `sliderCSS`, `typo.*`) use CSS variables for automatic theme awareness. The `alpha()` helper enables CSS-variable-compatible opacity via `color-mix()`.

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
-   **Tasting Features**: Includes whisky management, flight board, PDF export, blind mode, discussion panel, tasting note generator, and host-uploadable cover images.
-   **Personalization & Analytics**: Features participant profiles, a whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and a flavor wheel. Privacy-respecting per-tasting analytics are provided.
-   **Data Access Model**: Participants see their own ratings and anonymized group analytics; hosts see all individual ratings for their hosted tastings.
-   **Internationalization**: Fully migrated to react-i18next with `t()` calls — zero `isDE` ternaries remain. Supports German (DE) and English (EN). i18n keys in `client/src/lib/i18n.ts` (~7,900+ lines). All 20 main page files verified: zero hardcoded UI strings remain (brand names like "CaskSense" excluded). PDF generation functions use `tp()` helper with `{ lng: lang }` to respect the passed language parameter. Admin panel strings are English-only (internal tool).
-   **Host Tools**: Host briefing notes, tasting curation wizard, calendar view, dashboard summary, data export, and downloadable PDF templates for score sheets and tasting mats.
-   **Whisky Bottle Thumbnails**: Displayed consistently across the UI when an `imageUrl` is available.
-   **Guided Tasting Polling**: Faster polling rates in guided tasting mode for near real-time updates.
-   **Communication**: Session invitations via email or QR codes.
-   **Knowledge Base**: Includes a Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **AI Integration**: AI for bottle identification, content generation, market price estimation, tasting suggestions, and Whiskybase ID auto-fill lookup. Supports user-provided OpenAI API keys or platform-wide AI access.
-   **Whiskybase ID Lookup**: Entering a Whiskybase ID in the Log form auto-fills Name, Distillery, Age, ABV, Cask Type, and Price — first checks user's collection, then falls back to GPT-4o-mini. Rate-limited (10/min) and cached (1h).
-   **Barcode Scanner**: Camera-based barcode scanning (EAN-13/UPC-A) in the Log form identifies whisky bottles and auto-fills all fields including Whiskybase ID. Uses html5-qrcode library with manual code entry fallback. Rate-limited and cached.
-   **Collection Sync**: Whiskybase collection supports smart sync/diff via CSV re-upload.
-   **Host Wizard (Simple Mode)**: A 4-step inline wizard for creating sessions, adding whiskies, inviting participants, and running live tastings, with options for manual entry, AI identification, and CSV import.
-   **Tasting Results**: Displays ranked whiskies by average overall score after a tasting, with detailed breakdowns and multi-format export (CSV, Excel, PDF).
-   **Participant Tasting Room**: Dedicated view adapting to guided/free mode, blind settings, and reveal stages.
-   **Tasting Creation**: Supports single entry, list import, and AI-curated suggestions.
-   **Guest Mode**: Offers "Standard Naked" (persisted identity) and "Ultra Naked" (ephemeral identity) participation.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked (0), Self (1), and Full (2).
-   **Navigation Structure (Simple Mode)**: 2-tab bottom navigation (v2_two_tab): Tasting, My Taste. Controlled by `NAV_VERSION` in `client/src/lib/config.ts`. Previous configs: `v2_simplified` (3-tab: Tasting, My Taste, Explore), `v1` (5-tab: Join, Log, Host, My Taste, Discover). Discover/Explore content absorbed into My Taste under Knowledge, Community, and About sections. Landing page controlled by `LANDING_VERSION` flag: `two_screen_start` shows 3 primary actions (Join, Add Dram, Host) + 2 secondary (My Taste, Settings); `legacy_menu` preserves old layout.
-   **My Taste (Personal Dashboard)**: Personal whisky profile hub requiring email+password sign-in, showing taste snapshot, AI insights, flavor profiles, analytics, recommendations, journal, and collection management. Sections: Mein Profil (Flavor Profile, Aroma Wheel `/my-taste/wheel`, Settings `/my-taste/settings`), Auswertungen (Analytics, Compare, Benchmark, Food Pairings `/my-taste/pairings`, Recommendations), Meine Daten (Journal, Achievements), Meine Sammlung (Collection, Wishlist). Restructured via `MY_TASTE_STRUCTURE` flag in `client/src/lib/config.ts`. V2 layout (`v2_experience_first`): Drams section primary (Journal, Tasting Recap, Flavor Profile + primary CTA), Collection section secondary. Legacy layout restorable by setting flag to `"legacy"`.
-   **Discover (External World Hub)**: Restructured into 4 sections via `DISCOVER_STRUCTURE` flag in `client/src/lib/config.ts`. V2 layout: Community (Taste Twins, Whisky Friends, Community Rankings, Activity Feed), Wissen (Lexicon, Distilleries, Independent Bottlers, Whisky Database), Planen (Tasting Guide, Templates), Über (About, Donate). Legacy layout restorable by setting flag to `"legacy"`. Recommendations removed from Discover (accessible via My Taste).
-   **V2 Dark Warm UI (`/app`)**: Redesigned UI with an Apple-clean aesthetic and a whisky-warm dark color palette, featuring a 5-tab navigation.
-   **Simple Mode (`/enter`, `/log-simple`, `/my-taste`)**: Minimal UI for first-time users with client-side rate limiting.
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