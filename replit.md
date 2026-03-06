# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application designed to facilitate collaborative whisky tastings. It enables users to create events, manage participants, and conduct structured whisky evaluations with features like tasting progression, multi-act reveals with analytics, and personalized tools such as a whisky journal. The project aims to establish a leading platform for structured whisky tasting, fostering a global community and providing advanced tools for whisky enthusiasts. Key capabilities include comprehensive whisky management, personalized analytics, and AI-powered integrations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application is a TypeScript monorepo with separate client, server, and shared code using ESM modules. Data consistency is ensured via a shared `schema.ts` for Drizzle ORM and Zod validation.

### Frontend (`client/`)
The frontend is a React application built with Vite, Wouter for routing, TanStack React Query for server state, and Zustand for client state. UI components leverage shadcn/ui (New York style) based on Radix UI and Tailwind CSS, featuring a Dark Warm theme with centralized color tokens and support for a Light Warm theme. It incorporates Framer Motion for animations, Recharts for data visualization, and react-i18next for internationalization (English and German), supporting PWA features.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints and serving frontend assets in production.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, journal entries, communities, and community memberships, all identified by UUIDs.

### Key Design Decisions
-   **Authentication**: Email/password login with session persistence, account management, and guest mode.
-   **Data Access Security**: Enforces `x-participant-id` header validation and limits non-owner data exposure.
-   **Shared Schema**: Ensures consistent data definitions across client and server.
-   **Session State Machine**: Tastings transition through defined stages (draft, open, closed, reveal, archived) managed by the host.
-   **Asynchronous Updates**: Uses React Query polling for near real-time session data updates.
-   **Public Landing Page**: Apple-style landing page with Framer Motion scroll animations.
-   **Downloads**: Printable templates and data export functionalities integrated into relevant sections (e.g., Host Wizard, Settings).
-   **Tasting Features**: Includes whisky management, flight board, PDF export, blind mode, discussion panel, tasting note generator, and host-uploadable cover images.
-   **Personalization & Analytics**: Participant profiles, whisky journal, achievement badges, personal flavor profiles, whisky recommendations, side-by-side comparisons, and privacy-respecting per-tasting analytics.
-   **Internationalization**: Full migration to react-i18next supporting German and English. All M2 page headers, subtitles, action card labels, status badges, filter options, and empty states are fully translated in both languages via `client/src/lib/i18n.ts` (EN block starts line ~11, DE block starts line ~5473, M2-specific keys in `m2:` sub-objects at lines ~4255 / ~9683).
-   **Host Tools**: Host briefing notes, tasting curation wizard, dashboard summary, and tasting management.
-   **AI Integration**: AI for bottle identification, content generation, market price estimation, tasting suggestions, and Whiskybase ID auto-fill lookup.
-   **Whiskybase ID Lookup & Barcode Scanner**: Auto-filling whisky details via Whiskybase ID or camera-based barcode scanning with rate limiting and caching.
-   **Collection Sync**: Smart synchronization of Whiskybase collections via CSV re-upload.
-   **Tasting Hub (`/tasting`)**: Central hub for joining, hosting, or logging solo drams.
-   **Host Wizard (Simple Mode)**: Streamlined 4-step wizard for creating and managing tastings.
-   **Tasting Results**: Displays ranked whiskies by average overall score with detailed breakdowns and export options.
-   **Guest Mode**: Offers "Standard Naked" (persisted identity) and "Ultra Naked" (ephemeral identity) participation.
-   **Rating System**: Unified `M2RatingPanel` component for detailed, multi-dimensional ratings with flavor chip selection, voice input, and score normalization.
-   **Score Normalization**: All scores normalized to a 0–100 scale for cross-source comparison, with normalization applied at write-time and backfilled on startup.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked, Self, and Full.
-   **Module 2 (`/m2/*`)**: A fully self-contained parallel UI with a 3-tab bottom navigation (Tasting | Taste | Circle), sharing the same backend, auth, and database.
    -   **Apple-Level Bottom Navigation**: Custom SVG icons with Apple-grade visual polish, including GlencairnIcon, RadarIcon, and CircleIcon.
    -   **Apple-Design-System (M2 UI Polish)**: Comprehensive design upgrades including Playfair Display headers, refined NavRows, dynamic Tasting Cards, enhanced Stat Boxes, iOS-style Segmented Controls, inviting Empty States, and elegant Skeleton Loading.
    -   **Ambient Warm Glow**: Subtle, slowly drifting radial gradient (amber/gold at ~4% opacity) behind all M2 content via `Module2Shell.tsx`. CSS-only `m2ambientGlow` keyframe animation (20s cycle), GPU-accelerated with `willChange: transform`, `pointer-events: none`. Rendered as a `position: fixed` layer at `zIndex: 0` below content (`main` has `position: relative; zIndex: 1`). Creates an unconscious warmth like candlelight on dark wood. Respects `prefers-reduced-motion`.
    -   **Live-Tasting Pulse**: Open/reveal tastings "breathe" — left color edge pulses opacity (0.5 to 1 to 0.5, 2.5s cycle via `m2livePulse`) and status badge pulses box-shadow (0 to 4px spread, 2.5s via `m2badgePulse` using CSS custom property `--pulse-color` derived from the tasting's status color). Only active for `status === "open" || "reveal"`. Signals "something is happening now." Keyframes defined centrally in `Module2Shell.tsx`, not per card.
    -   **Action Cards (Joyn/Host/Solo)**: Apple-quality primary action cards with distinctive iconography, gradient backgrounds, and subtle touch feedback.
    -   **Hosting Dashboard**: Desktop-first live tasting control center with a 3-column layout for session status, whisky lineup, participant roster, and host's rating panel.
    -   **Historical Tastings**: Production-grade archive of externally imported tasting data with detailed views, insights, and robust community-gated access control.
    -   **Collection Analysis**: Comprehensive analytics page for user's Whiskybase collection.
    -   **Circle Tab**: Features community rankings, "Taste Twins," leaderboards, activity feeds, and friend management with real-time online notifications.
-   **Admin Tools**: Functionalities for managing test data, AI controls, and platform settings. Community member list shows participant names and emails (not UUIDs) via backend JOIN on `participants` table.

### CSS Animation Architecture (M2)
All M2-specific keyframe animations are defined centrally in a single `<style>` block within `Module2Shell.tsx`:
-   `m2ambientGlow` — Background glow drift (20s cycle)
-   `m2fadeInUp` — Card entrance animation (opacity + translateY)
-   `m2livePulse` — Live tasting edge breathing (opacity cycle)
-   `m2badgePulse` — Live badge box-shadow pulse (uses `var(--pulse-color)`)
-   `prefers-reduced-motion` media query disables all animations globally
Page-specific animations (`m2spin`, `m2shimmer`) remain inline in their respective components.

### Test Suite
A comprehensive test framework using Vitest covers unit, API, E2E, and smoke tests, including Module2Shell rendering, authentication flows, API endpoints, and historical tasting helpers.

### Production Auto-Seed
On production startup, `seedProductionData()` automatically seeds missing data like the default community and historical tastings from an Excel file, linking them with `community_only` visibility.

### Data Quality & Admin Tools
Includes historical reconciliation tools (`GET /api/admin/historical/reconciliation`) for auditing imported data and optimized DB indexes (`idx_historical_tastings_tasting_number`, `idx_historical_entries_tasting_id`).

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For typography.
-   **Nodemailer**: For email notifications.
-   **ExcelJS**: For Excel file processing.
-   **qrcode**: For QR code generation.
-   **html5-qrcode**: For camera-based QR/barcode scanning.
-   **Replit Object Storage**: For image storage.
-   **GPT-4o**: For AI functionalities.
-   **Recharts**: For data visualization.
-   **jsPDF**: For PDF generation.
-   **Framer Motion**: For animations.
-   **Capacitor**: For native mobile application wrapping.
