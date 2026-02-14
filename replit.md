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
- Rating endpoints for upserting and querying evaluations

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **Drizzle ORM** with `drizzle-zod` for schema-to-validation integration
- Schema push via `npm run db:push` (uses drizzle-kit)
- Tables: `participants`, `tastings`, `tasting_participants` (join table), `whiskies`, `ratings`
- UUIDs generated via PostgreSQL's `gen_random_uuid()`
- Storage layer (`server/storage.ts`) implements an `IStorage` interface with a `DatabaseStorage` class

### Database Schema
- **participants**: id, name, pin (optional), language, createdAt
- **tastings**: id, title, date, location, hostId, code (join code), status, currentAct, hostReflection, createdAt
- **tasting_participants**: id, tastingId, participantId, joinedAt
- **whiskies**: id, tastingId, name, distillery, age, abv, type, notes, sortOrder, category, region, abvBand, ageBand, caskInfluence, peatLevel
- **ratings**: id, participantId, whiskyId, tastingId, nose, taste, finish, balance, overall, notes

### Build Process
- `npm run dev` — Development server with Vite HMR
- `npm run build` — Builds client with Vite, bundles server with esbuild into `dist/index.cjs`
- `npm run start` — Runs production build
- Server bundling selectively externalizes dependencies for faster cold starts

### Key Design Decisions
1. **Lightweight auth**: No passwords or sessions — just name + optional PIN stored client-side via Zustand. Chosen for simplicity in a social tasting context.
2. **Shared schema**: Drizzle schema in `shared/` ensures type safety across the full stack without duplication.
3. **Session state machine**: Tastings progress through draft → open → closed → reveal (with 4 acts) → archived, controlled by the host.
4. **Real-time-ish updates**: Uses React Query polling (refetchInterval) rather than WebSockets for simplicity.

## External Dependencies

- **PostgreSQL** — Primary database, required via `DATABASE_URL` environment variable
- **Google Fonts** — Merriweather and Inter loaded from fonts.googleapis.com
- **No external APIs** — The app is self-contained with no third-party service integrations currently active (though build config references @google/generative-ai, openai, stripe, and nodemailer as potential future integrations)