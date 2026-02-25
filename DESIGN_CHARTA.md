# CaskSense — DesignCharta v1.0

> Deskriptive Dokumentation aller visuellen Design-Regeln, extrahiert aus dem bestehenden Code.
> Stand: Februar 2026 · Keine Vorgabe für Änderungen — dieses Dokument beschreibt, was **ist**.

---

## 1. Designphilosophie

CaskSense folgt einer **Whisky-Journal-Ästhetik**: warm, elegant, strukturiert. Das visuelle System orientiert sich an der Anmutung eines hochwertigen Verkostungstagebuchs — gedeckte Farbtöne, serifenbasierte Überschriften, klare Hierarchien und zurückhaltende Animationen.

Leitprinzipien:
- **Konsistenz vor Kreativität** — alle Seiten innerhalb des Layouts nutzen dasselbe Gerüst (`PageLayout`)
- **Inhalt vor Dekoration** — UI-Elemente dienen der Struktur, nicht der Verzierung
- **Warme Neutralität** — Amber/Gold als Akzentfarbe, gedämpfte Braun- und Cremetöne als Basis
- **Lesbarkeit** — Serif für Überschriften (Eleganz), Sans-Serif für Fließtext (Klarheit)

---

## 2. Farbpalette

Alle Farben sind als CSS Custom Properties in HSL definiert (`client/src/index.css`).

### Dark Mode (`:root`, Standard)

| Token | HSL | Beschreibung |
|-------|-----|--------------|
| `--background` | `25 18% 12%` | Tiefes Holzkohle-Braun |
| `--foreground` | `35 20% 88%` | Helles Creme/Offwhite |
| `--card` | `25 16% 16%` | Etwas helleres Dunkelbraun |
| `--card-foreground` | `35 20% 88%` | Wie Foreground |
| `--primary` | `36 55% 55%` | Gold/Amber (Whisky-Ton) |
| `--primary-foreground` | `25 20% 10%` | Dunkler Kontrast auf Primary |
| `--secondary` | `25 14% 20%` | Gedämpftes Dunkelbraun |
| `--secondary-foreground` | `35 20% 80%` | Heller Text auf Secondary |
| `--accent` | `36 60% 50%` | Kräftiges Amber |
| `--accent-foreground` | `25 20% 10%` | Dunkler Kontrast auf Accent |
| `--muted` | `25 10% 22%` | Zurückhaltendes Dunkelbraun |
| `--muted-foreground` | `30 12% 63%` | Gedämpfter Textton |
| `--destructive` | `0 55% 45%` | Tiefrot |
| `--destructive-foreground` | `0 0% 100%` | Weiß auf Destructive |
| `--border` | `25 14% 46%` | Gedämpfter Braunton |
| `--input` | `25 14% 46%` | Wie Border (Eingabefelder) |
| `--ring` | `36 55% 55%` | Wie Primary (Fokus-Ring) |
| `--popover` | `25 16% 16%` | Wie Card (Popovers) |
| `--popover-foreground` | `35 20% 88%` | Wie Foreground (Popovers) |

### Light Mode (`.light`)

| Token | HSL | Beschreibung |
|-------|-----|--------------|
| `--background` | `40 25% 96%` | Warmes Weiß/Papier |
| `--foreground` | `25 20% 15%` | Dunkles Braun |
| `--card` | `40 20% 99%` | Reines warmes Weiß |
| `--card-foreground` | `25 20% 15%` | Wie Foreground |
| `--primary` | `30 50% 35%` | Tiefes Burnt Orange/Amber |
| `--primary-foreground` | `40 25% 96%` | Heller Kontrast auf Primary |
| `--secondary` | `35 18% 90%` | Helles warmes Grau |
| `--secondary-foreground` | `25 20% 25%` | Dunkler Text auf Secondary |
| `--accent` | `30 55% 40%` | Sattes Amber |
| `--accent-foreground` | `40 25% 96%` | Heller Kontrast auf Accent |
| `--muted` | `35 12% 92%` | Blasses Grau/Creme |
| `--muted-foreground` | `25 10% 45%` | Gedämpfter Textton |
| `--destructive` | `0 60% 50%` | Standard-Rot |
| `--destructive-foreground` | `0 0% 100%` | Weiß auf Destructive |
| `--border` | `30 15% 80%` | Weicher warmer Rand |
| `--input` | `30 15% 80%` | Wie Border (Eingabefelder) |
| `--ring` | `30 50% 35%` | Wie Primary (Fokus-Ring) |
| `--popover` | `40 20% 99%` | Wie Card (Popovers) |
| `--popover-foreground` | `25 20% 15%` | Wie Foreground (Popovers) |

### Anwendungsregeln

| Kontext | Token |
|---------|-------|
| Seitenhintergrund | `bg-background` |
| Karten | `bg-card` mit `border` und `shadow` |
| Primäre Aktionen, Überschriften, Icons im Header | `text-primary`, `bg-primary` |
| Sekundäre Informationen, Beschreibungen | `text-muted-foreground` |
| Dezente Hintergründe (Badges, Tags) | `bg-muted`, `bg-secondary` |
| Fehler, Löschaktionen | `text-destructive`, `bg-destructive` |
| Subtile Ränder | `border-border/40`, `border-primary/20` |
| Hervorhebung (Glasmorphismus) | `bg-card/80 backdrop-blur` |

---

## 3. Typografie

### Schriftarten

| Rolle | Schriftart | CSS-Klasse | Einsatz |
|-------|-----------|------------|---------|
| Überschriften | Playfair Display (400–900) | `font-serif` | h1–h6, Seitentitel, Branding "CaskSense", Card-Titel, prominente CTAs |
| Fließtext | Inter (300–600) | `font-sans` | Body-Text, Labels, Formulare, UI-Elemente |
| CJK-Fallback | Noto Sans SC (300–700) | — | Automatischer Fallback in beiden Stacks |

**Globale Regel**: Alle `h1`–`h6` erhalten automatisch `font-serif tracking-tight text-primary` über die CSS-Base-Layer-Definition in `index.css`. Das bedeutet: jede Überschrift ist standardmäßig Serif, eng gesetzt und in der Primärfarbe.

### Größenhierarchie (PageLayout-Header)

| Element | Klassen |
|---------|---------|
| Seitentitel | `text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary tracking-tight` |
| Untertitel | `text-sm text-muted-foreground mt-1` |
| Card-Überschrift | `text-lg font-serif font-semibold` oder `text-base font-serif font-semibold` |
| Section-Label | `text-sm font-serif font-bold text-muted-foreground uppercase tracking-widest` |
| Fließtext | `text-sm` (Standard) oder `text-xs` (sekundär) |

---

## 4. Spacing & Layout

### PageLayout-Varianten

Alle Seiten innerhalb des `<Layout>`-Wrappers verwenden das `<PageLayout>`-Komponent. Es gibt drei Varianten:

| Variante | Container-Klassen | Einsatz |
|----------|-------------------|---------|
| `default` | `max-w-5xl mx-auto px-4 py-8` | Standard für die meisten Seiten |
| `narrow` | `max-w-2xl mx-auto px-4 py-8` | Formulare, Account-Einstellungen, kompakte Dashboards |
| `immersive` | `max-w-5xl mx-auto px-4 py-6` | Gleiche Breite wie Default, reduziertes vertikales Padding |

Alle Varianten haben zusätzlich `min-w-0 overflow-x-hidden` auf dem äußeren Wrapper.

### Abstände

| Kontext | Klasse |
|---------|--------|
| Header → Inhalt | `mb-6` |
| Tabs → Inhalt | `mb-4` |
| Zwischen Sektionen | `space-y-8` oder `space-y-6` |
| Innerhalb von Cards | `p-6` (CardContent) |
| Card-Grid | `grid grid-cols-1 md:grid-cols-2 gap-6` |

---

## 5. PageLayout — Komponent-Referenz

**Datei**: `client/src/components/page-layout.tsx`

### Props

| Prop | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| `icon` | `LucideIcon` | Ja | Icon links neben dem Titel |
| `title` | `string` | Ja | Seitentitel (Serif, Primary-Farbe) |
| `subtitle` | `string \| ReactNode` | Nein | Beschreibungszeile unter dem Titel |
| `primaryAction` | `ReactNode` | Nein | Button/Element oben rechts |
| `headerContent` | `ReactNode` | Nein | Zusatzinhalt zwischen Header und Tabs/Children |
| `tabs` | `PageTab[]` | Nein | Tab-Konfiguration (siehe unten) |
| `activeTabKey` | `string` | Nein | Aktiver Tab-Schlüssel |
| `onTabChange` | `(key: string) => void` | Nein | Callback bei Tab-Wechsel |
| `tabsTestId` | `string` | Nein | `data-testid` für die TabsList |
| `variant` | `"default" \| "narrow" \| "immersive"` | Nein | Layout-Variante (Standard: `"default"`) |
| `hideChrome` | `boolean` | Nein | Nur Children rendern, kein Header/Rahmen |
| `testId` | `string` | Nein | `data-testid` für Testing |
| `className` | `string` | Nein | Zusätzliche CSS-Klassen |

### PageTab-Interface

```typescript
interface PageTab {
  key: string;        // Eindeutiger Schlüssel
  labelKey: string;   // i18n-Übersetzungsschlüssel (wird mit t() aufgelöst)
  fallback?: string;  // Fallback-Text wenn labelKey nicht gefunden
  icon?: LucideIcon;  // Optionales Tab-Icon
  badge?: string;     // Optionaler Badge-Text
  disabled?: boolean; // Tab deaktivieren
  testId?: string;    // data-testid (Standard: `tab-${key}`)
}
```

Tab-Labels werden immer über i18n-Keys gesteuert (`labelKey`), nicht als statische Strings.

### Tab-Layout-Regeln

- **2–5 Tabs**: `grid grid-cols-[N]` (gleichmäßig verteilt)
- **> 5 Tabs**: `inline-flex` (scrollbar)
- **Tab-Trigger**: `text-xs sm:text-sm font-serif whitespace-nowrap`
- **Tab-Icons**: `w-3.5 h-3.5`, Text-Label auf Mobile ausgeblendet (`hidden sm:inline`) wenn Icon vorhanden
- **Tab-Badges**: `text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold`

### Header-Struktur

```
┌──────────────────────────────────────────┐
│  [Icon w-7 h-7]  Titel (Serif, Bold)    │  [primaryAction]
│                  Subtitle (text-sm)       │
├──────────────────────────────────────────┤
│  [Tab 1]  [Tab 2]  [Tab 3]  ...         │
├──────────────────────────────────────────┤
│  Children                                │
└──────────────────────────────────────────┘
```

---

## 6. Komponenten-Konventionen

### Card

**Basis**: `rounded-xl border bg-card text-card-foreground shadow`

| Teil | Klassen |
|------|---------|
| `CardHeader` | `flex flex-col space-y-1.5 p-6` |
| `CardTitle` | `font-semibold leading-none tracking-tight` (erhält `font-serif text-primary` automatisch da `h3`-Element) |
| `CardDescription` | `text-sm text-muted-foreground` |
| `CardContent` | `p-6 pt-0` |
| `CardFooter` | `flex items-center p-6 pt-0` |

**Häufige Overrides** (projektspezifisch):
- Glasmorphismus: `border-primary/20 bg-card/80 backdrop-blur`
- Hover-Effekt: `border-border/40 hover:border-primary/30 transition-colors cursor-pointer`
- Dezenter Hintergrund: `bg-secondary/10` oder `bg-muted/30`
- Sektionskarte: `bg-card rounded-lg border border-border/40 p-6`

### Button

**Datei**: `client/src/components/ui/button.tsx`

**Basis**: `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2`

| Variante | Klassen | Einsatz |
|----------|---------|---------|
| `default` | `bg-primary text-primary-foreground border border-primary-border` | Primäre Aktionen |
| `destructive` | `bg-destructive text-destructive-foreground shadow-sm border-destructive-border` | Löschaktionen |
| `outline` | `border [border-color:var(--button-outline)] shadow-xs active:shadow-none` | Sekundäre Aktionen (erbt Hintergrund/Textfarbe des Containers) |
| `secondary` | `border bg-secondary text-secondary-foreground border-secondary-border` | Tertiäre Aktionen |
| `ghost` | `border border-transparent` | Kontextuelle Links, Zurück-Buttons |
| `link` | `text-primary underline-offset-4 hover:underline` | Inline-Links |

| Größe | Klassen |
|-------|---------|
| `default` | `min-h-9 px-4 py-2` |
| `sm` | `min-h-8 rounded-md px-3 text-xs` |
| `lg` | `min-h-10 rounded-md px-8` |
| `icon` | `h-9 w-9` |

Besonderheiten: Buttons nutzen `min-h` statt `h` für flexible Höhe. Die `hover-elevate` und `active-elevate-2` Klassen erzeugen einen taktilen Elevations-Effekt.

---

## 7. Icon-Konventionen

**Bibliothek**: Lucide React (`lucide-react`)

| Kontext | Größe | Farbe | Beispiel |
|---------|-------|-------|----------|
| PageLayout-Header | `w-7 h-7` | `text-primary flex-shrink-0` | Seitenicon neben Titel |
| Cards, Navigation, Buttons | `w-5 h-5` | kontextabhängig | Sidebar-Icons, Card-Header |
| Tabs (in PageLayout) | `w-3.5 h-3.5` | geerbt | Tab-Icons |
| Inline/Klein | `w-4 h-4` | kontextabhängig | Buttons mit Icon + Text |
| Leere Zustände | `w-12 h-12` | `opacity-30` | Platzhalter bei leeren Listen |

**Regel**: Icons erhalten immer `flex-shrink-0` wenn sie neben Text stehen, um bei engem Platz nicht zu schrumpfen.

---

## 8. Border-Radius

Definiert als CSS Custom Properties in `client/src/index.css`:

| Token | Wert | Tailwind-Klasse |
|-------|------|-----------------|
| `--radius-sm` | `0.25rem` (4px) | `rounded-sm` |
| `--radius-md` | `0.5rem` (8px) | `rounded-md` |
| `--radius-lg` | `0.75rem` (12px) | `rounded-lg` |
| `--radius` (Global) | `0.5rem` (8px) | `rounded` |

**Konventionen**:
- Cards: `rounded-xl` (explizit, unabhängig von Token)
- Buttons: `rounded-md`
- Badges/Tags: `rounded-full`
- Sektionskarten: `rounded-lg`

---

## 9. Animationen

### Framer Motion

Für Seitenübergänge und Einblendungen:

```tsx
// Standard-Einblendung
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}
```

Verwendet in: Card-Gruppen, Sektionen, Dialoge.

### Spotlight-Pulse

Definiert in `index.css` als Keyframe-Animation:

```css
/* Amber-Glow für Hervorhebungen */
@keyframes spotlight-pulse { ... }
.spotlight-target-glow  /* 8px Radius, Amber-Glühen */
```

Einsatz: Feature-Highlighting, Onboarding-Fokus.

---

## 10. Do's & Don'ts

### Do's

- Jede eigenständige Seite innerhalb `<Layout>` **muss** `<PageLayout>` verwenden
- Titel und Subtitle immer über PageLayout-Props setzen, nie als eigenes `<h1>`
- Tabs immer über die `tabs`-Prop von PageLayout, nie als eigene `<TabsList>`
- `primaryAction` für kontextuelle Aktions-Buttons oben rechts nutzen
- `data-testid` an alle interaktiven und inhaltlich relevanten Elemente
- Card-Überschriften mit `font-serif` kennzeichnen
- Icon-Größen konsistent nach Kontext wählen (siehe Abschnitt 7)
- Dezente Borders verwenden (`border-border/40`, `border-primary/20`)

### Don'ts

- Keine eigenen `<h1>`-Tags auf Seitenebene — PageLayout übernimmt das
- Keine eigenen Container (`max-w-*xl mx-auto px-4 py-8`) — PageLayout liefert den Container
- Keine eigenen Tab-Implementierungen mit `border-b-2` oder ähnlichem
- Keine neuen Farben außerhalb der definierten Palette erfinden
- Keine fixen Breiten/Höhen für responsive Elemente
- Keine `font-sans` auf Überschriften — Überschriften sind immer `font-serif`
- Kein PageLayout auf Seiten außerhalb von `<Layout>` (Landing, Naked Tasting, Watch, etc.)
- Kein PageLayout auf Tab-eingebettete Inhaltskomponenten (die bereits in einem PageLayout-Elternteil rendern)

---

## 11. Seiten-Konformitätsliste

### PageLayout-konforme Seiten (21)

| Seite | Datei | Variante | Icon |
|-------|-------|----------|------|
| Account | `account.tsx` | narrow | UserCog |
| Admin Panel | `admin-panel.tsx` | default | ShieldAlert |
| Badges | `badges.tsx` | default | Award |
| Discover Community | `discover-community.tsx` | default | Users |
| Discover Distilleries | `discover-distilleries.tsx` | default | Landmark |
| Discover Hub | `discover-hub.tsx` | default | Compass |
| Flavor Profile | `flavor-profile.tsx` | default + tabs | Activity |
| Flavor Wheel | `flavor-wheel.tsx` | default | CircleDot |
| Home Dashboard | `home-dashboard.tsx` | narrow | LayoutDashboard |
| Method | `method.tsx` | default | FlaskConical |
| My Journal | `my-journal.tsx` | default + tabs | NotebookPen |
| News | `news.tsx` | default | Bell |
| Photo Tasting | `photo-tasting.tsx` | default | Camera |
| Profile | `profile.tsx` | narrow | User |
| Profile Help | `profile-help.tsx` | default + tabs | HelpCircle |
| Tasting Calendar | `tasting-calendar.tsx` | default | Calendar |
| Tasting Hub | `tasting-hub.tsx` | default | Home |
| Tasting Sessions | `tasting-sessions.tsx` | default + tabs | Wine |
| Whiskybase Collection | `whiskybase-collection.tsx` | default | Archive |
| Whisky Database | `whisky-database.tsx` | default | Database |
| Wishlist | `wishlist.tsx` | immersive | Star |

### Tab-eingebettete Inhaltskomponenten (kein eigenes PageLayout)

Diese Komponenten werden als Tab-Inhalt innerhalb einer PageLayout-Elternseite gerendert:

sessions, discover, journal, tasting-history, host-dashboard, tasting-recap, about, features, donate, help, distillery-encyclopedia, distillery-map, bottlers, whisky-friends, taste-twins, community-rankings, leaderboard, activity-feed, benchmark-analyzer, comparison, data-export, my-whiskies, analytics, recommendations, lexicon, research, tasting-templates, pairing-suggestions, export-notes, reminders

### Bewusste Ausnahmen (kein PageLayout)

| Seite | Grund |
|-------|-------|
| Landing (`/`) | Standalone Marketing-Seite, eigenes Layout |
| Tour, Feature Tour | Geführte Vollbild-Erlebnisse |
| Intro, Background | Standalone Onboarding/Info-Seiten außerhalb Layout |
| Naked Tasting | Rendert außerhalb von `<Layout>` |
| Watch Screen | Rendert außerhalb von `<Layout>` |
| Tasting Room | Immersive Session-Ansicht, eigene Struktur |
| Quick Tasting | Join-Flow, eigene Struktur |
| Invite Accept | Einladungs-Annahme, eigene Struktur |
| Not Found | Fehlerseite |
| Impressum, Privacy | Rechtliche Seiten, eigenes Layout |

---

*Diese Charta beschreibt den Ist-Zustand. Änderungen am Design-System sollten hier reflektiert werden.*
