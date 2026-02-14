import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        name: "CaskSense",
        tagline: "The Art of Whisky Analysis",
        copyright: "\u00a9 2026 CaskSense. All rights reserved."
      },
      nav: {
        lobby: "Lobby",
        tastingRoom: "Tasting Room",
        insight: "Insight Mode",
        host: "Host Controls",
        leave: "Leave Session",
        aboutMethod: "About the Method"
      },
      session: {
        status: {
          draft: "Draft",
          open: "Open for Evaluation",
          closed: "Evaluation Closed",
          reveal: "Reveal Phase",
          archived: "Archived"
        },
        actions: {
          start: "Open Session",
          close: "Close Evaluation",
          reveal: "Begin Reveal",
          nextAct: "Next Act",
          archive: "Archive Session"
        }
      },
      evaluation: {
        nose: "Nose",
        taste: "Taste",
        finish: "Finish",
        balance: "Balance",
        overall: "Overall Score",
        notes: "Personal Notes",
        save: "Save Evaluation",
        saved: "Saved",
        locked: "Evaluation Locked"
      },
      taxonomy: {
        category: "Category",
        region: "Region",
        abv: "ABV",
        age: "Age",
        cask: "Cask Influence",
        peat: "Peat Level"
      },
      reveal: {
        act1: "Act I: Completion",
        act2: "Act II: Perception",
        act3: "Act III: Insight",
        act4: "Act IV: Placement",
        divergence: "Linguistic Divergence",
        consensus: "Group Consensus"
      },
      welcome: {
        subtitle: "Welcome to",
        step1Title: "The Tasting Circle",
        step1Body: "CaskSense brings structure and calm to your whisky tasting sessions. Your host creates a flight, and you evaluate each expression with precision.",
        step2Title: "Ritual Mode",
        step2Body: "Rate each whisky across five dimensions \u2014 nose, taste, finish, balance, and overall. Use the decimal sliders for nuance. Your notes are yours alone until the reveal.",
        step3Title: "The Reveal",
        step3Body: "When evaluation closes, the host guides a four-act reveal: participation overview, group consensus, whisky identity, and the final ranking. Analytics replace intuition.",
        back: "Back",
        continue: "Continue",
        enter: "Enter the Circle"
      },
      whisky: {
        bottlePhoto: "Bottle Photo",
        uploadPhoto: "Upload Photo",
        changePhoto: "Change Photo",
        removePhoto: "Remove",
        photoHint: "JPG, PNG or WebP, max 2 MB",
        photoTooLarge: "Image must be under 2 MB",
        photoInvalidType: "Only JPG, PNG, and WebP images are allowed",
        addExpression: "Add Expression",
        addToFlight: "Add to Flight",
        noExpressions: "No expressions yet."
      }
    }
  },
  de: {
    translation: {
      app: {
        name: "CaskSense",
        tagline: "Die Kunst der Whisky-Analyse",
        copyright: "\u00a9 2026 CaskSense. Alle Rechte vorbehalten."
      },
      nav: {
        lobby: "Lobby",
        tastingRoom: "Verkostungsraum",
        insight: "Einsichtsmodus",
        host: "Gastgeber-Steuerung",
        leave: "Sitzung verlassen",
        aboutMethod: "\u00dcber die Methode"
      },
      session: {
        status: {
          draft: "Entwurf",
          open: "Offen zur Bewertung",
          closed: "Bewertung geschlossen",
          reveal: "Enth\u00fcllungsphase",
          archived: "Archiviert"
        },
        actions: {
          start: "Sitzung \u00f6ffnen",
          close: "Bewertung schlie\u00dfen",
          reveal: "Enth\u00fcllung starten",
          nextAct: "N\u00e4chster Akt",
          archive: "Sitzung archivieren"
        }
      },
      evaluation: {
        nose: "Nase",
        taste: "Geschmack",
        finish: "Abgang",
        balance: "Balance",
        overall: "Gesamtwertung",
        notes: "Pers\u00f6nliche Notizen",
        save: "Bewertung speichern",
        saved: "Gespeichert",
        locked: "Bewertung gesperrt"
      },
      taxonomy: {
        category: "Kategorie",
        region: "Region",
        abv: "Alkoholgehalt",
        age: "Alter",
        cask: "Fasseinfluss",
        peat: "Torfgehalt"
      },
      reveal: {
        act1: "Akt I: Vollendung",
        act2: "Akt II: Wahrnehmung",
        act3: "Akt III: Einsicht",
        act4: "Akt IV: Platzierung",
        divergence: "Sprachliche Divergenz",
        consensus: "Gruppenkonsens"
      },
      welcome: {
        subtitle: "Willkommen bei",
        step1Title: "Der Verkostungskreis",
        step1Body: "CaskSense bringt Struktur und Ruhe in Ihre Whisky-Verkostungen. Der Gastgeber erstellt einen Flight, und Sie bewerten jede Expression mit Pr\u00e4zision.",
        step2Title: "Ritual-Modus",
        step2Body: "Bewerten Sie jeden Whisky in f\u00fcnf Dimensionen \u2014 Nase, Geschmack, Abgang, Balance und Gesamt. Nutzen Sie die Dezimal-Regler f\u00fcr Nuancen. Ihre Notizen bleiben bis zur Enth\u00fcllung privat.",
        step3Title: "Die Enth\u00fcllung",
        step3Body: "Nach der Bewertung f\u00fchrt der Gastgeber durch vier Akte: Teilnahme\u00fcbersicht, Gruppenkonsens, Whisky-Identit\u00e4t und das finale Ranking. Analytik ersetzt Intuition.",
        back: "Zur\u00fcck",
        continue: "Weiter",
        enter: "Den Kreis betreten"
      },
      whisky: {
        bottlePhoto: "Flaschenfoto",
        uploadPhoto: "Foto hochladen",
        changePhoto: "\u00c4ndern",
        removePhoto: "Entfernen",
        photoHint: "JPG, PNG oder WebP, max 2 MB",
        photoTooLarge: "Bild muss kleiner als 2 MB sein",
        photoInvalidType: "Nur JPG, PNG und WebP Bilder erlaubt",
        addExpression: "Expression hinzuf\u00fcgen",
        addToFlight: "Zum Flight hinzuf\u00fcgen",
        noExpressions: "Noch keine Expressions."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
