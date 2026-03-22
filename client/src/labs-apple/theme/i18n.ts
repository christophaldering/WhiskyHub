// CaskSense Apple — i18n (DE + EN, alle Phasen 1–8)

export interface Translations {
  // App
  appName: string
  // Navigation
  tabTastings: string; tabEntdecken: string; tabMeineWelt: string; tabCircle: string
  // Hub
  hubGreeting: string; hubSub: string
  hubJoin: string; hubJoinDesc: string; hubDashboard: string; hubDashboardDesc: string
  hubSolo: string; hubSoloDesc: string
  hubHost: string; hubHostDesc: string
  hubRecent: string
  // Join
  joinTitle: string; joinCodeLabel: string; joinCodePH: string; joinCTA: string; joinNoAcc: string
  joinNameQ: string; joinNameSub: string; joinNamePH: string; joinEnter: string
  joinWaiting: string; joinPour: string
  // Misc
  back: string; darkMode: string; lightMode: string
  participantsLabel: string; hostLabel: string; youLabel: string; readyLabel: string; waitingLabel: string
  // Rating Phase 2
  ratingModeQ: string; ratingModeSub: string
  ratingGuided: string; ratingGuidedD: string; ratingGuidedH: string
  ratingCompact: string; ratingCompactD: string; ratingCompactH: string
  ratingNose: string; ratingPalate: string; ratingFinish: string; ratingOverall: string
  ratingQ_nose: string; ratingQ_palate: string; ratingQ_finish: string; ratingQ_overall: string
  ratingHint_nose: string; ratingHint_palate: string; ratingHint_finish: string; ratingHint_overall: string
  ratingAromen: string; ratingAromenS: string
  ratingNote: string; ratingNoteSub: string; ratingNotePH: string
  ratingTapEdit: string; ratingSave: string; ratingDone: string
  ratingNext: string; ratingEdit: string; ratingFinish2: string
  ratingOf: string; ratingDram: string; ratingMyRating: string
  ratingBlind: string; ratingProfile: string; ratingError: string
  band90: string; band85: string; band80: string; band75: string; band70: string; band0: string
  // Solo Phase 3
  soloTitle: string; soloCaptureSub: string
  soloPhoto: string; soloPhotoDesc: string
  soloManual: string; soloManualDesc: string
  soloBarcode: string; soloBarcodeDesc: string
  soloSkip: string
  soloName: string; soloNamePH: string
  soloRegion: string; soloRegionPH: string
  soloCask: string; soloCaskPH: string
  soloAge: string; soloAgePH: string
  soloAbv: string; soloAbvPH: string
  soloDistillery: string; soloDistilleryPH: string
  soloToRating: string; soloIdentifying: string; soloIdentifyFail: string; soloIdentifyRetry: string
  soloSaved: string; soloAnother: string; soloToHub: string
  soloJournalTitle: string; soloJournalEmpty: string
  soloQuickRate: string; soloFullEdit: string
  // Host Phase 4
  hostTitle: string
  hostStep1: string; hostStep2: string; hostStep3: string; hostStep4: string
  hostName: string; hostNamePH: string
  hostDate: string; hostTime: string; hostLoc: string; hostLocPH: string
  hostFormat: string; hostBlind: string; hostBlindDesc: string; hostOpen: string; hostOpenDesc: string
  hostScale: string; hostScale100: string; hostScale20: string; hostScale10: string
  hostRevealOrder: string; hostRevealClassic: string; hostRevealPhoto: string; hostRevealDetails: string; hostRevealOne: string
  hostNext: string; hostBack: string; hostSaving: string
  hostWhiskies: string; hostWhiskyCount: string; hostAddManual: string
  hostAiImport: string; hostAiImportDesc: string; hostAiImporting: string; hostAiPreview: string; hostAiConfirm: string
  hostWhiskyName: string; hostWhiskyNamePH: string
  hostWhiskyRegion: string; hostWhiskyRegionPH: string
  hostWhiskyCask: string; hostWhiskyCaskPH: string
  hostWhiskyAge: string; hostWhiskyAgePH: string
  hostWhiskyDelete: string
  hostInviteTitle: string; hostInviteDesc: string
  hostCode: string; hostLinkCopy: string; hostLinkCopied: string
  hostQrDownload: string; hostEmailLabel: string; hostEmailPH: string
  hostEmailNote: string; hostEmailNotePH: string
  hostEmailSend: string; hostEmailSent: string; hostEmailError: string
  hostPdfSheets: string; hostPdfDesc: string; hostStart: string
  hostLiveTitle: string; hostParticipants: string
  hostRatedAll: string; hostInProgress: string; hostNotStarted: string
  hostNextDram: string; hostReveal: string; hostClose: string
  hostEndConfirm: string; hostEndYes: string; hostEndNo: string
  hostPaperScan: string; hostCockpit: string
  // Live Phase 5
  liveLobby: string; liveLobbySub: string; liveLobbyPour: string
  liveDram: string; liveOf: string; liveBlindSample: string
  liveNosePhase: string; liveTastePhase: string; liveFinishPhase: string; liveOverallPhase: string
  liveRatingLocked: string; liveWaitingHost: string
  liveRevealTitle: string; liveRevealName: string; liveRevealDetails: string; liveRevealPhoto: string
  liveRevealDone: string; liveRevealFlash: string
  liveTastingDone: string; liveSeeResults: string
  liveAmbient: string; liveAmbientFire: string; liveAmbientRain: string; liveAmbientNight: string; liveAmbientBag: string; liveAmbientOff: string
  liveVoiceMemo: string; liveVoiceRecord: string; liveVoiceStop: string; liveVoicePlaying: string; liveVoiceDelete: string; liveVoiceTranscript: string
  liveProgress: string; liveParticipants: string
  // Results Phase 6
  resultsTitle: string; resultsOverview: string; resultsVsGroup: string; resultsPriceSurp: string; resultsCaskProfile: string
  resultsInsight1: string; resultsInsight2: string; resultsInsight3: string
  resultsYourAvg: string; resultsGroupAvg: string; resultsDifference: string; resultsBiggestOut: string
  resultsCheapest: string; resultsPriceCorr: string; resultsCaskDelta: string; resultsSherryFass: string; resultsBourbon: string
  resultsFavorite: string; resultsGroupWinner: string; resultsMostDebated: string; resultsSurprise: string
  resultsRanking: string; resultsShare: string; resultsPdf: string; resultsCopyLink: string
  recapTitle: string; recapTop: string; recapDivisive: string; recapAvgScore: string; recapParticipants: string; recapExport: string; recapPrint: string
  connoisseurTitle: string; connoisseurGenerate: string; connoisseurRegen: string; connoisseurLoading: string
  connoisseurTabReport: string; connoisseurTabWhisky: string; connoisseurTabAroma: string; connoisseurTabHist: string
  connoisseurShare: string; connoisseurDelete: string
  narrativeTitle: string; narrativeGenerate: string; narrativeLoading: string
  presentTitle: string; presentStart: string; presentNext: string; presentStop: string; presentSlide: string
  // Meine Welt Phase 7
  mwTitle: string; mwSub: string
  mwStatTastings: string; mwStatRatings: string; mwStatAvg: string; mwStatActivity: string
  mwUnlockAt: string; mwUnlockProgress: string
  mwProfileTitle: string; mwProfileSub: string
  mwJustMe: string; mwFriends: string; mwGlobal: string
  mwAnalyticsTitle: string; mwAnalyticsSub: string
  mwTrendRising: string; mwTrendDropping: string; mwTrendStable: string; mwConsistency: string
  mwWheelTitle: string; mwWheelSub: string
  mwCompareTitle: string; mwCompareSub: string; mwCompareAbove: string; mwCompareBelow: string; mwCompareSame: string
  mwRecoTitle: string; mwRecoSub: string; mwRecoLocked: string
  mwJournalTitle: string; mwJournalSub: string; mwJournalSearch: string; mwJournalEmpty: string
  mwCalendarTitle: string; mwCalendarSub: string; mwCalendarAll: string; mwCalendarMine: string; mwCalendarFriends: string
  mwProfileEdit: string; mwProfilePhoto: string; mwProfileName: string; mwProfileEmail: string; mwProfileSave: string
  mwInsightCard: string
  // Entdecken Phase 8
  entTitle: string; entSub: string
  entExplore: string; entExploreSub: string
  entLexikon: string; entLexikonSub: string
  entGuide: string; entGuideSub: string
  entDest: string; entDestSub: string
  entBottlers: string; entBottlersSub: string
  entVocab: string; entResearch: string; entMakingOf: string
  entHistory: string; entHistorySub: string
  entTemplates: string; entTemplatesSub: string
  entSearch: string; entFilterRegion: string; entFilterAll: string
  entSortAvg: string; entSortMost: string; entSortAlpha: string
  entBottleDetail: string; entBottleRatings: string; entBottleMyRating: string; entBottleHistory: string
  entLexSearch: string; entLexCategories: string
  entDistSearch: string; entDistCountry: string
  entHistSearch: string; entHistRegion: string; entHistSmoky: string
  // Circle Phase 8
  circleTitle: string; circleSub: string
  circleFriends: string; circleBoard: string; circleSessions: string; circleFeed: string
  circleYourRank: string; circlePercentile: string; circleAnonymous: string
  circleFriend: string; circleAddFriend: string; circlePending: string; circleAccept: string; circleDecline: string
  circleFeedEmpty: string; circleOnline: string; circleSearchFriend: string
  historyGated: string; historyJoin: string
  // Auth
  authWelcomeSub: string; authLoginTitle: string; authLoginSub: string; authLoginBtn: string
  authToRegister: string; authToLogin: string; authGuestLink: string
  authRegisterTitle: string; authRegisterSub: string; authRegisterBtn: string
  authGuestTitle: string; authGuestSub: string; authGuestBtn: string
  authGuestStandard: string; authGuestStandardDesc: string; authGuestUltra: string; authGuestUltraDesc: string
  authName: string; authEmail: string; authPassword: string; authPasswordConfirm: string
  authNamePH: string; authNameRequired: string; authMissingFields: string
  authPasswordMismatch: string; authPasswordTooShort: string
  authLoginError: string; authRegisterError: string; authGuestError: string; authNetworkError: string
  authVerifyReminder: string; authLogout: string
  authForgotPin: string; authForgotPinTitle: string; authForgotPinSub: string; authForgotPinSend: string; authForgotPinSending: string
  authForgotPinVerifyTitle: string; authForgotPinVerifySub: string; authForgotPinCode: string; authForgotPinCodePH: string
  authForgotPinNewPin: string; authForgotPinNewPinPH: string; authForgotPinReset: string; authForgotPinResetting: string
  authForgotPinDoneTitle: string; authForgotPinDoneMsg: string; authForgotPinBackToLogin: string
  authForgotPinPinTooShort: string; authForgotPinCodeAndPinRequired: string
  authVerifyTitle: string; authVerifySub: string; authVerifyCodeLabel: string; authVerifyCodePH: string
  authVerifyCodeHint: string; authVerifyConfirm: string; authVerifyVerifying: string
  authVerifyResend: string; authVerifyResending: string; authVerifyResent: string; authVerifyBackToLogin: string
  authBlockedTitle: string; authBlockedSub: string; authBlockedMsg: string
  authBlockedResendHint: string; authBlockedResend: string; authBlockedBack: string
  authConsentTitle: string; authConsentSub: string; authConsentText: string
  authConsentCheckLabel: string; authConsentPrivacyLink: string; authConsentTermsLink: string; authConsentAnd: string
  authConsentCancel: string; authConsentAccept: string; authConsentAccepting: string
  authPrivacyConsent: string; authPrivacyConsentRequired: string
  authNewsletterOptIn: string; authNewsletterHint: string
  authInvalidEmail: string; authLoginPrivacyNotice: string; authPrivacyLink: string
}

const DE: Translations = {
  appName: 'CaskSense',
  tabTastings: 'Tastings', tabEntdecken: 'Entdecken', tabMeineWelt: 'Meine Welt', tabCircle: 'Circle',
  hubGreeting: 'Guten Abend.', hubSub: 'Was bringst du mit heute Abend?',
  hubJoin: 'Tasting beitreten', hubJoinDesc: 'Code eingeben und loslegen', hubDashboard: 'Dashboard', hubDashboardDesc: 'Statistiken und Kalender',
  hubSolo: 'Dram erfassen', hubSoloDesc: 'Alleine verkosten und notieren',
  hubHost: 'Tasting veranstalten', hubHostDesc: 'Neue Session einrichten',
  hubRecent: 'Letzte Aktivität',
  joinTitle: 'Tasting beitreten', joinCodeLabel: 'Tasting-Code', joinCodePH: 'z.B. GLEN42', joinCTA: 'Weiter →', joinNoAcc: 'Kein Account nötig',
  joinNameQ: 'Wie sollen wir dich nennen?', joinNameSub: 'Nur dein Name — das war\'s.', joinNamePH: 'Dein Name', joinEnter: 'Eintreten →',
  joinWaiting: 'startet gleich', joinPour: 'Giess dir schon mal ein.',
  back: 'Zurück', darkMode: 'Dunkel', lightMode: 'Hell',
  participantsLabel: 'Im Raum', hostLabel: 'Host', youLabel: 'Du', readyLabel: 'Bereit', waitingLabel: 'Wartet',
  ratingModeQ: 'Wie möchtest du bewerten?', ratingModeSub: 'Beide Modi erfassen Nase · Gaumen · Abgang · Gesamt.',
  ratingGuided: 'Geführt', ratingGuidedD: 'Eine Dimension nach der anderen — mit Fragen und Aroma-Vorschlägen.', ratingGuidedH: 'Wenn man sich Zeit nimmt.',
  ratingCompact: 'Kompakt', ratingCompactD: 'Alle vier Dimensionen auf einmal — Score direkt eingeben.', ratingCompactH: 'Wenn man sein Bewertungsschema kennt.',
  ratingNose: 'Nase', ratingPalate: 'Gaumen', ratingFinish: 'Abgang', ratingOverall: 'Gesamt',
  ratingQ_nose: 'Was nimmst du zuerst wahr?', ratingQ_palate: 'Was spürst du beim ersten Schluck?', ratingQ_finish: 'Was bleibt zurück?', ratingQ_overall: 'Dein Gesamteindruck.',
  ratingHint_nose: 'Lass das Glas kurz atmen.', ratingHint_palate: 'Lass ihn auf der Zunge verweilen.', ratingHint_finish: 'Warte einen Moment.', ratingHint_overall: 'Vertrau deiner Intuition.',
  ratingAromen: 'Aromen wählen', ratingAromenS: 'Tippe an was du erkennst — oder lass es weg.',
  ratingNote: 'Notiz', ratingNoteSub: 'Optional — deine eigenen Worte.', ratingNotePH: 'Was fällt dir auf...',
  ratingTapEdit: 'Tippe auf die Zahl zum direkten Eingeben', ratingSave: 'speichern', ratingDone: 'Gespeichert',
  ratingNext: 'Weiter zu Dram', ratingEdit: 'Bewertung anpassen', ratingFinish2: 'Bewertung abschließen →',
  ratingOf: 'von', ratingDram: 'Dram', ratingMyRating: 'Deine Bewertung',
  ratingBlind: 'Blind · Allgemeine Vorschläge', ratingProfile: 'Aromen typisch für', ratingError: 'Bewertung konnte nicht gespeichert werden.',
  band90: 'Außergewöhnlich', band85: 'Exzellent', band80: 'Hervorragend', band75: 'Sehr gut', band70: 'Gut', band0: 'Okay',
  soloTitle: 'Neuen Dram erfassen', soloCaptureSub: 'Flasche erfassen oder direkt bewerten.',
  soloPhoto: 'Flasche fotografieren', soloPhotoDesc: 'KI erkennt Whisky automatisch',
  soloManual: 'Manuell eingeben', soloManualDesc: 'Name, Region und Fass eingeben',
  soloBarcode: 'Barcode scannen', soloBarcodeDesc: 'Whiskybase-ID automatisch befüllen',
  soloSkip: 'Direkt zur Bewertung',
  soloName: 'Whisky-Name', soloNamePH: 'z.B. Glenfarclas 15',
  soloRegion: 'Region', soloRegionPH: 'z.B. Speyside',
  soloCask: 'Fasslagerung', soloCaskPH: 'z.B. Sherry',
  soloAge: 'Alter (Jahre)', soloAgePH: 'z.B. 15',
  soloAbv: 'Alkohol (%)', soloAbvPH: 'z.B. 43',
  soloDistillery: 'Destillerie', soloDistilleryPH: 'z.B. Glenfarclas',
  soloToRating: 'Zur Bewertung →', soloIdentifying: 'Flasche wird erkannt...', soloIdentifyFail: 'Konnte nicht erkannt werden.', soloIdentifyRetry: 'Erneut versuchen',
  soloSaved: 'Im Journal gespeichert', soloAnother: 'Weiteren Dram erfassen →', soloToHub: 'Zurück',
  soloJournalTitle: 'Deine Drams', soloJournalEmpty: 'Noch keine Drams erfasst.',
  soloQuickRate: 'Schnellbewertung', soloFullEdit: 'Vollständige Eingabe',
  hostTitle: 'Tasting einrichten',
  hostStep1: 'Setup', hostStep2: 'Whiskies', hostStep3: 'Einladungen', hostStep4: 'Live',
  hostName: 'Name des Tastings', hostNamePH: 'z.B. Highland Herbst-Session',
  hostDate: 'Datum', hostTime: 'Uhrzeit', hostLoc: 'Ort', hostLocPH: 'z.B. Zürich, Wohnzimmer',
  hostFormat: 'Format', hostBlind: 'Blind', hostBlindDesc: 'Whiskies werden erst am Ende enthüllt', hostOpen: 'Offen', hostOpenDesc: 'Alle sehen den Whisky von Anfang an',
  hostScale: 'Bewertungsskala', hostScale100: '0 – 100 Punkte', hostScale20: '0 – 20 Punkte', hostScale10: '0 – 10 Punkte',
  hostRevealOrder: 'Enthüllungs-Reihenfolge', hostRevealClassic: 'Klassisch (Name → Details → Foto)', hostRevealPhoto: 'Foto zuerst', hostRevealDetails: 'Details zuerst', hostRevealOne: 'Einzeln (ein Feld nach dem anderen)',
  hostNext: 'Weiter →', hostBack: '← Zurück', hostSaving: 'Wird gespeichert...',
  hostWhiskies: 'Whiskies', hostWhiskyCount: 'Whisky', hostAddManual: 'Manuell hinzufügen',
  hostAiImport: 'KI-Import', hostAiImportDesc: 'Excel, CSV, Foto oder PDF hochladen', hostAiImporting: 'Wird importiert...', hostAiPreview: 'Import-Vorschau', hostAiConfirm: 'Auswahl übernehmen →',
  hostWhiskyName: 'Name', hostWhiskyNamePH: 'z.B. Talisker 10',
  hostWhiskyRegion: 'Region', hostWhiskyRegionPH: 'z.B. Islands',
  hostWhiskyCask: 'Fass', hostWhiskyCaskPH: 'z.B. Bourbon',
  hostWhiskyAge: 'Alter', hostWhiskyAgePH: '10',
  hostWhiskyDelete: 'Entfernen',
  hostInviteTitle: 'Einladungen versenden', hostInviteDesc: 'Teile den Code oder Link mit deinen Gästen.',
  hostCode: 'Tasting-Code', hostLinkCopy: 'Link kopieren', hostLinkCopied: 'Kopiert!',
  hostQrDownload: 'QR-Code herunterladen', hostEmailLabel: 'Per E-Mail einladen', hostEmailPH: 'name@beispiel.de',
  hostEmailNote: 'Persönliche Notiz (optional)', hostEmailNotePH: 'Freue mich auf euren Besuch...',
  hostEmailSend: 'Einladen', hostEmailSent: 'Einladung gesendet', hostEmailError: 'Einladung fehlgeschlagen',
  hostPdfSheets: 'Bewertungsbögen drucken', hostPdfDesc: 'PDF mit personalisierten QR-Codes pro Teilnehmer',
  hostStart: 'Tasting starten →', hostLiveTitle: 'Tasting läuft', hostParticipants: 'Teilnehmer',
  hostRatedAll: 'Alle bewertet', hostInProgress: 'In Bearbeitung', hostNotStarted: 'Noch nicht gestartet',
  hostNextDram: 'Nächster Dram →', hostReveal: 'Enthüllen →', hostClose: 'Tasting beenden',
  hostEndConfirm: 'Tasting wirklich beenden?', hostEndYes: 'Ja, beenden', hostEndNo: 'Weiter',
  hostPaperScan: 'Zettel einscannen', hostCockpit: 'Desktop-Cockpit',
  liveLobby: 'Warteraum', liveLobbySub: 'Der Host startet gleich.', liveLobbyPour: 'Giess dir schon mal ein.',
  liveDram: 'Dram', liveOf: 'von', liveBlindSample: 'Blind Sample',
  liveNosePhase: 'Nase', liveTastePhase: 'Gaumen', liveFinishPhase: 'Abgang', liveOverallPhase: 'Gesamt',
  liveRatingLocked: 'Bewertung gesperrt', liveWaitingHost: 'Warte auf Host...',
  liveRevealTitle: 'Enthüllung', liveRevealName: 'Name wird enthüllt', liveRevealDetails: 'Details werden enthüllt', liveRevealPhoto: 'Foto wird enthüllt',
  liveRevealDone: 'Vollständig enthüllt', liveRevealFlash: 'Enthüllt!',
  liveTastingDone: 'Tasting beendet', liveSeeResults: 'Ergebnisse ansehen →',
  liveAmbient: 'Ambiente', liveAmbientFire: 'Kaminfeuer', liveAmbientRain: 'Regen', liveAmbientNight: 'Nacht', liveAmbientBag: 'Dudelsack', liveAmbientOff: 'Aus',
  liveVoiceMemo: 'Sprachnotiz', liveVoiceRecord: 'Aufnehmen', liveVoiceStop: 'Stopp', liveVoicePlaying: 'Wiedergabe', liveVoiceDelete: 'Löschen', liveVoiceTranscript: 'Transkription',
  liveProgress: 'Fortschritt', liveParticipants: 'Teilnehmer',
  resultsTitle: 'Ergebnisse', resultsOverview: 'Überblick', resultsVsGroup: 'Du vs. Gruppe', resultsPriceSurp: 'Preis-Aha', resultsCaskProfile: 'Dein Profil',
  resultsInsight1: 'Erkenntnis 1 von 3', resultsInsight2: 'Erkenntnis 2 von 3', resultsInsight3: 'Erkenntnis 3 von 3',
  resultsYourAvg: 'Dein Schnitt', resultsGroupAvg: 'Gruppen-Ø', resultsDifference: 'Differenz', resultsBiggestOut: 'Größter Ausreißer',
  resultsCheapest: 'günstigster', resultsPriceCorr: 'Preis und Qualität korrelierten heute kaum.', resultsCaskDelta: 'Punkte höher als', resultsSherryFass: 'Sherryfass', resultsBourbon: 'Bourbonfass',
  resultsFavorite: 'Dein Favorit', resultsGroupWinner: 'Gruppen-Sieger', resultsMostDebated: 'Meistdiskutiert', resultsSurprise: 'Preis-Überraschung',
  resultsRanking: 'Heutiges Ranking', resultsShare: 'Teilen', resultsPdf: 'Als PDF', resultsCopyLink: 'Link kopieren',
  recapTitle: 'Tasting-Recap', recapTop: 'Spitzenreiter', recapDivisive: 'Meistdiskutiert', recapAvgScore: 'Durchschnitts-Score', recapParticipants: 'Teilnehmer-Highlights', recapExport: 'Export', recapPrint: 'Drucken',
  connoisseurTitle: 'Connoisseur Report', connoisseurGenerate: 'Report erstellen', connoisseurRegen: 'Neu erstellen', connoisseurLoading: 'KI analysiert dein Profil...',
  connoisseurTabReport: 'Report', connoisseurTabWhisky: 'Whiskies', connoisseurTabAroma: 'Aromen', connoisseurTabHist: 'Verlauf',
  connoisseurShare: 'Teilen', connoisseurDelete: 'Löschen',
  narrativeTitle: 'Session-Story', narrativeGenerate: 'Story erstellen', narrativeLoading: 'KI schreibt eure Geschichte...',
  presentTitle: 'Präsentation', presentStart: 'Präsentation starten', presentNext: 'Nächste Folie →', presentStop: 'Beenden', presentSlide: 'Folie',
  mwTitle: 'Meine Welt', mwSub: 'Dein Gaumen. Deine Geschichte.',
  mwStatTastings: 'Tastings', mwStatRatings: 'Bewertungen', mwStatAvg: 'Ø Score', mwStatActivity: 'Aktiv seit',
  mwUnlockAt: 'Freischalten ab 10 Whiskies', mwUnlockProgress: 'noch {n} Whiskies bis zur Analyse',
  mwProfileTitle: 'Mein Geschmacksprofil', mwProfileSub: 'Deine Dimensionen im Vergleich',
  mwJustMe: 'Nur ich', mwFriends: 'Freunde', mwGlobal: 'Global',
  mwAnalyticsTitle: 'Analytics', mwAnalyticsSub: 'Deine Entwicklung über Zeit',
  mwTrendRising: 'Steigende Tendenz', mwTrendDropping: 'Sinkende Tendenz', mwTrendStable: 'Stabil', mwConsistency: 'Konsistenz',
  mwWheelTitle: 'Flavour-Rad', mwWheelSub: 'Deine häufigsten Aromen',
  mwCompareTitle: 'Vergleich', mwCompareSub: 'Du vs. Plattform-Median', mwCompareAbove: 'Du liegst höher', mwCompareBelow: 'Du liegst niedriger', mwCompareSame: 'Im Einklang',
  mwRecoTitle: 'Empfehlungen', mwRecoSub: 'Basierend auf deinem Geschmacksprofil', mwRecoLocked: 'Erst ab 10 bewerteten Whiskies verfügbar',
  mwJournalTitle: 'Journal', mwJournalSub: 'Alle deine Drams', mwJournalSearch: 'Suche...', mwJournalEmpty: 'Noch keine Drams im Journal.',
  mwCalendarTitle: 'Kalender', mwCalendarSub: 'Deine Tasting-Geschichte', mwCalendarAll: 'Alle', mwCalendarMine: 'Meine', mwCalendarFriends: 'Freunde',
  mwProfileEdit: 'Profil bearbeiten', mwProfilePhoto: 'Foto ändern', mwProfileName: 'Name', mwProfileEmail: 'E-Mail', mwProfileSave: 'Speichern',
  mwInsightCard: 'KI-Einschätzung',
  entTitle: 'Entdecken', entSub: 'Whiskies · Wissen · Welt',
  entExplore: 'Whiskies entdecken', entExploreSub: 'Alle bewerteten Whiskies der Community',
  entLexikon: 'Lexikon', entLexikonSub: 'Whisky-Begriffe erklärt',
  entGuide: 'Tasting-Guide', entGuideSub: 'Schritt für Schritt verkosten',
  entDest: 'Destillerien', entDestSub: 'Weltkarte der Brennereien',
  entBottlers: 'Abfüller', entBottlersSub: 'Unabhängige Abfüller',
  entHistory: 'Historische Tastings', entHistorySub: 'Tasting-Archiv der Community',
  entTemplates: 'Vokabular', entTemplatesSub: 'Beschreibungs-Vorlagen nach Stil',
  entSearch: 'Suche...', entFilterRegion: 'Region', entFilterAll: 'Alle',
  entSortAvg: 'Ø Score', entSortMost: 'Meist bewertet', entSortAlpha: 'A–Z',
  entBottleDetail: 'Flasche', entBottleRatings: 'Community-Bewertungen', entBottleMyRating: 'Meine Bewertung', entBottleHistory: 'Tasting-Verlauf',
  entLexSearch: 'Begriff suchen...', entLexCategories: 'Kategorien',
  entDistSearch: 'Destillerie suchen...', entDistCountry: 'Land',
  entHistSearch: 'Archiv durchsuchen...', entHistRegion: 'Region', entHistSmoky: 'Rauchig',
  circleTitle: 'Circle', circleSub: 'Deine Whisky-Community.',
  circleFriends: 'Freunde', circleBoard: 'Bestenliste', circleSessions: 'Sessions', circleFeed: 'Feed',
  circleYourRank: 'Dein Rang', circlePercentile: 'Prozentrang', circleAnonymous: 'Whisky-Alias',
  circleFriend: 'Freund', circleAddFriend: 'Hinzufügen', circlePending: 'Ausstehend', circleAccept: 'Annehmen', circleDecline: 'Ablehnen',
  circleFeedEmpty: 'Noch keine Aktivitäten von Freunden.', circleOnline: 'Online', circleSearchFriend: 'Freund suchen...',
  historyGated: 'Nur für Community-Mitglieder', historyJoin: 'Community beitreten',
  authWelcomeSub: 'Dein Gaumen. Deine Geschichte.',
  authLoginTitle: 'Willkommen zurück', authLoginSub: 'Melde dich an, um fortzufahren.',
  authLoginBtn: 'Anmelden', authToRegister: 'Noch kein Konto?', authToLogin: 'Bereits registriert?',
  authGuestLink: 'Als Gast fortfahren',
  authRegisterTitle: 'Konto erstellen', authRegisterSub: 'Starte deine Whisky-Geschichte.',
  authRegisterBtn: 'Registrieren',
  authGuestTitle: 'Als Gast einloggen', authGuestSub: 'Kein Konto nötig. Wähl deinen Modus.',
  authGuestBtn: 'Als Gast starten',
  authGuestStandard: 'Standard', authGuestStandardDesc: 'Name wird gespeichert.',
  authGuestUltra: 'Anonym', authGuestUltraDesc: 'Kein Verlauf, kein Speichern.',
  authName: 'Name', authEmail: 'E-Mail', authPassword: 'Passwort', authPasswordConfirm: 'Passwort wiederholen',
  authNamePH: 'Dein Name', authNameRequired: 'Bitte gib deinen Namen ein.',
  authMissingFields: 'Bitte alle Felder ausfüllen.', authPasswordMismatch: 'Passwörter stimmen nicht überein.',
  authPasswordTooShort: 'Passwort mindestens 8 Zeichen.', authLoginError: 'E-Mail oder Passwort falsch.',
  authRegisterError: 'Registrierung fehlgeschlagen.', authGuestError: 'Gast-Login fehlgeschlagen.',
  authNetworkError: 'Netzwerkfehler. Bitte versuche es erneut.', authVerifyReminder: 'Bitte bestätige deine E-Mail-Adresse.',
  authLogout: 'Abmelden',
  authForgotPin: 'PIN vergessen?', authForgotPinTitle: 'PIN zurücksetzen', authForgotPinSub: 'Gib deine E-Mail-Adresse ein, um einen Reset-Code zu erhalten.',
  authForgotPinSend: 'Code senden', authForgotPinSending: 'Wird gesendet...',
  authForgotPinVerifyTitle: 'Neues Passwort setzen', authForgotPinVerifySub: 'Gib den Code aus deiner E-Mail und dein neues Passwort ein.',
  authForgotPinCode: 'Reset-Code', authForgotPinCodePH: '6-stelliger Code',
  authForgotPinNewPin: 'Neues Passwort', authForgotPinNewPinPH: 'min. 4 Zeichen',
  authForgotPinReset: 'Passwort zurücksetzen', authForgotPinResetting: 'Wird zurückgesetzt...',
  authForgotPinDoneTitle: 'Passwort zurückgesetzt', authForgotPinDoneMsg: 'Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt anmelden.',
  authForgotPinBackToLogin: 'Zurück zum Login',
  authForgotPinPinTooShort: 'Passwort muss mindestens 4 Zeichen lang sein.',
  authForgotPinCodeAndPinRequired: 'Bitte Code und neues Passwort eingeben.',
  authVerifyTitle: 'E-Mail bestätigen', authVerifySub: 'Wir haben dir einen Bestätigungscode gesendet.',
  authVerifyCodeLabel: 'Bestätigungscode', authVerifyCodePH: '6-stelliger Code',
  authVerifyCodeHint: 'Prüfe deinen Posteingang und Spam-Ordner.', authVerifyConfirm: 'Bestätigen', authVerifyVerifying: 'Wird geprüft...',
  authVerifyResend: 'Code erneut senden', authVerifyResending: 'Wird gesendet...', authVerifyResent: 'Code gesendet!', authVerifyBackToLogin: 'Zurück zum Login',
  authBlockedTitle: 'Konto gesperrt', authBlockedSub: 'E-Mail-Verifizierung nicht abgeschlossen',
  authBlockedMsg: 'Deine E-Mail wurde nicht rechtzeitig bestätigt. Bitte wende dich an den Administrator:',
  authBlockedResendHint: 'Falls du deinen Verifizierungscode erneut benötigst:',
  authBlockedResend: 'Code erneut senden', authBlockedBack: 'Zurück zum Login',
  authConsentTitle: 'Datenschutz', authConsentSub: 'Bitte akzeptiere die Datenschutzbestimmungen, um fortzufahren.',
  authConsentText: 'Wir verarbeiten deine Daten gemäß unserer Datenschutzrichtlinie, um dir die bestmögliche Erfahrung zu bieten.',
  authConsentCheckLabel: 'Ich akzeptiere die', authConsentPrivacyLink: 'Datenschutzrichtlinie',
  authConsentTermsLink: 'AGB', authConsentAnd: 'und die',
  authConsentCancel: 'Abbrechen', authConsentAccept: 'Akzeptieren & weiter', authConsentAccepting: 'Wird gespeichert...',
  authPrivacyConsent: 'Ich akzeptiere die Datenschutzrichtlinie und AGB', authPrivacyConsentRequired: 'Bitte akzeptiere die Datenschutzbestimmungen.',
  authNewsletterOptIn: 'Newsletter abonnieren', authNewsletterHint: 'Gelegentlich Neuigkeiten und Tipps per E-Mail.',
  authInvalidEmail: 'Bitte gib eine gültige E-Mail-Adresse ein.',
  authLoginPrivacyNotice: 'Mit der Anmeldung stimmst du unserer Datenschutzrichtlinie zu.',
  authPrivacyLink: 'Datenschutzrichtlinie',
}

const EN: Translations = {
  appName: 'CaskSense',
  tabTastings: 'Tastings', tabEntdecken: 'Discover', tabMeineWelt: 'My World', tabCircle: 'Circle',
  hubGreeting: 'Good evening.', hubSub: 'What are you bringing tonight?',
  hubJoin: 'Join tasting', hubJoinDesc: 'Enter code and dive in', hubDashboard: 'Dashboard', hubDashboardDesc: 'Statistics and calendar',
  hubSolo: 'Log a dram', hubSoloDesc: 'Taste and note on your own',
  hubHost: 'Host a tasting', hubHostDesc: 'Set up a new session',
  hubRecent: 'Recent activity',
  joinTitle: 'Join tasting', joinCodeLabel: 'Tasting code', joinCodePH: 'e.g. GLEN42', joinCTA: 'Continue →', joinNoAcc: 'No account needed',
  joinNameQ: 'What shall we call you?', joinNameSub: 'Just your name — that\'s it.', joinNamePH: 'Your name', joinEnter: 'Enter →',
  joinWaiting: 'starting shortly', joinPour: 'Pour yourself a glass.',
  back: 'Back', darkMode: 'Dark', lightMode: 'Light',
  participantsLabel: 'In the room', hostLabel: 'Host', youLabel: 'You', readyLabel: 'Ready', waitingLabel: 'Waiting',
  ratingModeQ: 'How would you like to rate?', ratingModeSub: 'Both modes capture Nose · Palate · Finish · Overall.',
  ratingGuided: 'Guided', ratingGuidedD: 'One dimension at a time — with questions and aroma suggestions.', ratingGuidedH: 'When you want to take your time.',
  ratingCompact: 'Compact', ratingCompactD: 'All four dimensions at once — type scores directly.', ratingCompactH: 'When you know your rating scheme.',
  ratingNose: 'Nose', ratingPalate: 'Palate', ratingFinish: 'Finish', ratingOverall: 'Overall',
  ratingQ_nose: 'What do you notice first?', ratingQ_palate: 'What do you taste on the first sip?', ratingQ_finish: 'What lingers?', ratingQ_overall: 'Your overall impression.',
  ratingHint_nose: 'Let the glass breathe a moment.', ratingHint_palate: 'Let it rest on your tongue.', ratingHint_finish: 'Wait a moment.', ratingHint_overall: 'Trust your instinct.',
  ratingAromen: 'Choose aromas', ratingAromenS: 'Tap what you recognise — or skip.',
  ratingNote: 'Note', ratingNoteSub: 'Optional — your own words.', ratingNotePH: 'What stands out...',
  ratingTapEdit: 'Tap the number to type directly', ratingSave: 'save', ratingDone: 'Saved',
  ratingNext: 'Continue to Dram', ratingEdit: 'Adjust rating', ratingFinish2: 'Complete rating →',
  ratingOf: 'of', ratingDram: 'Dram', ratingMyRating: 'Your rating',
  ratingBlind: 'Blind · General suggestions', ratingProfile: 'Aromas typical for', ratingError: 'Rating could not be saved.',
  band90: 'Extraordinary', band85: 'Excellent', band80: 'Outstanding', band75: 'Very good', band70: 'Good', band0: 'Okay',
  soloTitle: 'Log a new dram', soloCaptureSub: 'Capture the bottle or go straight to rating.',
  soloPhoto: 'Photograph bottle', soloPhotoDesc: 'AI identifies the whisky automatically',
  soloManual: 'Enter manually', soloManualDesc: 'Enter name, region and cask',
  soloBarcode: 'Scan barcode', soloBarcodeDesc: 'Auto-fill from Whiskybase ID',
  soloSkip: 'Go straight to rating',
  soloName: 'Whisky name', soloNamePH: 'e.g. Glenfarclas 15',
  soloRegion: 'Region', soloRegionPH: 'e.g. Speyside',
  soloCask: 'Cask type', soloCaskPH: 'e.g. Sherry',
  soloAge: 'Age (years)', soloAgePH: 'e.g. 15',
  soloAbv: 'ABV (%)', soloAbvPH: 'e.g. 43',
  soloDistillery: 'Distillery', soloDistilleryPH: 'e.g. Glenfarclas',
  soloToRating: 'Go to rating →', soloIdentifying: 'Identifying bottle...', soloIdentifyFail: 'Could not be identified.', soloIdentifyRetry: 'Try again',
  soloSaved: 'Saved to journal', soloAnother: 'Log another dram →', soloToHub: 'Back',
  soloJournalTitle: 'Your drams', soloJournalEmpty: 'No drams logged yet.',
  soloQuickRate: 'Quick rating', soloFullEdit: 'Full entry',
  hostTitle: 'Set up tasting',
  hostStep1: 'Setup', hostStep2: 'Whiskies', hostStep3: 'Invitations', hostStep4: 'Live',
  hostName: 'Tasting name', hostNamePH: 'e.g. Highland Autumn Session',
  hostDate: 'Date', hostTime: 'Time', hostLoc: 'Location', hostLocPH: 'e.g. Zurich, living room',
  hostFormat: 'Format', hostBlind: 'Blind', hostBlindDesc: 'Whiskies revealed at the end', hostOpen: 'Open', hostOpenDesc: 'Everyone sees the whisky from the start',
  hostScale: 'Rating scale', hostScale100: '0 – 100 points', hostScale20: '0 – 20 points', hostScale10: '0 – 10 points',
  hostRevealOrder: 'Reveal order', hostRevealClassic: 'Classic (Name → Details → Photo)', hostRevealPhoto: 'Photo first', hostRevealDetails: 'Details first', hostRevealOne: 'One by one',
  hostNext: 'Continue →', hostBack: '← Back', hostSaving: 'Saving...',
  hostWhiskies: 'Whiskies', hostWhiskyCount: 'Whisky', hostAddManual: 'Add manually',
  hostAiImport: 'AI import', hostAiImportDesc: 'Upload Excel, CSV, photo or PDF', hostAiImporting: 'Importing...', hostAiPreview: 'Import preview', hostAiConfirm: 'Apply selection →',
  hostWhiskyName: 'Name', hostWhiskyNamePH: 'e.g. Talisker 10',
  hostWhiskyRegion: 'Region', hostWhiskyRegionPH: 'e.g. Islands',
  hostWhiskyCask: 'Cask', hostWhiskyCaskPH: 'e.g. Bourbon',
  hostWhiskyAge: 'Age', hostWhiskyAgePH: '10',
  hostWhiskyDelete: 'Remove',
  hostInviteTitle: 'Send invitations', hostInviteDesc: 'Share the code or link with your guests.',
  hostCode: 'Tasting code', hostLinkCopy: 'Copy link', hostLinkCopied: 'Copied!',
  hostQrDownload: 'Download QR code', hostEmailLabel: 'Invite by email', hostEmailPH: 'name@example.com',
  hostEmailNote: 'Personal note (optional)', hostEmailNotePH: 'Looking forward to seeing you...',
  hostEmailSend: 'Invite', hostEmailSent: 'Invitation sent', hostEmailError: 'Invitation failed',
  hostPdfSheets: 'Print rating sheets', hostPdfDesc: 'PDF with personalised QR codes per participant',
  hostStart: 'Start tasting →', hostLiveTitle: 'Tasting live', hostParticipants: 'Participants',
  hostRatedAll: 'All rated', hostInProgress: 'In progress', hostNotStarted: 'Not started',
  hostNextDram: 'Next dram →', hostReveal: 'Reveal →', hostClose: 'End tasting',
  hostEndConfirm: 'End tasting?', hostEndYes: 'Yes, end it', hostEndNo: 'Continue',
  hostPaperScan: 'Scan paper sheet', hostCockpit: 'Desktop cockpit',
  liveLobby: 'Waiting room', liveLobbySub: 'The host will start shortly.', liveLobbyPour: 'Pour yourself a glass.',
  liveDram: 'Dram', liveOf: 'of', liveBlindSample: 'Blind Sample',
  liveNosePhase: 'Nose', liveTastePhase: 'Palate', liveFinishPhase: 'Finish', liveOverallPhase: 'Overall',
  liveRatingLocked: 'Rating locked', liveWaitingHost: 'Waiting for host...',
  liveRevealTitle: 'Reveal', liveRevealName: 'Name being revealed', liveRevealDetails: 'Details being revealed', liveRevealPhoto: 'Photo being revealed',
  liveRevealDone: 'Fully revealed', liveRevealFlash: 'Revealed!',
  liveTastingDone: 'Tasting ended', liveSeeResults: 'See results →',
  liveAmbient: 'Ambience', liveAmbientFire: 'Fireplace', liveAmbientRain: 'Rain', liveAmbientNight: 'Night', liveAmbientBag: 'Bagpipe', liveAmbientOff: 'Off',
  liveVoiceMemo: 'Voice memo', liveVoiceRecord: 'Record', liveVoiceStop: 'Stop', liveVoicePlaying: 'Playing', liveVoiceDelete: 'Delete', liveVoiceTranscript: 'Transcript',
  liveProgress: 'Progress', liveParticipants: 'Participants',
  resultsTitle: 'Results', resultsOverview: 'Overview', resultsVsGroup: 'You vs. Group', resultsPriceSurp: 'Price reveal', resultsCaskProfile: 'Your profile',
  resultsInsight1: 'Insight 1 of 3', resultsInsight2: 'Insight 2 of 3', resultsInsight3: 'Insight 3 of 3',
  resultsYourAvg: 'Your average', resultsGroupAvg: 'Group avg', resultsDifference: 'Difference', resultsBiggestOut: 'Biggest outlier',
  resultsCheapest: 'cheapest', resultsPriceCorr: 'Price and quality barely correlated today.', resultsCaskDelta: 'points higher than', resultsSherryFass: 'Sherry cask', resultsBourbon: 'Bourbon cask',
  resultsFavorite: 'Your favourite', resultsGroupWinner: 'Group winner', resultsMostDebated: 'Most debated', resultsSurprise: 'Price surprise',
  resultsRanking: 'Today\'s ranking', resultsShare: 'Share', resultsPdf: 'Save as PDF', resultsCopyLink: 'Copy link',
  recapTitle: 'Tasting recap', recapTop: 'Top rated', recapDivisive: 'Most divisive', recapAvgScore: 'Average score', recapParticipants: 'Participant highlights', recapExport: 'Export', recapPrint: 'Print',
  connoisseurTitle: 'Connoisseur Report', connoisseurGenerate: 'Generate report', connoisseurRegen: 'Regenerate', connoisseurLoading: 'AI is analysing your profile...',
  connoisseurTabReport: 'Report', connoisseurTabWhisky: 'Whiskies', connoisseurTabAroma: 'Aromas', connoisseurTabHist: 'History',
  connoisseurShare: 'Share', connoisseurDelete: 'Delete',
  narrativeTitle: 'Session story', narrativeGenerate: 'Create story', narrativeLoading: 'AI is writing your story...',
  presentTitle: 'Presentation', presentStart: 'Start presentation', presentNext: 'Next slide →', presentStop: 'End', presentSlide: 'Slide',
  mwTitle: 'My World', mwSub: 'Your palate. Your story.',
  mwStatTastings: 'Tastings', mwStatRatings: 'Ratings', mwStatAvg: 'Avg score', mwStatActivity: 'Active since',
  mwUnlockAt: 'Unlock at 10 whiskies', mwUnlockProgress: '{n} more whiskies to analytics',
  mwProfileTitle: 'My taste profile', mwProfileSub: 'Your dimensions compared',
  mwJustMe: 'Just me', mwFriends: 'Friends', mwGlobal: 'Global',
  mwAnalyticsTitle: 'Analytics', mwAnalyticsSub: 'Your development over time',
  mwTrendRising: 'Rising trend', mwTrendDropping: 'Dropping trend', mwTrendStable: 'Stable', mwConsistency: 'Consistency',
  mwWheelTitle: 'Flavour wheel', mwWheelSub: 'Your most common aromas',
  mwCompareTitle: 'Compare', mwCompareSub: 'You vs. platform median', mwCompareAbove: 'You rate higher', mwCompareBelow: 'You rate lower', mwCompareSame: 'In line',
  mwRecoTitle: 'Recommendations', mwRecoSub: 'Based on your taste profile', mwRecoLocked: 'Available after 10 rated whiskies',
  mwJournalTitle: 'Journal', mwJournalSub: 'All your drams', mwJournalSearch: 'Search...', mwJournalEmpty: 'No drams in journal yet.',
  mwCalendarTitle: 'Calendar', mwCalendarSub: 'Your tasting history', mwCalendarAll: 'All', mwCalendarMine: 'Mine', mwCalendarFriends: 'Friends',
  mwProfileEdit: 'Edit profile', mwProfilePhoto: 'Change photo', mwProfileName: 'Name', mwProfileEmail: 'Email', mwProfileSave: 'Save',
  mwInsightCard: 'AI insight',
  entTitle: 'Discover', entSub: 'Whiskies · Knowledge · World',
  entExplore: 'Explore whiskies', entExploreSub: 'All rated whiskies from the community',
  entLexikon: 'Lexicon', entLexikonSub: 'Whisky terms explained',
  entGuide: 'Tasting guide', entGuideSub: 'Step-by-step tasting',
  entDest: 'Distilleries', entDestSub: 'World map of distilleries',
  entBottlers: 'Bottlers', entBottlersSub: 'Independent bottlers',
  entHistory: 'Historical tastings', entHistorySub: 'Community tasting archive',
  entTemplates: 'Vocabulary', entTemplatesSub: 'Description templates by style',
  entSearch: 'Search...', entFilterRegion: 'Region', entFilterAll: 'All',
  entSortAvg: 'Avg score', entSortMost: 'Most rated', entSortAlpha: 'A–Z',
  entBottleDetail: 'Bottle', entBottleRatings: 'Community ratings', entBottleMyRating: 'My rating', entBottleHistory: 'Tasting history',
  entLexSearch: 'Search term...', entLexCategories: 'Categories',
  entDistSearch: 'Search distillery...', entDistCountry: 'Country',
  entHistSearch: 'Search archive...', entHistRegion: 'Region', entHistSmoky: 'Smoky',
  circleTitle: 'Circle', circleSub: 'Your whisky community.',
  circleFriends: 'Friends', circleBoard: 'Leaderboard', circleSessions: 'Sessions', circleFeed: 'Feed',
  circleYourRank: 'Your rank', circlePercentile: 'Percentile', circleAnonymous: 'Whisky alias',
  circleFriend: 'Friend', circleAddFriend: 'Add', circlePending: 'Pending', circleAccept: 'Accept', circleDecline: 'Decline',
  circleFeedEmpty: 'No activity from friends yet.', circleOnline: 'Online', circleSearchFriend: 'Search friend...',
  historyGated: 'Community members only', historyJoin: 'Join community',
  authWelcomeSub: 'Your palate. Your story.',
  authLoginTitle: 'Welcome back', authLoginSub: 'Sign in to continue.',
  authLoginBtn: 'Sign in', authToRegister: 'No account yet?', authToLogin: 'Already registered?',
  authGuestLink: 'Continue as guest',
  authRegisterTitle: 'Create account', authRegisterSub: 'Start your whisky story.',
  authRegisterBtn: 'Register',
  authGuestTitle: 'Guest login', authGuestSub: 'No account needed. Choose your mode.',
  authGuestBtn: 'Start as guest',
  authGuestStandard: 'Standard', authGuestStandardDesc: 'Name is saved.',
  authGuestUltra: 'Anonymous', authGuestUltraDesc: 'No history, no storage.',
  authName: 'Name', authEmail: 'Email', authPassword: 'Password', authPasswordConfirm: 'Confirm password',
  authNamePH: 'Your name', authNameRequired: 'Please enter your name.',
  authMissingFields: 'Please fill in all fields.', authPasswordMismatch: 'Passwords do not match.',
  authPasswordTooShort: 'Password must be at least 8 characters.', authLoginError: 'Wrong email or password.',
  authRegisterError: 'Registration failed.', authGuestError: 'Guest login failed.',
  authNetworkError: 'Network error. Please try again.', authVerifyReminder: 'Please verify your email address.',
  authLogout: 'Sign out',
  authForgotPin: 'Forgot PIN?', authForgotPinTitle: 'Reset PIN', authForgotPinSub: 'Enter your email to receive a reset code.',
  authForgotPinSend: 'Send code', authForgotPinSending: 'Sending...',
  authForgotPinVerifyTitle: 'Set new password', authForgotPinVerifySub: 'Enter the code from your email and your new password.',
  authForgotPinCode: 'Reset code', authForgotPinCodePH: '6-digit code',
  authForgotPinNewPin: 'New password', authForgotPinNewPinPH: 'min. 4 characters',
  authForgotPinReset: 'Reset password', authForgotPinResetting: 'Resetting...',
  authForgotPinDoneTitle: 'Password reset', authForgotPinDoneMsg: 'Your password has been successfully changed. You can now sign in.',
  authForgotPinBackToLogin: 'Back to login',
  authForgotPinPinTooShort: 'Password must be at least 4 characters.',
  authForgotPinCodeAndPinRequired: 'Please enter code and new password.',
  authVerifyTitle: 'Verify email', authVerifySub: 'We sent you a verification code.',
  authVerifyCodeLabel: 'Verification code', authVerifyCodePH: '6-digit code',
  authVerifyCodeHint: 'Check your inbox and spam folder.', authVerifyConfirm: 'Confirm', authVerifyVerifying: 'Verifying...',
  authVerifyResend: 'Resend code', authVerifyResending: 'Sending...', authVerifyResent: 'Code sent!', authVerifyBackToLogin: 'Back to login',
  authBlockedTitle: 'Account blocked', authBlockedSub: 'Email verification not completed',
  authBlockedMsg: 'Your email was not verified in time. Please contact the administrator:',
  authBlockedResendHint: 'If you need your verification code again:',
  authBlockedResend: 'Resend code', authBlockedBack: 'Back to login',
  authConsentTitle: 'Privacy', authConsentSub: 'Please accept the privacy policy to continue.',
  authConsentText: 'We process your data according to our privacy policy to provide you the best experience.',
  authConsentCheckLabel: 'I accept the', authConsentPrivacyLink: 'Privacy Policy',
  authConsentTermsLink: 'Terms of Service', authConsentAnd: 'and the',
  authConsentCancel: 'Cancel', authConsentAccept: 'Accept & continue', authConsentAccepting: 'Saving...',
  authPrivacyConsent: 'I accept the Privacy Policy and Terms of Service', authPrivacyConsentRequired: 'Please accept the privacy policy.',
  authNewsletterOptIn: 'Subscribe to newsletter', authNewsletterHint: 'Occasional news and tips via email.',
  authInvalidEmail: 'Please enter a valid email address.',
  authLoginPrivacyNotice: 'By signing in, you agree to our privacy policy.',
  authPrivacyLink: 'Privacy Policy',
}

export const I18N: Record<'de' | 'en', Translations> = { de: DE, en: EN }
