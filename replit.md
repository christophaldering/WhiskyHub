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
A complete UI redesign with an Apple-clean aesthetic and a whisky-warm dark color palette. It features a streamlined 4-tab navigation (Home, Sessions, Discover, Cellar) with a "More" overflow for advanced features. It shares the same database and API endpoints as the original UI.

## External Dependencies

-   **PostgreSQL**: Primary database.
-   **Google Fonts**: For web fonts.
-   **Nodemailer**: For sending email notifications.
-   **ExcelJS**: For reading and writing Excel files.
-   **qrcode**: For generating QR code invitations.
-   **Replit Object Storage**: For storing uploaded images.
-   **GPT-4o**: For AI-powered features.
-   **Capacitor**: For wrapping the PWA as native mobile applications.