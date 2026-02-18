# CaskSense – Mobile App (iOS & Android)

Dieses Projekt ist bereit für die Veröffentlichung im **Apple App Store** und **Google Play Store** mittels [Capacitor](https://capacitorjs.com/).

---

## Voraussetzungen

### Für iOS (App Store)
- **Mac** mit macOS 13+ (Ventura oder neuer)
- **Xcode 15+** (kostenlos im Mac App Store)
- **Apple Developer Account** – [developer.apple.com](https://developer.apple.com) – 99 $/Jahr
- **Node.js 18+** und **npm**

### Für Android (Play Store)
- **Android Studio** (kostenlos, läuft auf Mac/Windows/Linux)
- **Google Play Developer Account** – [play.google.com/console](https://play.google.com/console) – einmalig 25 $
- **Node.js 18+** und **npm**

---

## Schritt-für-Schritt Anleitung

### 1. Projekt auf deinen Computer laden

```bash
# Repository klonen oder Dateien herunterladen
git clone <dein-repo-url>
cd casksense

# Abhängigkeiten installieren
npm install
```

### 2. Web-App bauen & Capacitor synchronisieren

```bash
# Baut die Web-App und synchronisiert mit den nativen Projekten
npm run build
npx cap sync
```

Oder nutze das Build-Skript:
```bash
bash scripts/build-mobile.sh
```

### 3. Native Projekte erstellen (einmalig)

```bash
# iOS-Projekt hinzufügen
npx cap add ios

# Android-Projekt hinzufügen
npx cap add android

# Nochmal synchronisieren
npx cap sync
```

---

## iOS – Apple App Store

### In Xcode öffnen
```bash
npx cap open ios
```

### In Xcode:
1. **Team auswählen**: Xcode > Project > Signing & Capabilities > Team = dein Apple Developer Account
2. **Bundle Identifier** ist bereits gesetzt: `com.casksense.app`
3. **App Icons**: Sind automatisch aus den generierten Icons verfügbar
4. **Version & Build Number** setzen (z.B. Version 1.0.0, Build 1)

### TestFlight (zum Testen)
1. In Xcode: Product > Archive
2. Im Organizer: "Distribute App" > "App Store Connect"
3. In App Store Connect das Build zu TestFlight hinzufügen
4. Tester einladen

### App Store Einreichung
1. In [App Store Connect](https://appstoreconnect.apple.com) eine neue App erstellen
2. App-Informationen ausfüllen:
   - **Name**: CaskSense
   - **Beschreibung**: Dein kompletter Whisky-Begleiter — Tastings, Journal, Analyse
   - **Kategorie**: Food & Drink
   - **Screenshots**: Mind. 3 Screenshots für jedes Gerät (iPhone 6.7", iPhone 6.1", iPad)
3. Build von TestFlight auswählen
4. "Zur Prüfung einreichen"

Apple prüft die App normalerweise innerhalb von 1-3 Tagen.

---

## Android – Google Play Store

### In Android Studio öffnen
```bash
npx cap open android
```

### Signierter Release Build
1. In Android Studio: Build > Generate Signed Bundle / APK
2. "Android App Bundle" wählen (empfohlen für Play Store)
3. Keystore erstellen (beim ersten Mal) – **sicher aufbewahren!**
4. Release Build erstellen

### Play Store Einreichung
1. In der [Google Play Console](https://play.google.com/console) eine neue App erstellen
2. Store-Eintrag ausfüllen:
   - **Name**: CaskSense
   - **Kurzbeschreibung**: Whisky-Tasting, Journal & Analyse
   - **Kategorie**: Essen & Trinken
   - **Screenshots**: Mind. 2 Screenshots
3. App Bundle (`.aab`) hochladen unter "Releases" > "Production"
4. Zur Prüfung einreichen

Google prüft normalerweise innerhalb von 1-7 Tagen.

---

## App-Icons

Alle benötigten Icon-Größen sind bereits generiert in `client/public/icons/`:

| Größe | Verwendung |
|-------|-----------|
| 20x20 – 180x180 | iOS App Icons |
| 48x48 – 512x512 | Android App Icons |
| 1024x1024 | App Store Connect Upload |

---

## Konfiguration

Die Capacitor-Konfiguration befindet sich in `capacitor.config.ts`:

- **App ID**: `com.casksense.app`
- **App Name**: CaskSense
- **Farben**: Dark Theme (#0f1419 Hintergrund, #c8a864 Akzent)
- **Splash Screen**: 2 Sekunden, dunkler Hintergrund
- **Status Bar**: Dunkler Stil

---

## Server-URL anpassen

Aktuell verbindet sich die App mit deiner Replit-URL. Für die App Store-Version musst du in `capacitor.config.ts` die Server-URL setzen:

```typescript
server: {
  url: 'https://casksense.com',  // Deine produktive URL
  cleartext: false,
},
```

---

## Wichtige Hinweise

- **Apple Review**: Apple lehnt manchmal reine Web-Wrapper ab. CaskSense hat genug native Features (Kamera, Offline-Support), um die Richtlinien zu erfüllen.
- **Updates**: Bei Web-Änderungen musst du nur `npm run build && npx cap sync` ausführen und eine neue Version einreichen. Bei nativen Plugin-Änderungen muss auch Xcode/Android Studio genutzt werden.
- **Push Notifications**: Können später mit `@capacitor/push-notifications` hinzugefügt werden.
- **Keystore**: Den Android-Keystore sicher aufbewahren – ohne ihn kannst du keine Updates hochladen!
