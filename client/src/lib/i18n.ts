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
        replacePhoto: "Replace Photo",
        photoHint: "JPG, PNG, WebP or GIF, max 2 MB",
        photoTooLarge: "Image must be under 2 MB",
        photoInvalidType: "Only JPG, PNG, WebP, and GIF images are allowed",
        photoFormats: "JPG, PNG, WebP or GIF, max 2 MB",
        uploadError: "Upload failed. Please try again.",
        deletePhotoConfirm: "Remove this photo?",
        addExpression: "Add Expression",
        editExpression: "Edit Expression",
        addToFlight: "Add to Flight",
        saveChanges: "Save Changes",
        saving: "Saving...",
        noExpressions: "No expressions yet.",
        ppm: "PPM (Phenol)",
        ppmHint: "Phenol parts per million",
        whiskybaseId: "Whiskybase ID",
        whiskybaseHint: "Whiskybase catalog number",
        searchWhiskybase: "Search Whiskybase",
        findWhiskybase: "Find on Whiskybase",
        viewWhiskybase: "View on Whiskybase",
        deleteExpression: "Delete Expression",
        deleteConfirm: "Are you sure you want to remove this whisky from the flight? This will also delete all ratings for it.",
        deleteConfirmTitle: "Delete Expression",
        deleting: "Deleting...",
        deleted: "Expression removed",
        moveUp: "Move Up",
        moveDown: "Move Down",
        reorderHint: "Drag or use arrows to reorder"
      },
      wotd: {
        title: "Whisky of the Day",
        noWhiskies: "No whiskies have been added yet.",
        avgRating: "Average Rating",
        ratings: "{{count}} ratings",
        noRatings: "Not yet rated",
        nose: "Nose",
        taste: "Taste",
        finish: "Finish",
        balance: "Balance"
      },
      import: {
        title: "Import Flight",
        subtitle: "Import multiple expressions from a spreadsheet. Optionally attach bottle photos by selecting image files.",
        spreadsheet: "Spreadsheet File",
        dropSpreadsheet: "Click to select a spreadsheet",
        formats: "Supported: Excel (.xlsx), CSV (.csv), Text (.txt)",
        bottlePhotos: "Bottle Photos (optional)",
        dropImages: "Click to select image files",
        imagesHint: "Select multiple JPG, PNG, WebP or GIF files. Filenames are matched to the image_filename column in your spreadsheet, or auto-matched by whisky name.",
        imagesSelected: "{{count}} image(s) selected",
        templateHint: "Expected Columns",
        columns: "name (required), distillery, age, abv, type, category, region, cask, peat, notes, order, image_filename / image_url",
        exampleHeader: "Example Header Row",
        exampleRow: "Example Data Row",
        fieldExplanations: "Column Reference",
        col: {
          name: "Expression name (required)",
          distillery: 'Distillery, e.g. "Ardbeg"',
          age: '"12" or "NAS" for no age statement',
          abv: "Alcohol by volume, e.g. 54.2",
          type: 'e.g. "Single Malt", "Bourbon"',
          category: 'e.g. "Whisky", "Bourbon"',
          region: 'e.g. "Islay", "Speyside"',
          cask: 'Cask influence, e.g. "Sherry"',
          peat: "None / Light / Medium / Heavy",
          notes: "Free-text tasting notes",
          order: "Position in flight (1, 2, 3...)",
          ppm: "Phenol level in ppm, e.g. 55",
          whiskybase_id: "Whiskybase catalog number, e.g. 12345",
          image_filename: "Image filename, e.g. uigeadail.jpg",
          image_url: "URL to bottle image"
        },
        parsePreview: "Parse & Preview",
        parsing: "Parsing...",
        previewCount: "{{total}} rows found, {{valid}} valid",
        back: "Back",
        confirmImport: "Import {{count}} expressions",
        importing: "Importing expressions...",
        complete: "Import Complete",
        summary: "{{success}} expressions imported successfully. {{errors}} errors.",
        errorDetails: "Errors",
        successDetails: "Imported",
        imageMissing: "No image",
        imageMatched: "Matched",
        imageAutoMatched: "Auto-matched",
        imageUrl: "URL",
        imageManualPick: "Pick image...",
        imageNone: "None",
        close: "Close",
        mappingPreview: "Image Mapping",
        mappingHint: "Review which image will be attached to each expression. You can change the selection manually."
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
        replacePhoto: "Foto ersetzen",
        photoHint: "JPG, PNG, WebP oder GIF, max 2 MB",
        photoTooLarge: "Bild muss kleiner als 2 MB sein",
        photoInvalidType: "Nur JPG, PNG, WebP und GIF Bilder erlaubt",
        photoFormats: "JPG, PNG, WebP oder GIF, max 2 MB",
        uploadError: "Upload fehlgeschlagen. Bitte erneut versuchen.",
        deletePhotoConfirm: "Dieses Foto entfernen?",
        addExpression: "Expression hinzuf\u00fcgen",
        editExpression: "Expression bearbeiten",
        addToFlight: "Zum Flight hinzuf\u00fcgen",
        saveChanges: "Speichern",
        saving: "Wird gespeichert...",
        noExpressions: "Noch keine Expressions.",
        ppm: "PPM (Phenol)",
        ppmHint: "Phenol-Teile pro Million",
        whiskybaseId: "Whiskybase-Nr.",
        whiskybaseHint: "Whiskybase-Katalognummer",
        searchWhiskybase: "Whiskybase suchen",
        findWhiskybase: "Auf Whiskybase suchen",
        viewWhiskybase: "Auf Whiskybase ansehen",
        deleteExpression: "Expression löschen",
        deleteConfirm: "Möchten Sie diesen Whisky wirklich aus dem Flight entfernen? Alle zugehörigen Bewertungen werden ebenfalls gelöscht.",
        deleteConfirmTitle: "Expression löschen",
        deleting: "Wird gelöscht...",
        deleted: "Expression entfernt",
        moveUp: "Nach oben",
        moveDown: "Nach unten",
        reorderHint: "Pfeile nutzen zum Umsortieren"
      },
      wotd: {
        title: "Whisky des Tages",
        noWhiskies: "Es wurden noch keine Whiskies hinzugef\u00fcgt.",
        avgRating: "Durchschnittsbewertung",
        ratings: "{{count}} Bewertungen",
        noRatings: "Noch nicht bewertet",
        nose: "Nase",
        taste: "Geschmack",
        finish: "Abgang",
        balance: "Balance"
      },
      import: {
        title: "Flight importieren",
        subtitle: "Importieren Sie mehrere Expressions aus einer Tabelle. Optional mit Flaschenfotos durch Auswahl von Bilddateien.",
        spreadsheet: "Tabellendatei",
        dropSpreadsheet: "Klicken, um eine Tabelle auszuw\u00e4hlen",
        formats: "Unterst\u00fctzt: Excel (.xlsx), CSV (.csv), Text (.txt)",
        bottlePhotos: "Flaschenfotos (optional)",
        dropImages: "Klicken, um Bilddateien auszuw\u00e4hlen",
        imagesHint: "W\u00e4hlen Sie mehrere JPG, PNG, WebP oder GIF Dateien. Dateinamen werden mit der Spalte image_filename abgeglichen, oder automatisch anhand des Whisky-Namens zugeordnet.",
        imagesSelected: "{{count}} Bild(er) ausgew\u00e4hlt",
        templateHint: "Erwartete Spalten",
        columns: "name (erforderlich), distillery, age, abv, type, category, region, cask, peat, notes, order, image_filename / image_url",
        exampleHeader: "Beispiel-Kopfzeile",
        exampleRow: "Beispiel-Datenzeile",
        fieldExplanations: "Spalten\u00fcbersicht",
        col: {
          name: "Name der Expression (Pflichtfeld)",
          distillery: 'Brennerei, z.\u00a0B. \u201eArdbeg\u201c',
          age: '\u201e12\u201c oder \u201eNAS\u201c (ohne Altersangabe)',
          abv: "Alkoholgehalt in %, z.\u00a0B. 54,2",
          type: 'z.\u00a0B. \u201eSingle Malt\u201c, \u201eBourbon\u201c',
          category: 'z.\u00a0B. \u201eWhisky\u201c, \u201eBourbon\u201c',
          region: 'z.\u00a0B. \u201eIslay\u201c, \u201eSpeyside\u201c',
          cask: 'Fasseinfluss, z.\u00a0B. \u201eSherry\u201c',
          peat: "None / Light / Medium / Heavy",
          notes: "Freitext-Verkostungsnotizen",
          order: "Position im Flight (1, 2, 3\u2026)",
          ppm: "Phenolgehalt in ppm, z.\u00a0B. 55",
          whiskybase_id: "Whiskybase-Katalognummer, z.\u00a0B. 12345",
          image_filename: "Bild-Dateiname, z.\u00a0B. uigeadail.jpg",
          image_url: "URL zum Flaschenbild"
        },
        parsePreview: "Analysieren & Vorschau",
        parsing: "Wird analysiert...",
        previewCount: "{{total}} Zeilen gefunden, {{valid}} g\u00fcltig",
        back: "Zur\u00fcck",
        confirmImport: "{{count}} Expressions importieren",
        importing: "Expressions werden importiert...",
        complete: "Import abgeschlossen",
        summary: "{{success}} Expressions erfolgreich importiert. {{errors}} Fehler.",
        errorDetails: "Fehler",
        successDetails: "Importiert",
        imageMissing: "Kein Bild",
        imageMatched: "Zugeordnet",
        imageAutoMatched: "Automatisch",
        imageUrl: "URL",
        imageManualPick: "Bild w\u00e4hlen...",
        imageNone: "Keins",
        close: "Schließen",
        mappingPreview: "Bildzuordnung",
        mappingHint: "\u00dcberpr\u00fcfen Sie, welches Bild jeder Expression zugeordnet wird. Sie k\u00f6nnen die Zuordnung manuell \u00e4ndern."
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
