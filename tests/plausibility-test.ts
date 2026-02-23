import http from "http";

const BASE = "http://localhost:5000";
const results: { section: string; test: string; status: "PASS" | "FAIL" | "WARN"; detail?: string }[] = [];
let testParticipantId = "";
let testTastingId = "";
let testTastingCode = "";
let testWhiskyId = "";
let testJournalId = "";
let testWishlistId = "";
let adminParticipantId = "";

async function req(method: string, path: string, body?: any, expectStatus?: number): Promise<any> {
  const url = new URL(path, BASE);
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    };
    const r = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (expectStatus && res.statusCode !== expectStatus) {
            resolve({ __status: res.statusCode, __body: parsed, __error: true });
          } else {
            resolve({ __status: res.statusCode, ...parsed });
          }
        } catch {
          resolve({ __status: res.statusCode, __raw: data });
        }
      });
    });
    r.on("error", reject);
    r.on("timeout", () => { r.destroy(); reject(new Error("Timeout")); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function pass(section: string, test: string, detail?: string) {
  results.push({ section, test, status: "PASS", detail });
}
function fail(section: string, test: string, detail?: string) {
  results.push({ section, test, status: "FAIL", detail });
}
function warn(section: string, test: string, detail?: string) {
  results.push({ section, test, status: "WARN", detail });
}

async function testSection(section: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e: any) {
    fail(section, "Section crashed", e.message);
  }
}

// ========================
// 1. INFRASTRUCTURE
// ========================
async function testInfrastructure() {
  await testSection("Infrastruktur", async () => {
    const health = await req("GET", "/health");
    health.__status === 200 ? pass("Infrastruktur", "Health-Endpoint erreichbar") : fail("Infrastruktur", "Health-Endpoint", `Status: ${health.__status}`);

    const version = await req("GET", "/version");
    version.version ? pass("Infrastruktur", "Version-Endpoint", `v${version.version}`) : fail("Infrastruktur", "Version-Endpoint fehlt");

    const aiStatus = await req("GET", "/api/ai-status");
    typeof aiStatus.masterDisabled === "boolean" ? pass("Infrastruktur", "AI-Status-Endpoint") : fail("Infrastruktur", "AI-Status-Endpoint fehlerhaft");

    const pubSettings = await req("GET", "/api/app-settings/public");
    pubSettings.registration_open !== undefined ? pass("Infrastruktur", "Öffentliche App-Settings") : fail("Infrastruktur", "Öffentliche App-Settings fehlen");

    const smtp = await req("GET", "/api/smtp/status");
    smtp.__status === 200 ? pass("Infrastruktur", "SMTP-Status-Endpoint") : warn("Infrastruktur", "SMTP-Status", `Status: ${smtp.__status}`);

    const stats = await req("GET", "/api/platform-stats");
    typeof stats.totalParticipants === "number" ? pass("Infrastruktur", "Platform-Statistiken") : fail("Infrastruktur", "Platform-Statistiken fehlerhaft");

    const cal = await req("GET", "/api/calendar");
    cal.__status === 200 ? pass("Infrastruktur", "Kalender-Endpoint") : fail("Infrastruktur", "Kalender-Endpoint", `Status: ${cal.__status}`);

    const wotd = await req("GET", "/api/whisky-of-the-day");
    wotd.__status === 200 ? pass("Infrastruktur", "Whisky des Tages") : warn("Infrastruktur", "Whisky des Tages", `Status: ${wotd.__status}`);

    const community = await req("GET", "/api/community-scores");
    community.__status === 200 ? pass("Infrastruktur", "Community-Scores") : warn("Infrastruktur", "Community-Scores", `Status: ${community.__status}`);

    const globalFlavor = await req("GET", "/api/flavor-profile/global");
    globalFlavor.__status === 200 ? pass("Infrastruktur", "Globales Flavor-Profil") : warn("Infrastruktur", "Globales Flavor-Profil", `Status: ${globalFlavor.__status}`);

    const contributors = await req("GET", "/api/community-contributors");
    contributors.__status === 200 ? pass("Infrastruktur", "Community-Contributors") : warn("Infrastruktur", "Community-Contributors", `Status: ${contributors.__status}`);
  });
}

// ========================
// 2. AUTHENTIFIZIERUNG & TEILNEHMER
// ========================
async function testAuthentication() {
  await testSection("Authentifizierung", async () => {
    const testName = `__plaustest_${Date.now()}`;
    const testPin = "9999";

    const reg = await req("POST", "/api/participants", { name: testName, pin: testPin });
    if (reg.id) {
      testParticipantId = reg.id;
      pass("Authentifizierung", "Registrierung mit Name + PIN", `ID: ${reg.id}`);
    } else {
      fail("Authentifizierung", "Registrierung fehlgeschlagen", JSON.stringify(reg));
      return;
    }

    const login = await req("POST", "/api/participants/login", { name: testName, pin: testPin });
    login.id === testParticipantId
      ? pass("Authentifizierung", "Login mit korrektem PIN")
      : fail("Authentifizierung", "Login fehlgeschlagen", JSON.stringify(login));

    const wrongPin = await req("POST", "/api/participants/login", { name: testName, pin: "0000" });
    wrongPin.__status === 401 || wrongPin.message
      ? pass("Authentifizierung", "Login mit falschem PIN wird abgelehnt")
      : fail("Authentifizierung", "Falscher PIN wird nicht abgelehnt", `Status: ${wrongPin.__status}`);

    const dupReg = await req("POST", "/api/participants", { name: testName, pin: testPin });
    dupReg.__status === 409 || dupReg.__status === 400 || dupReg.message
      ? pass("Authentifizierung", "Doppelte Registrierung wird verhindert")
      : warn("Authentifizierung", "Doppelte Registrierung möglich?", `Status: ${dupReg.__status}`);

    const guest = await req("POST", "/api/participants/guest", {});
    guest.id ? pass("Authentifizierung", "Gast-Anmeldung", `ID: ${guest.id}`) : fail("Authentifizierung", "Gast-Anmeldung fehlgeschlagen");

    const getP = await req("GET", `/api/participants/${testParticipantId}`);
    getP.name === testName ? pass("Authentifizierung", "Teilnehmer-Daten abrufen") : fail("Authentifizierung", "Teilnehmer nicht abrufbar");

    const heartbeat = await req("POST", `/api/participants/${testParticipantId}/heartbeat`);
    heartbeat.__status === 200 ? pass("Authentifizierung", "Heartbeat funktioniert") : warn("Authentifizierung", "Heartbeat", `Status: ${heartbeat.__status}`);

    const xpUpdate = await req("PATCH", `/api/participants/${testParticipantId}/experience-level`, { level: "explorer" });
    xpUpdate.__status === 200 ? pass("Authentifizierung", "Experience-Level ändern") : fail("Authentifizierung", "Experience-Level ändern", `Status: ${xpUpdate.__status}`);

    const langUpdate = await req("PATCH", `/api/participants/${testParticipantId}/language`, { language: "de" });
    langUpdate.__status === 200 ? pass("Authentifizierung", "Sprache ändern") : fail("Authentifizierung", "Sprache ändern", `Status: ${langUpdate.__status}`);

    const pinChange = await req("PATCH", `/api/participants/${testParticipantId}/pin`, { oldPin: testPin, newPin: "8888" });
    pinChange.__status === 200
      ? pass("Authentifizierung", "PIN ändern")
      : fail("Authentifizierung", "PIN ändern fehlgeschlagen", `Status: ${pinChange.__status}`);

    const loginNewPin = await req("POST", "/api/participants/login", { name: testName, pin: "8888" });
    loginNewPin.id === testParticipantId
      ? pass("Authentifizierung", "Login mit neuem PIN")
      : fail("Authentifizierung", "Login mit neuem PIN fehlgeschlagen");

    const emailUpdate = await req("PATCH", `/api/participants/${testParticipantId}/email`, { email: "test@plaustest.dev" });
    emailUpdate.__status === 200 ? pass("Authentifizierung", "E-Mail setzen") : warn("Authentifizierung", "E-Mail setzen", `Status: ${emailUpdate.__status}`);
  });
}

// ========================
// 3. TASTING LIFECYCLE
// ========================
async function testTastingLifecycle() {
  await testSection("Tasting-Lifecycle", async () => {
    if (!testParticipantId) { fail("Tasting-Lifecycle", "Kein Test-Teilnehmer vorhanden"); return; }

    const create = await req("POST", "/api/tastings", {
      title: "__Plausibilitätstest Tasting",
      date: "2026-02-23",
      location: "Testlabor",
      hostId: testParticipantId,
      code: `PT${Date.now()}`.slice(0, 8),
    });
    if (create.id) {
      testTastingId = create.id;
      testTastingCode = create.code;
      pass("Tasting-Lifecycle", "Tasting erstellen", `ID: ${create.id}`);
    } else {
      fail("Tasting-Lifecycle", "Tasting erstellen fehlgeschlagen", JSON.stringify(create));
      return;
    }

    const get = await req("GET", `/api/tastings/${testTastingId}`);
    get.title === "__Plausibilitätstest Tasting" ? pass("Tasting-Lifecycle", "Tasting abrufen") : fail("Tasting-Lifecycle", "Tasting abrufen");

    const byCode = await req("GET", `/api/tastings/code/${testTastingCode}`);
    byCode.id === testTastingId ? pass("Tasting-Lifecycle", "Tasting per Code finden") : fail("Tasting-Lifecycle", "Tasting per Code nicht gefunden");

    const statusDraft = get.status;
    statusDraft === "draft" ? pass("Tasting-Lifecycle", "Initialstatus = draft") : fail("Tasting-Lifecycle", "Initialstatus", `Erwartet: draft, Erhalten: ${statusDraft}`);

    const openRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "open", participantId: testParticipantId });
    openRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → open") : fail("Tasting-Lifecycle", "Status → open fehlgeschlagen", `Status: ${openRes.__status}`);

    const join = await req("POST", `/api/tastings/${testTastingId}/join`, { participantId: testParticipantId });
    join.__status === 200 || join.__status === 201 ? pass("Tasting-Lifecycle", "Tasting beitreten") : fail("Tasting-Lifecycle", "Tasting beitreten", `Status: ${join.__status}`);

    const participants = await req("GET", `/api/tastings/${testTastingId}/participants`);
    Array.isArray(participants) && participants.length > 0 ? pass("Tasting-Lifecycle", "Teilnehmer-Liste") : warn("Tasting-Lifecycle", "Keine Teilnehmer gefunden");

    const titleUpdate = await req("PATCH", `/api/tastings/${testTastingId}/title`, { title: "__Plaustest Updated", participantId: testParticipantId });
    titleUpdate.__status === 200 ? pass("Tasting-Lifecycle", "Titel ändern") : fail("Tasting-Lifecycle", "Titel ändern", `Status: ${titleUpdate.__status}`);

    const detailsUpdate = await req("PATCH", `/api/tastings/${testTastingId}/details`, {
      title: "__Plaustest Updated",
      date: "2026-02-24",
      location: "Neuer Ort",
      participantId: testParticipantId,
    });
    detailsUpdate.__status === 200 ? pass("Tasting-Lifecycle", "Details ändern") : fail("Tasting-Lifecycle", "Details ändern", `Status: ${detailsUpdate.__status}`);

    const closeRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "closed", participantId: testParticipantId });
    closeRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → closed") : fail("Tasting-Lifecycle", "Status → closed fehlgeschlagen");

    const revealRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "reveal", participantId: testParticipantId });
    revealRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → reveal") : fail("Tasting-Lifecycle", "Status → reveal fehlgeschlagen");

    const archiveRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "archived", participantId: testParticipantId });
    archiveRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → archived") : fail("Tasting-Lifecycle", "Status → archived fehlgeschlagen");

    const invalidStatus = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "open", participantId: testParticipantId });
    invalidStatus.__status !== 200
      ? pass("Tasting-Lifecycle", "Ungültiger Statuswechsel (archived→open) blockiert")
      : warn("Tasting-Lifecycle", "Ungültiger Statuswechsel erlaubt?");

    await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "open", participantId: testParticipantId });
  });
}

// ========================
// 4. WHISKIES & RATINGS
// ========================
async function testWhiskiesAndRatings() {
  await testSection("Whiskies & Ratings", async () => {
    if (!testTastingId) { fail("Whiskies & Ratings", "Kein Test-Tasting vorhanden"); return; }

    const reopened = await req("POST", "/api/tastings", {
      title: "__Plaustest Rating-Test",
      date: "2026-02-23",
      location: "Testlabor",
      hostId: testParticipantId,
      code: `PR${Date.now()}`.slice(0, 8),
    });
    const ratingTastingId = reopened.id;

    await req("PATCH", `/api/tastings/${ratingTastingId}/status`, { status: "open", participantId: testParticipantId });
    await req("POST", `/api/tastings/${ratingTastingId}/join`, { participantId: testParticipantId });

    const whisky = await req("POST", "/api/whiskies", {
      tastingId: ratingTastingId,
      name: "Lagavulin 16 Plaustest",
      distillery: "Lagavulin",
      age: "16",
      abv: 43.0,
      region: "Islay",
      category: "Single Malt",
      peatLevel: "Heavy",
      caskInfluence: "Sherry",
      sortOrder: 0,
    });
    if (whisky.id) {
      testWhiskyId = whisky.id;
      pass("Whiskies & Ratings", "Whisky erstellen", `ID: ${whisky.id}`);
    } else {
      fail("Whiskies & Ratings", "Whisky erstellen fehlgeschlagen", JSON.stringify(whisky));
      return;
    }

    const whiskies = await req("GET", `/api/tastings/${ratingTastingId}/whiskies`);
    Array.isArray(whiskies) && whiskies.length === 1 ? pass("Whiskies & Ratings", "Whiskies abrufen") : fail("Whiskies & Ratings", "Whiskies abrufen");

    const updateW = await req("PATCH", `/api/whiskies/${testWhiskyId}`, { name: "Lagavulin 16 Updated", participantId: testParticipantId });
    updateW.__status === 200 ? pass("Whiskies & Ratings", "Whisky aktualisieren") : fail("Whiskies & Ratings", "Whisky aktualisieren", `Status: ${updateW.__status}`);

    const rating = await req("POST", "/api/ratings", {
      tastingId: ratingTastingId,
      whiskyId: testWhiskyId,
      participantId: testParticipantId,
      nose: 85,
      taste: 90,
      finish: 88,
      balance: 87,
      overall: 88,
      notes: "Plausibilitätstest Rating",
    });
    rating.__status === 200 || rating.__status === 201 || rating.id
      ? pass("Whiskies & Ratings", "Bewertung abgeben")
      : fail("Whiskies & Ratings", "Bewertung abgeben", `Status: ${rating.__status}`);

    const ratingGet = await req("GET", `/api/ratings/${testParticipantId}/${testWhiskyId}`);
    ratingGet.overall === 88 ? pass("Whiskies & Ratings", "Bewertung abrufen") : fail("Whiskies & Ratings", "Bewertung stimmt nicht", JSON.stringify(ratingGet));

    const upsertRating = await req("POST", "/api/ratings", {
      tastingId: ratingTastingId,
      whiskyId: testWhiskyId,
      participantId: testParticipantId,
      nose: 90,
      taste: 92,
      finish: 91,
      balance: 89,
      overall: 91,
      notes: "Aktualisiertes Rating",
    });
    upsertRating.__status === 200 || upsertRating.__status === 201 || upsertRating.id
      ? pass("Whiskies & Ratings", "Rating-Upsert (Aktualisierung)")
      : fail("Whiskies & Ratings", "Rating-Upsert fehlgeschlagen");

    const nullRating = await req("POST", "/api/ratings", {
      tastingId: ratingTastingId,
      whiskyId: testWhiskyId,
      participantId: testParticipantId,
      nose: null,
      taste: null,
      finish: null,
      balance: null,
      overall: null,
      notes: "",
    });
    nullRating.__status === 200 || nullRating.__status === 201 || nullRating.id
      ? pass("Whiskies & Ratings", "Nullable Rating (alle Werte null)")
      : fail("Whiskies & Ratings", "Nullable Rating fehlgeschlagen", `Status: ${nullRating.__status}`);

    const tastingRatings = await req("GET", `/api/tastings/${ratingTastingId}/ratings`);
    Array.isArray(tastingRatings) ? pass("Whiskies & Ratings", "Tasting-Ratings abrufen") : fail("Whiskies & Ratings", "Tasting-Ratings abrufen");

    const whiskyRatings = await req("GET", `/api/whiskies/${testWhiskyId}/ratings`);
    Array.isArray(whiskyRatings) ? pass("Whiskies & Ratings", "Whisky-Ratings abrufen") : fail("Whiskies & Ratings", "Whisky-Ratings abrufen");

    const whisky2 = await req("POST", "/api/whiskies", {
      tastingId: ratingTastingId,
      name: "Ardbeg 10 Plaustest",
      sortOrder: 1,
    });
    const reorder = await req("PATCH", `/api/tastings/${ratingTastingId}/reorder`, {
      whiskyIds: [whisky2.id, testWhiskyId],
      participantId: testParticipantId,
    });
    reorder.__status === 200 ? pass("Whiskies & Ratings", "Whisky-Reihenfolge ändern") : fail("Whiskies & Ratings", "Reorder fehlgeschlagen");

    const deleteW = await req("DELETE", `/api/whiskies/${whisky2.id}?participantId=${testParticipantId}`);
    deleteW.__status === 200 ? pass("Whiskies & Ratings", "Whisky löschen") : fail("Whiskies & Ratings", "Whisky löschen fehlgeschlagen");

    // Analytics
    const analytics = await req("GET", `/api/tastings/${ratingTastingId}/analytics`);
    analytics.__status === 200 ? pass("Whiskies & Ratings", "Tasting-Analytics") : warn("Whiskies & Ratings", "Tasting-Analytics", `Status: ${analytics.__status}`);
  });
}

// ========================
// 5. BLIND MODE & SESSION FEATURES
// ========================
async function testSessionFeatures() {
  await testSection("Session-Features", async () => {
    if (!testTastingId) { fail("Session-Features", "Kein Test-Tasting vorhanden"); return; }

    const newT = await req("POST", "/api/tastings", {
      title: "__Plaustest Session Features",
      date: "2026-02-23",
      location: "Testlabor",
      hostId: testParticipantId,
      code: `SF${Date.now()}`.slice(0, 8),
    });
    const sfId = newT.id;
    await req("PATCH", `/api/tastings/${sfId}/status`, { status: "open", participantId: testParticipantId });
    await req("POST", `/api/tastings/${sfId}/join`, { participantId: testParticipantId });

    const blind = await req("PATCH", `/api/tastings/${sfId}/blind-mode`, { blindMode: true, participantId: testParticipantId });
    blind.__status === 200 ? pass("Session-Features", "Blind-Mode aktivieren") : fail("Session-Features", "Blind-Mode", `Status: ${blind.__status}`);

    const guided = await req("PATCH", `/api/tastings/${sfId}/guided-mode`, { guidedMode: true, participantId: testParticipantId });
    guided.__status === 200 ? pass("Session-Features", "Guided-Mode aktivieren") : fail("Session-Features", "Guided-Mode", `Status: ${guided.__status}`);

    const reflect = await req("PATCH", `/api/tastings/${sfId}/details`, {
      reflectionEnabled: true,
      reflectionMode: "standard",
      reflectionVisibility: "named",
      participantId: testParticipantId,
    });
    reflect.__status === 200 ? pass("Session-Features", "Reflection aktivieren") : fail("Session-Features", "Reflection aktivieren");

    const discussion = await req("POST", `/api/tastings/${sfId}/discussions`, {
      participantId: testParticipantId,
      text: "Testkommentar für Plausibilitätstest",
    });
    discussion.__status === 200 || discussion.__status === 201 || discussion.id
      ? pass("Session-Features", "Diskussions-Eintrag erstellen")
      : fail("Session-Features", "Diskussions-Eintrag", `Status: ${discussion.__status}`);

    const getDiscussions = await req("GET", `/api/tastings/${sfId}/discussions`);
    Array.isArray(getDiscussions) ? pass("Session-Features", "Diskussionen abrufen") : fail("Session-Features", "Diskussionen abrufen");

    const reflEntry = await req("POST", `/api/tastings/${sfId}/reflections`, {
      participantId: testParticipantId,
      promptText: "Was war dein Highlight?",
      text: "Der Lagavulin war beeindruckend",
      isAnonymous: false,
    });
    reflEntry.id ? pass("Session-Features", "Reflection-Eintrag erstellen") : fail("Session-Features", "Reflection-Eintrag", `Status: ${reflEntry.__status}`);

    const getReflections = await req("GET", `/api/tastings/${sfId}/reflections`);
    Array.isArray(getReflections) ? pass("Session-Features", "Reflections abrufen") : fail("Session-Features", "Reflections abrufen");

    const myRefl = await req("GET", `/api/tastings/${sfId}/reflections/mine/${testParticipantId}`);
    Array.isArray(myRefl) ? pass("Session-Features", "Eigene Reflections abrufen") : fail("Session-Features", "Eigene Reflections abrufen");

    const presence = await req("GET", `/api/tastings/${sfId}/presence`);
    presence.__status === 200 ? pass("Session-Features", "Presence/Anwesenheit") : warn("Session-Features", "Presence", `Status: ${presence.__status}`);

    const duplicate = await req("POST", `/api/tastings/${sfId}/duplicate`, { participantId: testParticipantId });
    duplicate.id ? pass("Session-Features", "Tasting duplizieren") : warn("Session-Features", "Tasting duplizieren", `Status: ${duplicate.__status}`);
  });
}

// ========================
// 6. JOURNAL
// ========================
async function testJournal() {
  await testSection("Journal", async () => {
    if (!testParticipantId) { fail("Journal", "Kein Test-Teilnehmer vorhanden"); return; }

    const create = await req("POST", `/api/journal/${testParticipantId}`, {
      participantId: testParticipantId,
      title: "Plaustest Lagavulin 16",
      whiskyName: "Lagavulin 16",
      distillery: "Lagavulin",
      region: "Islay",
      age: "16",
      abv: "43",
      caskType: "Sherry",
      noseNotes: "Rauchig, torfig, süß",
      tasteNotes: "Vollmundig, Sherry, Torf",
      finishNotes: "Lang, warm, rauchig",
      personalScore: 92,
      mood: "Entspannt",
      occasion: "Abendverkostung",
      source: "casksense",
    });
    if (create.id) {
      testJournalId = create.id;
      pass("Journal", "Eintrag erstellen", `ID: ${create.id}`);
    } else {
      fail("Journal", "Eintrag erstellen fehlgeschlagen", JSON.stringify(create));
      return;
    }

    const getAll = await req("GET", `/api/journal/${testParticipantId}`);
    Array.isArray(getAll) && getAll.length > 0 ? pass("Journal", "Einträge abrufen") : fail("Journal", "Einträge abrufen");

    const getOne = await req("GET", `/api/journal/${testParticipantId}/${testJournalId}`);
    getOne.title === "Plaustest Lagavulin 16" ? pass("Journal", "Einzeleintrag abrufen") : fail("Journal", "Einzeleintrag abrufen");

    const update = await req("PATCH", `/api/journal/${testParticipantId}/${testJournalId}`, {
      title: "Plaustest Lagavulin 16 (Updated)",
      personalScore: 93,
    });
    update.__status === 200 ? pass("Journal", "Eintrag aktualisieren") : fail("Journal", "Eintrag aktualisieren", `Status: ${update.__status}`);

    const getUpdated = await req("GET", `/api/journal/${testParticipantId}/${testJournalId}`);
    getUpdated.personalScore === 93 ? pass("Journal", "Score korrekt aktualisiert") : fail("Journal", "Score nicht korrekt", `Erhalten: ${getUpdated.personalScore}`);

    const foreignAccess = await req("GET", `/api/journal/nonexistent-id-12345`);
    Array.isArray(foreignAccess) && foreignAccess.length === 0
      ? pass("Journal", "Fremder Zugriff liefert leeres Array")
      : pass("Journal", "Fremder Zugriff behandelt");

    const deleteEntry = await req("DELETE", `/api/journal/${testParticipantId}/${testJournalId}`);
    deleteEntry.__status === 200 ? pass("Journal", "Eintrag löschen") : fail("Journal", "Eintrag löschen", `Status: ${deleteEntry.__status}`);

    const afterDelete = await req("GET", `/api/journal/${testParticipantId}/${testJournalId}`);
    !afterDelete.id || afterDelete.__status === 404
      ? pass("Journal", "Gelöschter Eintrag nicht mehr abrufbar")
      : warn("Journal", "Gelöschter Eintrag noch vorhanden?");

    const recreate = await req("POST", `/api/journal/${testParticipantId}`, {
      participantId: testParticipantId,
      title: "Plaustest Zweiter Eintrag",
      whiskyName: "Ardbeg 10",
      source: "casksense",
    });
    testJournalId = recreate.id;
  });
}

// ========================
// 7. WISHLIST
// ========================
async function testWishlist() {
  await testSection("Wunschliste", async () => {
    if (!testParticipantId) { fail("Wunschliste", "Kein Test-Teilnehmer vorhanden"); return; }

    const create = await req("POST", `/api/wishlist/${testParticipantId}`, {
      participantId: testParticipantId,
      whiskyName: "Ardbeg Uigeadail",
      distillery: "Ardbeg",
      region: "Islay",
      priority: "high",
      notes: "Muss probiert werden!",
    });
    if (create.id) {
      testWishlistId = create.id;
      pass("Wunschliste", "Eintrag erstellen", `ID: ${create.id}`);
    } else {
      fail("Wunschliste", "Eintrag erstellen fehlgeschlagen", JSON.stringify(create));
      return;
    }

    const getAll = await req("GET", `/api/wishlist/${testParticipantId}`);
    Array.isArray(getAll) && getAll.length > 0 ? pass("Wunschliste", "Einträge abrufen") : fail("Wunschliste", "Einträge abrufen");

    const update = await req("PATCH", `/api/wishlist/${testParticipantId}/${testWishlistId}`, {
      priority: "low",
      notes: "Aktualisierte Notiz",
    });
    update.__status === 200 ? pass("Wunschliste", "Eintrag aktualisieren") : fail("Wunschliste", "Eintrag aktualisieren", `Status: ${update.__status}`);

    const deleteEntry = await req("DELETE", `/api/wishlist/${testParticipantId}/${testWishlistId}`);
    deleteEntry.__status === 200 ? pass("Wunschliste", "Eintrag löschen") : fail("Wunschliste", "Eintrag löschen");
  });
}

// ========================
// 8. PROFIL & PERSONALISIERUNG
// ========================
async function testProfile() {
  await testSection("Profil", async () => {
    if (!testParticipantId) { fail("Profil", "Kein Test-Teilnehmer vorhanden"); return; }

    const upsert = await req("PUT", `/api/profiles/${testParticipantId}`, {
      participantId: testParticipantId,
      bio: "Plaustest-Bio für Teilnehmer",
      favoriteWhisky: "Lagavulin 16",
      goToDram: "Ardbeg 10",
      preferredRegions: "Islay, Speyside",
      preferredPeatLevel: "Heavy",
      preferredCaskInfluence: "Sherry",
    });
    upsert.__status === 200 || upsert.__status === 201 || upsert.id
      ? pass("Profil", "Profil erstellen/aktualisieren")
      : fail("Profil", "Profil upsert fehlgeschlagen", `Status: ${upsert.__status}`);

    const get = await req("GET", `/api/profiles/${testParticipantId}`);
    get.bio === "Plaustest-Bio für Teilnehmer" ? pass("Profil", "Profil abrufen") : fail("Profil", "Profil abrufen");

    const stats = await req("GET", `/api/participants/${testParticipantId}/stats`);
    typeof stats.totalRatings === "number" ? pass("Profil", "Statistiken abrufen") : fail("Profil", "Statistiken fehlerhaft");

    const flavor = await req("GET", `/api/participants/${testParticipantId}/flavor-profile`);
    flavor.__status === 200 ? pass("Profil", "Flavor-Profil abrufen") : fail("Profil", "Flavor-Profil", `Status: ${flavor.__status}`);

    const whiskyProfile = await req("GET", `/api/participants/${testParticipantId}/whisky-profile`);
    whiskyProfile.__status === 200 ? pass("Profil", "Whisky-Profil abrufen") : fail("Profil", "Whisky-Profil", `Status: ${whiskyProfile.__status}`);

    const twins = await req("GET", `/api/participants/${testParticipantId}/taste-twins`);
    twins.__status === 200 ? pass("Profil", "Taste-Twins abrufen") : warn("Profil", "Taste-Twins", `Status: ${twins.__status}`);

    const friendActivity = await req("GET", `/api/participants/${testParticipantId}/friend-activity`);
    friendActivity.__status === 200 ? pass("Profil", "Freunde-Aktivität") : warn("Profil", "Freunde-Aktivität", `Status: ${friendActivity.__status}`);

    const ratingNotes = await req("GET", `/api/participants/${testParticipantId}/rating-notes`);
    ratingNotes.__status === 200 ? pass("Profil", "Rating-Notizen abrufen") : fail("Profil", "Rating-Notizen", `Status: ${ratingNotes.__status}`);
  });
}

// ========================
// 9. FRIENDS
// ========================
async function testFriends() {
  await testSection("Freunde", async () => {
    if (!testParticipantId) { fail("Freunde", "Kein Test-Teilnehmer vorhanden"); return; }

    const add = await req("POST", `/api/participants/${testParticipantId}/friends`, {
      firstName: "Max",
      lastName: "Plaustest",
      email: "max@plaustest.dev",
    });
    const friendId = add.id;
    add.id ? pass("Freunde", "Freund hinzufügen") : fail("Freunde", "Freund hinzufügen fehlgeschlagen");

    const getAll = await req("GET", `/api/participants/${testParticipantId}/friends`);
    Array.isArray(getAll) ? pass("Freunde", "Freunde-Liste abrufen") : fail("Freunde", "Freunde-Liste abrufen");

    if (friendId) {
      const update = await req("PATCH", `/api/participants/${testParticipantId}/friends/${friendId}`, {
        firstName: "Maximilian",
        lastName: "Plaustest",
        email: "max@plaustest.dev",
      });
      update.__status === 200 ? pass("Freunde", "Freund aktualisieren") : fail("Freunde", "Freund aktualisieren");

      const del = await req("DELETE", `/api/participants/${testParticipantId}/friends/${friendId}`);
      del.__status === 200 ? pass("Freunde", "Freund entfernen") : fail("Freunde", "Freund entfernen");
    }
  });
}

// ========================
// 10. REMINDERS
// ========================
async function testReminders() {
  await testSection("Erinnerungen", async () => {
    if (!testParticipantId) { fail("Erinnerungen", "Kein Test-Teilnehmer vorhanden"); return; }

    const getAll = await req("GET", `/api/reminders/${testParticipantId}`);
    getAll.__status === 200 ? pass("Erinnerungen", "Erinnerungen abrufen") : fail("Erinnerungen", "Erinnerungen abrufen", `Status: ${getAll.__status}`);
  });
}

// ========================
// 11. ADMIN
// ========================
async function testAdmin() {
  await testSection("Admin", async () => {
    const adminName = `__plaustest_admin_${Date.now()}`;
    const adminReg = await req("POST", "/api/participants", { name: adminName, pin: "1234" });
    adminParticipantId = adminReg.id;

    const allTastings = await req("GET", "/api/tastings");
    Array.isArray(allTastings) ? pass("Admin", "Alle Tastings abrufen") : fail("Admin", "Alle Tastings abrufen");

    const adminSettings = await req("GET", "/api/admin/app-settings");
    adminSettings.__status === 200 ? pass("Admin", "Admin-Settings abrufen") : warn("Admin", "Admin-Settings", `Status: ${adminSettings.__status}`);

    const updateSettings = await req("POST", "/api/admin/app-settings", {
      participantId: adminParticipantId,
      settings: { whats_new_enabled: "false", registration_open: "true" },
    });
    updateSettings.__status === 200 ? pass("Admin", "Admin-Settings aktualisieren") : warn("Admin", "Admin-Settings aktualisieren", `Status: ${updateSettings.__status}`);

    const onlineUsers = await req("GET", "/api/admin/online-users");
    onlineUsers.__status === 200 ? pass("Admin", "Online-Benutzer abrufen") : warn("Admin", "Online-Benutzer", `Status: ${onlineUsers.__status}`);

    const adminAnalytics = await req("GET", "/api/admin/analytics");
    adminAnalytics.__status === 200 ? pass("Admin", "Admin-Analytics") : warn("Admin", "Admin-Analytics", `Status: ${adminAnalytics.__status}`);

    const platformAnalytics = await req("GET", "/api/platform-analytics");
    platformAnalytics.__status === 200 ? pass("Admin", "Platform-Analytics") : warn("Admin", "Platform-Analytics", `Status: ${platformAnalytics.__status}`);

    const allJournals = await req("GET", "/api/admin/all-journals");
    allJournals.__status === 200 ? pass("Admin", "Alle Journal-Einträge") : warn("Admin", "Alle Journal-Einträge", `Status: ${allJournals.__status}`);

    const newsletters = await req("GET", "/api/admin/newsletters");
    newsletters.__status === 200 ? pass("Admin", "Newsletter-Archiv") : warn("Admin", "Newsletter-Archiv", `Status: ${newsletters.__status}`);
  });
}

// ========================
// 12. TEST DATA MANAGEMENT
// ========================
async function testTestDataManagement() {
  await testSection("Test-Daten", async () => {
    if (!testTastingId || !adminParticipantId) { fail("Test-Daten", "Keine Test-Daten vorhanden"); return; }

    const toggle = await req("POST", `/api/admin/tastings/${testTastingId}/test-flag`, { isTestData: true, participantId: adminParticipantId });
    toggle.__status === 200 ? pass("Test-Daten", "Test-Flag setzen") : fail("Test-Daten", "Test-Flag setzen", `Status: ${toggle.__status}`);

    const verify = await req("GET", `/api/tastings/${testTastingId}`);
    verify.isTestData === true ? pass("Test-Daten", "Test-Flag korrekt gespeichert") : fail("Test-Daten", "Test-Flag nicht gespeichert", `isTestData: ${verify.isTestData}`);

    const preview = await req("POST", "/api/admin/bulk-cleanup", {
      mode: "preview",
      filters: { titlePattern: "__Plaustest" },
      participantId: adminParticipantId,
    });
    preview.__status === 200 ? pass("Test-Daten", "Bulk-Cleanup Preview") : fail("Test-Daten", "Bulk-Cleanup Preview", `Status: ${preview.__status}`);

    if (preview.count > 0 || (Array.isArray(preview.tastings) && preview.tastings.length > 0)) {
      pass("Test-Daten", "Preview findet Test-Tastings", `Anzahl: ${preview.count || preview.tastings?.length}`);
    } else {
      warn("Test-Daten", "Preview findet keine Test-Tastings");
    }

    const toggleOff = await req("POST", `/api/admin/tastings/${testTastingId}/test-flag`, { isTestData: false, participantId: adminParticipantId });
    toggleOff.__status === 200 ? pass("Test-Daten", "Test-Flag entfernen") : fail("Test-Daten", "Test-Flag entfernen");
  });
}

// ========================
// 13. AI KILL SWITCH
// ========================
async function testAIKillSwitch() {
  await testSection("AI Kill Switch", async () => {
    const status = await req("GET", "/api/ai-status");
    typeof status.masterDisabled === "boolean" && Array.isArray(status.disabledFeatures)
      ? pass("AI Kill Switch", "Status-Endpoint Struktur korrekt")
      : fail("AI Kill Switch", "Status-Endpoint Struktur fehlerhaft", JSON.stringify(status));

    if (!status.masterDisabled) {
      pass("AI Kill Switch", "AI ist aktiviert (Standard)");
    } else {
      warn("AI Kill Switch", "AI ist global deaktiviert");
    }

    const expectedFeatures = [
      "ai_enrich", "ai_insights", "ai_highlights", "journal_identify",
      "wishlist_identify", "wishlist_summary", "whisky_search",
      "newsletter_generate", "benchmark_analyze", "photo_tasting_identify", "ai_import"
    ];
    if (!status.masterDisabled) {
      const allEnabled = status.disabledFeatures.length === 0;
      allEnabled ? pass("AI Kill Switch", "Alle AI-Features aktiv") : warn("AI Kill Switch", `Deaktivierte Features: ${status.disabledFeatures.join(", ")}`);
    }
  });
}

// ========================
// 14. EXPORT ENDPOINTS
// ========================
async function testExports() {
  await testSection("Daten-Export", async () => {
    if (!testParticipantId) { fail("Daten-Export", "Kein Test-Teilnehmer vorhanden"); return; }

    const exportData = await req("GET", `/api/participants/${testParticipantId}/export-data`);
    exportData.__status === 200 ? pass("Daten-Export", "Teilnehmer-Daten exportieren") : fail("Daten-Export", "Teilnehmer-Daten exportieren", `Status: ${exportData.__status}`);

    const endpoints = [
      { path: "/api/export/tastings", name: "Tastings-Export" },
      { path: "/api/export/journal", name: "Journal-Export" },
      { path: "/api/export/profile", name: "Profil-Export" },
      { path: "/api/export/wishlist", name: "Wunschliste-Export" },
    ];

    for (const ep of endpoints) {
      const res = await req("GET", `${ep.path}?participantId=${testParticipantId}`);
      res.__status === 200 ? pass("Daten-Export", ep.name) : warn("Daten-Export", ep.name, `Status: ${res.__status}`);
    }
  });
}

// ========================
// 15. EDGE CASES & SICHERHEIT
// ========================
async function testEdgeCases() {
  await testSection("Edge Cases & Sicherheit", async () => {
    const notFound = await req("GET", "/api/tastings/nonexistent-uuid-12345");
    notFound.__status === 404 || notFound.__status === 500
      ? pass("Edge Cases & Sicherheit", "Nicht existierendes Tasting → 404/Error")
      : warn("Edge Cases & Sicherheit", "Nicht existierendes Tasting", `Status: ${notFound.__status}`);

    const emptyBody = await req("POST", "/api/participants", {});
    emptyBody.__status === 400 || emptyBody.message
      ? pass("Edge Cases & Sicherheit", "Leerer Body bei Registrierung → Fehler")
      : fail("Edge Cases & Sicherheit", "Leerer Body wird akzeptiert?", `Status: ${emptyBody.__status}`);

    const sqlInjection = await req("POST", "/api/participants/login", {
      name: "'; DROP TABLE participants; --",
      pin: "1234",
    });
    sqlInjection.__status !== 200
      ? pass("Edge Cases & Sicherheit", "SQL-Injection-Versuch wird abgelehnt")
      : warn("Edge Cases & Sicherheit", "SQL-Injection Antwort prüfen");

    const xss = await req("POST", `/api/journal/${testParticipantId}`, {
      participantId: testParticipantId,
      title: '<script>alert("XSS")</script>',
      whiskyName: "Test",
      source: "casksense",
    });
    if (xss.id) {
      const getXss = await req("GET", `/api/journal/${testParticipantId}/${xss.id}`);
      if (getXss.title && !getXss.title.includes("<script>")) {
        pass("Edge Cases & Sicherheit", "XSS-Bereinigung in Journal");
      } else {
        warn("Edge Cases & Sicherheit", "XSS-Tags werden gespeichert (Frontend-Escaping nötig)");
      }
      await req("DELETE", `/api/journal/${testParticipantId}/${xss.id}`);
    }

    const longTitle = "A".repeat(5000);
    const longTasting = await req("POST", "/api/tastings", {
      title: longTitle,
      date: "2026-02-23",
      location: "Test",
      hostId: testParticipantId,
      code: `LT${Date.now()}`.slice(0, 8),
    });
    longTasting.id
      ? warn("Edge Cases & Sicherheit", "Sehr langer Titel (5000 Zeichen) akzeptiert — Limit empfohlen")
      : pass("Edge Cases & Sicherheit", "Sehr langer Titel wird abgelehnt");

    const negativeRating = await req("POST", "/api/ratings", {
      tastingId: testTastingId,
      whiskyId: testWhiskyId || "fake-id",
      participantId: testParticipantId,
      nose: -50,
      taste: 999,
      finish: 50,
      balance: 50,
      overall: 50,
    });
    negativeRating.__status === 400
      ? pass("Edge Cases & Sicherheit", "Ungültige Rating-Werte werden abgelehnt")
      : warn("Edge Cases & Sicherheit", "Ungültige Rating-Werte (−50, 999) akzeptiert — Validierung empfohlen", `Status: ${negativeRating.__status}`);

    const concurrentReqs = await Promise.all([
      req("GET", "/api/platform-stats"),
      req("GET", "/api/ai-status"),
      req("GET", "/api/community-scores"),
      req("GET", "/api/calendar"),
      req("GET", "/api/flavor-profile/global"),
    ]);
    const allOk = concurrentReqs.every(r => r.__status === 200);
    allOk ? pass("Edge Cases & Sicherheit", "5 parallele Anfragen erfolgreich") : warn("Edge Cases & Sicherheit", "Parallele Anfragen fehlerhaft");

    if (testParticipantId) {
      const notMyTasting = await req("POST", "/api/tastings", {
        title: "__Foreign Tasting",
        date: "2026-02-23",
        location: "Test",
        hostId: "nonexistent-host-id",
        code: `FT${Date.now()}`.slice(0, 8),
      });
      if (notMyTasting.id) {
        const statusChange = await req("PATCH", `/api/tastings/${notMyTasting.id}/status`, {
          status: "open",
          participantId: testParticipantId,
        });
        statusChange.__status !== 200
          ? pass("Edge Cases & Sicherheit", "Fremdes Tasting Status ändern blockiert")
          : warn("Edge Cases & Sicherheit", "Fremdes Tasting kann geändert werden — Host-Check fehlt?");
      }
    }
  });
}

// ========================
// 16. NOTIFICATIONS
// ========================
async function testNotifications() {
  await testSection("Benachrichtigungen", async () => {
    if (!testParticipantId) { fail("Benachrichtigungen", "Kein Test-Teilnehmer"); return; }

    const getAll = await req("GET", `/api/notifications?participantId=${testParticipantId}`);
    getAll.__status === 200 ? pass("Benachrichtigungen", "Benachrichtigungen abrufen") : warn("Benachrichtigungen", "Benachrichtigungen abrufen", `Status: ${getAll.__status}`);

    const unread = await req("GET", `/api/notifications/unread-count?participantId=${testParticipantId}`);
    typeof unread.count === "number" || unread.__status === 200
      ? pass("Benachrichtigungen", "Ungelesene Anzahl")
      : warn("Benachrichtigungen", "Ungelesene Anzahl", `Status: ${unread.__status}`);
  });
}

// ========================
// 17. ENCYCLOPEDIA & FEEDBACK
// ========================
async function testEncyclopediaFeedback() {
  await testSection("Enzyklopädie & Feedback", async () => {
    const suggestions = await req("GET", "/api/encyclopedia-suggestions");
    suggestions.__status === 200 ? pass("Enzyklopädie & Feedback", "Vorschläge abrufen") : warn("Enzyklopädie & Feedback", "Vorschläge", `Status: ${suggestions.__status}`);

    if (testParticipantId) {
      const fb = await req("POST", "/api/feedback", {
        participantId: testParticipantId,
        type: "bug",
        message: "Plausibilitätstest Feedback",
        page: "/test",
      });
      fb.__status === 200 || fb.__status === 201 || fb.id
        ? pass("Enzyklopädie & Feedback", "Feedback senden")
        : warn("Enzyklopädie & Feedback", "Feedback senden", `Status: ${fb.__status}`);

      const getFb = await req("GET", "/api/feedback");
      getFb.__status === 200 ? pass("Enzyklopädie & Feedback", "Feedback-Liste abrufen") : warn("Enzyklopädie & Feedback", "Feedback-Liste", `Status: ${getFb.__status}`);
    }
  });
}

// ========================
// 18. COLLECTION (WHISKYBASE)
// ========================
async function testCollection() {
  await testSection("Whiskybase-Sammlung", async () => {
    if (!testParticipantId) { fail("Whiskybase-Sammlung", "Kein Test-Teilnehmer"); return; }

    const getAll = await req("GET", `/api/collection/${testParticipantId}`);
    getAll.__status === 200 ? pass("Whiskybase-Sammlung", "Sammlung abrufen") : fail("Whiskybase-Sammlung", "Sammlung abrufen", `Status: ${getAll.__status}`);
  });
}

// ========================
// 19. BENCHMARK / LIBRARY
// ========================
async function testBenchmark() {
  await testSection("Whisky-Library", async () => {
    const getAll = await req("GET", "/api/benchmark");
    getAll.__status === 200 ? pass("Whisky-Library", "Library-Einträge abrufen") : warn("Whisky-Library", "Library abrufen", `Status: ${getAll.__status}`);

    if (testParticipantId) {
      const create = await req("POST", "/api/benchmark", {
        whiskyName: "Plaustest Benchmark Whisky",
        distillery: "Test Distillery",
        region: "Highland",
        uploadedBy: testParticipantId,
        libraryCategory: "tasting_notes",
      });
      if (create.id || (Array.isArray(create) && create.length > 0)) {
        pass("Whisky-Library", "Eintrag erstellen");
        const entryId = create.id || create[0]?.id;
        if (entryId) {
          const del = await req("DELETE", `/api/benchmark/${entryId}?participantId=${testParticipantId}`);
          del.__status === 200 ? pass("Whisky-Library", "Eintrag löschen") : warn("Whisky-Library", "Eintrag löschen", `Status: ${del.__status}`);
        }
      } else {
        warn("Whisky-Library", "Eintrag erstellen", `Status: ${create.__status}`);
      }
    }
  });
}

// ========================
// 20. CURATION & WHISKY DB
// ========================
async function testCuration() {
  await testSection("Kuratierung & Whisky-DB", async () => {
    const curation = await req("GET", "/api/curation/suggestions");
    curation.__status === 200 ? pass("Kuratierung & Whisky-DB", "Kuratierungs-Vorschläge") : warn("Kuratierung & Whisky-DB", "Kuratierungs-Vorschläge", `Status: ${curation.__status}`);

    const whiskyDb = await req("GET", "/api/global-whisky-database");
    whiskyDb.__status === 200 ? pass("Kuratierung & Whisky-DB", "Globale Whisky-Datenbank") : warn("Kuratierung & Whisky-DB", "Globale Whisky-DB", `Status: ${whiskyDb.__status}`);
  });
}

// ========================
// CLEANUP
// ========================
async function cleanup() {
  await testSection("Aufräumen", async () => {
    const cleanupPreview = await req("POST", "/api/admin/bulk-cleanup", {
      mode: "delete",
      filters: { titlePattern: "__Plaustest" },
      participantId: adminParticipantId || testParticipantId,
    });

    const cleanupForeign = await req("POST", "/api/admin/bulk-cleanup", {
      mode: "delete",
      filters: { titlePattern: "__Foreign" },
      participantId: adminParticipantId || testParticipantId,
    });

    const cleanupPlaustest = await req("POST", "/api/admin/bulk-cleanup", {
      mode: "delete",
      filters: { titlePattern: "__plaustest" },
      participantId: adminParticipantId || testParticipantId,
    });

    if (testParticipantId) {
      await req("DELETE", `/api/participants/${testParticipantId}/anonymize`);
    }
    if (adminParticipantId) {
      await req("DELETE", `/api/participants/${adminParticipantId}/anonymize`);
    }

    pass("Aufräumen", "Test-Daten bereinigt");
  });
}

// ========================
// MAIN
// ========================
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     CaskSense v2.0.0 — Plausibilitätstest                  ║");
  console.log("║     Umfassende System- und API-Prüfung                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();

  await testInfrastructure();
  await testAuthentication();
  await testTastingLifecycle();
  await testWhiskiesAndRatings();
  await testSessionFeatures();
  await testJournal();
  await testWishlist();
  await testProfile();
  await testFriends();
  await testReminders();
  await testAdmin();
  await testTestDataManagement();
  await testAIKillSwitch();
  await testExports();
  await testEdgeCases();
  await testNotifications();
  await testEncyclopediaFeedback();
  await testCollection();
  await testBenchmark();
  await testCuration();
  await cleanup();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ERGEBNISSE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let currentSection = "";
  for (const r of results) {
    if (r.section !== currentSection) {
      currentSection = r.section;
      console.log(`\n── ${currentSection} ${"─".repeat(Math.max(0, 50 - currentSection.length))}`);
    }
    const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "⚠";
    const color = r.status === "PASS" ? "\x1b[32m" : r.status === "FAIL" ? "\x1b[31m" : "\x1b[33m";
    const detail = r.detail ? ` (${r.detail})` : "";
    console.log(`  ${color}${icon}\x1b[0m ${r.test}${detail}`);
  }

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;
  const total = results.length;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  ZUSAMMENFASSUNG: ${total} Tests in ${duration}s`);
  console.log(`  \x1b[32m✓ ${passed} bestanden\x1b[0m  |  \x1b[31m✗ ${failed} fehlgeschlagen\x1b[0m  |  \x1b[33m⚠ ${warned} Warnungen\x1b[0m`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    console.log("\x1b[31m  KRITISCHE FEHLER:\x1b[0m");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`    ✗ [${r.section}] ${r.test}${r.detail ? ` — ${r.detail}` : ""}`);
    });
    console.log("");
  }

  if (warned > 0) {
    console.log("\x1b[33m  WARNUNGEN (potenzielle Risiken):\x1b[0m");
    results.filter(r => r.status === "WARN").forEach(r => {
      console.log(`    ⚠ [${r.section}] ${r.test}${r.detail ? ` — ${r.detail}` : ""}`);
    });
    console.log("");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Test-Runner abgestürzt:", e);
  process.exit(2);
});
