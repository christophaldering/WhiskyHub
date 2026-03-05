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
-   **Internationalization**: Fully migrated to react-i18next, supporting German and English, with all UI strings internationalized.
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
-   **Navigation Structure (Simple Mode)**: Features a 2-tab bottom navigation (`v2_two_tab`) with "Tasting" and "My Taste" sections, configurable via `NAV_VERSION` flag.
-   **My Taste (Personal Dashboard)**: A personal whisky profile hub requiring sign-in, with sections for personal drams, analytics, collection, downloads, and knowledge base.
-   **Lazy Loading**: Pages less frequently accessed are lazy-loaded using React.lazy.
-   **Discover (External World Hub)**: Organized into sections for Community, Knowledge, Planning, and About.
-   **V2 Dark Warm UI (`/app`)**: Redesigned UI with an Apple-clean aesthetic and a whisky-warm dark color palette.
-   **Simple Mode (`/enter`, `/log-simple`, `/my-taste`)**: Minimalist UI for new users, featuring AI-powered whisky identification via photo or text, and file import.
-   **Admin Tools**: Provides functionalities for managing test data, AI kill switch, and platform settings, accessible via a dedicated `/admin` route.
-   **Module 2 (`/m2/*`)**: Fully self-contained parallel UI sharing the same backend, auth, and database. NO cross-links to the old app — all navigation stays within `/m2/*`. 3-tab bottom nav (Tastings | Taste | Circle) with M2-specific profile menu (`M2ProfileMenu.tsx`, not SessionSheet). Components: `Module2Shell.tsx`, `M2BackButton.tsx` (enforces M2-only navigation via `isM2Route` guard), `M2ProfileMenu.tsx`. Pages: `M2TastingsHome`, `M2TastingsJoin`, `M2TastingsHost`, `M2TastingsSolo` (inline dram logger), `M2TastingSession`, `M2HostControl`, `M2TastingPlay` (inline rating UI), `M2TasteHome`, `M2TasteProfile`, `M2TasteAnalytics`, `M2TasteDrams`, `M2TasteCollection`, `M2CircleHome`. All use `v.*` theme tokens, i18n under `m2.*` namespace. Landing page has secondary CTA linking to `/m2`.

### Test Suite
Comprehensive test framework using Vitest with 4 tiers:
-   **Unit tests** (`tests/unit/`): Module2Shell rendering, M2BackButton fallback logic, theme token validation, i18n coverage. Config: `vitest.config.ts` (jsdom, @vitejs/plugin-react). Run: `npm run test:unit`.
-   **API tests** (`tests/api/`): Health endpoint, auth signin, tastings CRUD. Config: `vitest.config.api.ts` (node). Run: `npm run test:api`.
-   **E2E tests** (`tests/e2e/`): Fetch-based route verification for all `/m2/*` and existing routes, auth flow integration. Config: `vitest.config.e2e.ts` (node). Run: `npm run test:e2e`.
-   **Smoke tests** (`tests/smoke.ts`): CLI script checking server health, DB, auth, M2 routing. Run: `npm run test:smoke`.
-   **Full suite**: `npm run test:all` (unit + api + e2e + smoke). 39 tests total.
-   **Test data**: `npm run db:seed:test` creates test user (`test.m2@casksense.local`) and test tasting with 3 whiskies. Cleanup: `npx tsx server/cleanup-test.ts`.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For typography.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For Excel file processing.
-   **qrcode**: For generating QR codes.
-   **Replit Object Storage**: For image storage.
-   **GPT-4o**: For AI functionalities.
-   **Capacitor**: For native mobile application wrapping.