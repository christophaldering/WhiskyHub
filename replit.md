# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application designed for hosting and participating in collaborative whisky tasting sessions. It enables a host to create tasting events, invite participants, and guide them through a structured whisky evaluation process. Participants rate whiskies across various dimensions, and the host manages the session's progression through distinct stages, including a multi-act reveal phase for presenting results with analytics and charts. The project aims to provide a sophisticated and engaging platform for whisky enthusiasts to share and compare their tasting experiences.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application employs a monorepo structure, separating client, server, and shared code. It is built entirely with TypeScript, utilizing ESM modules. A shared `schema.ts` defines Drizzle ORM and Zod validation schemas for consistent data handling across the frontend and backend.

### Frontend (`client/`)
The frontend is a React application built with Vite. It uses Wouter for routing, TanStack React Query for server state, and Zustand for client-side state management. The UI is constructed with shadcn/ui (new-york style) based on Radix UI primitives and Tailwind CSS, featuring a custom theme with a muted slate blue palette. Animations are handled by Framer Motion, and data visualizations are powered by Recharts. Internationalization is managed via react-i18next, supporting English and German. Fonts (Merriweather and Inter) are chosen for a sophisticated aesthetic.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints. It serves the frontend assets in production and integrates with the Vite dev server for development. Participant identification is client-side, avoiding session-based authentication.

### API Structure
The API provides comprehensive endpoints for managing tastings, participants, whiskies, ratings, profiles, invitations, discussion, and reflections. Key functionalities include participant login, tasting creation and management, whisky CRUD operations (including image uploads and bulk import), participant profiles, session invitations via email, attendee rosters, blind tasting mode controls, and discussion/reflection entry management.

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for `participants`, `tastings`, `whiskies`, `ratings`, `profiles`, `session_invites`, `whisky_friends`, `journal_entries`, `discussion_entries`, and `reflection_entries`. UUIDs are used for identifiers.

### Key Design Decisions
1.  **Lightweight Authentication**: Participant authentication is simplified, relying on name and an optional PIN stored client-side.
2.  **Shared Schema**: A single source of truth for database schema and validation ensures type safety and consistency.
3.  **Session State Machine**: Tastings progress through defined stages (draft, open, closed, reveal, archived) controlled by the host. The reveal stage has a multi-act structure.
4.  **Asynchronous Updates**: React Query polling is used for near real-time updates without WebSockets.
5.  **Bulk Import**: Hosts can import whisky data from various spreadsheet formats (Excel, CSV, TXT) with image attachment support.
6.  **Bottle Photo Uploads**: Supports image uploads (JPG, PNG, WebP, GIF) for whiskies, stored and served locally.
7.  **Whiskybase Integration**: Provides external links to Whiskybase for research, with direct links when a `whiskybaseId` is available.
8.  **Whisky Management**: Comprehensive features for editing, reordering, and deleting whiskies within a tasting.
9.  **Flight Board View**: A structured display of whiskies within a tasting, optimized for host and participant views.
10. **PDF Export**: Generates customizable PDF tasting menus with cover and lineup pages.
11. **Participant Profiles**: Optional profiles for participants to share details and preferences, visible to other attendees.
12. **Session Invitations**: Hosts can invite participants via email using Nodemailer, with a fallback to shareable links.
13. **Blind Mode**: A dedicated blind tasting feature where whisky details are progressively revealed by the host.
14. **Discussion Panel**: A basic real-time discussion feature for active sessions using polling.
15. **Tasting Note Generator**: An interactive tool to assist participants in crafting structured tasting notes using predefined flavor categories.
16. **Reflection Phase**: An optional post-tasting reflection feature with configurable prompts and visibility settings.

## External Dependencies

-   **PostgreSQL**: The core relational database.
-   **Google Fonts**: Used for fetching Merriweather and Inter fonts.
-   **Nodemailer**: Employed for sending email invitations (optional, requires SMTP configuration).
-   **SheetJS (xlsx)**: Used for parsing Excel files during bulk whisky import.