# CaskSense Apple — Upload-Anleitung

## Was ist das?
Vollständige Neu-Implementierung von CaskSense V2 (alle 8 Phasen) als
direkt uploadbare Dateien. Kein Prompt-Roulette mit Replit-KI.

## Ordnerstruktur

Lade diesen Ordner als `client/src/labs-apple/` in dein Replit-Projekt.

```
client/src/labs-apple/
├── LabsAppleApp.tsx          ← Root-Komponente
├── LabsAppleLayout.tsx       ← Layout mit Tab-Bar + TopBar
├── theme/
│   ├── tokens.ts             ← Design Tokens (Farben, Spacing)
│   ├── i18n.ts               ← Alle Texte DE + EN (alle 8 Phasen)
│   └── animations.css        ← Keyframes (fadeUp, saveFlash, etc.)
├── icons/
│   └── Icons.tsx             ← Vollständige SVG-Icon-Library (45+ Icons)
├── types/
│   ├── rating.ts             ← TypeScript-Typen für Rating
│   └── host.ts               ← TypeScript-Typen für Hosting
├── components/
│   ├── PhaseSignature.tsx    ← Phasen-Icon + Akzentfarbe
│   ├── SaveConfirm.tsx       ← 300ms Flash nach Speichern
│   ├── ScoreInput.tsx        ← Custom Slider (kein input[type=range])
│   └── FlavorTags.tsx        ← Aroma-Tags mit API-Integration
├── screens/
│   ├── tastings/
│   │   └── TastingsHub.tsx   ← Hub + JoinFlow
│   ├── rating/
│   │   ├── RatingModeSelect.tsx
│   │   ├── GuidedRating.tsx
│   │   ├── CompactRating.tsx
│   │   └── RatingFlow.tsx    ← Orchestrator
│   ├── solo/
│   │   └── SoloFlow.tsx      ← Capture → Form → Rating → Done
│   ├── host/
│   │   └── HostWizard.tsx    ← 4-Schritt Host-Wizard
│   ├── live/
│   │   └── LiveTasting.tsx   ← Live-Raum + Reveal + Ambient
│   ├── results/
│   │   └── ResultsScreen.tsx ← Insights + Connoisseur Report
│   ├── meinewelt/
│   │   └── MeineWeltScreen.tsx ← Profil, Journal, Analytics
│   └── entdecken/
│       └── EntdeckenCircle.tsx ← Entdecken + Circle Tabs
```

## Routing in App.tsx (2 Zeilen hinzufügen)

Öffne `client/src/App.tsx` und füge am Ende der Route-Liste hinzu:

```tsx
import { LabsAppleApp } from './labs-apple/LabsAppleApp'

// In der Route-Konfiguration ergänzen:
<Route path="/labs-apple" component={LabsAppleApp} />
<Route path="/labs-apple/:rest*" component={LabsAppleApp} />
```

## Landing Page (optional: zweiten Button)

In `client/src/pages/landing-new.tsx` neben dem bestehenden CTA-Button:

```tsx
<a href="/labs-apple" style={{
  display: 'inline-flex', alignItems: 'center', height: 52,
  padding: '0 28px', borderRadius: 14, textDecoration: 'none',
  border: '1px solid #d4a847', color: '#d4a847', fontSize: 16,
  fontWeight: 600, background: 'transparent',
}}>
  ✦ Apple Experience
</a>
```

## Keine DB-Änderungen nötig
Die App nutzt dieselbe PostgreSQL-Datenbank und alle bestehenden
API-Endpunkte wie labs/. Keine schema.ts-Änderungen, kein drizzle-kit.

## Absolut unberührt bleiben:
- server/ (kein einziges File ändern)
- schema.ts
- client/src/labs/ (bestehende V1)
- .env
- package.json (keine neuen Dependencies nötig)

## Design-Garantien (alle implementiert)
✓ Keine Emojis — ausschließlich SVG-Icons
✓ 8px-Raster (SP.xs bis SP.xxxl)
✓ 44px Touch-Targets überall
✓ Playfair Display / Cormorant Garamond / DM Sans
✓ Dark default, Light-Toggle
✓ DE default, EN-Toggle
✓ 4 Dimensionen: Nase · Gaumen · Abgang · Gesamt (Balance: nicht vorhanden)
✓ Max 6 Flavor-Tags (aus API)
✓ Custom Slider (Thumb 44×44px Touch-Area)
✓ Slider-Start: 75
✓ 300ms Save-Animation
✓ Phasen-Signaturen mit eigenem Glow
✓ Breathing Pause (350ms) bei Dram-Wechsel
✓ DSGVO: Leaderboard anonymisiert (Whisky-Alias)
