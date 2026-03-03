# CaskSense — System Status Snapshot

Generated: 2026-03-03

---

## 1) Repo Overview

### Tech Stack
- **Frontend**: React 18 + Vite, Wouter v3 (routing), TanStack React Query, Zustand, Tailwind CSS, shadcn/ui (Radix), Framer Motion, Recharts, react-i18next (EN/DE)
- **Backend**: Express 5 (TypeScript, ESM), Node.js 20
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: OpenAI GPT-4o (via Replit AI Integrations)
- **Storage**: Replit Object Storage (images)
- **Email**: Nodemailer via Google Mail Integration
- **Build**: Vite (client) + esbuild (server → `dist/index.cjs`)
- **Hosting**: Replit (autoscale deployment)

### Folder Structure (top-level)
```
client/          # React frontend
  src/
    components/  # Shared UI components (incl. simple/, ui/)
    pages/       # Route pages (simple-enter, simple-log, my-taste, etc.)
    v2/          # V2 Dark Warm UI (AppShellV2, pages, theme)
    lab-dark/    # Lab Dark experimental UI
    lib/         # Utilities, session, translations
    hooks/       # Custom React hooks
    data/        # Static data files
    assets/      # Images, tour assets
  public/        # Static assets (sw.js, manifest.json, icons)
server/          # Express backend
  lib/           # ocr.ts, matching.ts, whiskyIndex.ts, cache.ts, onlineSearch.ts
  replit_integrations/  # AI, object storage, audio, image integrations
shared/          # Shared schema (schema.ts), version.ts, models/
script/          # build.ts (production build orchestrator)
dist/            # Production build output (index.cjs, public/)
uploads/         # Local file uploads
```

### Dev & Build Commands
- **Dev**: `npm run dev` → `NODE_ENV=development tsx server/index.ts`
- **Build**: `npm run build` → Vite client build + esbuild server bundle
- **Entry points**: `server/index.ts` (dev), `dist/index.cjs` (production)

---

## 2) Routing & Navigation Map

### Simple Mode (no nav chrome, `SimpleShell` wrapper, dark warm colors)
| Route | Component | Purpose | Auth |
|-------|-----------|---------|------|
| `/enter` | SimpleEnterPage | Join tasting via code | None |
| `/log-simple` | SimpleLogPage | Log a whisky (identify + save) | Gated on save (sign-in required) |
| `/my-taste` (`/taste`) | MyTastePage | Personal taste profile | Gated on save |
| `/simple-test` | SimpleTestPage | Happy-path smoke test checklist | None |
| `/simple-feedback` | SimpleFeedbackPage | User feedback form | None |
| `/join/:code` | QuickTasting | Quick join via link | None |
| `/naked/:code` | NakedTasting | Naked (ephemeral) tasting | None |

### V2 Dark Warm UI (`AppShellV2` wrapper, 5-tab nav)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/app/home` | V2Home | Dashboard home |
| `/app/sessions` | V2Sessions | Tasting sessions list |
| `/app/session/:id` | V2SessionDetail | Session detail view |
| `/app/discover` | V2Discover | Discovery / explore |
| `/app/cellar` | V2Cellar | Personal cellar |
| `/app/more` | V2More | Links to legacy features |
| `/app/admin` | AdminPanel | Admin panel |
| `/app/recap/:id` | TastingRecap | Tasting recap view |
| `/app/invite/:token` | InviteAccept | Accept invitation |
| `/app/join/:code` | QuickTasting | Join (no AppShellV2 chrome) |
| `/app/naked/:code` | NakedTasting | Naked tasting (no AppShellV2 chrome) |

### Legacy UI (`Layout` wrapper, sidebar nav)
| Route | Component | Purpose |
|-------|-----------|---------|
| `/legacy/home` | HomeDashboard | Legacy dashboard |
| `/legacy/tasting` | TastingHub | Tasting hub |
| `/legacy/tasting/sessions` | TastingSessions | Sessions list |
| `/legacy/tasting/calendar` | TastingCalendar | Calendar view |
| `/legacy/tasting/host` | HostDashboard | Host tools |
| `/legacy/tasting/:id` | TastingRoom | Active tasting room |
| `/legacy/my/journal` | MyJournal | Whisky journal |
| `/legacy/my/collection` | WhiskybaseCollection | Whiskybase sync |
| `/legacy/my/wishlist` | Wishlist | Wishlist |
| `/legacy/discover` | DiscoverHub | Discovery hub |
| `/legacy/discover/distilleries` | DiscoverDistilleries | Distillery encyclopedia |
| `/legacy/discover/community` | DiscoverCommunity | Community view |
| `/legacy/discover/database` | WhiskyDatabase | Whisky database |
| `/legacy/profile` | Profile | User profile |
| `/legacy/profile/account` | Account | Account settings |
| `/legacy/admin` | AdminPanel | Admin panel |
| `/legacy/news` | News | News/newsletter |
| `/legacy/badges` | Badges | Achievement badges |
| `/legacy/flavor-profile` | FlavorProfile | Radar chart |
| `/legacy/flavor-wheel` | FlavorWheel | Flavor wheel |
| `/legacy/photo-tasting` | PhotoTasting | Photo-based tasting |
| `/legacy/method` | Method | Tasting method info |
| `/legacy/recap/:id` | TastingRecap | Tasting recap |

### Lab Dark (`LabDarkLayout` wrapper, experimental)
| Route | Component |
|-------|-----------|
| `/lab-dark/home` | LabHome |
| `/lab-dark/sessions` | LabSessions |
| `/lab-dark/discover` | LabDiscover |
| `/lab-dark/session/:id` | LabSessionDetail |

### Other Top-Level
| Route | Purpose |
|-------|---------|
| `/` (`/landing`) | Landing page |
| `/feature-tour` | Feature tour |
| `/tour` | Tour |
| `/background` | Background info |
| `/intro` | Intro page |
| `/support` | Support console |
| `/impressum` | Legal imprint |
| `/privacy` | Privacy policy |

### Redirects
- `/join` → `/enter`
- `/log` → `/log-simple`
- `/legacy/comparison` → `/legacy/my/journal?tab=compare`
- `/legacy/tasting-templates` → `/legacy/tasting?tab=templates`
- `/legacy/pairings` → `/legacy/tasting?tab=pairings`
- `/legacy/benchmark` → `/legacy/my/journal?tab=benchmark`
- `/legacy/analytics` → `/legacy/my/journal?tab=analytics`

---

## 3) Auth / Session State

### Model
- **Two modes**: `log` (personalized, name optional) and `tasting` (anonymous, PIN-only)
- **UI terminology**: "Sign in" / "Sign out" (internally `unlocked` state)
- **Gating**: Users can fill whisky/score/notes while signed out. Save click gates on sign-in — after successful sign-in, save auto-proceeds.

### Storage Keys
**sessionStorage** (cleared on tab close):
- `session_signed_in` — "1" when signed in
- `session_mode` — "log" | "tasting"
- `session_name` — participant name
- `session_pid` — participant UUID

**localStorage** (persistent, for "Stay signed in"):
- `session_remember` — "1" when remember-me enabled
- `session_resume_token` — 32-byte hex resume token
- `session_resume_mode` — mode to resume
- `session_resume_name` — name to resume

### Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/session/signin` | Validate PIN, return optional resumeToken |
| `POST /api/session/resume` | Validate resumeToken, restore session |
| `POST /api/session/signout` | Invalidate resumeToken |
| `POST /api/simple/unlock` | Alias → signin |
| `POST /api/simple/resume` | Alias → resume |
| `POST /api/simple/logout` | Alias → signout |

### Resume Flow
1. On sign-in with "Stay signed in" checked → server generates 32-byte hex `resumeToken`
2. Token stored in `localStorage` (`session_resume_token`)
3. On next visit, `tryAutoResume()` calls `POST /api/session/resume`
4. Server validates token (in-memory Map, 14-day TTL) → returns mode/name
5. Tokens lost on server restart (graceful fallback to signed-out)

### Rate Limits
- signin: 5 attempts / 5 min per IP
- resume: 30 / min per IP

### UI Location
- **Simple Mode**: `SessionSheet` component (bottom sheet, dark variant)
- **Classic/Legacy**: Key icon button in header opens `SessionSheet` (light variant), auto-resumes on mount
- **File**: `client/src/components/session-sheet.tsx`
- **Auth lib**: `client/src/lib/session.ts`

---

## 4) Identify Pipeline (Whisky Recognition)

### Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whisky/identify` | POST (multipart) | Photo → OCR → match |
| `/api/whisky/identify-text` | POST (JSON) | Text query → match (no OCR) |
| `/api/whisky/identify-online` | POST (JSON) | External web search |
| `/api/whisky/identify-status` | GET | Check AI/search availability |

### Pipeline
1. **OCR** (`server/lib/ocr.ts`): GPT-4o Vision extracts text from bottle photos
2. **Index** (`server/lib/whiskyIndex.ts`): In-memory DB index of all whiskies, 5-min TTL refresh
3. **Matching** (`server/lib/matching.ts`): Token overlap + trigram (Jaccard) + distillery/name substring + age bonus scoring
4. **Online Search** (`server/lib/onlineSearch.ts`): Optional external search (SerpAPI or Google CSE)

### Confidence Badges
- **High**: ≥ 0.78
- **Medium**: 0.55–0.77
- **Low**: < 0.55
- Source shown as "Library" (local DB) or "External" (online)

### Menu Detection
`detectMode()` identifies multi-whisky text (menu/list) when 2+ distilleries found; uses per-line scoring + aggregation.

### Caching
- LRU cache with SHA-256 keys, 24h TTL, max 200 entries (`server/lib/cache.ts`)

### Rate Limiting
- 5 requests / 5 min per IP on all identify endpoints

### Fallback
- Unknown whisky → structured block in journal notes or localStorage with Copy/Download JSON

---

## 5) Logging / Scoring Model

### Tasting Ratings (`ratings` table)
| Field | Type | Description |
|-------|------|-------------|
| `nose` | real | Nose score (default 50) |
| `taste` | real | Taste score (default 50) |
| `finish` | real | Finish score (default 50) |
| `balance` | real | Balance score (default 50) |
| `overall` | real | Overall score (default 50) |
| `notes` | text | Free-text tasting notes |
| `guessAbv` | real | ABV guess |
| `guessAge` | text | Age guess |
| `normalizedScore` | real | Normalized to common scale |
| `calibrationDelta` | real | Calibration offset |

### Journal Entries (`journal_entries` table)
| Field | Type | Description |
|-------|------|-------------|
| `noseNotes` | text | Nose tasting notes |
| `tasteNotes` | text | Taste tasting notes |
| `finishNotes` | text | Finish tasting notes |
| `personalScore` | real | Personal overall score |
| `wbScore` | real | Whiskybase community score |
| `source` | text | "casksense" / "imported" / "whiskybase" |

### Rating Scale
- Configurable per tasting: 5, 10, 20, or 100 points
- Dynamic step sizing for sliders
- Auto-calculated overall from 4 dimensions, with manual override

### UI Behavior
- Default: overall score slider + notes field
- Accordion expands detailed 4-dimension scoring (nose, taste, finish, balance)
- Scores persisted in DB (`ratings` table for tastings, `journal_entries` for journal)

---

## 6) Feature Flags / Environment Variables

All referenced `process.env.*` names (values ***REDACTED***):

| Variable | Module | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | server/db.ts | PostgreSQL connection string |
| `PORT` | server/index.ts | Server port (default 5000) |
| `NODE_ENV` | server/index.ts, routes.ts | development / production |
| `SIMPLE_MODE_PIN` | server/routes.ts | PIN for simple mode access |
| `SIMPLE_DEBUG` | server/routes.ts | Debug flag for simple mode |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ocr.ts, routes.ts, integrations | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | ocr.ts, routes.ts, integrations | OpenAI base URL |
| `ONLINE_SEARCH_PROVIDER` | onlineSearch.ts | "serpapi" or "google_cse" |
| `SERPAPI_API_KEY` | onlineSearch.ts | SerpAPI key |
| `GOOGLE_CSE_API_KEY` | onlineSearch.ts | Google CSE API key |
| `GOOGLE_CSE_CX` | onlineSearch.ts | Google CSE engine ID |
| `REPL_IDENTITY` | server/email.ts | Replit identity for connectors |
| `REPLIT_CONNECTORS_HOSTNAME` | server/email.ts | Connectors hostname |
| `WEB_REPL_RENEWAL` | server/email.ts | Repl renewal flag |
| `PUBLIC_OBJECT_SEARCH_PATHS` | object_storage | Public asset paths |
| `PRIVATE_OBJECT_DIR` | object_storage | Private upload directory |
| `GIT_SHA` | shared/version.ts | Injected at build time |
| `BUILD_TIME` | shared/version.ts | Injected at build time |
| `VITE_SUPPORT_PIN` | client (Vite) | Support access PIN |

---

## 7) Recent Changes (git)

### Last 15 Commits
```
3857bd9 Published your App
cdc4db3 Update greetings to reflect user login status accurately
99fee26 Transitioned from Plan to Build mode
36418af Create comprehensive system status documentation
d1380cc Published your App
44fbcb1 Improve server startup and deployment configuration for faster response
30a78f1 Improve application startup and health check responsiveness
9e73347 Add error handling for server startup issues
7c4d1d7 Improve server startup reliability by removing preload process
3b4fd34 Improve website reliability by fixing offline errors
5d1f726 Published your App
29bcb4e Improve application startup by implementing a preload process
b30c1a3 Improve deployment reliability by optimizing server startup and health checks
742cce4 Add a dedicated health check endpoint and improve server startup responsiveness
44757fd Improve application startup speed and deployment reliability
```

### Summary of Last 6 Meaningful Commits
1. **cdc4db3**: Session UX hardening — greetings in V2Home and Legacy Home now respect `session.signedIn` state instead of only `currentParticipant` from Zustand. Added `session-change` custom event to `session.ts` (dispatched on signIn/signOut/autoResume) so greeting components update reactively.
2. **44fbcb1**: Rewrote server startup to use raw HTTP handler for health checks (bypasses Express), switched to `autoscale` deployment with `publicDir` for CDN-served static assets.
3. **30a78f1**: Moved healthcheck and loading page responses to raw HTTP level before Express processes them.
4. **9e73347**: Added EADDRINUSE error handler to prevent unhandled crashes during server startup.
5. **7c4d1d7**: Removed the preload process entirely; server now listens on port 5000 immediately.
6. **3b4fd34**: Fixed service worker (`sw.js`) — bumped cache to v2, removed fake "Offline" 503 fallback, stopped pre-caching `/`.

---

## 8) Known Bugs / Gaps

- **Deployment "Promotion failed"**: Multiple deployment attempts fail at the "Promotion" step. Healthcheck on `/` was timing out or getting slow responses. Root cause was `vm` deployment target conflicting with `publicDir`. Now switched to `autoscale` — latest deployment (d1380cc) was published, needs verification.
- **Autoscale cold start**: With `autoscale`, the server scales to zero after inactivity. Cold starts may take several seconds. Static assets are served from CDN, but API calls will fail until the server is ready. The React app should handle loading states gracefully.
- **Resume tokens lost on restart**: In-memory Map storage for resume tokens means all "Stay signed in" sessions are invalidated on server restart/redeploy. Graceful fallback to signed-out state.
- **`publicDir` stuck in `.replit`**: The `publicDir = "dist/public"` setting cannot be removed from `.replit` via the deployment config tool. For `autoscale` this is actually correct behavior (CDN serving), but it prevented `vm` deployments from working.
- **Service worker cache**: Users who visited the site before the SW fix (3b4fd34) may still have the old `casksense-v1` cache with a stale "Offline" response. They need to clear Safari/browser cache or use a private tab.
- **Online search not configured**: `ONLINE_SEARCH_PROVIDER`, `SERPAPI_API_KEY`, and `GOOGLE_CSE_*` env vars are not set → `/api/whisky/identify-online` returns "not configured". Only local DB matching works.

---

## 9) How to Verify Quickly (10-Step Smoke Test)

1. **Landing page**: Open `/` — verify landing page loads with CaskSense branding and entry buttons.
2. **Simple Enter**: Navigate to `/enter` — verify join-by-code form renders in dark warm theme, no nav chrome.
3. **Simple Log**: Navigate to `/log-simple` — verify whisky logging page loads with identify options (Photo, Upload, Describe).
4. **Identify (text)**: On `/log-simple`, use "Describe" with a known whisky name (e.g., "Lagavulin 16") — verify match result with confidence badge.
5. **Manual entry**: Skip identify, manually fill whisky name and score — verify form fields work.
6. **Save (sign-in gate)**: Click Save — verify sign-in bottom sheet appears. Sign in with name + PIN (e.g., "Test" + SIMPLE_MODE_PIN). After sign-in, save should auto-proceed.
7. **My Taste**: Navigate to `/my-taste` — verify personal taste profile page loads.
8. **V2 Home**: Navigate to `/app/home` — verify dark warm dashboard renders with 5-tab navigation.
9. **Legacy Home**: Navigate to `/legacy/home` — verify legacy dashboard renders with sidebar navigation.
10. **Health check**: Hit `/__health` — verify JSON `{"status":"ok"}` response with 200 status.
