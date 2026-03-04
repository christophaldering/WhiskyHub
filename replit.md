# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application designed for hosting and participating in collaborative whisky tasting sessions. It provides tools for event creation, participant management, and structured whisky evaluation. The platform offers session progression control, multi-act reveals with analytics and charts, and personalized features like a whisky journal and analytics. The project aims to be a leading platform for structured whisky tasting, fostering a global community and providing sophisticated tools for enthusiasts of all levels.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application uses a monorepo with client, server, and shared code, all in TypeScript with ESM modules. A shared `schema.ts` defines Drizzle ORM and Zod validation schemas.

### Frontend (`client/`)
The frontend is a React application built with Vite, using Wouter for routing, TanStack React Query for server state, and Zustand for client-side state. The UI is built with shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a muted slate blue theme and light mode. Framer Motion is used for animations, Recharts for data visualizations, and react-i18next for internationalization (English and German). It includes PWA support. The Dark Warm theme (`client/src/lib/theme.ts`) centralizes all color tokens, shared styles (inputStyle, cardStyle), slider CSS, and spacing constants for the ~20 dark-themed pages/components.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints and serving frontend assets in production. It supports an immediate listen startup for health checks and a loading page, with a `ready` flag indicating full application availability.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, and journal entries, using UUIDs for identifiers.

### Key Design Decisions
-   **Authentication**: Email + password login with optional display name. Password visibility toggle (eye icon). Session persistence via `sessionStorage`/`localStorage` with `resumeToken` for auto-resume. Account management from session sheet: change name, email, password. Email changes require double-entry confirmation (confirm email field appears only when email differs from saved value, save disabled until match). Password reset via email verification code (`POST /api/participants/forgot-pin` + `reset-pin`). Email recovery via name + password (`POST /api/participants/recover-email`, returns masked email). Legacy bcrypt-hashed PINs supported. Naked tasting join remains name + session-code + password. Login form uses standard `autoComplete` attributes for iOS/browser autofill compatibility. Hidden honeypot trap fields are isolated in a separate form to prevent interference with password managers. **TODO**: When scaling to multiple users, consider adding CAPTCHA or server-side rate limiting as additional bot protection.
-   **Data Access Security**: Personal data endpoints (journal, ratings, rating-notes, participant profile) require `x-participant-id` header matching the requested participant ID. Non-owner requests to `GET /api/participants/:id` return limited fields (id, name, role, language). The `POST /api/participants/lookup` endpoint is restricted to admin users. The frontend `fetchJSON` helper and `pidHeaders()` utility automatically attach the header.
-   **Guest Account Upgrade**: After a tasting ends, guests without an email see an upgrade prompt to add email + password for easier recovery. Dismissal persists in localStorage.
-   **Shared Schema**: Ensures data consistency across the stack.
-   **Session State Machine**: Tastings progress through stages (draft, open, closed, reveal, archived) controlled by the host.
-   **Asynchronous Updates**: React Query polling provides near real-time updates for session data.
-   **Data Import & Management**: Hosts can import whisky data and upload bottle photos.
-   **Tasting Features**: Includes whisky management, flight board, PDF export, blind mode, discussion panel, tasting note generator, and host-uploadable cover images.
-   **Personalization & Analytics**: Features participant profiles, a whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and a flavor wheel. Privacy-respecting per-tasting analytics are provided. Native Dark Warm analytics page at `/my-taste/analytics` with four insight cards: Taste Profile (dimension bars + smoke affinity + top flavors), Taste Map (SVG radar chart), Taste Evolution (monthly average line chart), Rating Consistency (stability score + stats grid).
-   **Data Access Model**: Participants see their own ratings and anonymized group analytics. Hosts see all individual ratings for their hosted tastings.
-   **Internationalization**: Supports German (DE) and English (EN).
-   **Host Tools**: Host briefing notes, tasting curation wizard, calendar view, and dashboard summary. Host page Tools section includes Data Export link, inline calendar, and Full Host Dashboard link. Documents section provides downloadable blank PDF templates: Score Sheet (Verkostungsbogen, portrait A4 with 6 whisky slots) and Tasting Mat (landscape A4 with glass placement circles). Session-specific menus and sheets are available in the live tasting room.
-   **Full Host Dashboard** (`/host-dashboard`): Dark Warm host cockpit with 6 sections: (1) Stat cards (tastings, participants, whiskies), (2) Quick Actions (new tasting, sessions, export) + Next Tasting highlight, (3) Average Scores chart + Documents panel (PDF downloads), (4) Top Whiskies (with bottle thumbnails) + Tools & Analytics panel, (5) Recent Tastings with per-session action buttons (Results, Preview), (6) Calendar + Invitations info. Full-width header, responsive grid layout.
-   **Whisky Bottle Thumbnails**: Displayed across 8 UI locations when `imageUrl` is available: (1) Tasting Room participant view (blind-mode aware — only after reveal), (2) Host Live View whisky list, (3) Dram Control active whisky, (4) Tasting Results rankings, (5) Host Dashboard top whiskies, (6) Journal entries, (7) Tasting Recap top 5, (8) Comparison whisky selector. Uses consistent sizing (24-48px width, cover fit, rounded corners). No fallback placeholder — gracefully hidden when no image.
-   **SimpleShell Header**: Full viewport width (not constrained by content maxWidth). CaskSense brand far-left, user name/button far-right. Sticky with backdrop blur.
-   **Guided Tasting Polling**: Participant view polls at 800ms in guided mode (vs 3000ms free mode) for near-instant whisky transitions. Whisky list also polls faster (3s vs 10s) in guided mode.
-   **Session Sheet**: Opens as top-right dropdown (not bottom sheet). `position: absolute; top: 0; right: 0` with bottom border radius.
-   **Communication**: Session invitations via email or QR codes.
-   **Knowledge Base**: Includes a Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **AI Integration**: AI for bottle identification, newsletter content generation, market price estimation, and tasting suggestions. Two-tier AI access: admin can toggle platform-wide AI via `ai_master_disabled` setting, and users can add their own OpenAI API key in their profile (`profiles.openaiApiKey`). Resolution order: user's own key (preferred) → platform key (if enabled) → AI unavailable. Server-side resolver: `server/ai-client.ts` (`getAIClient(participantId, featureId)`).
-   **Collection Sync**: Whiskybase collection supports smart sync/diff via CSV re-upload.
-   **Host Wizard (Simple Mode)**: A 4-step inline wizard for creating sessions, adding whiskies, inviting participants, and running live tastings.
-   **Tasting Results**: `/tasting-results/:id` displays a ranked list of whiskies by average overall score after a tasting ends. Shows avg score, rating count, and expandable detail breakdowns (Nose/Taste/Finish/Balance bars). Multi-format export: CSV, Excel (.xlsx), and PDF via dropdown menu. Backend: `GET /api/tastings/:id/results`. Accessible from Host History list and Run Live ended state. File: `client/src/pages/tasting-results.tsx`.
-   **Participant Tasting Room**: A dedicated view for participants during live tastings, adapting to guided or free mode, blind settings, and reveal stages.
-   **Tasting Creation**: Supports single entry, list import, and AI-curated suggestions for whiskies.
-   **Guest Mode**: Offers "Standard Naked" (persisted identity) and "Ultra Naked" (ephemeral identity) participation modes.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked (0), Self (1), and Full (2).
-   **Navigation Structure (Simple Mode)**: 5-tab bottom navigation for Join, Log, Host, My Taste, and Discover.
-   **My Taste (Personal Dashboard)**: Personal whisky profile hub requiring email+password sign-in (no naked participants). Shows Taste Snapshot (stability/exploration/smoke scores), AI Taste Insight, and 14 navigation cards: Flavor Wheel (`/my-taste/flavors`), Flavor Profile (radar vs. platform avg), Comparison (`/my-taste/compare`), Analytics (`/my-taste/analytics`, threshold-gated at 10 whiskies), Journal, My Whiskies (all rated, filterable), Collection (Whiskybase sync), Wishlist, Benchmark Analyzer, Recommendations, Taste Twins, Whisky Friends, Tasting Recap, Export Notes.
-   **Discover (External World Hub)**: Separated from personal features. Sections: Community (Twins, Rankings, Leaderboard, Activity at `/discover/community`), Recommendations, Knowledge (Lexicon at `/discover/lexicon`, Distilleries at `/discover/distilleries`, Whisky Database). Live platform stats (taster count, whisky count) shown at top.
-   **Native Dark Warm Detail Pages**: `/my-taste/flavors` (PieChart flavor wheel with keyword parsing from journal+ratings), `/my-taste/compare` (RadarChart side-by-side whisky comparison), `/my-taste/analytics` (4 insight cards: Taste Profile, Taste Map, Taste Evolution, Rating Consistency), `/discover/lexicon` (searchable accordion with i18n EN/DE), `/discover/community` (tabbed Twins/Rankings/Leaderboard), `/discover/distilleries` (searchable/filterable encyclopedia).
-   **SimpleLegacyShell**: Routes for legacy features are wrapped in a `SimpleLegacyShell` to provide consistent header and bottom navigation, while preserving legacy content in a white container.
-   **V2 Dark Warm UI (`/app`)**: A redesigned UI with an Apple-clean aesthetic and a whisky-warm dark color palette, featuring a 5-tab navigation.
-   **Simple Mode (`/enter`, `/log-simple`, `/my-taste`)**: A minimal UI for first-time users with no navigation chrome, including a join flow with client-side rate limiting.
-   **Whisky Identification**: AI-powered whisky identification via photo (GPT-4o Vision OCR) or text description, using fuzzy matching against an in-memory database index. Includes menu detection and confidence badges.
-   **Admin Tools**: Features for managing test data, AI kill switch, and platform settings for banners, registration, guest mode, maintenance, and email notifications.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For web fonts.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For reading and writing Excel files.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For storing uploaded images.
-   **GPT-4o**: For AI-powered features.
-   **Capacitor**: For wrapping the PWA as native mobile applications.