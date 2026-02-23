# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application for hosting and participating in collaborative whisky tasting sessions. It allows hosts to create events, invite participants, and guide them through a structured whisky evaluation. Participants rate whiskies, and the host manages session progression through various stages, including a multi-act reveal phase with analytics and charts. The platform aims to provide an engaging experience for whisky enthusiasts to share, compare, and deepen their understanding of whisky through session management, personalized analytics, and a comprehensive whisky journal. The project envisions becoming the leading platform for structured whisky tasting, fostering a global community and offering sophisticated tools for both casual and expert enthusiasts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application uses a monorepo structure with client, server, and shared code, all built with TypeScript and ESM modules. A shared `schema.ts` file defines Drizzle ORM and Zod validation schemas for data consistency.

### Frontend (`client/`)
The frontend is a React application built with Vite, using Wouter for routing, TanStack React Query for server state management, and Zustand for client-side state. The UI is developed with shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a custom muted slate blue theme and light mode. Framer Motion handles animations, Recharts provides data visualizations, and react-i18next is used for internationalization (English and German). Fonts are Playfair Display and Inter. PWA support is included for installability and offline access. UI elements adapt dynamically to chosen rating scales (5/10/20/100 points). Progressive onboarding for different experience levels (guest, explorer, connoisseur, analyst) guides users through features.

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
-   **Personalization & Analytics**: Features participant profiles, a whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and a flavor wheel. Privacy-respecting per-tasting analytics are provided, showing aggregated group statistics alongside individual participant data. Platform-wide analytics include measurement quality, predictive validity, and AI analysis.
-   **Host Tools**: Host briefing notes, a tasting curation wizard, calendar view, and a dashboard summary.
-   **Communication**: Session invitations via email or QR codes, with a friend activity feed and configurable tasting reminders.
-   **Knowledge Base**: Includes a Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **AI Integration**: AI-powered bottle identification for journal entries and AI-powered newsletter content generation. AI bottle scan results are cached for efficiency.
-   **Guest Mode**: Offers a streamlined guest experience for quick participation, with progressive navigation menu visibility based on `experienceLevel`.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override. Simplified rating view for Guest/Explorer levels.
-   **Experience Levels**: Four progressive levels — guest (Just Tasting), explorer (Entdecker), connoisseur (Kenner), analyst. Landing page features Just Tasting as a full-width hero card emphasizing minimal tech, with Explorer/Connoisseur/Analyst below.
-   **Navigation Structure**: Menu organized into 9 groups: Dashboard (lobby, news, sessions, calendar), My Profile (profile, "Mein Whisky-Profil" w/ flavor wheel tab), My Tastings (history, "me as host", recap, export notes), My Whiskys (tasted, journal, collection, wishlist), Tools & Analytics (recommendations, comparison, templates, pairings, whisky library, whisky database, analytics), Community, Whisky Knowledge, About CaskSense, Account (settings, data export, admin). Badges hidden from menu but route preserved. Reminders integrated into Calendar page (no separate menu item, old `/reminders` route redirects to `/calendar`). Whisky Database moved from My Whiskys to Tools & Analytics (analyst+ level, host/admin access).
-   **Whisky Library**: Formerly "Benchmark-Analyse", now a tabbed library with Import, Tastingnotizen, Auswertungen, Artikel, and Sonstiges tabs. Post-upload classification dialog routes extracted data to library (with category), wishlist, or tasted whiskies. Uses `libraryCategory` field on benchmark_entries.
-   **Data Source Tracking**: Journal entries have a `source` field (casksense/imported/whiskybase). "Meine verkosteten Whiskys" and "Mein Whisky-Profil" pages include data source filters. CaskSense session data is default; imported/external data only shown when actively enabled by the user.
-   **Whisky Profile Page**: Renamed from "Geschmacksprofil" to "Mein Whisky-Profil" with 3 distinct tabs: "Geschmacksanalyse" (radar chart, region/peat/cask breakdowns, top list), "Whisky-Profil" (statistical analysis, rating behavior), "Aromarad" (flavor wheel). Each analytics section has explanatory descriptions in DE/EN.
-   **Participant Deduplication**: Backend calculations (global averages, platform analytics, host dashboard, admin stats) deduplicate participants by (name, pin) combination to avoid double-counting the same person across multiple tastings.
-   **About the Method**: Tasting methodology content integrated into the About page's Overview tab as compact cards, replacing the standalone `/about-method` page.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For web fonts.
-   **Nodemailer**: For sending email notifications and invitations.
-   **ExcelJS**: For reading and writing Excel files.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For storing uploaded images.
-   **GPT-4o**: For AI-powered features like bottle identification and content generation.
-   **Capacitor**: For wrapping the PWA as native iOS and Android applications.