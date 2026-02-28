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
- No desktop sidebar in V2 (mobile-first bottom nav; desktop uses compact left sidebar)

## No New Dependencies
No new npm packages were added for V2. All components built with existing Tailwind CSS + CSS custom properties.
