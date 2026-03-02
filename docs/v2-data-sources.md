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

## Simple Mode Pages → API Endpoints

| Simple Page | API Client | Endpoints Used |
|-------------|-----------|----------------|
| /enter | participantApi | POST /api/participants |
| /enter | tastingApi | GET /api/tastings/code/:code |
| /enter | tastingApi | POST /api/tastings/:id/join |
| /log-simple | participantApi | POST /api/participants |
| /log-simple | journalApi | POST /api/journal/:participantId |
| /tasting-room-simple/:id | tastingApi | GET /api/tastings/:id |
| /tasting-room-simple/:id | whiskyApi | GET /api/tastings/:id/whiskies |
| /tasting-room-simple/:id | ratingApi | GET /api/ratings/:participantId/:whiskyId |
| /tasting-room-simple/:id | ratingApi | POST /api/ratings |
| /my-taste | participantApi | POST /api/participants |
| /my-taste | — | GET /api/participants/:id/insights |
| /simple-feedback | — | localStorage only (no backend endpoint) |

## Data Consistency
All data created/modified in V2 is immediately visible in Legacy UI and vice versa, because both use the same API endpoints and same database.
