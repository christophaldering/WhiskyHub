# CaskSense - Whisky Tasting Application

## Overview

CaskSense is a collaborative whisky tasting and evaluation web application. It allows a host to create tasting sessions with multiple whiskies, invite participants via a join code, and guide them through a structured evaluation process. Participants rate whiskies on multiple dimensions (nose, taste, finish, balance, overall) and the host can control the session flow through stages: draft → open → closed → reveal → archived. The reveal phase has a multi-act structure (act1 through act4) for a theatrical presentation of results with analytics and charts.

The app supports English and German via i18next internationalization and uses a lightweight participant authentication system (name + optional PIN).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
- **Monorepo layout** with three top-level directories: `client/`, `server/`, and `shared/`
- `shared/schema.ts` contains the Drizzle ORM schema and Zod validation schemas used by both frontend and backend
- TypeScript throughout, using ESM modules

### Frontend (`client/`)
- **React** with **Vite** as the build tool
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack React Query** for server state management and API data fetching
- **Zustand** for client-side state (current participant, language preference), persisted to localStorage
- **shadcn/ui** component library (new-york style) with **Radix UI** primitives and **Tailwind CSS**
- **Framer Motion** for animations
- **Recharts** for data visualization (bar charts, radar charts in the reveal view)
- **react-i18next** for internationalization (English and German)
- Path aliases: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- Fonts: Merriweather (serif) and Inter (sans-serif) for a sophisticated European academic aesthetic
- Custom theme with muted slate blue primary color and warm neutral tones

### Backend (`server/`)
- **Express 5** HTTP server
- RESTful API endpoints under `/api/` prefix
- In development: Vite dev server middleware serves the frontend with HMR
- In production: static files served from `dist/public/`
- No session-based auth — participants are identified by ID stored client-side

### API Structure
- `POST /api/participants` — Login or create participant (name + optional PIN)
- `GET /api/participants/:id` — Get participant
- `PATCH /api/participants/:id/language` — Update language preference
- `GET /api/tastings` — List all tastings
- `POST /api/tastings` — Create tasting
- `GET /api/tastings/:id` — Get tasting
- `GET /api/tastings/code/:code` — Find tasting by join code
- `PATCH /api/tastings/:id/status` — Update tasting status and current act
- `PATCH /api/tastings/:id/reflection` — Update host reflection
- `POST /api/tastings/:id/join` — Join a tasting
- `GET /api/tastings/:id/participants` — List tasting participants
- `GET /api/tastings/:id/whiskies` — List whiskies in a tasting
- `GET /api/tastings/:id/analytics` — Get aggregated tasting analytics
- `POST /api/whiskies` — Add whisky to tasting
- `PATCH /api/whiskies/:id` — Update whisky
- `DELETE /api/whiskies/:id` — Delete whisky
- `POST /api/whiskies/:id/image` — Upload bottle photo for a whisky
- `DELETE /api/whiskies/:id/image` — Remove bottle photo
- `POST /api/tastings/:id/import/parse` — Parse spreadsheet (Excel/CSV/TXT) and return preview
- `POST /api/tastings/:id/import/confirm` — Confirm import: create whiskies in bulk with optional ZIP/URL images
- `PATCH /api/participants/:id` — Update participant (name, email)
- `GET /api/profiles/:participantId` — Get participant profile
- `PUT /api/profiles/:participantId` — Create/update profile (bio, preferences, favorite whisky, etc.)
- `POST /api/profiles/:participantId/photo` — Upload profile photo
- `DELETE /api/profiles/:participantId/photo` — Remove profile photo
- `GET /api/tastings/:id/invites` — List invitations for a tasting
- `POST /api/tastings/:id/invites` — Send invitations (emails + personal note)
- `GET /api/invites/:token` — Look up invite by token
- `POST /api/invites/:token/accept` — Accept an invite (joins tasting)
- `GET /api/tastings/:id/roster` — Get attendee roster with profiles
- `GET /api/smtp/status` — Check SMTP configuration status
- Rating endpoints for upserting and querying evaluations

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **Drizzle ORM** with `drizzle-zod` for schema-to-validation integration
- Schema push via `npm run db:push` (uses drizzle-kit)
- Tables: `participants`, `tastings`, `tasting_participants` (join table), `whiskies`, `ratings`, `profiles`, `session_invites`
- UUIDs generated via PostgreSQL's `gen_random_uuid()`
- Storage layer (`server/storage.ts`) implements an `IStorage` interface with a `DatabaseStorage` class

### Database Schema
- **participants**: id, name, pin (optional), email (optional), language, createdAt
- **tastings**: id, title, date, location, hostId, code (join code), status (draft|open|closed|reveal|archived|deleted), currentAct, hostReflection, createdAt
- **tasting_participants**: id, tastingId, participantId, joinedAt
- **whiskies**: id, tastingId, name, distillery, age, abv, type, notes, sortOrder, category, region, abvBand, ageBand, caskInfluence, peatLevel, ppm, whiskybaseId, imageUrl
- **ratings**: id, participantId, whiskyId, tastingId, nose, taste, finish, balance, overall, notes
- **profiles**: id, participantId, bio, favoriteWhisky, goToDram, preferredRegions, preferredPeatLevel, preferredCaskInfluence, photoUrl, createdAt, updatedAt
- **session_invites**: id, tastingId, email, token, personalNote, status (invited/joined), acceptedAt, createdAt

### Build Process
- `npm run dev` — Development server with Vite HMR
- `npm run build` — Builds client with Vite, bundles server with esbuild into `dist/index.cjs`; injects GIT_SHA and BUILD_TIME into the server bundle
- `npm run start` — Runs production build (`NODE_ENV=production node dist/index.cjs`)
- Server bundling selectively externalizes dependencies for faster cold starts

### Deployment (Publishing)
- **Build command**: `npm run build`
- **Run command**: `npm run start`
- The production server serves the Vite-built SPA from `dist/public/` with a catch-all fallback to `index.html` for SPA routing
- Uploads directory (`/uploads`) is served via express.static for bottle images
- Health check: `GET /health` returns `{"status":"ok"}`
- Version info: `GET /version` returns `{"version","gitSha","buildTime","env"}`
- On startup, the server logs version, build SHA, environment, and build time
- The `GIT_SHA` env var is injected at build time; falls back to "dev" in development

### Key Design Decisions
1. **Lightweight auth**: No passwords or sessions — just name + optional PIN stored client-side via Zustand. Chosen for simplicity in a social tasting context.
2. **Shared schema**: Drizzle schema in `shared/` ensures type safety across the full stack without duplication.
3. **Session state machine**: Tastings progress through draft → open → closed → reveal (with 4 acts) → archived, controlled by the host.
4. **Real-time-ish updates**: Uses React Query polling (refetchInterval) rather than WebSockets for simplicity.
5. **Flight import**: Hosts can bulk-import whiskies from Excel (.xlsx), CSV, or TXT files. Supports image attachment via URL column or multi-file upload with smart filename matching (case-insensitive exact match, whisky name auto-matching). Uses SheetJS (xlsx) for Excel parsing. Two-step flow: parse → preview with image mapping → confirm.
6. **Bottle photo uploads**: Multer-based image upload (JPG, PNG, WebP, GIF, max 2 MB) stored in `/uploads` directory, served via express.static. Supports upload during creation and editing. Graceful error handling with bilingual messages.
7. **Whiskybase integration**: Non-scraping external link integration. "Find on Whiskybase" button auto-constructs search queries from name + distillery + age + ABV. Direct page link when whiskybaseId is present.
8. **EditWhiskyDialog**: Host can edit existing whiskies (when session is draft/open) with full form + photo replace/remove functionality.
9. **Whisky reorder**: Host can reorder whiskies in a flight using up/down arrow buttons. Batch reorder endpoint (`PATCH /api/tastings/:id/reorder`) updates sortOrder for all items in a single request.
10. **Whisky deletion**: Host can delete whiskies from a flight with a confirmation dialog (AlertDialog). Deletion cascades: removes all associated ratings, cleans up image files from disk, then deletes the whisky record.
11. **Flight Board view**: Two-column menu-style layout in tasting room (tab navigation). Shows order number, thumbnail, name, distillery, age/ABV primary meta, and second meta line (region, cask, peat, ppm, whiskybase). Supports reorder (up/down) and delete per dram. Paginated at 12 items per page (6 per column).
12. **PDF export**: jsPDF-based tasting menu PDF generation. Two-page layout: cover page (title, date, location, optional background image, optional quote, optional participants list) and lineup page (two-column list with thumbnails and second meta line). Configurable via dialog: title, date, quote, background image, include participants toggle, include photos toggle.
13. **Participant profiles**: Optional profile page with photo upload, bio (400 chars max), favorite whisky, go-to dram, preferred regions/peat/cask. Profiles are public to other attendees in the same session. Profile photos use the same multer upload system as bottle photos.
14. **Session invitations**: Hosts can invite participants by email. Uses nodemailer with SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL). Falls back to shareable invite links if SMTP is not configured. Invites use random 48-char hex tokens with status tracking (invited → joined). Invite acceptance auto-joins the tasting.
15. **Attendee roster**: Shows participants in a tasting with profile photos and names. Clicking a participant opens a read-only profile card. Host badge for the session creator.
16. **Blind Mode**: Host can enable blind tasting during session creation. In blind mode, whisky identities (name, details, image) are hidden from participants. Host controls a sequential reveal: each "Reveal Next" step progresses through name → meta → image for each expression in order. Uses `revealIndex` (which expression) and `revealStep` (0=blind, 1=name, 2=meta, 3=image). Sidebar and navigation pills respect blind state.
17. **Discussion panel**: Real-time chat panel visible during active (open) sessions. Uses React Query polling (3s interval). Participants post messages with their name and timestamp. Locked when session is not open.
18. **Reflection phase**: Optional post-tasting reflection enabled at session creation. Supports standard 4 prompts or custom host-defined prompts (1–5). Three visibility modes: named, anonymous, or optional (participant chooses). Uses `reflection_entries` table. Panel shows per-prompt submission with all reflections aggregated.

### Database Schema (additions)
- **discussion_entries**: id, tastingId, participantId, participantName, text, createdAt
- **reflection_entries**: id, tastingId, participantId, participantName, promptText, text, isAnonymous, createdAt

### API Structure (additions)
- `PATCH /api/tastings/:id/blind-mode` — Update blind mode settings (host only)
- `POST /api/tastings/:id/reveal-next` — Advance blind reveal (host only)
- `GET /api/tastings/:id/discussions` — List discussion entries
- `POST /api/tastings/:id/discussions` — Post discussion entry
- `GET /api/tastings/:id/reflections` — List all reflections
- `GET /api/tastings/:id/reflections/mine/:participantId` — Get participant's reflections
- `POST /api/tastings/:id/reflections` — Post a reflection

## External Dependencies

- **PostgreSQL** — Primary database, required via `DATABASE_URL` environment variable
- **Google Fonts** — Merriweather and Inter loaded from fonts.googleapis.com
- **Nodemailer** — Email sending for session invitations (requires SMTP configuration via environment variables; optional — falls back to copy links)
- **No external APIs** — The app is self-contained with no third-party service integrations currently active (though build config references @google/generative-ai, openai, stripe as potential future integrations)