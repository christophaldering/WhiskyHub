export type V2Lang = "de" | "en";

export interface Translations {
  appName: string;
  tabTastings: string;
  tabEntdecken: string;
  tabMeineWelt: string;
  tabCircle: string;
  hubGreeting: string;
  hubSub: string;
  hubJoin: string;
  hubJoinDesc: string;
  hubSolo: string;
  hubSoloDesc: string;
  hubHost: string;
  hubHostDesc: string;
  hubRecent: string;
  joinTitle: string;
  joinCodeLabel: string;
  joinCodePH: string;
  joinCTA: string;
  joinNoAcc: string;
  joinNameQ: string;
  joinNameSub: string;
  joinNamePH: string;
  joinEnter: string;
  joinWaiting: string;
  joinPour: string;
  joinNotFound: string;
  joinAlready: string;
  joinServerErr: string;
  joinFailed: string;
  back: string;
  darkMode: string;
  lightMode: string;
  participantsLabel: string;
  hostLabel: string;
  youLabel: string;
  readyLabel: string;
  waitingLabel: string;
  ratingModeQ: string;
  ratingModeSub: string;
  ratingGuided: string;
  ratingGuidedD: string;
  ratingGuidedH: string;
  ratingCompact: string;
  ratingCompactD: string;
  ratingCompactH: string;
  ratingNose: string;
  ratingPalate: string;
  ratingFinish: string;
  ratingOverall: string;
  ratingQ_nose: string;
  ratingQ_palate: string;
  ratingQ_finish: string;
  ratingQ_overall: string;
  ratingHint_nose: string;
  ratingHint_palate: string;
  ratingHint_finish: string;
  ratingHint_overall: string;
  ratingAromen: string;
  ratingAromenS: string;
  ratingNote: string;
  ratingNoteSub: string;
  ratingNotePH: string;
  ratingTapEdit: string;
  ratingSave: string;
  ratingDone: string;
  ratingNext: string;
  ratingEdit: string;
  ratingFinish2: string;
  ratingOf: string;
  ratingDram: string;
  ratingMyRating: string;
  ratingBlind: string;
  ratingProfile: string;
  ratingError: string;
  band90: string;
  band85: string;
  band80: string;
  band75: string;
  band70: string;
  band0: string;
  soloTitle: string;
  soloCaptureSub: string;
  soloPhoto: string;
  soloPhotoDesc: string;
  soloManual: string;
  soloManualDesc: string;
  soloBarcode: string;
  soloBarcodeDesc: string;
  soloSkip: string;
  soloName: string;
  soloNamePH: string;
  soloRegion: string;
  soloRegionPH: string;
  soloCask: string;
  soloCaskPH: string;
  soloAge: string;
  soloAgePH: string;
  soloAbv: string;
  soloAbvPH: string;
  soloDistillery: string;
  soloDistilleryPH: string;
  soloToRating: string;
  soloIdentifying: string;
  soloIdentifyFail: string;
  soloIdentifyRetry: string;
  soloSaved: string;
  soloAnother: string;
  soloToHub: string;
  soloJournalTitle: string;
  soloJournalEmpty: string;
  soloQuickRate: string;
  soloFullEdit: string;
  soloVoiceMemo: string;
  soloRecording: string;
  soloUploading: string;
  soloDeleteMemo: string;
  soloDeleteConfirm: string;
  soloCancel: string;
  soloRecognized: string;
  soloBarcodeInput: string;
  soloBarcodeInputPH: string;
  soloBarcodeSubmit: string;
  soloSaveRetry: string;
  soloParticipantError: string;
  hostTitle: string;
  hostName: string;
  hostDate: string;
  hostTime: string;
  hostLoc: string;
  hostFormat: string;
  hostBlind: string;
  hostOpen: string;
  hostNext: string;
  hostBack: string;
  hostWhiskies: string;
  hostAddW: string;
  hostInvite: string;
  hostCode: string;
  hostLive: string;
  hostStart: string;
  entTitle: string;
  entSub: string;
  mwTitle: string;
  mwSub: string;
  circleTitle: string;
  circleSub: string;
  comingSoon: string;
  newExperience: string;
}

const de: Translations = {
  appName: "CaskSense",
  tabTastings: "Tastings",
  tabEntdecken: "Entdecken",
  tabMeineWelt: "Meine Welt",
  tabCircle: "Circle",
  hubGreeting: "Guten Abend",
  hubSub: "Was möchtest du heute tun?",
  hubJoin: "Tasting beitreten",
  hubJoinDesc: "Code eingeben und mitmachen",
  hubSolo: "Dram erfassen",
  hubSoloDesc: "Einen Whisky allein verkosten",
  hubHost: "Tasting leiten",
  hubHostDesc: "Ein Event erstellen und leiten",
  hubRecent: "ZULETZT BEWERTET",
  joinTitle: "Tasting beitreten",
  joinCodeLabel: "Dein Tasting-Code",
  joinCodePH: "CODE",
  joinCTA: "Beitreten →",
  joinNoAcc: "Kein Account nötig",
  joinNameQ: "Wie sollen wir dich nennen?",
  joinNameSub: "Nur dein Name — das war's.",
  joinNamePH: "Name eingeben",
  joinEnter: "Eintreten →",
  joinWaiting: "Warte auf den Host…",
  joinPour: "Giess dir schon mal ein.",
  joinNotFound: "Code nicht gefunden",
  joinAlready: "Du bist bereits beigetreten",
  joinServerErr: "Serverfehler — bitte erneut versuchen",
  joinFailed: "Beitritt fehlgeschlagen. Bitte erneut versuchen.",
  back: "Zurück",
  darkMode: "Dunkel",
  lightMode: "Hell",
  participantsLabel: "Im Raum",
  hostLabel: "Host",
  youLabel: "Du",
  readyLabel: "Bereit",
  waitingLabel: "Wartet",
  ratingModeQ: "Wie m\u00f6chtest du bewerten?",
  ratingModeSub: "Beide Modi erfassen Nase \u00b7 Gaumen \u00b7 Abgang \u00b7 Gesamt.",
  ratingGuided: "Gef\u00fchrt",
  ratingGuidedD: "Eine Dimension nach der anderen \u2014 mit Fragen und Aroma-Vorschl\u00e4gen.",
  ratingGuidedH: "Wenn man sich Zeit nimmt.",
  ratingCompact: "Kompakt",
  ratingCompactD: "Alle vier Dimensionen auf einmal \u2014 Score direkt eingeben.",
  ratingCompactH: "Wenn man sein Bewertungsschema kennt.",
  ratingNose: "Nase",
  ratingPalate: "Gaumen",
  ratingFinish: "Abgang",
  ratingOverall: "Gesamt",
  ratingQ_nose: "Was nimmst du zuerst wahr?",
  ratingQ_palate: "Was sp\u00fcrst du beim ersten Schluck?",
  ratingQ_finish: "Was bleibt zur\u00fcck?",
  ratingQ_overall: "Dein Gesamteindruck.",
  ratingHint_nose: "Lass das Glas kurz atmen.",
  ratingHint_palate: "Lass ihn auf der Zunge verweilen.",
  ratingHint_finish: "Warte einen Moment.",
  ratingHint_overall: "Vertrau deiner Intuition.",
  ratingAromen: "Aromen w\u00e4hlen",
  ratingAromenS: "Tippe an was du erkennst \u2014 oder lass es weg.",
  ratingNote: "Notiz",
  ratingNoteSub: "Optional \u2014 deine eigenen Worte.",
  ratingNotePH: "Was f\u00e4llt dir auf...",
  ratingTapEdit: "Tippe auf die Zahl zum direkten Eingeben",
  ratingSave: "speichern",
  ratingDone: "Gespeichert",
  ratingNext: "Weiter zu Dram",
  ratingEdit: "Bewertung anpassen",
  ratingFinish2: "Bewertung abschlie\u00dfen \u2192",
  ratingOf: "von",
  ratingDram: "Dram",
  ratingMyRating: "Deine Bewertung",
  ratingBlind: "Blind \u00b7 Allgemeine Vorschl\u00e4ge",
  ratingProfile: "Aromen typisch f\u00fcr",
  ratingError: "Bewertung konnte nicht gespeichert werden.",
  band90: "Au\u00dfergew\u00f6hnlich",
  band85: "Exzellent",
  band80: "Hervorragend",
  band75: "Sehr gut",
  band70: "Gut",
  band0: "Okay",
  soloTitle: "Dram erfassen",
  soloCaptureSub: "Wie m\u00f6chtest du den Whisky erfassen?",
  soloPhoto: "Foto aufnehmen",
  soloPhotoDesc: "Flasche fotografieren und per KI erkennen",
  soloManual: "Manuell eingeben",
  soloManualDesc: "Name, Destillerie und Details selbst eintragen",
  soloBarcode: "Barcode scannen",
  soloBarcodeDesc: "EAN- oder QR-Code einlesen",
  soloSkip: "Ohne Angaben bewerten",
  soloName: "Name",
  soloNamePH: "z.B. Lagavulin 16",
  soloRegion: "Region",
  soloRegionPH: "z.B. Islay",
  soloCask: "Fasstyp",
  soloCaskPH: "z.B. Sherry",
  soloAge: "Alter",
  soloAgePH: "Jahre",
  soloAbv: "ABV",
  soloAbvPH: "%",
  soloDistillery: "Destillerie",
  soloDistilleryPH: "z.B. Lagavulin",
  soloToRating: "Weiter zur Bewertung",
  soloIdentifying: "Whisky wird erkannt\u2026",
  soloIdentifyFail: "Erkennung fehlgeschlagen",
  soloIdentifyRetry: "Erneut versuchen",
  soloSaved: "Im Journal gespeichert",
  soloAnother: "Noch einen Dram erfassen",
  soloToHub: "Zur\u00fcck zur \u00dcbersicht",
  soloJournalTitle: "Journal",
  soloJournalEmpty: "Noch keine Eintr\u00e4ge",
  soloQuickRate: "Schnellbewertung",
  soloFullEdit: "Detailliert bearbeiten",
  soloVoiceMemo: "Sprachnotiz",
  soloRecording: "Aufnahme l\u00e4uft\u2026",
  soloUploading: "Wird hochgeladen\u2026",
  soloDeleteMemo: "Sprachnotiz l\u00f6schen",
  soloDeleteConfirm: "Wirklich l\u00f6schen?",
  soloCancel: "Abbrechen",
  soloRecognized: "Per Foto erkannt",
  soloBarcodeInput: "Barcode eingeben",
  soloBarcodeInputPH: "EAN / UPC Nummer",
  soloBarcodeSubmit: "Weiter",
  soloSaveRetry: "Erneut speichern",
  soloParticipantError: "Sitzung konnte nicht erstellt werden. Bitte erneut versuchen.",
  hostTitle: "",
  hostName: "",
  hostDate: "",
  hostTime: "",
  hostLoc: "",
  hostFormat: "",
  hostBlind: "",
  hostOpen: "",
  hostNext: "",
  hostBack: "",
  hostWhiskies: "",
  hostAddW: "",
  hostInvite: "",
  hostCode: "",
  hostLive: "",
  hostStart: "",
  entTitle: "Entdecken",
  entSub: "Whisky-Welt erkunden",
  mwTitle: "Meine Welt",
  mwSub: "Deine pers\u00f6nliche Whisky-Reise",
  circleTitle: "Circle",
  circleSub: "Deine Community",
  comingSoon: "Kommt bald",
  newExperience: "\u2726 Neue Erfahrung",
};

const en: Translations = {
  appName: "CaskSense",
  tabTastings: "Tastings",
  tabEntdecken: "Discover",
  tabMeineWelt: "My World",
  tabCircle: "Circle",
  hubGreeting: "Good evening",
  hubSub: "What would you like to do?",
  hubJoin: "Join Tasting",
  hubJoinDesc: "Enter a code and join",
  hubSolo: "Solo Dram",
  hubSoloDesc: "Taste a whisky on your own",
  hubHost: "Host Tasting",
  hubHostDesc: "Create and lead an event",
  hubRecent: "RECENTLY RATED",
  joinTitle: "Join Tasting",
  joinCodeLabel: "Your tasting code",
  joinCodePH: "CODE",
  joinCTA: "Join \u2192",
  joinNoAcc: "No account needed",
  joinNameQ: "What should we call you?",
  joinNameSub: "Just your name \u2014 that's it.",
  joinNamePH: "Enter name",
  joinEnter: "Enter \u2192",
  joinWaiting: "Waiting for the host\u2026",
  joinPour: "Go ahead and pour yourself one.",
  joinNotFound: "Code not found",
  joinAlready: "You have already joined",
  joinServerErr: "Server error \u2014 please try again",
  joinFailed: "Join failed. Please try again.",
  back: "Back",
  darkMode: "Dark",
  lightMode: "Light",
  participantsLabel: "In the room",
  hostLabel: "Host",
  youLabel: "You",
  readyLabel: "Ready",
  waitingLabel: "Waiting",
  ratingModeQ: "How would you like to rate?",
  ratingModeSub: "Both modes capture Nose \u00b7 Palate \u00b7 Finish \u00b7 Overall.",
  ratingGuided: "Guided",
  ratingGuidedD: "One dimension at a time \u2014 with questions and aroma suggestions.",
  ratingGuidedH: "When you want to take your time.",
  ratingCompact: "Compact",
  ratingCompactD: "All four dimensions at once \u2014 type scores directly.",
  ratingCompactH: "When you know your rating scheme.",
  ratingNose: "Nose",
  ratingPalate: "Palate",
  ratingFinish: "Finish",
  ratingOverall: "Overall",
  ratingQ_nose: "What do you notice first?",
  ratingQ_palate: "What do you taste on the first sip?",
  ratingQ_finish: "What lingers?",
  ratingQ_overall: "Your overall impression.",
  ratingHint_nose: "Let the glass breathe a moment.",
  ratingHint_palate: "Let it rest on your tongue.",
  ratingHint_finish: "Wait a moment.",
  ratingHint_overall: "Trust your instinct.",
  ratingAromen: "Choose aromas",
  ratingAromenS: "Tap what you recognise \u2014 or skip.",
  ratingNote: "Note",
  ratingNoteSub: "Optional \u2014 your own words.",
  ratingNotePH: "What stands out...",
  ratingTapEdit: "Tap the number to type directly",
  ratingSave: "save",
  ratingDone: "Saved",
  ratingNext: "Continue to Dram",
  ratingEdit: "Adjust rating",
  ratingFinish2: "Complete rating \u2192",
  ratingOf: "of",
  ratingDram: "Dram",
  ratingMyRating: "Your rating",
  ratingBlind: "Blind \u00b7 General suggestions",
  ratingProfile: "Aromas typical for",
  ratingError: "Rating could not be saved.",
  band90: "Extraordinary",
  band85: "Excellent",
  band80: "Outstanding",
  band75: "Very good",
  band70: "Good",
  band0: "Okay",
  soloTitle: "Log a Dram",
  soloCaptureSub: "How would you like to capture the whisky?",
  soloPhoto: "Take a Photo",
  soloPhotoDesc: "Photograph the bottle and identify via AI",
  soloManual: "Manual Entry",
  soloManualDesc: "Enter name, distillery, and details yourself",
  soloBarcode: "Scan Barcode",
  soloBarcodeDesc: "Read an EAN or QR code",
  soloSkip: "Rate without details",
  soloName: "Name",
  soloNamePH: "e.g. Lagavulin 16",
  soloRegion: "Region",
  soloRegionPH: "e.g. Islay",
  soloCask: "Cask Type",
  soloCaskPH: "e.g. Sherry",
  soloAge: "Age",
  soloAgePH: "Years",
  soloAbv: "ABV",
  soloAbvPH: "%",
  soloDistillery: "Distillery",
  soloDistilleryPH: "e.g. Lagavulin",
  soloToRating: "Continue to Rating",
  soloIdentifying: "Identifying whisky...",
  soloIdentifyFail: "Identification failed",
  soloIdentifyRetry: "Try again",
  soloSaved: "Saved to journal",
  soloAnother: "Log another dram",
  soloToHub: "Back to overview",
  soloJournalTitle: "Journal",
  soloJournalEmpty: "No entries yet",
  soloQuickRate: "Quick rate",
  soloFullEdit: "Detailed edit",
  soloVoiceMemo: "Voice Memo",
  soloRecording: "Recording...",
  soloUploading: "Uploading...",
  soloDeleteMemo: "Delete voice memo",
  soloDeleteConfirm: "Really delete?",
  soloCancel: "Cancel",
  soloRecognized: "Identified from photo",
  soloBarcodeInput: "Enter barcode",
  soloBarcodeInputPH: "EAN / UPC number",
  soloBarcodeSubmit: "Continue",
  soloSaveRetry: "Retry save",
  soloParticipantError: "Could not create session. Please try again.",
  hostTitle: "",
  hostName: "",
  hostDate: "",
  hostTime: "",
  hostLoc: "",
  hostFormat: "",
  hostBlind: "",
  hostOpen: "",
  hostNext: "",
  hostBack: "",
  hostWhiskies: "",
  hostAddW: "",
  hostInvite: "",
  hostCode: "",
  hostLive: "",
  hostStart: "",
  entTitle: "Discover",
  entSub: "Explore the whisky world",
  mwTitle: "My World",
  mwSub: "Your personal whisky journey",
  circleTitle: "Circle",
  circleSub: "Your community",
  comingSoon: "Coming soon",
  newExperience: "\u2726 New Experience",
};

export const I18N: Record<V2Lang, Translations> = { de, en };

export function getT(lang: V2Lang): Translations {
  return I18N[lang];
}
