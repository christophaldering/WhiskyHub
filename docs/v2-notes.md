# CaskSense V2 — Dark Warm UI Notes

## What is /app?
The V2 "Dark Warm" UI is a complete redesign of CaskSense with an Apple-clean aesthetic and whisky-warm dark color palette. It provides a streamlined 4-tab navigation (Home, Sessions, Discover, Cellar) with a "More" overflow menu for all additional features.

## How to Access
- **V2 UI**: Navigate to `/app` or `/app/home`
- **Legacy UI**: Navigate to `/legacy` or `/legacy/home`
- **Lab Dark**: Navigate to `/lab-dark` (experimental surface, admin-only link in sidebar)
- **Landing**: `/` — public landing page

## Architecture
- All V2 files live in `client/src/v2/`
  - `theme/tokens.css` — CSS variables for Dark Warm palette
  - `components/` — Reusable V2 components (AppShellV2, CardV2, etc.)
  - `pages/` — V2 page implementations
- No server-side changes. No new API endpoints. No DB modifications.
- V2 uses the same `client/src/lib/api.ts` API clients as Legacy.
- Auth state shared via Zustand store.

## Known Stubs/Limitations
- Discover > Pairings, Templates, Distilleries, Community, Knowledge tabs show "Coming soon" placeholders with "Open in Classic View" links to legacy
- Cellar > Stats and Badges tabs link to legacy pages
- More page links all advanced features to legacy routes
- No desktop sidebar in V2 (mobile-first bottom nav with 5 tabs: Home, Sessions, Discover, Cellar, More; desktop uses compact left sidebar with same 5 items)
- `/app/join/:code` and `/app/naked/:code` render outside AppShellV2 (no nav chrome for tasting flows)

## Simple Mode
A minimal "Simple Mode" UI for first-time users and small circle testing. Three entry points from the landing page, all rendered with `SimpleShell` (centered, max 420px, Dark Warm, no navigation chrome).

### Routes
| Route | Purpose |
|-------|---------|
| /enter | Join flow: name/PIN identification → session code entry → tasting room |
| /log-simple | Quick whisky log: name, score, notes → save to journal or localStorage |
| /my-taste | Personal taste snapshot with unlock |
| /tasting-room-simple/:id | Rating room wrapper (sliders for nose/taste/finish/overall + notes) |
| /simple-test | Happy-path checklist with links to each step |
| /simple-feedback | Satisfaction + simplicity ratings, free text, clipboard copy |

### Redirect Leak Prevention
| Old route | Now redirects to | Was going to |
|-----------|-----------------|--------------|
| /join | /enter | /tasting/sessions |
| /log | /log-simple | /my/journal |
| /profile | /my-taste | legacy profile |

### Files
- `client/src/components/simple/simple-shell.tsx` — Minimal layout wrapper
- `client/src/pages/simple-enter.tsx` — Join flow
- `client/src/pages/simple-log.tsx` — Log form
- `client/src/pages/simple-feedback.tsx` — Feedback form
- `client/src/pages/simple-test.tsx` — Test checklist
- `client/src/pages/tasting-room-simple.tsx` — Rating room wrapper

## No New Dependencies
No new npm packages were added for V2. All components built with existing Tailwind CSS + CSS custom properties.
