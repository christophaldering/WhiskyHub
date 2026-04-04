# CaskSense v2.0.0 — Vollständige Projektdokumentation

## 1. Überblick

CaskSense ist eine Web-Plattform für kollaborative Whisky-Tastings. Die Anwendung ermöglicht es, Tasting-Sessions zu erstellen, Teilnehmer einzuladen, Whiskys strukturiert zu bewerten und persönliche Tasting-Daten zu pflegen. Die Plattform bietet AI-gestützte Features (Flaschen-Erkennung per Foto, Newsletter-Generierung, Marktpreis-Schätzung), ein persönliches Whisky-Journal, Flavor-Analysen, Community-Features und eine Wissensdatenbank.

**Primäre Domain:** casksense.com
**Einziger User:** Christoph Aldering (Admin)
**Tech-Stack:** React + Vite (Frontend), Express 5 (Backend), PostgreSQL + Drizzle ORM (Datenbank), TypeScript (durchgehend)

---

## 2. Systemarchitektur

### 2.1 Monorepo-Struktur

```
/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/       # ~80 Seiten-Komponenten
│   │   ├── components/  # Wiederverwendbare Komponenten
│   │   │   ├── ui/      # Basis-UI (shadcn/ui, Radix)
│   │   │   └── simple/  # Simple-Mode-Shells
│   │   ├── lib/         # Utilities, State, API-Client
│   │   │   ├── api.ts   # Zentraler API-Client
│   │   │   ├── store.ts # Zustand State-Management
│   │   │   ├── theme.ts # Dark Warm Farbpalette
│   │   │   ├── i18n.ts  # Internationalisierung
│   │   │   └── session.ts # Session-Management
│   │   ├── v2/          # V2 Dark Warm UI Komponenten
│   │   ├── lab-dark/    # Experimentelle Lab-Ansichten
│   │   └── hooks/       # Custom React Hooks
│   └── index.html
├── server/              # Backend (Express 5)
│   ├── index.ts         # Server-Einstiegspunkt
│   ├── routes.ts        # ~9.350 Zeilen API-Routen
│   ├── storage.ts       # Datenbank-Abstraktionsschicht
│   ├── db.ts            # PostgreSQL-Verbindung
│   ├── ai-settings.ts   # AI Feature-Toggles
│   ├── insight-engine.ts # Statistische Analysen
│   └── lib/
│       ├── auth.ts      # Authentifizierung
│       ├── ocr.ts       # Texterkennung via GPT-4o Vision
│       ├── matching.ts  # Whisky-Matching-Algorithmen
│       └── onlineSearch.ts # Externe Suche (SerpApi)
├── shared/
│   └── schema.ts        # Drizzle-Schema + Zod-Validierung
├── docs/                # Dokumentation
├── scripts/             # Build-Skripte
└── package.json
```

### 2.2 Frontend-Technologien

| Technologie | Zweck |
|---|---|
| React 18 + Vite | UI-Framework + Bundler |
| Wouter | Client-Side Routing |
| TanStack React Query | Server-State-Management (Polling) |
| Zustand | Client-State-Management |
| shadcn/ui + Radix UI | Komponentenbibliothek |
| Tailwind CSS | Utility-CSS |
| Framer Motion | Animationen |
| Recharts | Datenvisualisierungen |
| react-i18next | Internationalisierung (DE/EN) |
| Capacitor | Native Mobile Apps (iOS/Android) |

### 2.3 Backend-Technologien

| Technologie | Zweck |
|---|---|
| Express 5 | HTTP-Server |
| Drizzle ORM | Datenbankzugriff |
| PostgreSQL | Primäre Datenbank |
| Nodemailer | E-Mail-Versand |
| ExcelJS | Excel-Import/Export |
| qrcode | QR-Code-Generierung |
| OpenAI GPT-4o | AI-Features |
| Replit Object Storage | Bild-Uploads |

---

## 3. UI-Ebenen & Navigation

CaskSense hat drei UI-Ebenen, die parallel existieren:

### 3.1 Simple Mode (Primäre UI)

Die Hauptansicht für den täglichen Gebrauch. 5-Tab-Navigation am unteren Bildschirmrand.

| Tab | Route | Beschreibung |
|---|---|---|
| Join | `/enter` | Session beitreten, Login |
| Log | `/log-simple` | Whisky loggen (Foto/Text, Bewertung, Notizen) |
| Host | `/host` | Tasting erstellen und verwalten |
| My Taste | `/my-taste` | Persönliches Geschmacksprofil |
| Discover | `/analyze` | Community, Lexikon, Destillerien |

**Unterseiten Simple Mode:**
- `/my-taste/flavors` — Flavor Wheel (Pie-Chart)
- `/my-taste/compare` — Whisky-Vergleich (Radar-Chart)
- `/my-taste/analytics` — Persönliche Analysen (4 Insight-Karten)
- `/discover/lexicon` — Whisky-Lexikon (durchsuchbar, DE/EN)
- `/discover/community` — Taste Twins, Rankings, Leaderboard
- `/discover/distilleries` — Destillerie-Enzyklopädie
- `/tasting-room-simple/:id` — Live-Tasting-Teilnahme
- `/tasting-results/:id` — Tasting-Ergebnisse

### 3.2 V2 Dark Warm UI (`/app/*`)

Redesigned Apple-Clean-Ästhetik mit dunkler, warmer Farbpalette.

| Route | Beschreibung |
|---|---|
| `/app/home` | Dashboard |
| `/app/sessions` | Session-Übersicht |
| `/app/session/:id` | Session-Detail |
| `/app/discover` | Entdecken |
| `/app/cellar` | Whisky-Sammlung |
| `/app/more` | Einstellungen, Admin |
| `/app/admin` | Admin-Panel |
| `/app/recap/:id` | Tasting-Zusammenfassung |

### 3.3 Legacy UI (`/legacy/*` und Root-Routen)

Klassische Ansicht mit Sidebar-Navigation.

| Route | Beschreibung |
|---|---|
| `/home` | Dashboard |
| `/tasting` | Tasting Hub |
| `/tasting/sessions` | Session-Liste |
| `/tasting/calendar` | Kalender |
| `/tasting/:id` | Tasting Room |
| `/my/journal` | Whisky-Journal |
| `/my/collection` | Whiskybase-Sammlung |
| `/my/wishlist` | Wunschliste |
| `/discover` | Entdecken |
| `/profile/account` | Account-Einstellungen |
| `/admin` | Admin-Panel |
| `/flavor-profile` | Geschmacksprofil |
| `/flavor-wheel` | Flavor Wheel |

### 3.4 Öffentliche / Standalone-Seiten

| Route | Beschreibung |
|---|---|
| `/` | Landing Page |
| `/join/:code` | Quick-Join via Code |
| `/naked/:code` | Blind-Tasting-Modus |
| `/feature-tour` | Produkt-Tour |
| `/impressum` | Impressum |
| `/privacy` | Datenschutz |

---

## 4. Dark Warm Design-System

Zentralisiert in `client/src/lib/theme.ts`. Alle ~20 Dark-Warm-Seiten importieren von hier.

### 4.1 Farbpalette

| Token | Hex | Verwendung |
|---|---|---|
| `bg` | `#1a1714` | Seiten-Hintergrund |
| `card` | `#242018` | Karten-Hintergrund |
| `border` | `#2e2a24` | Standard-Rahmen |
| `inputBg` | `#23201a` | Input-Hintergrund (elevated) |
| `inputBorder` | `#3d362e` | Input-Rahmen (stärker sichtbar) |
| `text` | `#f5f0e8` | Primärer Text (warm-weiß) |
| `muted` | `#888` | Sekundärer Text |
| `mutedLight` | `#8a7e6d` | Tertiärer Text (warm-grau) |
| `accent` | `#d4a256` | Akzentfarbe (Whisky-Gold) |
| `accentDim` | `#a8834a` | Gedämpftes Gold |
| `error` | `#c44` | Fehler-Rot |
| `success` / `high` | `#6a9a5b` | Erfolg / Hohe Wertung |
| `medium` | `#d4a256` | Mittlere Wertung |
| `low` | `#c44` | Niedrige Wertung |
| `gold` | `#d4a256` | Medaille Gold |
| `silver` | `#a8a8a8` | Medaille Silber |
| `bronze` | `#b87333` | Medaille Bronze |
| `danger` | `#e57373` | Warnung |

### 4.2 Gemeinsame Styles

- **`inputStyle`**: Einheitliches Styling für alle Textfelder (inputBg, inputBorder, borderRadius 10, fontSize 15)
- **`cardStyle`**: Einheitliches Karten-Styling (card bg, inputBorder, borderRadius 14, padding 24)
- **`sliderCSS`**: Custom CSS für Range-Slider (`.warm-slider` Klasse) — 6px Track, 22px Thumb mit Accent-Farbe und Schatten
- **`sectionSpacing`**: 40px Standard-Abstand zwischen Sections

### 4.3 Typografie

- **Überschriften**: Playfair Display (Serif)
- **Section Labels**: System-UI, uppercase, letter-spacing 1.5px, fontWeight 700
- **Fließtext**: system-ui, sans-serif

---

## 5. Datenbank-Schema

PostgreSQL mit Drizzle ORM. Alle IDs sind UUIDs.

### 5.1 Kern-Tabellen

#### `participants` — Benutzer
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | varchar (PK) | UUID |
| `name` | text | Anzeigename |
| `pin` | text | Passwort (bcrypt-gehasht) |
| `email` | text | E-Mail-Adresse |
| `role` | text | 'user', 'admin', 'host' |
| `language` | text | 'en' oder 'de' |
| `emailVerified` | boolean | E-Mail bestätigt? |
| `experienceLevel` | text | 'guest', 'explorer', 'connoisseur' |
| `smokeAffinityIndex` | real | Rauch-Präferenz (berechnet) |
| `sweetnessBias` | real | Süße-Präferenz (berechnet) |
| `ratingStabilityScore` | real | Bewertungs-Konsistenz (berechnet) |
| `explorationIndex` | real | Vielfalt der Bewertungen (berechnet) |
| `newsletterOptIn` | boolean | Newsletter abonniert? |
| `lastSeenAt` | timestamp | Letzte Aktivität |
| `createdAt` | timestamp | Erstellungszeitpunkt |

#### `tastings` — Tasting-Sessions
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | varchar (PK) | UUID |
| `title` | text | Session-Titel |
| `date` | text | Datum |
| `location` | text | Ort |
| `code` | text | 4-stelliger Beitrittscode |
| `hostId` | varchar | Referenz auf `participants` |
| `status` | text | draft → open → closed → reveal → archived |
| `blindMode` | boolean | Blind-Tasting aktiv? |
| `guidedMode` | boolean | Geführter Modus? |
| `guidedWhiskyIndex` | integer | Aktueller Whisky im geführten Modus |
| `activeWhiskyId` | varchar | Aktuell aktiver Whisky |
| `ratingScale` | integer | Bewertungsskala (Standard 100) |
| `sessionUiMode` | text | flow, focus, journal |
| `showRanking` | boolean | Ranking anzeigen? |
| `showGroupAvg` | boolean | Gruppendurchschnitt anzeigen? |
| `currentAct` | text | act1–act4 (Reveal-Phasen) |

#### `whiskies` — Whiskys in einer Session
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | varchar (PK) | UUID |
| `tastingId` | varchar | Referenz auf `tastings` |
| `name` | text | Whisky-Name |
| `distillery` | text | Destillerie |
| `age` | text | Alter |
| `abv` | real | Alkoholgehalt |
| `type` | text | Typ (Single Malt, Blend, etc.) |
| `region` | text | Region |
| `caskType` | text | Fasstyp |
| `imageUrl` | text | Foto-URL |
| `sortOrder` | integer | Reihenfolge |
| `hostNotes` | text | Notizen des Hosts |
| `whiskybaseId` | text | Whiskybase-ID |
| `price` | real | Preis |

#### `ratings` — Bewertungen
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | varchar (PK) | UUID |
| `tastingId` | varchar | Referenz auf `tastings` |
| `whiskyId` | varchar | Referenz auf `whiskies` |
| `participantId` | varchar | Referenz auf `participants` |
| `nose` | real | Nase (0–100) |
| `taste` | real | Geschmack (0–100) |
| `finish` | real | Abgang (0–100) |
| `overall` | real | Gesamtbewertung (0–100) |
| `notes` | text | Notizen |

#### `journal_entries` — Persönliches Whisky-Journal
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | varchar (PK) | UUID |
| `participantId` | varchar | Referenz auf `participants` |
| `whiskyName` | text | Whisky-Name |
| `distillery` | text | Destillerie |
| `personalScore` | real | Persönliche Bewertung |
| `notes` | text | Tasting-Notizen |
| `source` | text | 'casksense' oder 'import' |

### 5.2 Social & Kommunikation

| Tabelle | Beschreibung |
|---|---|
| `tasting_participants` | Join-Tabelle: Teilnehmer ↔ Session |
| `discussion_entries` | Chat-Nachrichten innerhalb einer Session |
| `reflection_entries` | Antworten auf Host-Prompts |
| `session_invites` | Einladungs-Tokens (E-Mail) |
| `whisky_friends` | Kontaktliste |
| `notifications` | Benachrichtigungen |

### 5.3 Sammlungen & Daten

| Tabelle | Beschreibung |
|---|---|
| `profiles` | Erweiterte Benutzerprofile (Bio, Favoriten, Foto) |
| `whiskybase_collection` | Importierte Whiskybase-Sammlungen |
| `benchmark_entries` | AI-extrahierte Vergleichsdaten |
| `encyclopedia_suggestions` | Community-Beiträge zur Datenbank |
| `tasting_photos` | Hochgeladene Session-Fotos |
| `user_feedback` | App-Feedback |
| `changelog_entries` | Änderungsprotokoll |

### 5.4 System & Konfiguration

| Tabelle | Beschreibung |
|---|---|
| `system_settings` | Key-Value-Store (JSONB) für Laufzeit-Konfiguration |
| `app_settings` | Key-Value-Store für Admin-Einstellungen |
| `admin_audit_log` | Audit-Trail für Admin-Aktionen |
| `session_presence` | Heartbeat-Tracking für Live-Teilnehmer |
| `tasting_reminders` | Geplante Erinnerungen |

### 5.5 Beziehungen

- **One-to-Many**: `participants` → `profiles`, `journal_entries`, `ratings`, `whisky_friends`
- **One-to-Many**: `tastings` → `whiskies`, `ratings`, `discussion_entries`, `session_invites`
- **Many-to-Many**: `participants` ↔ `tastings` via `tasting_participants`
- **One-to-Many**: `whiskies` → `ratings`

---

## 6. API-Endpunkte

Alle Endpunkte sind unter `/api/` erreichbar. Authentifizierung erfolgt über den `x-participant-id` HTTP-Header.

### 6.1 Authentifizierung & Teilnehmer

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/participants` | Registrierung / Login (Name + PIN) |
| POST | `/api/participants/login` | Login via E-Mail + PIN |
| POST | `/api/participants/guest` | Gast-Login |
| GET | `/api/participants/:id` | Profil abrufen (eingeschränkt für Nicht-Eigentümer) |
| PATCH | `/api/participants/:id/email` | E-Mail ändern |
| PATCH | `/api/participants/:id/pin` | PIN/Passwort ändern |
| PATCH | `/api/participants/:id/language` | Sprache ändern |
| POST | `/api/participants/:id/verify` | E-Mail verifizieren (6-stelliger Code) |
| POST | `/api/participants/:id/resend-verification` | Verifikationscode erneut senden |
| POST | `/api/participants/forgot-pin` | PIN-Reset anfordern |
| POST | `/api/participants/reset-pin` | PIN zurücksetzen |
| POST | `/api/participants/recover-email` | E-Mail-Wiederherstellung (Name + PIN → maskierte E-Mail) |
| POST | `/api/participants/:id/heartbeat` | Aktivität melden |
| POST | `/api/participants/:id/secure` | PIN für Account ohne PIN setzen |
| GET | `/api/participants/:id/export-data` | DSGVO-Datenexport (JSON) |
| DELETE | `/api/participants/:id/anonymize` | DSGVO-Anonymisierung |

### 6.2 Tastings (Sessions)

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/tastings` | Alle Sessions auflisten |
| GET | `/api/tastings/:id` | Session-Details |
| GET | `/api/tastings/code/:code` | Session via Beitrittscode finden |
| POST | `/api/tastings` | Neue Session erstellen |
| PATCH | `/api/tastings/:id/status` | Status ändern (draft→open→closed→reveal→archived) |
| PATCH | `/api/tastings/:id/title` | Titel ändern |
| PATCH | `/api/tastings/:id/details` | Details ändern (Datum, Ort, etc.) |
| PATCH | `/api/tastings/:id/reflection` | Host-Reflexion speichern |
| POST | `/api/tastings/:id/join` | Session beitreten |
| POST | `/api/tastings/:id/duplicate` | Session duplizieren |
| DELETE | `/api/tastings/:id` | Session löschen |
| POST | `/api/tastings/:id/transfer-host` | Host-Rechte übertragen |
| GET | `/api/tastings/:id/participants` | Teilnehmer-Liste |
| GET | `/api/tastings/:id/results` | Aggregierte Ergebnisse |

**Cover-Images:**
| POST | `/api/tastings/:id/cover-image` | Cover-Bild hochladen |
| DELETE | `/api/tastings/:id/cover-image` | Cover-Bild entfernen |
| PATCH | `/api/tastings/:id/cover-image-reveal` | Cover-Bild im Blind-Modus zeigen/verbergen |

**Blind & Guided Mode:**
| PATCH | `/api/tastings/:id/blind-mode` | Blind-Modus konfigurieren |
| POST | `/api/tastings/:id/reveal-next` | Nächsten Reveal-Schritt |
| PATCH | `/api/tastings/:id/guided-mode` | Geführten Modus ein/ausschalten |
| POST | `/api/tastings/:id/guided-advance` | Zum nächsten Whisky |
| POST | `/api/tastings/:id/guided-goto` | Zu bestimmtem Whisky springen |

**Timer & Prompts:**
| POST | `/api/tastings/:id/dram-timer` | Timer starten |
| POST | `/api/tastings/:id/rating-prompt` | Bewertungs-Prompt an Teilnehmer senden |

### 6.3 Whiskys & Bewertungen

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/tastings/:id/whiskies` | Whiskys einer Session |
| POST | `/api/whiskies` | Whisky hinzufügen |
| PATCH | `/api/whiskies/:id` | Whisky bearbeiten |
| DELETE | `/api/whiskies/:id` | Whisky entfernen |
| PATCH | `/api/tastings/:id/reorder` | Reihenfolge ändern |
| POST | `/api/whiskies/:id/image` | Whisky-Foto hochladen |
| DELETE | `/api/whiskies/:id/image` | Whisky-Foto entfernen |
| GET | `/api/whiskies/:id/ratings` | Bewertungen eines Whiskys |
| GET | `/api/tastings/:id/ratings` | Alle Bewertungen einer Session |
| GET | `/api/ratings/:participantId/:whiskyId` | Einzelne Bewertung |
| POST | `/api/ratings` | Bewertung abgeben/aktualisieren |

### 6.4 Journal & Sammlung

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/participants/:id/journal` | Journal abrufen |
| POST | `/api/journal` | Journal-Eintrag erstellen |
| GET | `/api/journal/:id` | Einzelnen Eintrag abrufen |
| PATCH | `/api/journal/:id` | Eintrag bearbeiten |
| DELETE | `/api/journal/:id` | Eintrag löschen |
| GET | `/api/participants/:id/collection` | Whiskybase-Sammlung |
| POST | `/api/collection/:pid/sync` | CSV-Import-Vergleich (Diff) |
| POST | `/api/collection/:pid/sync/apply` | Diff anwenden |
| POST | `/api/collection/:pid/price-estimate` | AI-Preisschätzung |
| POST | `/api/collection/:pid/suggest-tasting` | AI-Tasting-Vorschlag aus Sammlung |

### 6.5 Social & Community

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/participants/:id/friends` | Freundesliste |
| POST | `/api/participants/:id/friends` | Freundschaftsanfrage |
| POST | `/api/.../friends/:fid/accept` | Anfrage annehmen |
| POST | `/api/.../friends/:fid/decline` | Anfrage ablehnen |
| DELETE | `/api/.../friends/:fid` | Freund entfernen |
| GET | `/api/participants/:id/friend-activity` | Freunde-Aktivitätsfeed |

### 6.6 AI-Features

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/whisky/identify` | Flaschen-Erkennung via Foto (GPT-4o Vision) |
| POST | `/api/whisky/identify-text` | Text-Erkennung aus Foto (Etiketten, Menükarten) |
| POST | `/api/whisky/identify-online` | Online-Suche nach Whisky-Details |
| POST | `/api/whiskies/:id/ai-enrich` | AI-Fakten und Destillerie-Info |
| POST | `/api/whiskies/ai-insights` | AI-Hintergrundgeschichte zu einem Whisky |
| POST | `/api/tastings/:id/ai-highlights` | AI-Session-Zusammenfassung |
| POST | `/api/tastings/ai-import` | AI-Import aus Fotos/PDFs/Excel |
| POST | `/api/journal/identify-bottle` | Flasche aus Journal-Foto erkennen |
| POST | `/api/wishlist/identify` | Flasche für Wunschliste erkennen |
| POST | `/api/photo-tasting/identify` | Bis zu 20 Fotos → Tasting erstellen |

### 6.7 Analytics & Statistiken

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/platform-stats` | Plattform-Gesamtstatistik |
| GET | `/api/platform-analytics` | Detaillierte Plattform-Analyse |
| GET | `/api/participants/:id/stats` | Persönliche Statistiken |
| GET | `/api/participants/:id/flavor-profile` | Geschmacksprofil-Daten |
| GET | `/api/community/scores` | Community-Rankings |
| GET | `/api/community/twins/:id` | Taste Twins (Geschmacks-Zwillinge) |
| GET | `/api/leaderboard` | Top-Bewerter |

### 6.8 Admin

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/admin/overview` | Admin-Dashboard |
| PATCH | `/api/admin/participants/:id/role` | Rolle ändern |
| DELETE | `/api/admin/participants/:id` | User löschen |
| GET | `/api/admin/ai-settings` | AI-Kill-Switch-Status |
| POST | `/api/admin/ai-settings` | AI-Features ein/ausschalten |
| POST | `/api/admin/newsletters/generate` | Newsletter generieren (GPT-4o-mini) |
| POST | `/api/admin/newsletters/send` | Newsletter versenden |
| GET | `/api/admin/online-users` | Aktive User |

### 6.9 Sonstiges

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/health` | Health-Check |
| GET | `/version` | Versions-Info |
| GET | `/api/changelog` | Änderungsprotokoll |
| GET | `/api/calendar` | Kommende Tastings |
| POST | `/api/feedback` | Feedback senden |
| GET | `/api/notifications` | Benachrichtigungen |
| POST | `/api/export/notes-docx` | Tasting-Notizen als Word-Dokument |

---

## 7. Authentifizierung & Sicherheit

### 7.1 Login-Verfahren

- **Standard**: E-Mail + Passwort (bcrypt-gehasht)
- **Session-Join**: Name + Session-Code + Passwort
- **Gast**: Name + einfache PIN
- **Session-Persistenz**: `sessionStorage` / `localStorage` mit `resumeToken` für Auto-Resume

### 7.2 Sicherheitsmechanismen

- **`x-participant-id` Header**: Alle persönlichen API-Endpunkte erfordern diesen Header, der die Participant-ID enthält. Der `fetchJSON`-Helper und die `pidHeaders()`-Utility-Funktion setzen ihn automatisch.
- **Datenzugriffsbeschränkung**: Nicht-Eigentümer erhalten bei `GET /api/participants/:id` nur eingeschränkte Felder (id, name, role, language).
- **Honeypot-Trap-Fields**: Unsichtbare Formularfelder in separaten `<form>`-Elementen als Bot-Schutz.
- **Client-Side Rate Limiting**: Join-Flow mit Begrenzung auf 5 Versuche in 5 Minuten.
- **Admin-only Endpoints**: Bestimmte Endpunkte prüfen `role === 'admin'`.

### 7.3 Gast-Account-Upgrade

Nach Ende eines Tastings sehen Gäste ohne E-Mail einen Upgrade-Prompt, um E-Mail + Passwort hinzuzufügen. Dismissal wird in `localStorage` persistiert.

---

## 8. Tasting-Workflow (State Machine)

Ein Tasting durchläuft folgende Status:

```
draft → open → closed → reveal → archived
```

| Status | Beschreibung |
|---|---|
| `draft` | Erstellt, noch nicht gestartet. Host konfiguriert Whiskys. |
| `open` | Laufend. Teilnehmer können bewerten. |
| `closed` | Beendet. Keine weiteren Bewertungen möglich. |
| `reveal` | Enthüllung. Blind-Informationen werden schrittweise aufgedeckt. |
| `archived` | Archiviert. Nur noch Ergebnisse einsehbar. |

### 8.1 Modi

- **Blind Mode**: Whisky-Namen und -Details sind verborgen. Schrittweise Enthüllung.
- **Guided Mode**: Host steuert den Fortschritt (welcher Whisky wann).
- **Free Mode**: Teilnehmer bewerten in eigener Reihenfolge.
- **Context Level**: Dreistufige Sichtbarkeit — Naked (0), Self (1), Full (2).

### 8.2 Reveal-Phasen (Acts)

| Phase | Was wird enthüllt |
|---|---|
| Act 1 | Einzelbewertungen sichtbar |
| Act 2 | Gruppendurchschnitt + Rankings |
| Act 3 | Whisky-Identitäten enthüllt |
| Act 4 | Vollständige Analyse + Charts |

---

## 9. AI-Integration

Alle AI-Features nutzen OpenAI GPT-4o (Vision) oder GPT-4o-mini und können über einen Admin-Kill-Switch einzeln deaktiviert werden.

### 9.1 Flaschen-Erkennung (GPT-4o Vision)

- Foto-Upload → GPT-4o analysiert Label/Etikett
- Extrahiert: Name, Destillerie, Alter, ABV, Fasstyp, Region
- Fuzzy-Matching gegen In-Memory-Datenbank-Index
- Erkennt Menükarten und Regale (Multi-Bottle)
- SHA-256-Cache verhindert doppelte API-Calls
- Konfidenz-Badges: High / Medium / Low

### 9.2 Text-basierte Identifikation

- Freitext-Eingabe → GPT analysiert und identifiziert
- Beispiel: "Lagavulin 16" → strukturierte Whisky-Daten

### 9.3 AI-Tasting-Import

- Upload von Excel, PDF, Fotos oder Freitext
- GPT extrahiert komplette Whisky-Liste mit Metadaten
- Erstellt automatisch eine Tasting-Session

### 9.4 Newsletter-Generierung (GPT-4o-mini)

- Admin kann "Welcome" oder "Update" Newsletter generieren
- AI erhält Feature-Liste als Kontext
- Gibt Subject + HTML-Body zurück

### 9.5 Whisky-Enrichment

- AI liefert Fakten, Destillerie-URL, "Did you know?"-Info
- Hintergrundgeschichten zu einzelnen Whiskys
- Session-Highlights basierend auf allen Bewertungen

### 9.6 Insight Engine (Nicht-AI, statistisch)

- Berechnet: Smoke Bias, High ABV Preference, Rating Stability
- Standardabweichung und Mean Delta über historische Bewertungen
- Ergebnisse werden in `participants`-Tabelle persistiert

---

## 10. Personalisierung & Analytics

### 10.1 My Taste — Persönliches Dashboard

- **Taste Snapshot**: Stability/Exploration/Smoke-Scores
- **AI Taste Insight**: AI-generierte Geschmacks-Einordnung
- **Flavor Wheel** (`/my-taste/flavors`): PieChart mit Keywords aus Journal + Ratings
- **Comparison** (`/my-taste/compare`): Radar-Chart Side-by-Side
- **Analytics** (`/my-taste/analytics`): 4 Insight-Karten (ab 10 bewerteten Whiskys):
  - Taste Profile (Dimension Bars + Smoke Affinity + Top Flavors)
  - Taste Map (SVG Radar-Chart)
  - Taste Evolution (Monatlicher Durchschnitt als Linienchart)
  - Rating Consistency (Stability Score + Stats Grid)

### 10.2 Bewertungssystem

- Skala: 0–100 für jede Dimension (Nose, Taste, Finish, Overall)
- Overall-Score: Automatisch berechnet aus Detail-Bewertungen, manuell überschreibbar
- Dynamische Schrittgrößen für Slider
- Tasting Notes: Vordefinierte Chips + Freitext + Sprachaufnahme

---

## 11. Host-Features

### 11.1 Session-Erstellung

Drei Wege, Whiskys hinzuzufügen:
1. **Manuell**: Einzeln eingeben
2. **Excel/CSV-Import**: Liste importieren
3. **AI-Import**: Foto/PDF/Text → AI erkennt Whiskys

### 11.2 Simple Host Wizard

4-Schritt-Wizard:
1. Session erstellen (Titel, Datum, Ort)
2. Whiskys hinzufügen
3. Teilnehmer einladen (E-Mail / QR-Code)
4. Live-Tasting starten und steuern

### 11.3 Weitere Host-Tools

- **Host Briefing Notes**: Vorbereitungsnotizen pro Whisky
- **Tasting Curation Wizard**: AI-kuratierte Whisky-Vorschläge
- **Calendar View**: Kommende und vergangene Tastings
- **Dashboard Summary**: Übersicht aller gehosteten Sessions
- **PDF Export**: Tasting-Ergebnisse als Dokument
- **Discussion Panel**: Live-Chat während des Tastings

---

## 12. Wissensdatenbank

### 12.1 Whisky-Lexikon (`/discover/lexicon`)

- Durchsuchbar, Accordion-Darstellung
- Internationalisiert (DE/EN)
- Begriffe aus der Whisky-Welt erklärt

### 12.2 Destillerie-Enzyklopädie (`/discover/distilleries`)

- Durchsuchbar und filterbar
- Informationen zu Destillerien weltweit

### 12.3 Independent Bottlers Encyclopedia

- Informationen zu unabhängigen Abfüllern

---

## 13. Community-Features

### 13.1 Taste Twins

Algorithmus findet User mit ähnlichem Geschmacksprofil basierend auf Bewertungsmustern.

### 13.2 Rankings & Leaderboard

- Community-weite Whisky-Rankings nach Durchschnittsbewertung
- Leaderboard der aktivsten Bewerter

### 13.3 Activity Feed

- Feed von Freunde-Aktivitäten (neue Bewertungen, Journal-Einträge)

### 13.4 Whiskybase-Integration

- CSV-Import der eigenen Whiskybase-Sammlung
- Smart Sync/Diff bei erneutem Upload
- AI-Preisschätzung für Sammlung

---

## 14. Internationalisierung (i18n)

- Zwei Sprachen: Deutsch (DE) und Englisch (EN)
- Implementierung via react-i18next
- Übersetzungsdateien in `client/src/lib/translations/`
- Sprachauswahl pro Teilnehmer (persistiert in DB)

---

## 15. PWA & Mobile

### 15.1 Progressive Web App

- Service Worker für Offline-Fähigkeit
- Installierbar auf Mobilgeräten
- Push-Benachrichtigungen (vorbereitet)

### 15.2 Capacitor (Native Apps)

- Konfiguration in `capacitor.config.ts`
- Build-Skript: `scripts/build-mobile.sh`
- iOS und Android Targets definiert

---

## 16. Kommunikation

### 16.1 E-Mail

- **Nodemailer** mit Gmail-Integration
- Session-Einladungen per E-Mail
- Verifikationscodes
- Newsletter-Versand
- PIN-Reset-E-Mails

### 16.2 QR-Codes

- Automatisch generierte QR-Codes für Session-Beitritt
- Enthalten den Join-Link mit Session-Code

---

## 17. Admin-Tools

| Feature | Beschreibung |
|---|---|
| AI Kill Switch | Einzelne AI-Features ein/ausschalten |
| User Management | Rollen ändern, User löschen, Online-Status |
| Platform Settings | Banner, Registrierung, Gast-Modus, Wartungsmodus |
| Newsletter | AI-generierte Newsletter erstellen und versenden |
| Audit Log | Protokoll aller Admin-Aktionen |
| Test Data | Tools zum Verwalten von Testdaten |
| Platform Analytics | Statistische Plattform-Analyse |
| DSGVO | Datenexport und Anonymisierung |

---

## 18. Externe Abhängigkeiten

| Service | Verwendung |
|---|---|
| PostgreSQL | Primäre Datenbank |
| OpenAI GPT-4o / GPT-4o-mini | AI-Features (Vision, Text) |
| Google Fonts | Playfair Display |
| Gmail (Nodemailer) | E-Mail-Versand |
| Replit Object Storage | Bild-Uploads |
| SerpApi / Google Custom Search | Online-Whisky-Suche |

---

## 19. Log-Tab (Simple Mode) — Aktueller Stand

Der Log-Tab (`/log-simple`) ist die zentrale Seite zum Erfassen eines Whiskys:

### Aufbau (top-down):
1. **Titel**: "Log"
2. **WHISKY Section**: Eingabefeld mit integriertem Kamera-Icon (rechts). Enter → AI-Suche. Kamera-Icon → Foto-Picker-Sheet.
3. **"Add details" Link**: Klappt manuelle Detailfelder auf (Destillerie, Alter, ABV, Fass, Whiskybase-ID, Preis)
4. **SCORE Section**: "Rate in detail" Accordion (Nose/Taste/Finish Slider + Flavor-Chips). Score-Slider (0–100) mit berechneter oder manueller Bewertung.
5. **NOTES Section**: Freitext-Textarea mit optionalem Mikrofon-Icon für Spracheingabe.
6. **Save Button**: Gesperrt ohne Whisky-Name. Speichert in Journal.

Alle Sections sind jederzeit interaktiv (kein Ausgrauen). Nur der Save-Button erfordert einen Whisky-Namen.

---

## 20. Deployment

- **Plattform**: Replit
- **Build**: `npm run build` → `dist/` (Vite Frontend + bundled Backend)
- **Start**: `npm run start` → `NODE_ENV=production node dist/index.cjs`
- **Dev**: `npm run dev` → `NODE_ENV=development tsx server/index.ts`
- **DB Migration**: `npm run db:push` → Drizzle Kit Push

---

*Dokumentation generiert am 04.03.2026 — CaskSense v2.0.0*
