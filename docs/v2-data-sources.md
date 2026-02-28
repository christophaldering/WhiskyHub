# CaskSense V2 Data Sources

## V2 Page → API Endpoints

| V2 Page | API Client | Endpoints Used |
|---------|-----------|----------------|
| /app/home | tastingApi | GET /api/tastings |
| /app/home | journalApi | POST /api/journal/:participantId |
| /app/sessions | tastingApi | GET /api/tastings |
| /app/session/:id | tastingApi | GET /api/tastings/:id |
| /app/session/:id | whiskyApi | GET /api/tastings/:id/whiskies |
| /app/session/:id | ratingApi | GET /api/ratings/:participantId/:whiskyId |
| /app/session/:id | ratingApi | POST /api/ratings |
| /app/discover | journalApi | GET /api/journal/:participantId |
| /app/discover | collectionApi | GET /api/collection/:participantId |
| /app/cellar | journalApi | GET /api/journal/:participantId |
| /app/cellar | collectionApi | GET /api/collection/:participantId |
| /app/cellar | wishlistApi | GET /api/wishlist/:participantId |
| /app/more | — | Links to /legacy/* (no direct API calls) |

## Authentication
All V2 pages use `useAppStore().currentParticipant` from Zustand store (shared with legacy UI). Same auth state across all surfaces.

## Data Consistency
All data created/modified in V2 is immediately visible in Legacy UI and vice versa, because both use the same API endpoints and same database.
