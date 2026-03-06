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
The backend is an Express 5 HTTP server, providing RESTful API endpoints and serving frontend assets in production.

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
-   **Rating System**: Unified `M2RatingPanel` component (`client/src/components/m2/M2RatingPanel.tsx`) used across Solo, Live Tasting, and Hosting Dashboard. Features accordion-based dimension rating (nose/taste/finish/balance) with flavor chip selection, per-dimension text notes with voice input, auto-calculated overall with manual override, dynamic scale support, and compact mode for dashboard. Chips/texts are serialized into the notes field using `[NOSE]...[/NOSE]` block format.
-   **Context Level**: Three-tier data visibility control within active tasting sessions: Naked, Self, and Full.
-   **Navigation Structure (Simple Mode)**: Features a 2-tab bottom navigation (`v2_two_tab`) with "Tasting" and "Taste" sections, configurable via `NAV_VERSION` flag.
-   **Taste (Personal Dashboard)**: A personal whisky profile hub requiring sign-in, with sections for drams, analytics, collection, downloads, and knowledge base.
-   **Lazy Loading**: Pages less frequently accessed are lazy-loaded using React.lazy.
-   **Discover (External World Hub)**: Organized into sections for Community, Knowledge, Planning, and About.
-   **V2 Dark Warm UI (`/app`)**: Redesigned UI with an Apple-clean aesthetic and a whisky-warm dark color palette.
-   **Simple Mode (`/enter`, `/log-simple`, `/my-taste`)**: Minimalist UI for new users, featuring AI-powered whisky identification via photo or text, and file import.
-   **Admin Tools**: Provides functionalities for managing test data, AI kill switch, and platform settings, accessible via a dedicated `/admin` route.

### Module 2 (`/m2/*`) — Full Feature Parity
A fully self-contained parallel UI sharing the same backend, auth, and database, with a 3-tab bottom navigation (Tasting | Taste | People) and M2-specific profile menu.
-   **Core Components**: Includes `Module2Shell.tsx` for main layout, `M2BackButton.tsx` for navigation guards, `M2ProfileMenu.tsx` for authentication and settings, and `M2Feedback.tsx` for loading and error states.
-   **Tastings Tab (`/m2/tastings/*`)**: Manages tasting creation, joining, hosting, solo logging, session play, host controls, and results. Includes a comprehensive 4-step wizard for hosts.
-   **Taste Tab (`/m2/taste/*`)**: Provides a personal dashboard for users, including taste snapshots, profile analytics, dram management, collection sync, comparison tools, recommendations, and settings.
-   **Circle Tab (`/m2/circle`)**: Features community rankings, "Taste Twins," leaderboards, activity feeds, and friend management.
-   **Discover (`/m2/discover/*`)**: Hub for community, knowledge, planning, and information.
-   **Admin (`/m2/admin`)**: Dedicated route for administrative functionalities like user management, AI controls, and platform settings.

#### Hosting Dashboard (`/m2/tastings/session/:id/dashboard`) — 1 page
- `M2HostingDashboard` — Desktop-first live tasting control center with 3-column layout (Left: session status, live controls, blind reveal, guided navigation, session summary | Center: whisky lineup with per-dram progress, participant status roster with real-time rating indicators | Right: host's own rating via shared `M2RatingPanel` (compact mode) with accordion dimensions, flavor chips, per-dimension notes, and auto-save; participant view preview showing what guests currently see). Mobile companion view with essential controls and "desktop recommended" banner. Entry points from Step4Live and M2HostControl. Host-only access with authorization check.

### Test Suite
A comprehensive test framework using Vitest with unit, API, E2E, and smoke tests, covering Module2Shell rendering, authentication flows, API endpoints, and route verification.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For typography.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For Excel file processing.
-   **qrcode**: For generating QR codes.
-   **html5-qrcode**: For camera-based QR/barcode scanning.
-   **Replit Object Storage**: For image storage.
-   **GPT-4o**: For AI functionalities.
-   **Recharts**: For data visualization (radar charts, bar charts, pie charts, line charts).
-   **jsPDF**: For PDF generation (results, recap, tasting sheets).
-   **Framer Motion**: For animations.
-   **Capacitor**: For native mobile application wrapping.