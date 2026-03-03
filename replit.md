# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application for hosting and participating in collaborative whisky tasting sessions. It enables hosts to create events, invite participants, and manage structured whisky evaluations. Participants rate whiskies, and hosts control session progression through various stages, including a multi-act reveal with analytics and charts. The platform aims to provide an engaging experience for whisky enthusiasts, offering session management, personalized analytics, and a comprehensive whisky journal. The project's vision is to become a leading platform for structured whisky tasting, fostering a global community and providing sophisticated tools for all levels of enthusiasts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application uses a monorepo structure with client, server, and shared code, all built with TypeScript and ESM modules. A shared `schema.ts` file defines Drizzle ORM and Zod validation schemas.

### Frontend (`client/`)
The frontend is a React application built with Vite, utilizing Wouter for routing, TanStack React Query for server state management, and Zustand for client-side state. The UI uses shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a custom muted slate blue theme and light mode. Framer Motion is used for animations, Recharts for data visualizations, and react-i18next for internationalization (English and German). PWA support is included. UI elements dynamically adapt to chosen rating scales (5/10/20/100 points).

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints. It serves frontend assets in production and integrates with the Vite development server.

### Production Startup (Preload Pattern)
A lightweight `server/preload.cjs` script runs as a separate process during deployment startup. It starts an HTTP server on port 5000 immediately (within ~200ms), responding to all requests with HTTP 200. This ensures deployment healthchecks pass while the main Express app initializes (~5-7 seconds). The main app signals the preload process via SIGTERM when ready, then takes over port 5000. Deployment run command: `bash -c "node dist/preload.cjs & PRELOAD_PID=$!; PRELOAD_PID=$PRELOAD_PID node dist/index.cjs"`. The preload script is copied to `dist/` during build by `script/build.ts`.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, and journal entries, using UUIDs for identifiers.

### Key Design Decisions
-   **Authentication**: Participant authentication uses a name and a mandatory 4-digit PIN.
-   **Shared Schema**: Ensures data consistency across the stack.
-   **Session State Machine**: Tastings progress through defined stages (draft, open, closed, reveal, archived) with host-controlled advancement.
-   **Asynchronous Updates**: React Query polling enables near real-time updates for session data.
-   **Data Import & Management**: Hosts can import whisky data from spreadsheets and upload bottle photos.
-   **Tasting Features**: Includes whisky management, flight board view, PDF export of tasting menus, blind mode, discussion panel, tasting note generator, and host-uploadable cover images.
-   **Personalization & Analytics**: Features participant profiles, a whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and a flavor wheel. Privacy-respecting per-tasting analytics are provided.
-   **Data Access Model**: Participants see their own ratings and anonymized group analytics. Hosts see all individual ratings for their hosted tastings. Platform-wide cross-tasting analytics are admin-only.
-   **Internationalization**: Actively supports German (DE) and English (EN).
-   **Host Tools**: Host briefing notes, a tasting curation wizard, calendar view, and a dashboard summary.
-   **Communication**: Session invitations via email or QR codes.
-   **Knowledge Base**: Includes a Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **AI Integration**: AI-powered bottle identification for journal entries, newsletter content generation, market price estimation, and tasting suggestions.
-   **Collection Sync**: Whiskybase collection supports smart sync/diff via CSV re-upload.
-   **Tasting Creation**: Supports multiple whisky input methods, including single entry, list import, and AI-curated suggestions.
-   **Guest Mode**: Offers "Standard Naked" (persisted identity) and "Ultra Naked" (ephemeral identity) participation modes, controllable by the host. Naked Tasting supports Flow, Focus, and Journal UI modes.
-   **Rating System**: Dynamic step sizing for rating sliders and auto-calculated overall scores with manual override.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked (0), Self (1), and Full (2).
-   **Navigation Structure**: Desktop sidebar with 6 sections (Genuss, Pro, Profil, Wissen, Über, Admin) and a mobile bottom nav with 5 tabs (Home, Tasting, Journal, Entdecken, Profil).
-   **Whisky Library**: A tabbed library for managing whisky data, including import, tasting notes, analyses, articles, and other categories.
-   **Data Source Tracking**: Journal entries track their source (casksense/imported/whiskybase).
-   **Whisky Profile Page**: Provides "Geschmacksanalyse," "Whisky-Profil," and "Aromarad" tabs.
-   **Participant Deduplication**: Backend deduplicates participants by (name, pin) for accurate analytics.
-   **Admin AI Profiles**: Admin panel includes PIN-protected AI participant profiles generated by GPT-4o.
-   **Admin Settings**: Centralized platform settings for banners, registration, guest mode, maintenance, and email notifications.
-   **Test Data Management**: Tastings can be flagged as "test data" to exclude them from platform analytics.
-   **AI Kill Switch**: Admin can disable AI features globally or per-feature.

### V2 Dark Warm UI (`/app`)
A complete UI redesign with an Apple-clean aesthetic and a whisky-warm dark color palette. It features a 5-tab navigation (Home, Sessions, Discover, Cellar, More) on both mobile bottom nav and desktop left sidebar. More page provides grouped links to all legacy features (Profile, Host Tools, Analysis, Social, Knowledge, About, Legal, Admin). `/app/join/:code` and `/app/naked/:code` render outside AppShellV2 (no nav chrome). Files in `client/src/v2/`. Components: AppShellV2, PageHeaderV2, CardV2, ListRowV2, SegmentedControlV2, BottomSheetV2, SearchBarV2, EmptyStateV2. All built with Tailwind + CSS custom properties (tokens.css), no shadcn dependency. Same database and API endpoints as the original UI.

### Simple Mode (`/enter`, `/log-simple`, `/my-taste`)
A minimal "Simple Mode" for first-time users with no navigation chrome. Three entry points from the landing page, all rendered with `SimpleShell` (centered container, Dark Warm colors, no sidebar/nav). Includes `/simple-test` (happy-path checklist) and `/simple-feedback` (user feedback form). Join flow includes client-side rate limiting (5 attempts / 5 min). Redirect leak prevention: `/join`→`/enter`, `/log`→`/log-simple`, `/profile`→`/my-taste`. Files in `client/src/pages/simple-*.tsx` and `client/src/components/simple/`.

### Session Auth v2 (Sign In / Auto-Resume)
-   **Terminology**: UI uses "Sign in" / "Sign out" (internally `unlocked` state variable).
-   **Two modes**: `log` (personalized saving, name optional) and `tasting` (anonymous, PIN-only).
-   **Session persistence**: `sessionStorage` keys (`session_signed_in`, `session_mode`, `session_name`, `session_pid`) — cleared on tab close.
-   **Auto-resume**: On sign-in with "Stay signed in" checked, server generates a 32-byte hex `resumeToken` stored in `localStorage` (`session_remember`, `session_resume_token`, `session_resume_mode`, `session_resume_name`). On next visit, `tryAutoResume()` calls `POST /api/session/resume` to restore session. No plaintext PIN stored.
-   **Endpoints**: `POST /api/session/signin` (validates PIN, returns optional resumeToken), `POST /api/session/resume` (validates token, returns mode/name), `POST /api/session/signout` (invalidates token). Old `/api/simple/unlock|resume|logout` kept as aliases.
-   **Rate limits**: signin 5/5min per IP, resume 30/min per IP.
-   **Token storage**: In-memory `Map` with 14-day TTL. Tokens lost on server restart (graceful fallback to signed-out).
-   **Gating**: Users can fill whisky/score/notes while signed out. Save click gates on sign-in — after successful sign-in, save auto-proceeds.
-   **Auth lib**: `client/src/lib/session.ts` — canonical module with `getSession()`, `signIn()`, `tryAutoResume()`, `signOut()`, `setSessionPid()`. `client/src/lib/simple-auth.ts` is a backward-compat wrapper.
-   **SessionSheet component**: `client/src/components/session-sheet.tsx` — shared bottom sheet for sign-in/sign-out, used in both SimpleShell (dark variant) and Classic Layout (light variant). Shows session status, inline sign-in form with name/PIN/remember, sign-out button.
-   **Classic Layout integration**: Key icon button in header bar opens SessionSheet (light variant). Auto-resumes on mount.

### Whisky Identification (Phase 2)
AI-powered whisky identification with 3 input methods on `/log-simple`:
-   **Take Photo**: Camera capture of bottle label or menu → GPT-4o Vision OCR → fuzzy matching against DB index.
-   **Upload Photo(s)**: Gallery/file upload (1-5 images), best result used.
-   **Describe**: Text input → direct fuzzy matching (no OCR needed, instant).
-   **Endpoints**: `POST /api/whisky/identify` (multipart photo), `POST /api/whisky/identify-text` (JSON query).
-   **Pipeline**: `server/lib/ocr.ts` (GPT-4o Vision) → `server/lib/whiskyIndex.ts` (in-memory DB index, 5min TTL) → `server/lib/matching.ts` (token overlap + trigram + distillery/name substring + age bonus) → `server/lib/cache.ts` (LRU SHA-256, 24h TTL, 200 entries).
-   **Menu Detection**: `detectMode()` identifies multi-whisky text (menu/list) when 2+ distilleries found; uses per-line scoring + aggregation.
-   **Confidence Badges**: High >=0.78, Medium 0.55-0.77, Low <0.55. Source shown as "Library"/"External".
-   **Rate Limiting**: 5 requests per 5 minutes per IP on identify endpoints.
-   **Fallback**: Unknown whisky → structured block in journal notes or localStorage with Copy/Download JSON.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For web fonts.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For reading and writing Excel files.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For storing uploaded images.
-   **GPT-4o**: For AI-powered features.
-   **Capacitor**: For wrapping the PWA as native mobile applications.