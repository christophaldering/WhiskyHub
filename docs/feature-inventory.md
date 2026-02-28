# CaskSense Feature Inventory

## Client Routes

| Route | Page Component | Purpose | API Sources | V2 Target |
|-------|---------------|---------|-------------|-----------|
| `/` | Landing | Public landing page | — | `/` (redesign) |
| `/feature-tour` | FeatureTour | Feature showcase | — | More > Features |
| `/tour` | Tour | Interactive tour | — | More > Tour |
| `/background` | Background | Background info | — | More |
| `/join/:code` | QuickTasting | Quick join via code | tastingApi | `/app/join/:code` |
| `/naked/:code` | NakedTasting | Naked tasting mode | tastingApi, ratingApi | `/app/naked/:code` |
| `/impressum` | Impressum | Legal imprint | — | `/app/more` |
| `/privacy` | Privacy | Privacy policy | — | `/app/more` |
| `/intro` | Intro | Onboarding intro | — | `/app/intro` |
| `/home` | HomeDashboard | Dashboard home | tastingApi, statsApi, journalApi | `/app/home` |
| `/tasting` | TastingHub | Tasting lobby | tastingApi, pairingsApi | `/app/home` |
| `/tasting/sessions` | TastingSessions | Session list | tastingApi | `/app/sessions` |
| `/tasting/calendar` | TastingCalendar | Calendar view | calendarApi | `/app/sessions` (tab) |
| `/tasting/host` | HostDashboard | Host dashboard | hostDashboardApi | `/app/more` > Host |
| `/tasting/:id` | TastingRoom | Active tasting room | tastingApi, whiskyApi, ratingApi | `/app/session/:id` |
| `/my/journal` | MyJournal | Journal (tabs: journal, tasted, compare, benchmark, analytics, export, recap) | journalApi, benchmarkApi, exportApi | `/app/cellar` |
| `/my/collection` | WhiskybaseCollection | Whiskybase collection | collectionApi | `/app/cellar` (tab) |
| `/my/wishlist` | Wishlist | Wishlist | wishlistApi | `/app/cellar` (tab) |
| `/discover` | DiscoverHub | Discover hub (lexicon, recommendations, research) | flavorProfileApi, communityApi | `/app/discover` |
| `/discover/distilleries` | DiscoverDistilleries | Distilleries + bottlers + map | — | `/app/discover` (tab) |
| `/discover/community` | DiscoverCommunity | Community (twins, friends, rankings, activity, leaderboard) | friendsApi, communityApi, leaderboardApi | `/app/discover` (tab) |
| `/discover/database` | WhiskyDatabase | Whisky database (host/admin) | adminApi | `/app/discover` (tab) |
| `/profile` | Profile | User profile | profileApi, participantApi | `/app/more` > Profile |
| `/profile/account` | Account | Account settings | participantApi | `/app/more` > Account |
| `/profile/help` | ProfileHelp | Help + about + features + donate | — | `/app/more` > Help |
| `/admin` | AdminPanel | Admin panel | adminApi | `/app/admin` |
| `/news` | News | What's new / changelog | adminApi | `/app/more` > News |
| `/badges` | Badges | Achievement badges | statsApi | `/app/cellar` (tab) |
| `/flavor-profile` | FlavorProfile | Whisky profile (3 tabs) | flavorProfileApi | `/app/cellar` (tab) |
| `/flavor-wheel` | FlavorWheel | Flavor wheel | flavorProfileApi | `/app/cellar` (tab) |
| `/photo-tasting` | PhotoTasting | AI photo tasting | photoTastingApi | `/app/more` > Tools |
| `/method` | Method | Tasting method info | — | `/app/more` |
| `/recap/:id` | TastingRecap | Tasting recap | recapApi | `/app/recap/:id` |
| `/invite/:token` | InviteAccept | Accept invite | inviteApi | `/app/invite/:token` |

## Redirect Routes (old → new canonical)

| Old Route | Redirects To |
|-----------|-------------|
| `/app` | `/tasting` |
| `/sessions` | `/tasting/sessions` |
| `/journal` | `/my/journal` |
| `/my-whiskies` | `/my/journal?tab=tasted` |
| `/collection` | `/my/collection` |
| `/wishlist` | `/my/wishlist` |
| `/recap` | `/my/journal?tab=recap` |
| `/my-tastings` | `/tasting/sessions?tab=mine` |
| `/host-dashboard` | `/tasting/host` |
| `/export-notes` | `/my/journal?tab=export` |
| `/calendar` | `/tasting/calendar` |
| `/comparison` | `/my/journal?tab=compare` |
| `/tasting-templates` | `/tasting?tab=templates` |
| `/pairings` | `/tasting?tab=pairings` |
| `/benchmark` | `/my/journal?tab=benchmark` |
| `/whisky-database` | `/discover/database` |
| `/analytics` | `/my/journal?tab=analytics` |
| `/data-export` | `/my/journal?tab=export` |
| `/recommendations` | `/discover` |
| `/taste-twins` | `/discover/community?tab=twins` |
| `/friends` | `/discover/community?tab=friends` |
| `/community-rankings` | `/discover/community?tab=rankings` |
| `/activity` | `/discover/community?tab=activity` |
| `/leaderboard` | `/discover/community?tab=leaderboard` |
| `/account` | `/profile/account` |
| `/lexicon` | `/discover?section=lexicon` |
| `/distilleries` | `/discover/distilleries` |
| `/distillery-map` | `/discover/distilleries?tab=map` |
| `/bottlers` | `/discover/distilleries?tab=bottlers` |
| `/research` | `/discover?section=research` |
| `/help` | `/profile/help` |
| `/about` | `/profile/help?tab=about` |
| `/features` | `/profile/help?tab=features` |
| `/donate` | `/profile/help?tab=donate` |
| `/reminders` | `/tasting/sessions` |

## Navigation Structure (Current)

### Desktop Sidebar (6 sections)
1. **GENUSS**: Lobby, Sessions, Calendar, Journal, Verkostete, Collection, Wishlist, Recap, My Tastings, Host Dashboard
2. **PRO**: Comparison, Templates, Pairings, Benchmark, Whisky Database, Analytics, Data Export
3. **PROFIL**: Profile, Whisky Profile, Recommendations, Taste Twins, Friends, Community Rankings, Activity, Leaderboard, Account
4. **WISSEN**: Lexicon, Distilleries, Distillery Map, Bottlers, Research
5. **ÜBER**: Help, About, Features, Donate, Landing Page
6. **ADMIN** (admin-only): Admin Panel, Dark Lab

### Mobile Bottom Nav (5 tabs)
Home, Tasting, Journal, Entdecken, Profil

## API Client Objects (client/src/lib/api.ts)

participantApi, tastingApi, whiskyApi, importApi, wotdApi, profileApi, inviteApi, rosterApi, participantUpdateApi, blindModeApi, guidedApi, discussionApi, reflectionApi, friendsApi, journalApi, statsApi, platformStatsApi, platformAnalyticsApi, flavorProfileApi, communityApi, ratingNotesApi, activityApi, calendarApi, ratingApi, exportApi, tastingHistoryApi, hostDashboardApi, recapApi, pairingsApi, leaderboardApi, benchmarkApi, journalBottleApi, photoTastingApi, wishlistApi, wishlistScanApi, textExtractApi, collectionApi, adminApi, tastingPhotoApi, feedbackApi, notificationApi

## Server API Routes

~200+ endpoints covering participants, tastings, whiskies, ratings, analytics, profiles, friends, invites, journal, wishlist, collection, benchmarks, admin, export, notifications, and more. All under `/api/` prefix.

## Database Schema

PostgreSQL via Drizzle ORM. Tables: participants, tastings, whiskies, ratings, profiles, journal_entries, wishlist_items, collection_items, benchmark_entries, friends, invites, discussions, reflections, reminders, tasting_photos, notifications, newsletters, changelog, app_settings, encyclopedia_suggestions, feedback. NO CHANGES PERMITTED.
