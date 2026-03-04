# CaskSense v2.0.0 — Projektstatus

**Stand:** 4. März 2026  
**Owner/Admin:** Christoph Aldering (christoph.aldering@googlemail.com)  
**Prod-Participant-ID:** `09bbdc90-31fb-41b4-89bd-f5af1fbbe37f`  
**Dev-Participant-ID:** `38f152c2-a4b7-49a1-bbf8-b0093cd3cd44`

---

## 1. Architektur

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + Vite + TypeScript (ESM), Wouter (Routing), TanStack React Query, Zustand |
| UI | shadcn/ui (Radix) + Tailwind (Legacy), Inline-Styles mit `c`-Tokens (Dark Warm Theme) |
| Backend | Express 5 + TypeScript, 219 API-Routen (~9.500 Zeilen) |
| Datenbank | PostgreSQL via Drizzle ORM, 28 Tabellen |
| AI | OpenAI GPT-4o (via Replit-Integration) |
| Email | Nodemailer / Gmail (Replit-Integration) |
| Storage | Replit Object Storage (Flaschen-Fotos, Cover-Bilder) |
| i18n | react-i18next (DE + EN, Fallback: DE), ~7.250 Zeilen |
| PWA | Service Worker + Capacitor (iOS/Android) |

---

## 2. Projektumfang

- **97 Seiten-Komponenten** (client/src/pages/)
- **78 davon** nutzen bereits `useTranslation()`
- **242 Frontend-Dateien**, 33 Backend-Dateien
- **28 DB-Tabellen:** participants, tastings, whiskies, ratings, profiles, journal_entries, whiskybase_collection, wishlist_entries, whisky_friends, tasting_participants, session_invites, tasting_photos, notifications, u.a.

---

## 3. UI-Schichten & Navigation

### Feature Flag: `NAV_VERSION` in `client/src/lib/config.ts`
- `"v2_simplified"` = neue 3-Tab-Navigation (aktiv)
- Zurücksetzen auf alten Wert stellt 5-Tab-Nav wieder her

### Aktive UI: Dark Warm (Simple Mode) — 3-Tab Bottom-Nav (v2_simplified)

| Tab | Route | Datei | Beschreibung |
|---|---|---|---|
| Tasting | `/tasting` | tasting-hub-simple.tsx | Hub: Join oder Host auswählen |
| My Taste | `/my-taste` | my-taste.tsx | Persönliches Dashboard + "Dram eintragen" Button |
| Explore | `/analyze` | simple-analyze.tsx | Wissensbasis, Social, Empfehlungen |

### Vorherige 5-Tab-Nav (v1, deaktiviert)

| Tab | Route | Datei |
|---|---|---|
| Join | `/enter` | simple-enter.tsx |
| Log | `/log-simple` | simple-log.tsx |
| Host | `/host` | simple-host.tsx |
| My Taste | `/my-taste` | my-taste.tsx |
| Discover | `/analyze` | simple-analyze.tsx |

### Wichtige Unterseiten

**My Taste:** Settings, Journal, Analytics, Compare, Recommendations, Benchmark, Pairings, Aroma Wheel, Flavors, Collection (Whiskybase CSV), Wishlist, Data Export

**Discover:** Lexikon, Brennereien-Enzyklopädie, Independent Bottlers, Tasting-Templates, Tasting Guide, About, Donate, Community

**Tasting:** Tasting Room (`/tasting-room-simple/:id`), Ergebnisse, Recap

**Admin:** Admin Console (`/admin`), Support Console, Platform Analytics

---

## 4. Kernfeatures

### Tasting-Management
- Erstellen/Bearbeiten/Löschen, Whisky-Lineup (manuell, Foto-AI, Barcode, CSV/Excel, KI-Kuratierung)
- Status-Machine: draft → open → closed → reveal → archived
- Guided Tasting mit Host-Controls, Multi-Act-Reveal
- QR-Code + Email-Einladungen, Flight Board, PDF-Export
- Live-Teilnehmer-Tracking mit Bewertungsstatus

### Bewertungssystem
- 5 Dimensionen: Nose, Taste, Finish, Balance, Overall
- Dynamische Slider-Schritte, Auto-Berechnung mit manuellem Override
- 3 Context-Level: Naked (0), Self (1), Full (2)

### Persönliche Features
- Flavor-Profil (Radar-Charts, Aromarad), Whisky-Journal
- Whiskybase-Collection (CSV Sync/Diff), Wishlist mit AI-Summaries
- Achievements/Badges, Side-by-Side-Vergleich, Empfehlungen
- Benchmark-Analyzer, Datenexport (JSON, Excel, DOCX)

### AI-Features (GPT-4o)
- Flaschenidentifikation (Foto → OCR), Barcode-Scanner (EAN-13/UPC-A)
- Tasting-Notiz-Generator, KI-Lineup-Kuratierung, Preisschätzung
- Whiskybase-ID Auto-Fill, Session-Highlights, Benchmark-Analyse

### Wissensbasis
- Whisky-Lexikon (53 zweisprachige Einträge, 5 Kategorien)
- Brennerei-Enzyklopädie (~100 Brennereien, interaktive Karte)
- Independent Bottlers (20+ Einträge), Tasting-Templates, Guide

### Social & Community
- Taste Twins, Whisky Friends, Community Rankings, Leaderboard
- Activity Feed, Tasting-Kalender, Email-Erinnerungen

---

## 5. Authentifizierung

- **Primär:** Email + Passwort (bcrypt)
- **Legacy:** 4-Digit PIN (bcrypt, wird noch unterstützt)
- **Gast-Modus:** "Standard Naked" (persistiert) + "Ultra Naked" (ephemer)
- **Session:** LocalStorage (`cs_session`), Header `x-participant-id`
- **Admin-Check (Frontend):** `useAppStore().currentParticipant?.role === "admin"`
- **Passwort-Reset:** Email-Verifizierung

---

## 6. Theme (Dark Warm)

Alle Farben in `client/src/lib/theme.ts`:

```
bg: "#1a1612", card: "#231e19", text: "#e8dfd6",
muted: "#9a8e82", accent: "#c8a97e", border: "#3a322a",
success: "#5cb85c", danger/error: "#c44",
inputBg: "#2a241e", inputBorder: "#3a322a"
```

Exports: `c`, `pageTitleStyle`, `pageSubtitleStyle`, `sectionHeadingStyle`, `cardStyle`, `inputStyle`  
Font: Playfair Display (Überschriften), system-ui (Body)

---

## 7. i18n-Migrationsstatus

**System:** react-i18next | **Sprachen:** DE (Fallback), EN | **Datei:** ~7.800+ Zeilen

### Migration: KOMPLETT ✓
Alle 97 Seiten nutzen `t()` / `useTranslation()`. Keine `isDE`-Ternaries mehr im Projekt.

### Neue i18n-Sections (hinzugefügt in dieser Session):
tastingHub, tasteTwins, communityRankings, vocabularyPage, vocabCategories, discoverTemplates, tastingTemplates, methodPage, activityFeed, comparisonPage, myTasteFlavors, aiCuration

---

## 8. Session-Dropdown (oben rechts)

1. User-Info (Name, "Angemeldet · Log-Modus")
2. Einstellungen & Profil → `/my-taste/settings`
3. Admin Console *(nur Admin)* → `/admin`
4. Name ändern (inline)
5. Email ändern (inline)
6. Abmelden

---

## 9. Host-Seite Create-Menü

1. **Manueller Eintrag** — Schritt-für-Schritt-Wizard
2. **Photo / AI** — Flasche fotografieren & identifizieren
3. **Barcode** — Barcode scannen → `/log-simple?barcode=1`
4. **Excel / CSV Import** — Aus Tabelle oder Text
5. **KI-Lineup-Vorschläge** — KI-gestützte Empfehlungen

---

## 10. Terminologie

| Konzept | EN | DE |
|---|---|---|
| Event/Abend | Tasting | Tasting |
| Whisky-Set | Line-up | Line-up |
| Einzelner Whisky | Dram ("Dram 3 of 7") | Dram ("Dram 3 von 7") |
| Journal-Eintrag | Entry | Eintrag |
| Eigene Flaschen | My Collection | Meine Sammlung |
| Alles Getastete | My Drams | Meine Drams |
| Tab-Label | Tasted | Verkostet |

---

## 11. Dateistruktur

```
client/src/
  components/
    simple/           → Simple-Mode Shell, Bottom-Nav
    session-sheet.tsx  → Session-Dropdown oben rechts
  lib/
    i18n.ts           → Alle Übersetzungen (EN + DE, ~7.250 Zeilen)
    theme.ts          → Dark Warm Farb-Tokens + Shared Styles
    store.ts          → Zustand Store (currentParticipant etc.)
    session.ts        → Session-Management (localStorage)
    api.ts            → API-Hilfsfunktionen
  pages/              → 97 Seiten-Komponenten

server/
  index.ts            → Express Server Entry
  routes.ts           → Alle API-Routen (~9.500 Zeilen)
  storage.ts          → Storage-Interface + Drizzle-Implementation

shared/
  schema.ts           → Drizzle ORM Schema (28 Tabellen, 532 Zeilen)
```

---

## 12. Umgebung & Integrationen

- **Hosting:** Replit (NixOS Container)
- **Datenbank:** PostgreSQL (Replit-managed, `DATABASE_URL`)
- **Object Storage:** Replit Object Storage
- **AI:** OpenAI GPT-4o (Replit AI-Integration)
- **Email:** Gmail (Replit Google Mail-Integration)
- **Deployment:** Replit Deployments (Auto-Build, TLS, Health Checks)

---

## 13. Offene Aufgaben

1. ~~**i18n-Migration:**~~ **KOMPLETT** — alle Seiten nutzen `t()`, keine `isDE` mehr
2. **Legacy UI** (`/legacy/*`): Noch zugänglich, nicht aktiv gepflegt
3. **V2 UI** (`/app/*`): Experimentell, nicht voll angebunden

---

*Stand: 4. März 2026*
