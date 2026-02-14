import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      app: {
        name: "CaskSense",
        tagline: "The Art of Whisky Analysis",
        copyright: "© 2026 CaskSense. All rights reserved."
      },
      nav: {
        lobby: "Lobby",
        tastingRoom: "Tasting Room",
        insight: "Insight Mode",
        host: "Host Controls",
        leave: "Leave Session"
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
      }
    }
  },
  de: {
    translation: {
      app: {
        name: "CaskSense",
        tagline: "Die Kunst der Whisky-Analyse",
        copyright: "© 2026 CaskSense. Alle Rechte vorbehalten."
      },
      nav: {
        lobby: "Lobby",
        tastingRoom: "Verkostungsraum",
        insight: "Einsichtsmodus",
        host: "Gastgeber-Steuerung",
        leave: "Sitzung verlassen"
      },
      session: {
        status: {
          draft: "Entwurf",
          open: "Offen zur Bewertung",
          closed: "Bewertung geschlossen",
          reveal: "Enthüllungsphase",
          archived: "Archiviert"
        },
        actions: {
          start: "Sitzung öffnen",
          close: "Bewertung schließen",
          reveal: "Enthüllung starten",
          nextAct: "Nächster Akt",
          archive: "Sitzung archivieren"
        }
      },
      evaluation: {
        nose: "Nase",
        taste: "Geschmack",
        finish: "Abgang",
        balance: "Balance",
        overall: "Gesamtwertung",
        notes: "Persönliche Notizen",
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
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
