# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application designed for hosting and participating in collaborative whisky tasting sessions. It enables a host to create tasting events, invite participants, and guide them through a structured whisky evaluation process. Participants rate whiskies across various dimensions, and the host manages the session's progression through distinct stages, including a multi-act reveal phase for presenting results with analytics and charts. The project aims to provide a sophisticated and engaging platform for whisky enthusiasts to share and compare their tasting experiences, offering features from session management to personalized analytics and a comprehensive whisky journal.

## Recent Changes
- **Printable Sheets Enhancement (Feb 2026)**: PDFs now include participant name, profile photo, session code, and date. Separate "Download PDF" and "Print" (browser dialog) buttons. Moved printable sheets into the ⋯ more menu for less prominence. Subtle analog hint on the join page.
- **Feedback System (Feb 2026)**: Floating feedback button (bottom-right) with category selector (New Feature / Improvement / Problem / Other), free-text message, and auto-populated participant name. Stored in `user_feedback` table. Admin panel has a new "Feedback" tab to review submissions.
- **Product Tour (Feb 2026)**: New visual product tour at `/tour` with 12 illustrated slides, split-screen layouts, TOC sidebar, keyboard/autoplay navigation, and Framer Motion animations. German-only content. PPTX export via `/api/tour-pptx` using pptxgenjs with embedded illustrations. Old `/feature-tour` still available.
- **Landing Page (Feb 2026)**: Added a public-facing landing page at `/` with Hero, Features, How It Works, Origin Story, Live Stats, AI Highlight, and CTA sections. The app dashboard moved from `/` to `/app`. All internal navigation updated accordingly. Full EN/DE translations. New `/api/platform-stats` endpoint serves live database counts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application employs a monorepo structure, separating client, server, and shared code, built entirely with TypeScript and ESM modules. A shared `schema.ts` defines Drizzle ORM and Zod validation schemas for consistent data handling.

### Frontend (`client/`)
The frontend is a React application built with Vite, utilizing Wouter for routing, TanStack React Query for server state, and Zustand for client-side state. The UI uses shadcn/ui (new-york style) based on Radix UI and Tailwind CSS, featuring a custom muted slate blue theme and light mode. Animations are handled by Framer Motion, data visualizations by Recharts, and internationalization via react-i18next (English and German). Fonts are Playfair Display and Inter. PWA support is included for installability and offline access.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints. It serves frontend assets in production and integrates with the Vite dev server for development. Participant identification is client-side.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for participants, tastings, whiskies, ratings, profiles, journal entries, and other session-related data, using UUIDs for identifiers.

### Key Design Decisions
-   **Lightweight Authentication**: Participant authentication relies on name and an optional PIN stored client-side.
-   **Shared Schema**: A single source of truth for database schema and validation.
-   **Session State Machine**: Tastings progress through defined stages (draft, open, closed, reveal, archived) controlled by the host, with a multi-act reveal stage.
-   **Asynchronous Updates**: React Query polling is used for near real-time updates.
-   **Bulk Import & Photo Uploads**: Hosts can import whisky data from spreadsheets and upload bottle photos, stored in Replit Object Storage.
-   **Whiskybase Integration**: External links to Whiskybase for research and collection import.
-   **Tasting Features**: Includes whisky management, flight board view, PDF export of tasting menus, blind mode, discussion panel, tasting note generator, and cover image banner for sessions (uploadable by host for any tasting type, auto-set from group photo in photo-tastings). Cover images are hidden during blind tastings with host-controlled reveal. Host delegation allows transferring the host role to another participant during a session.
-   **Personalization & Analytics**: Participant profiles, whisky journal, achievement badges, personal flavor profiles (radar charts), whisky recommendations, side-by-side comparisons, and flavor wheel visualization.
-   **Host Tools**: Host briefing notes, tasting curation wizard, calendar view, and dashboard summary.
-   **Communication**: Session invitations via email (Nodemailer) or QR codes, and a friend activity feed. Tasting Reminders via email with configurable timing offsets.
-   **Knowledge Base**: Whisky Lexicon, Distillery Encyclopedia, and Independent Bottlers Encyclopedia.
-   **AI Integration**: AI-powered bottle identification for journal entries (GPT-4o) and AI-powered newsletter content generation.

## External Dependencies

-   **PostgreSQL**: Core relational database.
-   **Google Fonts**: For specified fonts (Playfair Display, Inter).
-   **Nodemailer**: For sending email invitations.
-   **SheetJS (xlsx)**: For parsing Excel files during bulk whisky import.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For persistent storage of uploaded bottle images.
-   **GPT-4o**: For AI-powered bottle identification.
-   **Capacitor**: For wrapping the PWA as native iOS/Android apps for App Store/Play Store distribution.

## Mobile App (Capacitor)

The project is configured for native mobile app builds via Capacitor:
-   **Config**: `capacitor.config.ts` (App ID: `com.casksense.app`)
-   **Icons**: Generated in `client/public/icons/` (all required sizes from 20x20 to 1024x1024)
-   **Build Guide**: See `MOBILE_APP_GUIDE.md` for step-by-step instructions
-   **Build Command**: `npm run build && npx cap sync` to prepare, then `npx cap open ios/android`
-   **Plugins**: SplashScreen, StatusBar configured with dark theme