# CaskSense v2.0.0 — Projekt- & Menüstruktur für ChatGPT

**Stand:** 5. März 2026  
**Stack:** React 19 + Vite 7 · Express 5 · PostgreSQL + Drizzle ORM · TypeScript  
**Domain:** casksense.com (Replit Hosting)  
**Admin:** Christoph Aldering

---

## 1. Verzeichnisstruktur (komplett)

```
casksense/
├── client/                          # React SPA
│   └── src/
│       ├── App.tsx                  # Router (alle Routen, 3 UI-Schichten)
│       ├── main.tsx                 # Einstiegspunkt
│       ├── index.css                # Globales CSS (Tailwind)
│       │
│       ├── pages/                   # 103 Seiten-Dateien
│       │   ├── public-landing.tsx       # "/" — Premium Landing (8 Sektionen)
│       │   ├── guided-presentation.tsx  # "/presentation" — 18-Slide Deck
│       │   ├── landing-v2.tsx           # "/landing-v2" — Interaktive Landing
│       │   ├── feature-showcase.tsx     # "/feature-showcase" — 11 Feature-Demos
│       │   ├── feature-tour.tsx         # "/feature-tour"
│       │   ├── tour.tsx                 # "/tour"
│       │   ├── intro.tsx                # "/intro"
│       │   │
│       │   ├── simple-enter.tsx         # "/enter" — Login/Registrierung
│       │   ├── tasting-hub-simple.tsx   # "/tasting" — Tasting-Hub (Tab 1)
│       │   ├── simple-host.tsx          # "/host" — Tasting erstellen
│       │   ├── host-dashboard.tsx       # "/host-dashboard" — Host-Cockpit
│       │   ├── tasting-room-simple.tsx  # "/tasting-room-simple/:id" — Live-Raum
│       │   ├── tasting-results.tsx      # "/tasting-results/:id" — Ergebnisse
│       │   ├── sessions-dark.tsx        # "/sessions" — Tasting-Liste
│       │   ├── tasting-calendar.tsx     # "/tasting-calendar"
│       │   ├── naked-tasting.tsx        # "/naked/:code" — Gast-Modus
│       │   ├── quick-tasting.tsx        # "/join/:code" — Schnellbeitritt
│       │   │
│       │   ├── my-taste.tsx             # "/my-taste" — Persönl. Dashboard (Tab 2)
│       │   ├── simple-log.tsx           # "/my-taste/log" — Dram loggen
│       │   ├── my-journal.tsx           # "/my-taste/journal" — Tagebuch
│       │   ├── flavor-profile.tsx       # "/my-taste/profile" — Geschmacksprofil
│       │   ├── my-taste-analytics.tsx   # "/my-taste/analytics"
│       │   ├── my-taste-compare.tsx     # "/my-taste/compare"
│       │   ├── my-taste-recommendations.tsx  # "/my-taste/recommendations"
│       │   ├── my-taste-pairings.tsx    # "/my-taste/pairings"
│       │   ├── my-taste-benchmark.tsx   # "/my-taste/benchmark"
│       │   ├── my-taste-wheel.tsx       # "/my-taste/wheel" — Aroma-Rad
│       │   ├── my-taste-settings.tsx    # "/my-taste/settings" — Einstellungen
│       │   ├── whiskybase-collection.tsx # "/my-taste/collection"
│       │   ├── wishlist.tsx             # "/my-taste/wishlist"
│       │   │
│       │   ├── data-export-dark.tsx     # "/data-export"
│       │   ├── ai-curation-dark.tsx     # "/ai-curation"
│       │   ├── simple-analyze.tsx       # "/analyze"
│       │   ├── vocabulary-dark.tsx      # "/vocabulary" — Lexikon
│       │   ├── tasting-guide.tsx        # "/guide" & "/discover/guide"
│       │   ├── discover-templates.tsx   # "/discover/templates"
│       │   ├── discover-lexicon.tsx     # "/discover/lexicon"
│       │   ├── discover-distilleries-native.tsx  # "/discover/distilleries"
│       │   ├── discover-bottlers-native.tsx      # "/discover/bottlers"
│       │   ├── discover-community-native.tsx     # "/discover/community"
│       │   ├── activity-feed.tsx        # "/discover/activity"
│       │   ├── about-dark.tsx           # "/discover/about"
│       │   ├── donate-dark.tsx          # "/discover/donate"
│       │   ├── support-console.tsx      # "/support"
│       │   ├── tasting-recap.tsx        # Tasting-Rückblick
│       │   ├── invite-accept.tsx        # Einladungs-Annahme
│       │   │
│       │   ├── admin-panel.tsx          # "/admin" — Admin-Bereich
│       │   ├── impressum.tsx            # "/impressum"
│       │   ├── privacy.tsx              # "/privacy"
│       │   │
│       │   ├── landing.tsx              # "/app-entry" (alter Landing)
│       │   ├── home-dashboard.tsx       # Legacy Home
│       │   ├── tasting-hub.tsx          # Legacy Tasting Hub
│       │   ├── tasting-room.tsx         # Legacy Tasting Room
│       │   ├── discover-hub.tsx         # Legacy Discover
│       │   ├── profile.tsx              # Legacy Profile
│       │   └── ... (weitere Legacy/Hilfsdateien)
│       │
│       ├── components/
│       │   ├── simple/
│       │   │   ├── simple-shell.tsx      # Layout-Wrapper Simple Mode (Header + Bottom Nav)
│       │   │   └── simple-legacy-shell.tsx # Legacy-Wrapper
│       │   ├── apple/
│       │   │   └── index.tsx            # Apple-Style Komponenten (ApplePage, AppleSection, etc.)
│       │   ├── admin/
│       │   │   └── AdminLayout.tsx      # Admin-Bereich Layout
│       │   ├── landing/
│       │   │   ├── DemoDramLogger.tsx    # Interaktive Demo (Landing V2)
│       │   │   └── DemoPanelCompare.tsx  # Interaktive Demo (Landing V2)
│       │   ├── ui/                      # shadcn/ui Basis-Komponenten (~50 Dateien)
│       │   ├── layout.tsx               # Legacy Layout mit Sidebar
│       │   ├── session-sheet.tsx         # User/Session Menu (Drawer)
│       │   ├── session-control.tsx       # Host-Steuerung
│       │   ├── evaluation-form.tsx       # Bewertungsformular
│       │   ├── guided-tasting.tsx        # Guided-Modus Komponente
│       │   ├── flight-board.tsx          # Flight Board
│       │   ├── discussion-panel.tsx      # Diskussions-Panel
│       │   ├── invite-panel.tsx          # Einladungs-Panel
│       │   ├── tasting-note-generator.tsx # KI-Notiz-Generator
│       │   ├── tasting-analytics.tsx     # Analyse-Visualisierungen
│       │   ├── reveal-presenter.tsx      # Reveal-Show
│       │   ├── reveal-view.tsx           # Reveal-Ansicht
│       │   ├── pdf-export-dialog.tsx     # PDF-Export
│       │   ├── briefing-notes.tsx        # Host Briefing
│       │   ├── curation-wizard.tsx       # KI-Kuratierung
│       │   ├── feedback-button.tsx       # Feedback-Button
│       │   ├── language-toggle.tsx       # Sprachumschaltung
│       │   ├── theme-toggle.tsx          # Theme-Umschaltung
│       │   └── ... (weitere Feature-Komponenten)
│       │
│       ├── v2/                          # V2 Dark Warm UI (/app/*)
│       │   ├── components/
│       │   │   ├── AppShellV2.tsx        # V2 Layout (5-Tab Bottom Nav)
│       │   │   ├── CardV2.tsx
│       │   │   ├── ListRowV2.tsx
│       │   │   ├── PageHeaderV2.tsx
│       │   │   ├── SearchBarV2.tsx
│       │   │   └── SegmentedControlV2.tsx
│       │   └── pages/
│       │       ├── V2Home.tsx            # /app/home
│       │       ├── V2Sessions.tsx        # /app/sessions
│       │       ├── V2SessionDetail.tsx   # /app/session/:id
│       │       ├── V2Discover.tsx        # /app/discover
│       │       ├── V2Cellar.tsx          # /app/cellar
│       │       └── V2More.tsx            # /app/more
│       │
│       ├── lab-dark/                    # Lab Experimental (/lab-dark/*)
│       │   ├── LabDarkLayout.tsx
│       │   └── pages/
│       │       ├── LabHome.tsx
│       │       ├── LabSessions.tsx
│       │       ├── LabDiscover.tsx
│       │       └── LabSessionDetail.tsx
│       │
│       ├── lib/
│       │   ├── config.ts               # Feature Flags (NAV_VERSION, UI_SKIN, etc.)
│       │   ├── themeVars.ts            # Theme-System (dark-warm / light-warm)
│       │   ├── theme.ts               # Legacy Theme
│       │   ├── i18n.ts                # Internationalisierung (~7.900 Keys, DE/EN)
│       │   ├── api.ts                 # API-Client Funktionen
│       │   ├── store.ts               # Zustand Store (Auth, State)
│       │   ├── session.ts             # Session-Handling
│       │   ├── simple-auth.ts         # Simple Mode Auth
│       │   ├── demoMath.ts            # Demo-Berechnung (Landing V2)
│       │   ├── queryClient.ts         # React Query Client
│       │   ├── ambient.ts             # Ambient-Effekte
│       │   ├── comparable-baseline.ts # Benchmark-Basisdaten
│       │   ├── utils.ts               # Hilfsfunktionen
│       │   └── translations/          # Zusätzliche Sprachen (ES, FR, IT, NL, ZH)
│       │
│       ├── hooks/
│       │   ├── use-toast.ts
│       │   ├── use-mobile.tsx
│       │   ├── use-ai-status.ts
│       │   ├── use-upload.ts
│       │   ├── use-unsaved-changes.ts
│       │   └── use-input-focused.ts
│       │
│       └── data/
│           ├── distilleries.ts        # Destillerien-Daten
│           └── bottlers.ts            # Abfüller-Daten
│
├── server/                            # Express 5 Backend
│   ├── index.ts                       # Server-Einstiegspunkt
│   ├── routes.ts                      # Alle API-Endpunkte (~6.000 Zeilen)
│   ├── storage.ts                     # IStorage Interface + Drizzle-Implementierung
│   ├── db.ts                          # PostgreSQL-Verbindung
│   ├── ai-client.ts                   # OpenAI GPT-4o Integration
│   ├── ai-settings.ts                 # KI Kill-Switch
│   ├── email.ts                       # Nodemailer (Gmail)
│   ├── excel-utils.ts                 # ExcelJS Helper
│   ├── insight-engine.ts              # Analyse-Engine
│   ├── static.ts                      # Statische Dateien
│   ├── vite.ts                        # Vite Dev-Server Integration
│   ├── lib/
│   │   ├── auth.ts                    # Auth-Logik
│   │   ├── cache.ts                   # Caching
│   │   ├── matching.ts               # Fuzzy Matching
│   │   ├── ocr.ts                     # OCR/Bilderkennung
│   │   ├── onlineSearch.ts            # Online-Suche
│   │   └── whiskyIndex.ts             # Whisky-Index
│   └── replit_integrations/           # Replit-Integrationen
│       ├── object_storage/            # Bildupload (Flaschen, Avatare)
│       ├── chat/                      # KI-Chat
│       ├── audio/                     # Audio
│       ├── image/                     # Bildgenerierung
│       └── batch/                     # Batch-Verarbeitung
│
├── shared/                            # Geteilter Code (Client + Server)
│   ├── schema.ts                      # Drizzle ORM Schema (26 Tabellen) + Zod
│   ├── version.ts                     # Build-Version
│   └── models/
│       └── chat.ts                    # Chat-Modelle
│
├── tests/                             # Tests
│   └── link-integrity.ts             # Route-Integritäts-Test (43/43)
│
├── docs/                              # Dokumentation
├── scripts/                           # Build/Migration-Scripts
├── dist/                              # Build-Output
├── uploads/                           # Lokale Uploads (Dev)
│
├── package.json                       # Dependencies
├── vite.config.ts                     # Vite-Konfiguration
├── drizzle.config.ts                  # Drizzle-Konfiguration
├── tsconfig.json                      # TypeScript
├── capacitor.config.ts                # Capacitor (Mobile)
└── replit.md                          # Projekt-Dokumentation
```

---

## 2. Aktive Feature Flags

| Flag | Wert | Bedeutung |
|------|------|-----------|
| `NAV_VERSION` | `"v2_two_tab"` | 2-Tab Bottom Navigation |
| `UI_SKIN` | `"apple_dark_warm"` | Apple-Style Dark Warm Design |
| `MY_TASTE_STRUCTURE` | `"v2_experience_first"` | Drams-Sektion primär, Collection sekundär |
| `DISCOVER_STRUCTURE` | `"v2_simplified"` | Discover-Inhalte in My Taste integriert |
| `LANDING_VERSION` | `"two_screen_start"` | 3 Primary + 2 Secondary Actions |

---

## 3. Menü- & Navigationsarchitektur (Simple Mode — aktiv)

### 3.1 Bottom Navigation (2 Tabs)

```
┌──────────────────────────────────────────┐
│           [Tasting]    [My Taste]        │
└──────────────────────────────────────────┘
     Tab 1: /tasting       Tab 2: /my-taste
```

### 3.2 Tab 1: Tasting (`/tasting` → tasting-hub-simple.tsx)

```
TASTING HUB
├── 🟢 Primary Actions (große Karten)
│   ├── "Tasting beitreten" → /enter (Session-Code eingeben)
│   └── "Tasting hosten" → /host (neues Tasting erstellen)
│
└── 📋 Mehr-Bereich (Listenzeilen)
    ├── "Letzte Tastings" → /sessions
    ├── "Host Dashboard" → /host-dashboard
    └── "Tasting Kalender" → /tasting-calendar
```

### 3.3 Host Dashboard (`/host-dashboard` → host-dashboard.tsx)

```
HOST DASHBOARD
├── 📊 Statistik-Karten (oben)
│   ├── Tastings gesamt (Zahl)
│   ├── Teilnehmer gesamt (Zahl)
│   └── Whiskys gesamt (Zahl)
│
├── ⚡ Schnellzugriff
│   ├── "Neues Tasting" → /host
│   └── "Tastings" → /sessions
│   └── [Entwürfe fortsetzen] (falls vorhanden, Badges mit Tasting-Namen)
│
├── 📈 Durchschnittliche Bewertungen
│   └── Balkendiagramm (Nose, Taste, Finish, Balance, Overall)
│
├── 📄 Dokumente
│   ├── "Bewertungsbogen" (PDF Download)
│   └── "Tasting-Unterlage" (PDF Download)
│
├── 🏆 Top Whiskys
│   └── Rangliste (Name, Destillerie, Score, Bild)
│
├── 🛠 Tools & Analyse
│   ├── "Datenexport" → /data-export (CSV, Excel, kompletter Export)
│   ├── "Tastings verwalten" → /sessions (Duplizieren, archivieren, bearbeiten)
│   └── "KI-Kuratierung" → /ai-curation (KI-gestützte Vorschläge)
│
├── 📅 Letzte Tastings
│   └── Liste (Name, Datum, Status-Badge, Teilnehmerzahl)
│
└── 📨 Einladungen
    ├── Tasting-Auswahl (Dropdown)
    ├── QR-Code anzeigen
    ├── Einladungs-Link kopieren
    └── Per E-Mail einladen (mit persönlicher Nachricht)
```

### 3.4 Tab 2: My Taste (`/my-taste` → my-taste.tsx)

```
MY TASTE (v2_experience_first Layout)
├── 🥃 Drams (primäre Sektion)
│   ├── [+ Dram hinzufügen] → /log-simple (Primary CTA)
│   ├── "Journal" → /my-taste/journal (Anzahl Einträge)
│   ├── "Tasting Recap" → /sessions (Anzahl Sessions)
│   └── "Flavor Profile" → /my-taste/profile
│
├── 🎯 Taste Snapshot
│   ├── Stability-Score
│   ├── Exploration-Index
│   ├── Smoke Affinity
│   └── KI-Insight Text
│
├── 📊 Auswertungen
│   ├── "Analytics" → /my-taste/analytics (ab 10 Bewertungen)
│   ├── "Vergleich" → /my-taste/compare
│   ├── "Empfehlungen" → /my-taste/recommendations
│   ├── "Benchmark" → /my-taste/benchmark
│   └── "Datenexport" → /data-export
│
├── 📦 Sammlung
│   ├── "Meine Sammlung" → /my-taste/collection (Whiskybase CSV)
│   └── "Wunschliste" → /my-taste/wishlist
│
├── 📚 Wissen (in My Taste integriert, da v2_two_tab)
│   ├── "Lexikon" → /discover/lexicon
│   ├── "Destillerien" → /discover/distilleries
│   ├── "Unabhängige Abfüller" → /discover/bottlers
│   ├── "Tasting Guide" → /discover/guide
│   └── "Vorlagen" → /discover/templates
│
├── 👥 Community
│   ├── "Taste Twins" → /discover/community?tab=twins
│   ├── "Community Rankings" → /discover/community?tab=rankings
│   └── "Aktivitäts-Feed" → /discover/activity
│
├── ℹ️ Über
│   ├── "Über CaskSense" → /discover/about
│   └── "Spenden" → /discover/donate
│
└── ⚙️ Einstellungen (erreichbar über Profil-Icon)
    → /my-taste/settings
    ├── Foto hochladen
    ├── Name & E-Mail
    ├── PIN ändern
    ├── Newsletter Opt-in
    ├── Bio & Lieblingswhisky
    ├── Bevorzugte Regionen
    ├── Peat Level & Fass-Einfluss
    ├── OpenAI API Key
    ├── Theme (Dark Warm / Light Warm)
    ├── Sprache (Deutsch / English)
    └── Account löschen (Danger Zone)
```

### 3.5 Unterseiten-Tiefe

```
/my-taste
├── /my-taste/journal          Whisky-Tagebuch (Einträge)
├── /my-taste/profile          Geschmacksprofil (Radar-Chart)
├── /my-taste/analytics        Persönliche Analysen
├── /my-taste/compare          Side-by-Side Vergleich
├── /my-taste/recommendations  KI-Empfehlungen
├── /my-taste/pairings         Food Pairings
├── /my-taste/benchmark        Benchmark-Vergleich
├── /my-taste/wheel            Aroma-Rad
├── /my-taste/collection       Flaschensammlung
├── /my-taste/wishlist          Wunschliste
└── /my-taste/settings          Einstellungen
```

---

## 4. Weitere UI-Schichten (nicht primär aktiv)

### V2 Dark Warm UI (`/app/*`)
5-Tab Bottom Navigation: Home | Sessions | Discover | Cellar | More

### Lab Experimental (`/lab-dark/*`)
Experimentelle Ansichten: Home | Sessions | Discover

### Legacy UI (`/legacy/*`)
Alte Sidebar-Navigation: Home | Tasting | Discover | Profile

---

## 5. Header-Menü (SessionSheet)

```
HEADER (alle Seiten in Simple Mode)
├── Links: "CaskSense" Logo → /tasting
└── Rechts: [Christoph Al...] ▾ (SessionSheet öffnen)
    ├── Profil-Info (Name, E-Mail)
    ├── "Einstellungen" → /my-taste/settings
    ├── "Admin" → /admin (nur für role=admin)
    └── "Abmelden"
```

---

## 6. Öffentliche Seiten (kein Login)

| Route | Seite | Beschreibung |
|-------|-------|-------------|
| `/` | Public Landing | 8 Sektionen, Scroll-Animationen, CTAs |
| `/presentation` | Guided Presentation | 18 Slides, Keyboard/Swipe Nav |
| `/landing-v2` | Landing V2 | Interaktive Demos (Dram Logger, Panel Compare) |
| `/feature-showcase` | Feature Showcase | 11 klickbare Feature-Demos |
| `/impressum` | Impressum | Rechtliche Infos |
| `/privacy` | Datenschutz | Datenschutzerklärung |

---

## 7. Admin-Bereich (`/admin`)

Eigenes Layout (AdminLayout), kein Bottom-Nav, "Back to App" Link.
Funktionen: Test-Daten, KI Kill-Switch, Platform Settings, Audit Log, Feedback.

---

*Dieses Dokument enthält die vollständige Verzeichnis- und Menüstruktur von CaskSense und kann direkt an ChatGPT weitergegeben werden, um über Menü-Architektur, Navigation und Seitenstruktur zu diskutieren.*
