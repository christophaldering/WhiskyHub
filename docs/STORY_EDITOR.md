# Story-Editor (CMS Story-Builder) — Funktion, Zugriff und Zweck

> **Stand:** 26.04.2026 · Klärungsdokument zu Task #1039
> **Entscheidung:** Story-Editor **bleibt produktiv** als internes Admin-Werkzeug und Fundament für die geplanten Storybuilder-Phasen #1022 (Tasting-Story-Migration) und #1023 (LandingPage-CMS).

---

## 1. Was ist der Story-Editor?

Der Story-Editor (auch „CMS Story-Builder“) ist ein **block-basiertes Content-Management-System**, das im Backoffice von CaskSense unter `/admin/cms` läuft. Er erlaubt Administrator:innen, Landing-Page-Inhalte als Abfolge wiederverwendbarer **Story-Blöcke** (Hero, Text, Bild, Zitat, Trenner, …) zusammenzustellen, in einer Live-Vorschau zu prüfen und ohne Code-Deploy zu veröffentlichen.

Der Editor baut auf der hauseigenen **Storybuilder-Bibliothek** (`client/src/storybuilder/`) auf, die in Phase 1 (Task #1018, 25.04.2026) als Fundament für zwei Anwendungsfälle gelegt wurde:

1. **LandingPage-CMS** (heute, dieses Dokument) — pflegbare Marketing-Seiten unter `/`.
2. **Tasting-Story-Migration** (geplant, Phase #1022) — die heute statische Tasting-Story (`client/public/tasting-story/template.html`) soll perspektivisch ebenfalls aus diesen Blöcken zusammengesetzt werden.

Der Editor ist also **kein Ersatz** für die bestehende Landing-Page (`landing-new.tsx`), sondern ein **Migrationspfad**: Solange keine veröffentlichte CMS-Seite mit Slug `home` existiert, sehen Besucher die hartkodierte `landing-new.tsx`. Sobald Christoph eine `home`-Seite veröffentlicht, übernimmt das CMS automatisch.

---

## 2. Routen-Übersicht

| Route                          | Zweck                                                         | Zugriff      |
|--------------------------------|---------------------------------------------------------------|--------------|
| `/`                            | Öffentliche Landing-Page (CMS wenn vorhanden, sonst Fallback) | Öffentlich   |
| `/admin/cms`                   | Dashboard: Liste aller Seiten, neu/duplizieren/löschen        | Nur Admin    |
| `/admin/cms/:id`               | Editor für eine Seite (Blöcke bearbeiten, Draft speichern)    | Nur Admin    |
| `/admin/cms/:id/preview`       | Live-Vorschau der Draft-Version                               | Nur Admin    |
| `/admin/storybuilder-demo`     | Spielwiese mit Seed-Inhalt (Phase 1 Demo)                     | Nur Admin    |

> **Hinweis zu älteren Pfaden:** In früheren Notizen tauchten die Routen `/admin/cms-editor/:slug` und `/admin/cms-preview/:slug` auf. Diese existieren **nicht** — die produktiven Routen verwenden die UUID `:id` (siehe `client/src/App.tsx`, Zeilen 549–567).

---

## 3. Datenmodell (`shared/schema.ts`)

### `cms_pages`
Eine Zeile = eine pflegbare Seite.

| Spalte              | Bedeutung                                                              |
|---------------------|------------------------------------------------------------------------|
| `id`                | UUID (Primärschlüssel)                                                 |
| `slug`              | URL-Schlüssel, eindeutig (z. B. `home`, `about`)                       |
| `title`             | Anzeigetitel                                                           |
| `blocks_json`       | **Veröffentlichte** Blockliste (was Besucher sehen)                    |
| `draft_blocks_json` | **Aktuelle Arbeitsfassung** (Editor speichert hier)                    |
| `theme`             | Visuelles Theme (Default: `casksense-editorial`)                       |
| `published_at`      | Zeitpunkt der letzten Veröffentlichung; `null` = noch nie veröffentlicht |
| `created_by_id`     | Wer hat die Seite angelegt                                             |
| `created_at`/`updated_at` | Standard-Timestamps                                              |

**Status (im Code abgeleitet, nicht gespeichert):**
- `draft` — noch nie veröffentlicht (`published_at IS NULL`)
- `live` — veröffentlicht, Draft = Live-Stand
- `live-changes` — veröffentlicht, aber Draft enthält ungespeicherte Änderungen

### `story_versions`
Snapshot-Historie. Jede Veröffentlichung sowie manuelle „Snapshots" und Auto-Saves landen hier (`source_type = 'cms'`, `source_id = cms_pages.id`). Wird auch von der Tasting-Story (Phase #1022) mitbenutzt.

### `story_templates`
Vorgefertigte Block-Templates, die im Editor eingefügt werden können. Aktuell minimal befüllt; wächst mit Phase #1021.

---

## 4. API-Endpunkte (`server/routes.ts`)

> **Letzter Abgleich mit dem Code:** 26.04.2026 — Routen, Endpunkte und Schema wurden gegen `client/src/App.tsx`, `server/routes.ts` und `shared/schema.ts` verifiziert.

Alle Admin-Endpunkte verlangen einen authentifizierten Request **und** `participant.role === 'admin'`. Bei fehlender Berechtigung antwortet der Server mit `403 Forbidden`.

| Methode | Pfad                                       | Zweck                                                  |
|---------|--------------------------------------------|--------------------------------------------------------|
| GET     | `/api/admin/cms/pages`                     | Liste aller Seiten (Metadaten)                         |
| GET     | `/api/admin/cms/pages/:id`                 | Eine Seite inkl. Draft-Blöcke laden                    |
| POST    | `/api/admin/cms/pages`                     | Neue Seite anlegen (`slug`, `title`)                   |
| PUT     | `/api/admin/cms/pages/:id`                 | Metadaten oder `draft_blocks_json` speichern           |
| POST    | `/api/admin/cms/pages/:id/publish`         | Draft → Live (kopiert `draft_blocks_json` → `blocks_json`, setzt `published_at`) |
| POST    | `/api/admin/cms/pages/:id/duplicate`       | Seite klonen (neuer Slug)                              |
| DELETE  | `/api/admin/cms/pages/:id`                 | Seite löschen                                          |
| POST    | `/api/admin/cms/seed-home`                 | Demo-„Home"-Seite anlegen, falls noch keine existiert  |
| POST    | `/api/cms/upload`                          | Bild-Upload für Blöcke (Replit Object Storage)         |
| **GET** | **`/api/cms/pages/:slug`**                 | **Öffentlich**: liefert nur `blocks_json` (Live-Stand) zur Anzeige auf `/` |

---

## 5. Zugriff & Zielgruppe

- **Bearbeiten/Veröffentlichen:** ausschließlich Christoph (Rolle `admin`). Sowohl Frontend (`isAdmin`-Check in jedem Editor-Page) als auch Backend (Rollencheck pro Endpoint) blockieren alle anderen.
- **Lesen (gerendertes Ergebnis):** alle Besucher von `casksense.com` — sobald eine Seite mit Slug `home` veröffentlicht ist, bekommt jeder Besucher diese statt `landing-new.tsx` zu sehen.
- **Risiko bei Falschveröffentlichung:** mittel — eine fehlerhafte `home`-Seite würde die Live-Landing-Page sofort ersetzen. Mitigation: stets vorher unter `/admin/cms/:id/preview` prüfen, im Notfall die Seite über das Dashboard löschen oder den Slug ändern, damit der Fallback wieder greift.

---

## 6. Verhältnis zur bestehenden Landing-Page

```
GET /
  └── client/src/pages/landing-cms.tsx
        ├── fetch /api/cms/pages/home
        │     ├── liefert Blöcke → StoryRenderer rendert die CMS-Seite
        │     └── liefert nichts (404 / leer) → Fallback
        └── Fallback: lazy-load client/src/pages/landing-new.tsx  ← der heutige Live-Stand
```

**Heute (26.04.2026):** Es ist keine `home`-CMS-Seite veröffentlicht. Besucher sehen weiterhin die hartkodierte `landing-new.tsx`. Der Story-Editor ist also **vorbereitet, aber noch nicht öffentlich aktiv**.

Die hartkodierte Landing-Page bleibt zudem die verbindliche **Brand Visual Direction** (siehe `replit.md`, Stand 25.04.2026): EB Garamond + Inter, Amber `#C9A961`, Filmkorn-Overlay. Jede künftige CMS-Seite muss in diesem Stil bleiben — das Default-Theme `casksense-editorial` setzt das bereits voraus.

---

## 7. Entscheidung: Editor bleibt produktiv

**Begründung:**
1. Der Editor ist **ausdrücklich Phase 1 eines Mehrphasenplans** (`replit.md`, Checkpoint Storybuilder Phase 1). Phasen #1020 (Editor-Ausbau), #1021 (Versionen + Templates + KI), #1022 (Tasting-Story-Migration), #1023 (LandingPage-CMS), #1024 (Cutover) sind als Drafts angelegt und bauen direkt darauf auf.
2. Der Code ist **vollständig kapselt** unter `/admin/cms*` und wirkt sich auf nichts aus, solange keine `home`-Seite veröffentlicht wurde. Risiko = niedrig.
3. **Zugriff ist sauber abgesichert** (Admin-Only, doppelt: Frontend + Backend).
4. Ein Entfernen würde drei Tabellen, ~15 Endpunkte, vier Pages und die komplette `client/src/storybuilder/`-Bibliothek wegwerfen — und damit das Fundament für die geplante Tasting-Story-Migration zerstören.

**Was nicht passiert:**
- Keine Routen werden entfernt.
- Keine Tabellen werden gelöscht.
- Keine Cleanup-Aktion an `cms_pages`, `story_versions`, `story_templates`.

**Was bei künftigen Phasen zu beachten ist:**
- Wenn eine `home`-Seite tatsächlich veröffentlicht werden soll (Phase #1023 / #1024), muss vorher inhaltlich ein 1:1-Ersatz für die heutige `landing-new.tsx` aufgebaut sein — sonst verliert die Live-Seite Inhalte.
- Vor dem Cutover sollte die hartkodierte Landing-Page nicht entfernt werden; sie bleibt als sicherer Fallback.

---

## 8. Kurzanleitung für Christoph (Admin)

> Voraussetzung: in CaskSense eingeloggt mit dem Admin-Konto.

### a) Eine neue Seite anlegen
1. `/admin/cms` öffnen.
2. Oben rechts auf **„Neue Seite"** klicken.
3. **Slug** vergeben (URL-tauglich, klein, ohne Leerzeichen — z. B. `about`, `tasting-club`). Slug `home` ist reserviert und überschreibt nach Veröffentlichung die öffentliche Startseite.
4. **Titel** vergeben (interner Anzeigetitel, z. B. „Über uns").
5. **„Anlegen"** → die Seite wird erstellt und der Editor öffnet sich.

### b) Inhalte bearbeiten
Im Editor (`/admin/cms/:id`) gibt es drei Spalten:

- **Links — Block-Liste:** jeder Block einer Seite (Reihenfolge per Drag/Drop, einzeln duplizieren, ausblenden, löschen). Über **„Block hinzufügen"** stehen die Storybuilder-Blöcke zur Auswahl: Hero-Cover, Text-Section (mit Akt-Intro-Variante), Full-Width-Image, Quote, Divider.
- **Mitte — Live-Vorschau:** zeigt die aktuelle Draft-Fassung im echten Theme (EB Garamond, Inter, Amber, Filmkorn).
- **Rechts — Properties-Panel:** Eingabefelder für den gerade ausgewählten Block (Überschriften, Texte, Bild-Upload via Drag/Drop, Akzentfarben).

Änderungen werden **automatisch als Draft** gespeichert — die Live-Seite ist davon noch nicht betroffen.

### c) Vorschau prüfen
- Im Editor oben rechts auf **„Vorschau"** klicken oder direkt `/admin/cms/:id/preview` öffnen.
- Die Vorschau rendert die **Draft-Fassung** exakt so, wie sie nach dem Veröffentlichen aussehen würde.

### d) Veröffentlichen
1. Im Dashboard `/admin/cms` die Zeile der Seite suchen.
2. Auf **„Veröffentlichen"** klicken.
3. Die Draft-Fassung wird in `blocks_json` kopiert, `published_at` wird gesetzt — und wenn der Slug `home` ist, sehen Besucher von `/` ab sofort die neue Version.

### e) Zurück zum Fallback (Notfall)
Falls die veröffentlichte `home`-Seite Probleme macht:
- entweder die Seite im Dashboard **löschen** (→ Fallback `landing-new.tsx` greift wieder), oder
- den **Slug umbenennen** auf z. B. `home-broken` (`PUT /api/admin/cms/pages/:id`).

### f) Versionshistorie
Jede Veröffentlichung legt automatisch einen Snapshot in `story_versions` ab. Eine UI zum Zurückrollen ist Teil von Phase #1021 und heute noch nicht im Editor verfügbar — bei Bedarf bitte direkt anfragen.

---

## 9. Screenshots

> Screenshots werden ergänzt, sobald Christoph die Seite produktiv betritt und einen kurzen Rundgang aufzeichnet. Die UI ist stabil, sodass nachgereichte Screenshots nicht erneut veralten sollten.

Empfohlene Screenshots zum späteren Einfügen:
- `/admin/cms` — Dashboard mit Seitenliste & Status-Badges.
- `/admin/cms/:id` — Editor mit allen drei Spalten.
- `/admin/cms/:id/preview` — Live-Vorschau einer Seite.

---

## 10. Querverweise

- `replit.md` → Checkpoint **„Storybuilder Phase 1" (25.04.2026)** für die Architekturentscheidung.
- `client/src/storybuilder/` → Block-Bibliothek, Themes, Renderer, Editor.
- `client/src/pages/landing-cms.tsx` → Public-Routing für `/` mit CMS/Fallback-Logik.
- `client/src/pages/landing-new.tsx` → aktuelle Live-Landing-Page (Fallback).
- `shared/schema.ts` (Zeilen ~1509–1549) → Tabellen `cms_pages`, `story_versions`, `story_templates`.
- `server/routes.ts` (Zeilen ~25352–25571) → CMS-Endpunkte.
