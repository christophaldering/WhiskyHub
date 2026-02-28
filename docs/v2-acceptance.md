# CaskSense V2 Acceptance Checklist

## Database Integrity
- [x] No schema changes (shared/schema.ts unchanged)
- [x] No new migrations created
- [x] No new DB connection strings
- [x] No new environment variables for DB
- [x] Single PostgreSQL database used by all UIs

## API Integrity
- [x] No v2 API endpoints created
- [x] No server-side code references lab-dark or v2
- [x] All V2 pages use existing API client objects from client/src/lib/api.ts
- [x] No duplicated business logic on server

## Legacy UI Integrity
- [x] /legacy/* routes serve the existing UI with full Layout
- [x] All existing canonical routes still work at original paths (/home, /tasting, etc.)
- [x] All redirect routes still function
- [x] No existing pages or components modified
- [x] Navigation structure unchanged in legacy Layout

## V2 Feature Integration
- [x] /app/home — Dashboard with greeting, active session, quick actions, recents, Quick Log
- [x] /app/sessions — Session list with Active/History tabs
- [x] /app/session/:id — Full tasting room with ratings, notes, debounced save
- [x] /app/discover — Bottle search + category stubs with legacy links
- [x] /app/cellar — Journal, Collection, Wishlist tabs + legacy links for Stats/Badges
- [x] /app/more — All remaining features organized in groups, linking to /legacy/*
- [x] /app/admin — Admin panel accessible

## Zero Feature Loss Verification
- [x] Every route from feature-inventory.md is accessible in V2 (directly or via More > legacy link)
- [x] Quick Log saves to journal via existing journalApi.create()
- [x] Ratings save via existing ratingApi.upsert()
- [x] Session data from existing tastingApi
- [x] Collection/Wishlist from existing collectionApi/wishlistApi
- [x] No feature marked as "obsolete"

## Routing
- [x] / — Landing page
- [x] /app/* — V2 Dark Warm UI
- [x] /legacy/* — Existing UI
- [x] /lab-dark/* — Experimental Lab surface
- [x] /join/:code, /naked/:code — Special routes work
- [x] No 404 errors on any mapped route
