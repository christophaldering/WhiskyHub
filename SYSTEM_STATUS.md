# CaskSense v2.0.0 — Systemstatus

> Stand: 06. Maerz 2026
> Plattform: Replit (Node.js, PostgreSQL)

---

## 1. Was ist CaskSense?

Eine Web-App fuer strukturierte, kollaborative Whisky-Tastings. Nutzer koennen Sessions erstellen, Teilnehmer einladen, Whiskys blind bewerten und Ergebnisse analysieren. Die App richtet sich an Whisky-Enthusiasten, die ihre Tastings professionell dokumentieren moechten.

**Sole Admin/User:** Christoph Aldering (`christoph.aldering@googlemail.com`)

---

## 2. Tech-Stack

| Schicht       | Technologie                                                              |
|---------------|--------------------------------------------------------------------------|
| Frontend      | React 19, Vite 7, TypeScript, Wouter (Routing), TanStack React Query    |
| UI            | shadcn/ui + Radix UI + Tailwind CSS, Dark Warm Theme (`#d4a256` Accent)  |
| State         | Zustand (Client), React Query (Server State)                             |
| Backend       | Express 5, TypeScript, ESM Modules                                      |
| Datenbank     | PostgreSQL, Drizzle ORM, Zod Validation                                 |
| i18n          | react-i18next (Deutsch + Englisch)                                       |
| AI            | OpenAI GPT-4o (Flaschen-ID, Content, Preise, Vorschlaege)               |
| Speicher      | Replit Object Storage (Bilder)                                           |
| Charts        | Recharts (Radar, Bar, Pie, Line)                                         |
| PDF           | jsPDF                                                                    |
| E-Mail        | Nodemailer                                                               |
| Excel         | ExcelJS                                                                  |
| Mobile        | Capacitor (iOS/Android Wrapper)                                          |
| Tests         | Vitest (67 Tests, alle gruen)                                            |
| Animationen   | Framer Motion                                                            |

---

## 3. Projektstruktur

```
/
├── client/                    # Frontend (React/Vite)
│   └── src/
│       ├── components/        # Wiederverwendbare Komponenten
│       │   ├── m2/            # Module 2 spezifische Komponenten
│       │   ├── simple/        # Simple Mode Layout (Header + Bottom Nav)
│       │   ├── apple/         # Apple-Style Komponenten
│       │   ├── admin/         # Admin-Bereich Layout
│       │   ├── landing/       # Landing Page Demos
│       │   └── ui/            # shadcn/ui Basis-Komponenten (~50 Dateien)
│       ├── pages/             # Seiten (~130 Dateien)
│       │   └── m2/            # Module 2 Seiten (~50 Dateien)
│       ├── v2/                # V2 Dark Warm UI (/app/*)
│       ├── lab-dark/          # Lab Experimental (/lab-dark/*)
│       ├── lib/               # Utilities, API, i18n, Theme, Config
│       │   ├── config.ts      # Feature Flags (NAV_VERSION, UI_SKIN, etc.)
│       │   ├── themeVars.ts   # Theme-System (dark-warm / light-warm)
│       │   ├── i18n.ts        # Internationalisierung (~11.000 Zeilen, DE/EN)
│       │   ├── api.ts         # API-Client Funktionen
│       │   ├── store.ts       # Zustand Store (Auth, State)
│       │   └── session.ts     # Session-Handling
│       ├── hooks/             # Custom React Hooks
│       └── data/              # Statische Daten (Destillerien, Abfueller)
├── server/                    # Backend (Express)
│   ├── routes.ts              # ~10.100 Zeilen, alle API Endpoints
│   ├── storage.ts             # ~2.100 Zeilen, DB-Zugriff (IStorage Interface)
│   ├── historical-import.ts   # Excel-Import fuer historische Tastings
│   ├── historical-reconciliation.ts  # Datenqualitaets-Audit
│   ├── ai-client.ts           # OpenAI Integration
│   ├── ai-settings.ts         # KI Kill-Switch
│   ├── email.ts               # E-Mail Versand (Nodemailer/Gmail)
│   ├── excel-utils.ts         # ExcelJS Helper
│   ├── insight-engine.ts      # Analyse-Engine
│   ├── db.ts                  # PostgreSQL-Verbindung
│   ├── static.ts              # Statische Dateien
│   ├── vite.ts                # Vite Dev-Server Integration
│   └── lib/                   # Auth, Cache, Matching, OCR, Whisky-Index
├── shared/                    # Geteilter Code (Client + Server)
│   ├── schema.ts              # Drizzle ORM Schema (35+ Tabellen) + Zod Schemas
│   └── version.ts             # Build-Version
└── tests/
    └── unit/                  # Vitest Tests (7 Dateien, 67 Tests)
```

---

## 4. Datenbank-Schema (PostgreSQL)

### Kern-Tabellen
| Tabelle                    | Zweck                                          |
|----------------------------|-------------------------------------------------|
| `participants`             | Benutzer (UUID, Name, E-Mail, Rolle, Passwort)  |
| `profiles`                 | Geschmacksprofil, Praeferenzen, Einstellungen    |
| `tastings`                 | Tasting-Sessions (Status: draft/open/closed/reveal/archived) |
| `tasting_participants`     | Teilnehmer pro Session                           |
| `whiskies`                 | Whiskys pro Session                              |
| `ratings`                  | Bewertungen (Nase/Geschmack/Finish/Balance/Gesamt) |
| `journal_entries`          | Persoenliches Whisky-Tagebuch                    |
| `whiskybase_collection`    | Importierte Whiskybase-Sammlung (CSV)            |

### Historisches Archiv
| Tabelle                        | Zweck                                      |
|--------------------------------|--------------------------------------------|
| `historical_tastings`          | 32 importierte Tastings (aus Excel)        |
| `historical_tasting_entries`   | 384 Whisky-Eintraege mit Scores            |
| `historical_import_runs`       | Import-Protokoll                           |

### Community & Zugriffskontrolle
| Tabelle                    | Zweck                                          |
|----------------------------|-------------------------------------------------|
| `communities`              | Community-Gruppen (Slug, Name, Sichtbarkeit)    |
| `community_memberships`    | Mitgliedschaften (Participant + Community + Rolle) |

### Social & Interaktion
| Tabelle                    | Zweck                                          |
|----------------------------|-------------------------------------------------|
| `whisky_friends`           | Freundschaften zwischen Teilnehmern             |
| `wishlist_entries`         | Persoenliche Wunschliste                        |
| `session_invites`          | Einladungen zu Sessions                         |
| `session_presence`         | Online-Status (Heartbeat)                       |
| `notifications`            | Benachrichtigungen                              |
| `discussion_entries`       | Diskussionsbeitraege in Sessions                |
| `tasting_photos`           | Fotos pro Session                               |
| `tasting_reminders`        | Erinnerungen                                    |

### Admin & System
| Tabelle                    | Zweck                                          |
|----------------------------|-------------------------------------------------|
| `admin_audit_log`          | Audit-Protokoll (Admin-Aktionen)                |
| `app_settings`             | Feature-Toggles (z.B. Friend Notifications)     |
| `system_settings`          | System-Konfiguration                            |
| `user_feedback`            | Nutzerfeedback                                  |
| `newsletter_recipients`    | Newsletter-Empfaenger                           |
| `newsletters`              | Newsletter-Inhalte                              |

### Weitere
`benchmark_entries`, `changelog_entries`, `encyclopedia_suggestions`, `reflection_entries`, `reminder_log`

---

## 5. Wichtigste Features

### Tasting-System
- **Live Tastings**: Host erstellt Session, laedt Teilnehmer ein (QR/Link), Blind-Modus, Fortschrittsanzeige
- **Solo Drams**: Einzelbewertung mit AI-gestuetzter Whisky-Erkennung (Foto/Text)
- **Rating-System**: 5 Dimensionen (Nase/Geschmack/Finish/Balance/Gesamt), Flavor-Chips, Sprach-Notizen
- **Hosting Dashboard**: Desktop-first 3-Spalten-Layout fuer Live-Kontrolle
- **Context Level**: Naked (blind) / Self (eigene Bewertung) / Full (alle sehen alles)
- **Ergebnisse**: Ranking, Podium, Statistiken, Export (PDF/CSV/Excel/ZIP)
- **Guest Mode**: "Standard Naked" (persistente Identitaet) und "Ultra Naked" (ephemere Identitaet)

### Persoenlicher Bereich ("Taste")
- Geschmacksprofil & Analytics, Flavor Wheel
- Whisky-Sammlung (Whiskybase CSV-Sync), Collection Analysis (8 Sektionen)
- Journal, Badges, Vergleichstool, Empfehlungen, Wunschliste

### Historisches Archiv
- 32 Tastings, 384 Whisky-Eintraege (Excel-Import)
- Durchsuchbar, sortierbar, mit Winner-Podium und Score-Verteilung
- Insights: Top-Whiskys, Regionen, Rauchig/Nicht-Rauchig, Fasstypen, Radar-Charts

### Community & Social
- Freundschaften, Taste Twins, Leaderboards, Activity Feed
- Online-Status mit Benachrichtigungen (Toggle per User und Admin)
- Community-Rankings

### AI-Features
- Flaschen-Identifikation (Foto)
- Tasting-Vorschlaege, Content-Generierung
- Marktpreis-Schaetzung
- Whiskybase ID Auto-Fill

### Oeffentliche Seiten
- Premium Landing Page (8 Sektionen, Scroll-Animationen)
- Guided Presentation (18 Slides)
- Feature Showcase (11 interaktive Demos)

---

## 6. Community Visibility & Access Model (AKTUELL)

### Architektur
Historische Tasting-Daten sind durch Community-Mitgliedschaft geschuetzt.

### Sichtbarkeitsstufen
| Level                  | Wer sieht was?                                      |
|------------------------|------------------------------------------------------|
| `community_only`       | Nur Mitglieder der zugehoerigen Community (STANDARD) |
| `public_aggregated`    | Oeffentlich, aber nur aggregierte Daten               |
| `public_full`          | Oeffentlich, volle Details                            |
| `private_admin`        | Nur Admins                                            |

### Aktueller Zustand
- 1 Community: "Christoph, Rudi & Friends-Circle" (ID: `d1d8fd17-c63f-42e2-8524-7503803c625b`)
- 32 Tastings, alle `community_only`
- 1 Admin-Mitglied (Christoph)
- Anonyme User sehen: 0 Tastings, 0 Analytics, 0 Appearances
- Admin sieht: alle 32 Tastings, volle Analytics

### Zugriffskontrolle (gehaertet, Stand 06.03.2026)
- Zentraler Helper: `getAccessibleHistoricalTastingIds(communityIds, isAdmin)` in `server/storage.ts`
- Alle Endpoints gefiltert: `/tastings`, `/analytics`, `/whisky-appearances`, `/public-insights`
- `private_admin` explizit von Nicht-Admin-Mitgliedern ausgeschlossen
- Zod-Validation auf Admin-Endpoints (Community-Update, Mitglieder-Hinzufuegen)
- Frontend: `enabled: isMember` auf allen Queries, `x-participant-id` Header auf allen Fetches

### Zugriffs-Matrix
| Benutzertyp              | `/tastings` | `/analytics` | `/tastings/:id` | `/whisky-appearances` | `/public-insights` |
|--------------------------|-------------|---------------|------------------|------------------------|---------------------|
| Anonym                   | 0 Ergebnisse | 0 Stats      | 403              | 0 Ergebnisse           | Nur public_*       |
| Nicht-Mitglied (authed)  | 0 Ergebnisse | 0 Stats      | 403              | 0 Ergebnisse           | Nur public_*       |
| Community-Mitglied       | Eigene Community + public | Eigene + public | Eigene + public  | Eigene + public        | Nur public_*       |
| Admin                    | Alles       | Alles         | Alles            | Alles                  | Nur public_*       |

---

## 7. API-Endpunkte (wichtigste)

### Historische Tastings (zugriffskontrolliert)
```
GET  /api/historical/tastings              # Liste (gefiltert nach Zugriff)
GET  /api/historical/tastings/:id          # Detail (403 wenn kein Zugriff)
GET  /api/historical/analytics             # Statistiken (gefiltert)
GET  /api/historical/whisky-appearances    # Whisky-Auftritte (gefiltert)
GET  /api/historical/public-insights       # Nur public_full/public_aggregated
```

### Community-Management (Admin-only)
```
GET    /api/admin/communities              # Alle Communities
PUT    /api/admin/communities/:id          # Update (Zod-validiert)
POST   /api/admin/communities/:id/members  # Mitglied hinzufuegen (Zod-validiert)
DELETE /api/admin/communities/:id/members/:pid  # Mitglied entfernen
POST   /api/admin/communities/seed         # Initial-Daten erstellen
GET    /api/communities/mine               # Eigene Mitgliedschaften
```

### Kern-API
```
POST   /api/participants/login             # Anmeldung
GET    /api/participants/:id               # Profil
POST   /api/tastings                       # Session erstellen
GET    /api/tastings/:id                   # Session-Details
POST   /api/ratings                        # Bewertung abgeben
GET    /api/journal                        # Journal-Eintraege
POST   /api/admin/historical/import        # Excel-Import (Admin)
GET    /api/admin/historical/reconciliation # Datenqualitaet (Admin)
```

---

## 8. Navigation & Routing

### Simple Mode (aktiv, 2-Tab Bottom Nav)
- **Tab 1 — Tasting** (`/tasting`): Hub zum Beitreten, Hosten, Sessions-Liste, Host Dashboard
- **Tab 2 — My Taste** (`/my-taste`): Persoenliches Dashboard mit Drams, Analytics, Collection, Wissen, Community

### Module 2 (Haupt-UI: `/m2/*`)
- **3-Tab Bottom Nav**: Tasting | Taste | People
- **Tasting Tab**: `/m2/tastings/*` — Sessions, Host-Wizard, Live Play, Ergebnisse
- **Taste Tab**: `/m2/taste/*` — Dashboard, Drams, Analytics, Collection, Historical
- **Circle Tab**: `/m2/circle` — Community, Friends, Leaderboards
- **Discover**: `/m2/discover/*` — Wissen, Templates, Destillerien
- **Admin**: `/m2/admin` — Verwaltung, AI, Communities, Import

### Weitere UI-Schichten (nicht primaer aktiv)
- **V2 Dark Warm** (`/app/*`): 5-Tab Bottom Nav (Home, Sessions, Discover, Cellar, More)
- **Lab Experimental** (`/lab-dark/*`): Experimentelle Ansichten
- **Legacy** (`/legacy/*`): Alte Sidebar-Navigation

### Design-Regeln (M2)
- Inline Styles mit `v.*` CSS-Tokens (NICHT shadcn/ui)
- Dark Warm Theme, Accent: `#d4a256` (Gold)
- `M2BackButton` ist Default Export
- `session.pid` (nicht `session?.participantId`)
- `Array.from()` fuer Map-Iteration

---

## 9. Aktive Feature Flags

| Flag | Wert | Bedeutung |
|------|------|-----------|
| `NAV_VERSION` | `"v2_two_tab"` | 2-Tab Bottom Navigation |
| `UI_SKIN` | `"apple_dark_warm"` | Apple-Style Dark Warm Design |
| `MY_TASTE_STRUCTURE` | `"v2_experience_first"` | Drams-Sektion primaer, Collection sekundaer |
| `DISCOVER_STRUCTURE` | `"v2_simplified"` | Discover-Inhalte in My Taste integriert |
| `LANDING_VERSION` | `"two_screen_start"` | 3 Primary + 2 Secondary Actions |

---

## 10. Tests

7 Test-Dateien, 67 Tests (alle gruen):

| Datei | Tests | Inhalt |
|-------|-------|--------|
| `community-access.test.ts` | 13 | Access Control (anonym, admin, member, Zod validation) |
| `historical-normalization.test.ts` | 32 | Normalisierung, Parsing, Source Keys |
| `i18n-coverage.test.ts` | 2 | i18n-Abdeckung EN/DE |
| `Module2Shell.test.tsx` | 4 | M2 Layout Rendering |
| `M2BackButton.test.tsx` | 4 | Navigation Guards |
| `M2ProfileMenu.test.tsx` | 8 | Auth-Flow Tests |
| `theme-tokens.test.ts` | 4 | Theme-Token Konsistenz |

---

## 11. Bekannte Einschraenkungen / Offene Punkte

- Doppelter "nav" Key in `i18n.ts` (harmlos, nicht fixen)
- Null-Safety TS-Fehler in `server/storage.ts` (pre-existing, nicht fixen)
- `routes.ts` ist ~10.100 Zeilen (koennte aufgeteilt werden)
- Kein DB-FK-Constraint auf `community_memberships` (funktioniert, aber kein Referential Integrity)
- Kein Unique Index auf `(communityId, participantId)` in `community_memberships`

---

## 12. Deployment

- Hosting: Replit
- Build: `npm run dev` (Development), Vite Production Build fuer Deployment
- DB: Replit PostgreSQL (automatisch provisioniert)
- Bilder: Replit Object Storage
- Domain: `.replit.app` oder Custom Domain (casksense.com)

---

*Dieses Dokument enthaelt den vollstaendigen Systemstatus von CaskSense und kann direkt an ChatGPT oder andere Tools weitergegeben werden, um ueber Architektur, Features, Security und naechste Schritte zu diskutieren.*
