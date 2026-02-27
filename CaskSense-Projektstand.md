# CaskSense v2.0.0 — Vollständiger Projektstand & Programmlogik

**Stand:** 27. Februar 2026  
**Version:** 2.0.0 (Release: 21.02.2026)

---

## 1. Projektübersicht

CaskSense ist eine Webplattform für kollaborative Whisky-Tastings. Hosts erstellen Tasting-Sessions, laden Teilnehmer ein und führen sie durch eine strukturierte Whisky-Bewertung. Die Plattform bietet Session-Management, persönliche Analytik, ein umfassendes Whisky-Tagebuch und eine Wissensdatenbank.

---

## 2. Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| **Frontend** | React 18 + Vite + TypeScript (ESM) |
| **Routing** | Wouter (NICHT React Router/Next.js) |
| **State Management** | Zustand (client-side) + TanStack React Query (server state) |
| **UI Framework** | shadcn/ui (new-york style) + Radix UI + Tailwind CSS |
| **Animationen** | Framer Motion |
| **Charts** | Recharts |
| **i18n** | react-i18next (DE + EN aktiv) |
| **Backend** | Express 5 (HTTP Server) |
| **Datenbank** | PostgreSQL + Drizzle ORM |
| **AI** | GPT-4o (OpenAI) |
| **Dateispeicher** | Replit Object Storage |
| **E-Mail** | Nodemailer |
| **Excel** | ExcelJS |
| **QR-Codes** | qrcode |
| **Mobile** | Capacitor (PWA → iOS/Android) |
| **Fonts** | Playfair Display + Inter (Google Fonts) |

---

## 3. Projektstruktur

```
/
├── client/                    # Frontend (React + Vite)
│   ├── index.html             # Einstiegspunkt Web-App
│   ├── public/                # Statische Assets (Icons, Manifest, SW)
│   │   ├── manifest.json      # PWA-Manifest
│   │   ├── sw.js              # Service Worker
│   │   └── icons/             # App-Icons (20x20 bis 1024x1024)
│   └── src/
│       ├── App.tsx            # Haupt-Router (Wouter Switch/Route)
│       ├── main.tsx           # React-Einstiegspunkt
│       ├── index.css          # Globale Styles (Tailwind)
│       ├── components/        # UI-Komponenten
│       │   ├── layout.tsx     # Layout-Wrapper (Sidebar + Bottom-Nav)
│       │   ├── ui/            # shadcn/ui Basis-Komponenten
│       │   ├── flight-board.tsx
│       │   ├── guided-tasting.tsx
│       │   ├── tasting-analytics.tsx
│       │   └── ...
│       ├── pages/             # Seitenkomponenten (66 Dateien)
│       │   ├── landing.tsx         # Startseite (außerhalb Layout)
│       │   ├── naked-tasting.tsx   # Naked-Tasting (außerhalb Layout)
│       │   ├── tasting-room.tsx    # Tasting-Raum (Hauptseite)
│       │   ├── home-dashboard.tsx  # Home Dashboard
│       │   ├── tasting-hub.tsx     # Tasting Lobby
│       │   ├── tasting-sessions.tsx # Sessions-Übersicht
│       │   ├── my-journal.tsx      # Journal (Composite-Seite)
│       │   ├── discover-hub.tsx    # Entdecken Hub
│       │   ├── admin-panel.tsx     # Admin-Panel
│       │   └── ...
│       ├── hooks/             # Custom Hooks
│       │   ├── use-toast.ts
│       │   ├── use-mobile.tsx
│       │   ├── use-upload.ts
│       │   └── use-ai-status.ts   # AI Kill Switch Hook
│       ├── lib/               # Utilities & State
│       │   ├── store.ts       # Zustand Store
│       │   ├── i18n.ts        # Internationalisierung (DE+EN inline)
│       │   ├── api.ts         # API-Client
│       │   ├── queryClient.ts # React Query Client
│       │   └── translations/  # Weitere Sprachen (Fallback)
│       ├── data/              # Statische Daten
│       │   ├── distilleries.ts
│       │   └── bottlers.ts
│       └── assets/            # Bilder, Tour-Slides
│
├── server/                    # Backend (Express 5)
│   ├── index.ts               # Server-Einstiegspunkt
│   ├── routes.ts              # API-Routen (~8800 Zeilen)
│   ├── storage.ts             # Datenzugriffsschicht (Drizzle)
│   ├── db.ts                  # DB-Verbindung
│   ├── email.ts               # E-Mail-Service
│   ├── excel-utils.ts         # Excel-Verarbeitung
│   ├── ai-settings.ts         # AI Kill Switch Konfiguration
│   ├── static.ts              # Statische Datei-Auslieferung
│   └── vite.ts                # Vite-Integration (Dev-Modus)
│
├── shared/                    # Gemeinsamer Code
│   ├── schema.ts              # Drizzle-Schema + Zod-Validierung
│   └── version.ts             # App-Version (2.0.0)
│
├── scripts/                   # Build & Deploy Skripte
├── tests/                     # Plausibilitätstests
├── uploads/                   # Hochgeladene Dateien
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── capacitor.config.ts        # Mobile App Konfiguration
```

---

## 4. Datenbank-Schema (PostgreSQL + Drizzle ORM)

Alle IDs sind UUIDs (`varchar` + `gen_random_uuid()`). Schema definiert in `shared/schema.ts`.

### 4.1 Kerntabellen

#### `participants` — Benutzer
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | varchar (UUID) | Primärschlüssel |
| name | text | Benutzername (Pflicht) |
| pin | text | 4-stellige PIN (Pflicht für Auth) |
| email | text | Optional |
| role | text | "user" / "admin" |
| language | text | "en" / "de" |
| emailVerified | boolean | E-Mail bestätigt |
| canAccessWhiskyDb | boolean | Zugang zur Whisky-Datenbank |
| newsletterOptIn | boolean | Newsletter-Opt-In |
| experienceLevel | text | Immer "connoisseur" (Level entfernt) |
| lastSeenAt | timestamp | Letzte Aktivität |

#### `tastings` — Tasting-Sessions
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | varchar (UUID) | Primärschlüssel |
| title | text | Titel der Session |
| date | text | Datum |
| location | text | Ort |
| hostId | varchar | Gastgeber (FK → participants) |
| code | text | Teilnahme-Code |
| status | text | draft / open / closed / reveal / archived |
| currentAct | text | act1 / act2 / act3 / act4 (Reveal-Phase) |
| blindMode | boolean | Blind-Modus aktiv |
| ratingScale | integer | 5 / 10 / 20 / 100 Punkte |
| guestMode | text | "standard" / "ultra" |
| sessionUiMode | text | null / flow / focus / journal |
| showRanking | boolean | Ranking anzeigen |
| showGroupAvg | boolean | Gruppendurchschnitt anzeigen |
| isTestData | boolean | Testdaten-Markierung |
| guidedMode | boolean | Geführter Modus |
| guidedWhiskyIndex | integer | Aktiver Whisky im geführten Modus |
| coverImageUrl | text | Cover-Bild URL |
| videoLink | text | Video-Link |
| ratingPrompt | text | null / "rate" / "final" |
| openedAt / closedAt / revealedAt / archivedAt | timestamp | Status-Zeitstempel |

#### `whiskies` — Whiskys in einer Session
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | varchar (UUID) | Primärschlüssel |
| tastingId | varchar | FK → tastings |
| name | text | Whisky-Name |
| distillery | text | Destillerie |
| age | text | Alter |
| abv | real | Alkoholgehalt |
| type | text | Typ |
| country | text | Land |
| region | text | Region |
| category | text | Single Malt, Bourbon, etc. |
| caskInfluence | text | Fasstyp |
| peatLevel | text | None/Light/Medium/Heavy |
| imageUrl | text | Flaschenfoto URL |
| sortOrder | integer | Reihenfolge |
| hostNotes | text | Host-Notizen |
| hostSummary | text | Host-Bewertung |
| whiskybaseId | text | Whiskybase-ID |
| price | real | Flaschenpreis |
| aiFactsCache | text | Gecachte AI-Fakten (JSON) |
| aiInsightsCache | text | Gecachte AI-Insights |

#### `ratings` — Bewertungen
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | varchar (UUID) | Primärschlüssel |
| tastingId | varchar | FK → tastings |
| whiskyId | varchar | FK → whiskies |
| participantId | varchar | FK → participants |
| nose | real | Nase-Bewertung (0-100) |
| taste | real | Geschmack-Bewertung |
| finish | real | Abgang-Bewertung |
| balance | real | Balance-Bewertung |
| overall | real | Gesamt (auto-berechnet + manuell) |
| notes | text | Persönliche Notizen |
| guessAbv | real | ABV-Schätzung |
| guessAge | text | Alters-Schätzung |

### 4.2 Weitere Tabellen

| Tabelle | Zweck |
|---------|-------|
| `tasting_participants` | Join-Tabelle: Teilnehmer ↔ Tasting |
| `journal_entries` | Privates Whisky-Tagebuch |
| `wishlist_entries` | Whisky-Wunschliste |
| `whiskybase_collection` | Importierte Whiskybase-Sammlung |
| `benchmark_entries` | AI-extrahierte Tasting-Daten (Whisky Library) |
| `profiles` | Teilnehmer-Profile (Bio, Foto, Präferenzen) |
| `session_invites` | E-Mail/Token-Einladungen |
| `discussion_entries` | Diskussionsbeiträge pro Session |
| `reflection_entries` | Reflexionen pro Session |
| `whisky_friends` | Freunde-Kontaktliste |
| `newsletters` | Newsletter-Archiv |
| `newsletter_recipients` | Newsletter-Empfänger |
| `tasting_reminders` | Erinnerungen pro Teilnehmer |
| `reminder_log` | Gesendete Erinnerungen |
| `encyclopedia_suggestions` | Community-Vorschläge für Enzyklopädie |
| `tasting_photos` | Session-Fotos |
| `user_feedback` | Benutzer-Feedback |
| `notifications` | Benachrichtigungen / News Feed |
| `system_settings` | System-Einstellungen (JSONB Key-Value) |
| `app_settings` | Admin-Plattform-Einstellungen (Text Key-Value) |
| `admin_audit_log` | Admin-Aktionsprotokoll |
| `changelog_entries` | Plattform-Changelog |
| `session_presence` | Heartbeat-basierte Anwesenheit |

---

## 5. Routing-Architektur

### 5.1 Routing-Konzept

- **Wouter** für Client-Side-Routing (NICHT React Router)
- Äußere `<Switch>`: Seiten OHNE Layout (Landing, Naked Tasting, etc.)
- Innere `<Switch>` innerhalb `<Layout>`: Seiten MIT Sidebar + Bottom-Nav
- Naked-Route `/naked/:code` rendert AUSSERHALB von `<Layout>` → kein Sidebar/Bottom-Nav

### 5.2 Kanonische Routen

| Route | Seite | Beschreibung |
|-------|-------|-------------|
| `/` | Landing | Startseite (außerhalb Layout) |
| `/naked/:code` | NakedTasting | Gast-Tasting (außerhalb Layout) |
| `/join/:code` | QuickTasting | Schnellbeitritt (außerhalb Layout) |
| `/home` | HomeDashboard | Home-Dashboard |
| `/tasting` | TastingHub | Tasting-Lobby |
| `/tasting/sessions` | TastingSessions | Session-Übersicht |
| `/tasting/calendar` | TastingCalendar | Tasting-Kalender |
| `/tasting/host` | HostDashboard | Gastgeber-Dashboard |
| `/tasting/:id` | TastingRoom | Aktiver Tasting-Raum |
| `/my/journal` | MyJournal | Whisky-Tagebuch (Composite) |
| `/my/collection` | WhiskybaseCollection | Whiskybase-Sammlung |
| `/my/wishlist` | Wishlist | Wunschliste |
| `/discover` | DiscoverHub | Entdecken-Hub |
| `/discover/distilleries` | DiscoverDistilleries | Destillerien |
| `/discover/community` | DiscoverCommunity | Community |
| `/discover/database` | WhiskyDatabase | Whisky-Datenbank (gated) |
| `/profile` | Profile | Profil |
| `/profile/account` | Account | Konto-Einstellungen |
| `/profile/help` | ProfileHelp | Hilfe & FAQ |
| `/admin` | AdminPanel | Admin-Panel (admin-only) |

### 5.3 Weiterleitungen (Old → New)

Alle alten Routen leiten auf neue kanonische Routen weiter:

| Alte Route | Neue Route |
|------------|-----------|
| `/app` | `/tasting` |
| `/sessions` | `/tasting/sessions` |
| `/journal` | `/my/journal` |
| `/my-whiskies` | `/my/journal?tab=tasted` |
| `/collection` | `/my/collection` |
| `/wishlist` | `/my/wishlist` |
| `/recap` | `/my/journal?tab=recap` |
| `/my-tastings` | `/tasting/sessions?tab=mine` |
| `/host-dashboard` | `/tasting/host` |
| `/calendar` | `/tasting/calendar` |
| `/comparison` | `/my/journal?tab=compare` |
| `/benchmark` | `/my/journal?tab=benchmark` |
| `/analytics` | `/my/journal?tab=analytics` |
| `/data-export` | `/my/journal?tab=export` |
| `/whisky-database` | `/discover/database` |
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

### 5.4 Funktionale Routen (nicht in Navigation)

| Route | Zweck |
|-------|-------|
| `/news` | Neuigkeiten |
| `/badges` | Achievements |
| `/flavor-profile` | Geschmacksprofil |
| `/flavor-wheel` | Aromarad |
| `/photo-tasting` | Foto-Tasting |
| `/method` | Tasting-Methodik |
| `/recap/:id` | Session-Rückblick |
| `/invite/:token` | Einladung annehmen |
| `/feature-tour` | Feature-Tour |
| `/tour` | App-Tour |
| `/background` | Hintergrund |
| `/impressum` | Impressum |
| `/privacy` | Datenschutz |

---

## 6. Navigation (v2 Informationsarchitektur)

### 6.1 Desktop-Sidebar (6 Sektionen)

**GENUSS** (defaultOpen: true)
1. Lobby → `/tasting`
2. Sessions → `/tasting/sessions`
3. Tasting-Kalender → `/tasting/calendar`
4. Journal → `/my/journal`
5. Verkostete Whiskys → `/my-whiskies` (→ redirect)
6. Sammlung → `/my/collection`
7. Wunschliste → `/my/wishlist`
8. Recap → `/recap` (→ redirect)
9. Meine Tastings → `/my-tastings` (→ redirect)
10. Gastgeber-Dashboard → `/tasting/host`

**PRO**
1. Vergleich → `/comparison` (→ redirect)
2. Vorlagen → `/tasting-templates` (→ redirect)
3. Pairings → `/pairings` (→ redirect)
4. Whisky Library → `/benchmark` (→ redirect)
5. Whisky-Datenbank → `/discover/database`
6. Analytics → `/analytics` (→ redirect)
7. Daten-Export → `/data-export` (→ redirect)

**PROFIL**
1. Profil → `/profile`
2. Whisky-Profil → `/flavor-profile`
3. Empfehlungen → `/recommendations` (→ redirect)
4. Geschmackszwillinge → `/taste-twins` (→ redirect)
5. Freunde → `/friends` (→ redirect)
6. Community Rankings → `/community-rankings` (→ redirect)
7. Aktivität → `/activity` (→ redirect)
8. Rangliste → `/leaderboard` (→ redirect)
9. Konto → `/profile/account`

**WISSEN**
1. Lexikon → `/lexicon` (→ redirect)
2. Destillerien → `/discover/distilleries`
3. Destillerie-Karte → `/distillery-map` (→ redirect)
4. Abfüller → `/bottlers` (→ redirect)
5. Forschung → `/research` (→ redirect)

**ÜBER**
1. Hilfe → `/profile/help`
2. Über → `/about` (→ redirect)
3. Funktionen → `/features` (→ redirect)
4. Spenden → `/donate` (→ redirect)
5. Homepage → `/` (Landing Page)

**ADMIN** (nur wenn `role === "admin"`)
1. Admin-Bereich → `/admin`

### 6.2 Mobile Bottom-Nav (5 Tabs)

| Tab | Icon | Route | Dynamisch |
|-----|------|-------|-----------|
| Home / Cockpit | Home / ArrowLeft | `/home` / Tasting-ID | Wenn in Tasting → "Cockpit" |
| Tasting | Wine | `/tasting` | - |
| Journal | NotebookPen | `/my/journal` | - |
| Entdecken | Compass | `/discover` | - |
| Profil | User | `/profile` | - |

### 6.3 Akkordeon-Verhalten

Desktop-Sidebar: Nur eine Sektion gleichzeitig geöffnet (Akkordeon). GENUSS ist standardmäßig offen.

---

## 7. Authentifizierung & Berechtigungen

### 7.1 Teilnehmer-Auth

- **Name + 4-stellige PIN** (kein Passwort)
- Client-side verwaltet via Zustand Store (`currentParticipant`)
- Participant-ID als UUID, gespeichert in localStorage
- Kein Server-Session-System (stateless)

### 7.2 Rollen

| Rolle | Zugriff |
|-------|---------|
| `user` | Standard-Features, eigene Daten |
| `admin` | + Admin-Panel, Whisky-Datenbank, Plattform-Analytics, alle Einzelbewertungen |
| Host | Wer `hostId` einer Session ist → sieht alle Einzelbewertungen dieser Session |

### 7.3 Datenzugriff

- **Teilnehmer**: Eigene Bewertungen + anonymisierte Gruppen-Analytics für besuchte Tastings
- **Host**: Alle Einzelbewertungen für gehostete Tastings
- **Admin**: Plattformweite Cross-Tasting-Analytics + Export

### 7.4 Datenexport (3 Stufen)

| Stufe | Wer | Was |
|-------|-----|-----|
| Own | Alle | Profil, Journal, Wunschliste, Sammlung, Freunde |
| Extended | Host/Admin | Gebündelte Tasting-Bewertungen aller Sessions |
| Admin | Admin | Vollständiger Datenexport |

---

## 8. Tasting-Session State Machine

```
draft → open → closed → reveal (act1→act2→act3→act4) → archived
```

| Status | Beschreibung |
|--------|-------------|
| `draft` | Session erstellt, Whiskys werden hinzugefügt |
| `open` | Teilnehmer können beitreten und bewerten |
| `closed` | Bewertungsphase beendet |
| `reveal` | Multi-Act Enthüllungsphase mit Analytics |
| `archived` | Session abgeschlossen |

### Reveal-Acts

| Act | Inhalt |
|-----|--------|
| act1 | Ranking & Statistiken |
| act2 | Whisky-Details enthüllen |
| act3 | Vertiefende Analyse |
| act4 | Zusammenfassung & Abschluss |

---

## 9. Naked Tasting (Gäste-Modus)

### 9.1 Zwei Modi

**Standard Naked** (`guestMode: "standard"`)
- Teilnehmer-Identität in Zustand/localStorage persistiert
- Gleiche `participantId` bei Reload → Session-Resume
- Hinweis-Banner angezeigt

**Ultra Naked** (`guestMode: "ultra"`)
- Ephemerer In-Memory-Teilnehmer (nur React State)
- Refresh = Fortschritt verloren
- Warnbanner (Amber-bordered, "ACHTUNG"/"WARNING")
- Ranking in RecapScreen ausgeblendet
- Bestätigungs-Dialog (AlertDialog) vor Aktivierung

### 9.2 UI-Modi (3 Ansichten)

| Modus | Beschreibung |
|-------|-------------|
| `flow` | Timeline mit einklappbaren Dram-Karten (Standard) |
| `focus` | Ein Dram gleichzeitig, Kartenstapel-Muster |
| `journal` | Strukturiertes Dokument mit einklappbarer Liste |

Alle Modi teilen `RatingSliders` und `useRatingState` — keine duplizierte Business-Logik.

### 9.3 Blind-Modus

- `getDramDisplay(tasting, whisky, index)` → Single Source of Truth
- Gibt `{displayTitle, displaySubtitle, displayImageUrl, isBlindHidden}` zurück
- Blind aktiv nur wenn `tasting.blindMode && tasting.status === "open"`
- `DramThumbnail`-Komponente: 3 Zustände (blind=Buchstabenkreis, image=echtes Thumbnail, fallback=Wine-Icon)

### 9.4 Context Level (3-stufige Sichtbarkeit)

| Level | Name | Inhalt |
|-------|------|--------|
| 0 | Naked | Nur Bewertungs-Eingaben + eigene Notizen |
| 1 | Self | + Persönlicher Fortschritt + AI Whisky Insights |
| 2 | Full | + Community Analytics, Diskussion, Reflexion, Teilnehmerliste |

---

## 10. Zustand Store (`client/src/lib/store.ts`)

```typescript
interface AppState {
  currentParticipant: { id: string; name: string; role?: string; canAccessWhiskyDb?: boolean } | null;
  language: string;           // "de" | "en"
  theme: Theme;               // "dark" | "light"
  contextLevel: ContextLevel; // 0 | 1 | 2
  uiMode: UIMode;             // "flow" | "focus" | "journal"
  storageConsentDismissed: boolean;
  wishlistTransfer: WishlistTransfer | null;
  // Ambient Sound
  ambientPlaying: boolean;
  ambientSoundscape: Soundscape; // "fireplace" | "rain" | "night" | "bagpipe"
  ambientVolume: number;
}
```

Persistiert via `zustand/middleware/persist` in localStorage unter Key `casksense-storage`.

---

## 11. API-Endpunkte (Auszug)

### 11.1 Teilnehmer

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| POST | `/api/participants` | Registrierung |
| POST | `/api/participants/login` | Login (Name + PIN) |
| POST | `/api/participants/guest` | Gast-Teilnehmer erstellen |
| GET | `/api/participants/:id` | Teilnehmer abrufen |
| PATCH | `/api/participants/:id/pin` | PIN ändern |
| PATCH | `/api/participants/:id/email` | E-Mail ändern |
| PATCH | `/api/participants/:id/language` | Sprache ändern |
| DELETE | `/api/participants/:id/anonymize` | Konto anonymisieren |
| POST | `/api/participants/:id/heartbeat` | Heartbeat (Anwesenheit) |
| GET | `/api/participants/:id/export-data` | Daten exportieren |

### 11.2 Tastings

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/tastings` | Alle Sessions |
| GET | `/api/tastings/:id` | Session-Details |
| GET | `/api/tastings/code/:code` | Session per Code |
| POST | `/api/tastings` | Session erstellen |
| PATCH | `/api/tastings/:id/status` | Status ändern |
| PATCH | `/api/tastings/:id/details` | Details bearbeiten |
| POST | `/api/tastings/:id/join` | Session beitreten |
| POST | `/api/tastings/:id/duplicate` | Session duplizieren |
| DELETE | `/api/tastings/:id` | Session löschen |
| POST | `/api/tastings/:id/transfer-host` | Host übertragen |
| POST | `/api/tastings/:id/cover-image` | Cover-Bild hochladen |

### 11.3 Whiskys

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/tastings/:id/whiskies` | Whiskys einer Session |
| POST | `/api/whiskies` | Whisky hinzufügen |
| PATCH | `/api/whiskies/:id` | Whisky bearbeiten |
| DELETE | `/api/whiskies/:id` | Whisky löschen |
| POST | `/api/whiskies/:id/image` | Flaschenfoto hochladen |
| POST | `/api/whiskies/:id/ai-enrich` | AI-Anreicherung |
| POST | `/api/tastings/:id/import/parse` | Excel/CSV Import parsen |
| POST | `/api/tastings/:id/import/confirm` | Import bestätigen |

### 11.4 Bewertungen

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| POST | `/api/ratings` | Bewertung erstellen/aktualisieren (Upsert) |
| GET | `/api/tastings/:id/ratings` | Alle Bewertungen einer Session |
| GET | `/api/ratings/:participantId/:whiskyId` | Einzelbewertung |
| GET | `/api/tastings/:id/analytics` | Session-Analytics |

**Rating-Upsert**: Keyed auf `(tastingId, whiskyId, participantId)` mit 800ms Debounce Auto-Save.

### 11.5 Journal & Wishlist

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/journal/:participantId` | Journal-Einträge |
| POST | `/api/journal/:participantId` | Eintrag erstellen |
| PATCH | `/api/journal/:participantId/:id` | Eintrag bearbeiten |
| DELETE | `/api/journal/:participantId/:id` | Eintrag löschen |
| POST | `/api/journal/identify-bottle` | AI-Flaschenidentifikation |
| GET | `/api/wishlist/:participantId` | Wunschliste |
| POST | `/api/wishlist/identify` | AI-Wunschlisten-Scan |

### 11.6 Sammlung (Whiskybase)

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/collection/:participantId` | Sammlung abrufen |
| POST | `/api/collection/:participantId/import` | CSV-Import |
| POST | `/api/collection/:participantId/sync` | Smart Sync/Diff |
| POST | `/api/collection/:participantId/sync/apply` | Sync anwenden |
| POST | `/api/collection/:participantId/price-estimate` | AI-Preisschätzung |
| GET | `/api/collection/:participantId/suggest-tasting` | AI-Tasting-Vorschläge |

### 11.7 Weitere Endpunkte

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/participants/:id/flavor-profile` | Geschmacksprofil |
| GET | `/api/community-scores` | Community-Bewertungen |
| GET | `/api/participants/:id/taste-twins` | Geschmackszwillinge |
| POST | `/api/tastings/:id/reveal-next` | Nächste Enthüllung |
| POST | `/api/tastings/:id/ai-highlights` | AI Session-Highlights |
| GET | `/api/platform-stats` | Plattform-Statistiken |
| GET | `/api/ai-status` | AI Kill Switch Status |
| GET | `/health` | Health-Check |
| GET | `/version` | Versions-Info |

---

## 12. Schlüssel-Features

### 12.1 Bewertungssystem

- 4 Dimensionen: Nose, Taste, Finish, Balance
- Dynamische Skalen: 5 / 10 / 20 / 100 Punkte
- Auto-berechneter Overall-Score mit manuellem Override
- ABV- und Alters-Schätzung optional

### 12.2 AI-Features (GPT-4o)

| Feature | Beschreibung | Rate Limit |
|---------|-------------|-----------|
| Flaschen-Identifikation | Foto → Whisky-Erkennung für Journal | - |
| Whisky-Insights | AI-generierte Fakten & Kontext | Gecacht |
| Session-Highlights | AI-Analyse der Tasting-Ergebnisse | Gecacht |
| Preisschätzung | Marktwert für Sammlungsstücke | 1x/Woche (non-admin) |
| Tasting-Vorschläge | Kuratierung aus eigener Sammlung | - |
| Newsletter-Generierung | AI-gestützter Newsletter-Inhalt | Admin-only |
| AI-Teilnehmerprofile | GPT-generierte Profilbeschreibungen | Admin-only, PIN-geschützt |

**AI Kill Switch**: Admin kann AI global oder per Feature deaktivieren. Frontend nutzt `useAIStatus` Hook für Status-Polling.

### 12.3 Whiskybase-Integration

- CSV-Import der persönlichen Sammlung
- Smart Sync/Diff bei Re-Upload (neu, entfernt, geändert)
- Pro-Item-Entscheidungen (hinzufügen/behalten/löschen/aktualisieren)
- AI-Preisschätzung mit "KI-geschätzt" Badge
- Tasting-Kuratierung aus eigener Sammlung

### 12.4 Internationalisierung

- **Aktiv**: Deutsch (DE) + Englisch (EN)
- Inline in `client/src/lib/i18n.ts` (~6000 Zeilen)
- Weitere Sprachen als Fallback vorhanden (ES, FR, IT, NL, ZH) aber versteckt

### 12.5 PWA & Mobile

- Service Worker für Offline-Zugriff
- Installierbar als PWA
- Capacitor-Wrapper für iOS/Android
- Safe-Area-Insets für Notch-Geräte
- Touch-optimierte Slider für Bewertungen

### 12.6 Wissensdatenbank

- **Whisky-Lexikon**: Fachbegriffe und Definitionen
- **Destillerie-Enzyklopädie**: Destillerien weltweit
- **Abfüller-Enzyklopädie**: Independent Bottlers
- **Destillerie-Karte**: Interaktive Kartenansicht
- Community-Vorschläge für neue Einträge

### 12.7 Admin-Features

- Plattform-Einstellungen (What's New, Registrierung, Wartungsmodus)
- Test-Daten-Management (Markierung, Bulk-Cleanup)
- AI Kill Switch (global/per Feature)
- Teilnehmer-Verwaltung (Rollen, Whitelist)
- Changelog-Verwaltung
- Audit-Log
- PIN-geschützte AI-Teilnehmerprofile
- Plattform-Analytics (Messqualität, Prädiktive Validität)

### 12.8 Teilnehmer-Deduplizierung

Backend-Berechnungen (globale Durchschnitte, Plattform-Analytics) deduplizieren Teilnehmer nach `(name, pin)` Kombination, um Doppelzählungen zu vermeiden.

---

## 13. Dateigrößen-Übersicht (Kernkomponenten)

| Datei | Zeilen | Beschreibung |
|-------|--------|-------------|
| `server/routes.ts` | ~8.800 | Alle API-Routen |
| `client/src/lib/i18n.ts` | ~6.000 | Übersetzungen DE+EN |
| `shared/schema.ts` | ~524 | Datenbank-Schema |
| `client/src/components/layout.tsx` | ~819 | Layout + Navigation |
| `client/src/pages/naked-tasting.tsx` | groß | Naked-Tasting UI |
| `client/src/pages/tasting-room.tsx` | groß | Tasting-Raum |
| `client/src/pages/admin-panel.tsx` | groß | Admin-Panel |
| `server/storage.ts` | groß | Datenzugriffsschicht |
| `client/src/App.tsx` | ~176 | Router + Redirects |

---

## 14. Datenfluss-Diagramm

```
Benutzer (Browser)
    │
    ├── Zustand Store (localStorage)    ← Client-State (Participant, Theme, UIMode, ContextLevel)
    │
    ├── React Query (Polling)           ← Server-State (Tastings, Ratings, etc.)
    │       │
    │       ▼
    │   Express 5 API (/api/*)
    │       │
    │       ├── Storage Interface (Drizzle ORM)
    │       │       │
    │       │       ▼
    │       │   PostgreSQL
    │       │
    │       ├── OpenAI GPT-4o           ← AI-Features
    │       │
    │       ├── Replit Object Storage   ← Bilder
    │       │
    │       └── Nodemailer              ← E-Mails
    │
    └── Naked Tasting (/naked/:code)   ← Außerhalb Layout, eigener State-Flow
```

---

## 15. Wichtige Design-Entscheidungen

1. **Kein Server-Session-System**: Alles client-side via Zustand. Stateless API.
2. **Composite Pages**: Viele alte Einzelseiten wurden zu Tabbed-Seiten zusammengefasst (z.B. MyJournal enthält Journal, Verkostete, Recap, Compare, Benchmark, Analytics, Export).
3. **Redirect-Architektur**: Alte Routen bleiben als Redirects erhalten für Rückwärtskompatibilität.
4. **Rating Upsert**: Keyed auf `(tastingId, whiskyId, participantId)` — Auto-Save mit 800ms Debounce.
5. **Blind-Modus Single Source of Truth**: `getDramDisplay()` Funktion für einheitliche Blind-Logik.
6. **AI-Caching**: Alle AI-Ergebnisse werden in der DB gecacht (Spalten `aiFactsCache`, `aiInsightsCache`, `aiHighlightsCache`).
7. **Polling statt WebSockets**: React Query Polling für Near-Real-Time Updates.
8. **Tailwind + shadcn/ui**: Muted Slate Blue Theme, Light Mode Standard.

---

*Erstellt am 27.02.2026 für den Austausch mit externen AI-Assistenten.*
