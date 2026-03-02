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

## Simple Mode
- [x] Landing has 3 primary CTAs: Join (/enter), Log (/log-simple), My Taste (/my-taste)
- [x] All Simple pages use SimpleShell — no sidebar, no bottom nav, no legacy layout
- [x] /join redirects to /enter (not /tasting/sessions)
- [x] /log redirects to /log-simple (not /my/journal)
- [x] /profile redirects to /my-taste (not legacy profile)
- [x] Landing shows "Already using CaskSense Pro?" link to /app
- [x] Join flow: name/PIN → code entry → tasting-room-simple/:id
- [x] Rate-limit: 5 attempts / 5 minutes on join code lookup (client-side sessionStorage)
- [x] /simple-test page with happy-path checklist + route buttons
- [x] /simple-feedback page with satisfaction/simplicity ratings + clipboard copy
- [x] Console logs prefixed with [SIMPLE_MODE]
- [x] Error handling with inline messages on all Simple pages

## Routing
- [x] / — Landing page (3 Simple Mode CTAs + Pro link)
- [x] /enter — Simple join flow (SimpleShell)
- [x] /log-simple — Simple whisky log (SimpleShell)
- [x] /my-taste — Taste profile (SimpleShell)
- [x] /tasting-room-simple/:id — Rating room without legacy layout
- [x] /simple-test — Happy-path test checklist
- [x] /simple-feedback — Feedback form
- [x] /app/* — V2 Dark Warm UI
- [x] /legacy/* — Existing UI
- [x] /lab-dark/* — Experimental Lab surface
- [x] /join/:code, /naked/:code — Special routes work
- [x] No 404 errors on any mapped route
