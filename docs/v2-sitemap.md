# CaskSense V2 Sitemap (Dark Warm)

## Navigation: 4 Primary + More

### Bottom Nav (Mobile) / Top Nav (Desktop)
1. **Home** — `/app/home`
2. **Sessions** — `/app/sessions`
3. **Discover** — `/app/discover`
4. **Cellar** — `/app/cellar`
5. **More** — `/app/more` (overflow menu)

## Route → Feature Mapping

### /app/home (Kaminraum)
- Hero card: active session CTA or "Ready for a pour?"
- Quick Actions: Quick Log, New Session, Discover Pairing
- Recent tastings/logs (last 3)
- Insight nugget (if data available)
- **Sources**: GENUSS > Lobby, Home Dashboard

### /app/sessions
- Tabs: Active / History
- Calendar toggle (if available)
- Session rows: title, date, whisky count, status
- Click → /app/session/:id
- **Sources**: GENUSS > Sessions, Calendar, My Tastings

### /app/session/:id (Tasting Room)
- Session header + meta
- Whisky focus card with lineup progress
- Nose/Palate/Finish segmented rating
- Overall score
- Prev/Next navigation
- **Sources**: Tasting Room, Rating system

### /app/discover
- Search bar
- Chips: Bottles / Pairings / Templates / Distilleries / Community / Knowledge
- Bottles: journal + collection bottle search
- Pairings: existing pairing suggestions
- Templates: tasting templates
- Distilleries: encyclopedia + map
- Community: friends, twins, rankings, leaderboard, activity
- Knowledge: lexicon, research, bottlers
- **Sources**: PRO, WISSEN, PROFIL > Social features

### /app/cellar
- Tabs: Journal / Collection / Wishlist / Stats / Badges
- Journal: personal tasting journal
- Collection: Whiskybase collection
- Wishlist: wishlist items
- Stats: flavor profile, whisky profile, flavor wheel
- Badges: achievements
- **Sources**: GENUSS > Journal/Collection/Wishlist, PROFIL > Flavor Profile

### /app/more
- Profile + Account Settings
- Host Dashboard
- Photo Tasting
- Comparison Tool
- Benchmark / Library
- Analytics + Data Export
- Whisky Database (host/admin)
- News / Changelog
- Help / About / Features
- Method
- Donate
- Impressum / Privacy
- Tour / Feature Tour
- **Sources**: All remaining features from PRO, PROFIL, WISSEN, ÜBER

### /app/admin (admin-only)
- Full admin panel
- **Sources**: ADMIN section

### Special Routes (outside app shell)
- `/` — Landing page (Dark Warm redesign)
- `/app/join/:code` — Quick join
- `/app/naked/:code` — Naked tasting
- `/app/recap/:id` — Tasting recap
- `/app/invite/:token` — Invite accept
- `/app/intro` — Onboarding

### /legacy/* — Old UI
- All current routes mounted under /legacy prefix
- Functional but not default

## Feature Integration Guarantee

| Feature | Current Location | V2 Location |
|---------|-----------------|-------------|
| Tasting Lobby | /tasting | /app/home |
| Session List | /tasting/sessions | /app/sessions |
| Calendar | /tasting/calendar | /app/sessions (tab) |
| Tasting Room | /tasting/:id | /app/session/:id |
| Host Dashboard | /tasting/host | /app/more > Host |
| Journal | /my/journal | /app/cellar > Journal |
| Tasted Whiskies | /my-whiskies | /app/cellar > Journal |
| Collection | /my/collection | /app/cellar > Collection |
| Wishlist | /my/wishlist | /app/cellar > Wishlist |
| Comparison | /comparison | /app/more > Compare |
| Templates | /tasting-templates | /app/discover > Templates |
| Pairings | /pairings | /app/discover > Pairings |
| Benchmark/Library | /benchmark | /app/more > Library |
| Whisky Database | /discover/database | /app/discover > Database |
| Analytics | /analytics | /app/more > Analytics |
| Data Export | /data-export | /app/more > Export |
| Profile | /profile | /app/more > Profile |
| Flavor Profile | /flavor-profile | /app/cellar > Stats |
| Flavor Wheel | /flavor-wheel | /app/cellar > Stats |
| Recommendations | /recommendations | /app/discover > Bottles |
| Taste Twins | /taste-twins | /app/discover > Community |
| Friends | /friends | /app/discover > Community |
| Community Rankings | /community-rankings | /app/discover > Community |
| Activity Feed | /activity | /app/discover > Community |
| Leaderboard | /leaderboard | /app/discover > Community |
| Account Settings | /profile/account | /app/more > Account |
| Lexicon | /lexicon | /app/discover > Knowledge |
| Distilleries | /discover/distilleries | /app/discover > Distilleries |
| Distillery Map | /distillery-map | /app/discover > Distilleries |
| Bottlers | /bottlers | /app/discover > Knowledge |
| Research | /research | /app/discover > Knowledge |
| Help/About | /profile/help | /app/more > Help |
| Features | /features | /app/more > Features |
| Donate | /donate | /app/more > Donate |
| Photo Tasting | /photo-tasting | /app/more > Tools |
| Method | /method | /app/more > Method |
| News | /news | /app/more > News |
| Badges | /badges | /app/cellar > Badges |
| Admin Panel | /admin | /app/admin |
| Naked Tasting | /naked/:code | /app/naked/:code |
| Quick Join | /join/:code | /app/join/:code |
| Recap | /recap/:id | /app/recap/:id |
| Invite | /invite/:token | /app/invite/:token |
| Impressum | /impressum | /app/more > Legal |
| Privacy | /privacy | /app/more > Legal |
