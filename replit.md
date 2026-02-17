# CaskSense - Whisky Tasting Application

## Overview
CaskSense is a web application designed for hosting and participating in collaborative whisky tasting sessions. It enables a host to create tasting events, invite participants, and guide them through a structured whisky evaluation process. Participants rate whiskies across various dimensions, and the host manages the session's progression through distinct stages, including a multi-act reveal phase for presenting results with analytics and charts. The project aims to provide a sophisticated and engaging platform for whisky enthusiasts to share and compare their tasting experiences.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The application employs a monorepo structure, separating client, server, and shared code. It is built entirely with TypeScript, utilizing ESM modules. A shared `schema.ts` defines Drizzle ORM and Zod validation schemas for consistent data handling across the frontend and backend.

### Frontend (`client/`)
The frontend is a React application built with Vite. It uses Wouter for routing, TanStack React Query for server state, and Zustand for client-side state management. The UI is constructed with shadcn/ui (new-york style) based on Radix UI primitives and Tailwind CSS, featuring a custom theme with a muted slate blue palette and a light mode alternative. Animations are handled by Framer Motion, and data visualizations are powered by Recharts. Internationalization is managed via react-i18next, supporting English and German. Fonts (Playfair Display and Inter) are chosen for a sophisticated aesthetic.

### Backend (`server/`)
The backend is an Express 5 HTTP server providing RESTful API endpoints. It serves the frontend assets in production and integrates with the Vite dev server for development. Participant identification is client-side, avoiding session-based authentication.

### API Structure
The API provides comprehensive endpoints for managing tastings, participants, whiskies, ratings, profiles, invitations, discussion, reflections, journal entries, and participant stats.

### Key Endpoints
- `GET /api/participants/:id/stats` — Aggregated participant statistics for badge computation
- `GET /api/journal/:participantId` — List journal entries
- `POST /api/journal/:participantId` — Create journal entry (Zod validated)
- `PATCH /api/journal/:participantId/:id` — Update journal entry (field-filtered)
- `DELETE /api/journal/:participantId/:id` — Delete journal entry

### Database
PostgreSQL is the primary database, accessed via Drizzle ORM. The schema includes tables for `participants`, `tastings`, `tasting_participants`, `whiskies`, `ratings`, `profiles`, `session_invites`, `whisky_friends`, `journal_entries`, `discussion_entries`, and `reflection_entries`. UUIDs are used for identifiers.

### Key Design Decisions
1.  **Lightweight Authentication**: Participant authentication is simplified, relying on name and an optional PIN stored client-side.
2.  **Shared Schema**: A single source of truth for database schema and validation ensures type safety and consistency.
3.  **Session State Machine**: Tastings progress through defined stages (draft, open, closed, reveal, archived) controlled by the host. The reveal stage has a multi-act structure.
4.  **Asynchronous Updates**: React Query polling is used for near real-time updates without WebSockets.
5.  **Bulk Import**: Hosts can import whisky data from various spreadsheet formats (Excel, CSV, TXT) with image attachment support.
6.  **Bottle Photo Uploads**: Supports image uploads (JPG, PNG, WebP, GIF) for whiskies, stored in Replit Object Storage (persistent cloud storage) and served via `/objects/` paths. Legacy `/uploads/` paths still supported as fallback.
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
17. **Whisky Journal**: Private tasting diary with CRUD operations, rich metadata, personal scores, mood/occasion tracking, and bottle photo uploads via object storage.
18. **Dark/Light Theme**: Togglable dark (warm whisky) and light (cream/amber) themes with localStorage persistence and no-flash initialization.
19. **Ambient Soundscapes**: Web Audio API procedural sound engine with three soundscapes (fireplace, rain, night), volume control, centralized state via Zustand.
20. **Whisky Lexicon**: Reference glossary with 53 bilingual entries across 5 categories, searchable with accordion sections.
21. **Host Briefing Notes**: Auto-generated summary cards for whiskies in a tasting, with print support.
22. **Achievement Badges**: 37 milestone badges (15 beginner + 22 expert tier) computed client-side from participant stats API, with progress tracking and thresholds up to 1000+ ratings.
23. **Personal Flavor Profile**: Radar charts showing taste dimension averages, region/cask/peat breakdowns, and top-rated whiskies.
24. **Whisky Recommendations**: Algorithm scoring unrated whiskies based on region (40%), cask (30%), and peat (30%) preferences.
25. **Side-by-Side Comparison**: Compare 2-3 rated whiskies with overlaid radar charts, score tables, notes, and details.
26. **Tasting Note Templates**: Pre-built vocabulary for 6 whisky styles (Islay, Speyside, Sherry, Bourbon, Highland, Japanese) with copy support.
27. **QR Code Invitations**: Generates a scannable QR code per tasting session for instant in-person joining via `qrcode` library.
28. **Friend Activity Feed**: Lightweight timeline showing friends' journal entries and tasting participations, refreshing every 60s.
29. **Shared Tasting Calendar**: Monthly calendar view of all tastings with status badges, upcoming events sidebar, and overview stats.
30. **Export & Share Tasting Notes**: Export personal ratings/notes from a tasting as printable PDF or copyable text with whisky details and scores.
31. **Host Dashboard Summary**: Overview page for hosts showing total tastings, participants, whiskies, average scores with bar chart, top-rated whiskies, and recent tastings.
32. **Tasting Recap**: Shareable post-tasting summary with top-rated whiskies, most divisive whisky, overall averages, and participant highlights.
33. **Flavor Wheel Visualization**: Interactive sunburst-style radial chart mapping flavor keywords from journal entries across 8 categories (Fruity, Floral, Sweet, Spicy, Woody, Smoky, Malty, Maritime).
34. **Smart Whisky Pairing Suggestions**: Algorithm analyzing a tasting lineup's regions/casks/peat levels and suggesting complementary whiskies from the database with reasoning.
35. **Participant Leaderboard**: Global rankings across 4 metrics: most active (ratings count), most detailed notes, highest rated, most consistent (lowest variance).
36. **Distillery Encyclopedia**: Reference page with ~100 distillery entries including history, descriptions, country, region, and founding year.
37. **Global Whisky Database**: Admin/host-only view of all whiskies ever tasted with ratings, filterable and searchable.
38. **Tasting Curation Wizard**: Multi-step wizard for planning flights by theme, region, style, or age with Whiskybase integration.
39. **Enhanced PDF Export**: Stylish themed cover page with customizable layouts for tasting menus.
40. **Whisky Detail Modal**: Click any whisky thumbnail/name in flight board to see full details in a modal.
41. **Blind Tasting Guesses**: ABV and age guess fields during blind tastings with post-reveal comparison.
42. **Reveal Confirmation**: Confirmation dialog before transitioning to reveal phase.
43. **Tasting Note Free Text**: Custom free text inputs in each flavor section of the tasting note generator.
44. **Words of Wisdom**: Curated real whisky industry quotes from famous figures on the home page.
45. **PWA Support**: Progressive Web App with manifest, service worker (network-first caching), Apple touch icon, and offline fallback. Installable on iOS/Android home screens.
46. **Flavor Wheel Ratings Integration**: Flavor wheel now analyzes both journal entries and tasting rating notes for keyword frequency mapping.
47. **Personal vs Global Statistics**: Flavor profile shows overlaid radar chart comparing personal averages with global averages from all participants, plus detailed comparison table.
48. **Journal Bottle Scanner**: AI-powered bottle identification in the whisky journal. Upload a photo of any bottle and GPT-4o reads the label to auto-fill whisky name, distillery, region, age, ABV, and cask type. Includes Whiskybase search link for external research.
49. **Whiskybase Research**: Photo Tasting and Journal scanner provide Whiskybase search links for whiskies not found in the internal database, enabling external verification and research.
50. **Independent Bottlers Encyclopedia**: Reference page with 20 independent bottler entries (Gordon & MacPhail, Signatory, Brühler Whiskyhaus, Douglas Laing, Compass Box, SMWS, etc.) including descriptions, specialties, and notable releases. Searchable with country filtering and sort options.
51. **Curation Wizard "Add to Tasting"**: Suggestions from the curation wizard can be directly transferred to the current tasting session via "Add to Tasting" buttons with visual confirmation.
52. **Forgot PIN Recovery**: Users who forgot their PIN can reset it via email verification code flow (request → verify → set new PIN).
53. **Benchmark Analyzer Enhancements**: Upload metadata display (uploader, timestamp, filename), inline delete with confirmation, and whisky-to-database selection toggle with visual distinction.

### Key Endpoints (continued)
- `GET /api/participants/:id/flavor-profile` — Aggregated flavor profile with radar data, breakdowns, and whisky lists
- `GET /api/participants/:id/friend-activity` — Friend activity feed (journal entries + tasting participations)
- `GET /api/calendar` — All tastings with host name, participant/whisky counts for calendar view
- `GET /api/tastings/:id/participant-notes` — Participant's ratings + whisky data for a tasting (export)
- `GET /api/hosts/:hostId/summary` — Host dashboard aggregation (tastings, participants, scores, top whiskies)
- `GET /api/tastings/:id/recap` — Tasting recap with top-rated, most divisive, averages, highlights
- `GET /api/tastings/:id/pairings` — Smart pairing suggestions based on lineup analysis
- `GET /api/leaderboard` — Global participant rankings across 4 metrics
- `GET /api/admin/overview` — Admin overview of all participants, hosts, tastings with stats (admin-only)
- `PATCH /api/admin/participants/:id/role` — Change participant role (admin-only)
- `DELETE /api/admin/participants/:id` — Delete participant with all data (admin-only, transactional)
- `DELETE /api/admin/tastings/:id` — Hard-delete tasting (admin-only)
- `GET /api/flavor-profile/global` — Global average scores across all participants
- `GET /api/participants/:id/rating-notes` — All rating notes for a participant (for flavor wheel)
- `POST /api/journal/identify-bottle` — Single bottle photo AI identification for journal entries (any participant)
- `GET /api/wishlist/:participantId` — List all wishlist entries for a participant
- `POST /api/wishlist/:participantId` — Create a wishlist entry
- `PATCH /api/wishlist/:participantId/:id` — Update a wishlist entry
- `DELETE /api/wishlist/:participantId/:id` — Delete a wishlist entry
- `POST /api/participants/forgot-pin` — Request PIN reset via email verification code
- `POST /api/participants/reset-pin` — Reset PIN with verification code and new PIN

## External Dependencies

-   **PostgreSQL**: The core relational database.
-   **Google Fonts**: Used for fetching Playfair Display and Inter fonts.
-   **Nodemailer**: Employed for sending email invitations (optional, requires SMTP configuration).
-   **SheetJS (xlsx)**: Used for parsing Excel files during bulk whisky import.
-   **qrcode**: Generates QR code data URLs for tasting session invitations.
-   **Leaflet / React-Leaflet**: Interactive maps for distillery locations using free CARTO dark tiles (no API key).
