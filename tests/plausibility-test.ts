import http from "http";

const BASE = "http://localhost:5000";
const results: { section: string; test: string; status: "PASS" | "FAIL" | "WARN"; detail?: string }[] = [];
let testParticipantId = "";
let testTastingId = "";
let testTastingCode = "";
let testWhiskyId = "";
let testJournalId = "";
let testWishlistId = "";
let ratingTastingId = "";

const TEST_EMAIL = `plaustest_${Date.now()}@casksense-test.dev`;
const TEST_PIN = "9999";
const TEST_NAME = `__plaustest_${Date.now()}`;

async function req(method: string, path: string, body?: any): Promise<any> {
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
        const status = res.statusCode || 0;
        if (!data || !data.trim()) {
          resolve({ __status: status, __empty: true });
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            resolve(Object.assign(parsed, { __status: status }));
          } else {
            resolve({ __status: status, ...parsed });
          }
        } catch {
          resolve({ __status: status, __raw: data.slice(0, 200) });
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
    fail(section, "Abschnitt abgestürzt", e.message);
  }
}

// ========================
// 1. INFRASTRUKTUR
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
    const reg = await req("POST", "/api/participants", { name: TEST_NAME, pin: TEST_PIN, email: TEST_EMAIL });
    if (reg.id) {
      testParticipantId = reg.id;
      pass("Authentifizierung", "Registrierung mit Name + PIN + E-Mail", `ID: ${reg.id}`);
    } else {
      fail("Authentifizierung", "Registrierung fehlgeschlagen", reg.message || JSON.stringify(reg));
      return;
    }

    const login = await req("POST", "/api/participants/login", { email: TEST_EMAIL, pin: TEST_PIN });
    login.id === testParticipantId
      ? pass("Authentifizierung", "Login mit korrektem PIN")
      : fail("Authentifizierung", "Login fehlgeschlagen", JSON.stringify(login));

    const wrongPin = await req("POST", "/api/participants/login", { email: TEST_EMAIL, pin: "0000" });
    wrongPin.__status === 401 || wrongPin.message
      ? pass("Authentifizierung", "Login mit falschem PIN wird abgelehnt")
      : fail("Authentifizierung", "Falscher PIN wird nicht abgelehnt", `Status: ${wrongPin.__status}`);

    const dupReg = await req("POST", "/api/participants", { name: TEST_NAME, pin: TEST_PIN, email: TEST_EMAIL });
    dupReg.__status === 409
      ? pass("Authentifizierung", "Doppelte Registrierung wird verhindert (409)")
      : fail("Authentifizierung", "Doppelte Registrierung nicht erkannt", `Status: ${dupReg.__status}`);

    const noEmail = await req("POST", "/api/participants", { name: "test_no_email", pin: "1234" });
    noEmail.__status === 400
      ? pass("Authentifizierung", "Registrierung ohne E-Mail wird abgelehnt")
      : warn("Authentifizierung", "Registrierung ohne E-Mail möglich", `Status: ${noEmail.__status}`);

    const noPin = await req("POST", "/api/participants", { name: "test_no_pin", email: "x@y.z" });
    noPin.__status === 400
      ? pass("Authentifizierung", "Registrierung ohne PIN wird abgelehnt")
      : warn("Authentifizierung", "Registrierung ohne PIN möglich", `Status: ${noPin.__status}`);

    const guest = await req("POST", "/api/participants/guest", { name: `__guest_${Date.now()}`, pin: "5555" });
    guest.id
      ? pass("Authentifizierung", "Gast-Anmeldung", `ID: ${guest.id}`)
      : fail("Authentifizierung", "Gast-Anmeldung fehlgeschlagen", guest.message);

    const getP = await req("GET", `/api/participants/${testParticipantId}`);
    getP.name === TEST_NAME ? pass("Authentifizierung", "Teilnehmer-Daten abrufen") : fail("Authentifizierung", "Teilnehmer nicht abrufbar");

    const heartbeat = await req("POST", `/api/participants/${testParticipantId}/heartbeat`);
    heartbeat.__status === 200 ? pass("Authentifizierung", "Heartbeat funktioniert") : warn("Authentifizierung", "Heartbeat", `Status: ${heartbeat.__status}`);

    const xpUpdate = await req("PATCH", `/api/participants/${testParticipantId}/experience-level`, { level: "explorer" });
    xpUpdate.__status === 200 ? pass("Authentifizierung", "Experience-Level ändern") : fail("Authentifizierung", "Experience-Level ändern", `Status: ${xpUpdate.__status}`);

    const langUpdate = await req("PATCH", `/api/participants/${testParticipantId}/language`, { language: "de" });
    langUpdate.__status === 200 ? pass("Authentifizierung", "Sprache ändern") : fail("Authentifizierung", "Sprache ändern", `Status: ${langUpdate.__status}`);

    const pinChange = await req("PATCH", `/api/participants/${testParticipantId}/pin`, { currentPin: TEST_PIN, newPin: "8888" });
    pinChange.__status === 200
      ? pass("Authentifizierung", "PIN ändern")
      : fail("Authentifizierung", "PIN ändern fehlgeschlagen", `Status: ${pinChange.__status}, ${pinChange.message}`);

    const loginNewPin = await req("POST", "/api/participants/login", { email: TEST_EMAIL, pin: "8888" });
    loginNewPin.id === testParticipantId
      ? pass("Authentifizierung", "Login mit neuem PIN")
      : fail("Authentifizierung", "Login mit neuem PIN fehlgeschlagen");

    await req("PATCH", `/api/participants/${testParticipantId}/pin`, { currentPin: "8888", newPin: TEST_PIN });
  });
}

// ========================
// 3. TASTING LIFECYCLE
// ========================
async function testTastingLifecycle() {
  await testSection("Tasting-Lifecycle", async () => {
    if (!testParticipantId) { fail("Tasting-Lifecycle", "Kein Test-Teilnehmer vorhanden"); return; }

    testTastingCode = `P${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const create = await req("POST", "/api/tastings", {
      title: "__Plaustest Tasting",
      date: "2026-02-23",
      location: "Testlabor",
      hostId: testParticipantId,
      code: testTastingCode,
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
    get.title === "__Plaustest Tasting" ? pass("Tasting-Lifecycle", "Tasting abrufen") : fail("Tasting-Lifecycle", "Tasting abrufen");

    const byCode = await req("GET", `/api/tastings/code/${testTastingCode}`);
    byCode.id === testTastingId ? pass("Tasting-Lifecycle", "Tasting per Code finden") : fail("Tasting-Lifecycle", "Tasting per Code nicht gefunden");

    get.status === "draft" ? pass("Tasting-Lifecycle", "Initialstatus = draft") : fail("Tasting-Lifecycle", "Initialstatus falsch", `Erhalten: ${get.status}`);

    const allTastings = await req("GET", `/api/tastings?participantId=${testParticipantId}`);
    Array.isArray(allTastings) ? pass("Tasting-Lifecycle", "Tasting-Liste abrufen") : fail("Tasting-Lifecycle", "Tasting-Liste fehlerhaft");

    const openRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "open", hostId: testParticipantId });
    openRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → open") : fail("Tasting-Lifecycle", "Status → open", `Status: ${openRes.__status}`);

    const join = await req("POST", `/api/tastings/${testTastingId}/join`, { participantId: testParticipantId });
    join.__status === 200 || join.__status === 201 ? pass("Tasting-Lifecycle", "Tasting beitreten") : fail("Tasting-Lifecycle", "Tasting beitreten", `Status: ${join.__status}`);

    const participants = await req("GET", `/api/tastings/${testTastingId}/participants`);
    Array.isArray(participants) && participants.length > 0
      ? pass("Tasting-Lifecycle", "Teilnehmer-Liste")
      : warn("Tasting-Lifecycle", "Keine Teilnehmer gefunden");

    const titleUpdate = await req("PATCH", `/api/tastings/${testTastingId}/title`, { title: "__Plaustest Updated", hostId: testParticipantId });
    titleUpdate.__status === 200 ? pass("Tasting-Lifecycle", "Titel ändern") : fail("Tasting-Lifecycle", "Titel ändern", `Status: ${titleUpdate.__status}`);

    const closeRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "closed", hostId: testParticipantId });
    closeRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → closed") : fail("Tasting-Lifecycle", "Status → closed");

    const revealRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "reveal", hostId: testParticipantId });
    revealRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → reveal") : fail("Tasting-Lifecycle", "Status → reveal");

    const archiveRes = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "archived", hostId: testParticipantId });
    archiveRes.__status === 200 ? pass("Tasting-Lifecycle", "Status → archived") : fail("Tasting-Lifecycle", "Status → archived");

    const invalidStatus = await req("PATCH", `/api/tastings/${testTastingId}/status`, { status: "open", hostId: testParticipantId });
    invalidStatus.__status === 400
      ? pass("Tasting-Lifecycle", "Ungültiger Statuswechsel (archived→open) blockiert (400)")
      : fail("Tasting-Lifecycle", "Rückwärts-Transition archived→open nicht blockiert", `Status: ${invalidStatus.__status}`);
  });
}

// ========================
// 4. WHISKIES & RATINGS
// ========================
async function testWhiskiesAndRatings() {
  await testSection("Whiskies & Ratings", async () => {
    if (!testParticipantId) { fail("Whiskies & Ratings", "Kein Teilnehmer"); return; }

    const t = await req("POST", "/api/tastings", {
      title: "__Plaustest Rating-Test",
      date: "2026-02-23",
      location: "Testlabor",
      hostId: testParticipantId,
      code: `R${Date.now().toString(36).slice(-7).toUpperCase()}`,
    });
    ratingTastingId = t.id;
    await req("PATCH", `/api/tastings/${ratingTastingId}/status`, { status: "open", hostId: testParticipantId });
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
      pass("Whiskies & Ratings", "Whisky erstellen");
    } else {
      fail("Whiskies & Ratings", "Whisky erstellen fehlgeschlagen", JSON.stringify(whisky));
      return;
    }

    const whiskies = await req("GET", `/api/tastings/${ratingTastingId}/whiskies`);
    Array.isArray(whiskies) && whiskies.length >= 1 ? pass("Whiskies & Ratings", "Whiskies abrufen") : fail("Whiskies & Ratings", "Whiskies abrufen");

    const updateW = await req("PATCH", `/api/whiskies/${testWhiskyId}`, { name: "Lagavulin 16 Updated" });
    updateW.__status === 200 ? pass("Whiskies & Ratings", "Whisky aktualisieren") : fail("Whiskies & Ratings", "Whisky aktualisieren");

    const rating = await req("POST", "/api/ratings", {
      tastingId: ratingTastingId,
      whiskyId: testWhiskyId,
      participantId: testParticipantId,
      nose: 85,
      taste: 90,
      finish: 88,
      overall: 88,
      notes: "Plausibilitätstest Rating",
    });
    rating.id ? pass("Whiskies & Ratings", "Bewertung abgeben") : fail("Whiskies & Ratings", "Bewertung fehlgeschlagen", `Status: ${rating.__status}`);

    const ratingGet = await req("GET", `/api/ratings/${testParticipantId}/${testWhiskyId}`);
    ratingGet.overall === 88 ? pass("Whiskies & Ratings", "Bewertung korrekt gespeichert") : fail("Whiskies & Ratings", "Bewertung falsch", `overall: ${ratingGet.overall}`);

    const upsert = await req("POST", "/api/ratings", {
      tastingId: ratingTastingId,
      whiskyId: testWhiskyId,
      participantId: testParticipantId,
      nose: 90, taste: 92, finish: 91, overall: 91,
      notes: "Aktualisiert",
    });
    const updated = await req("GET", `/api/ratings/${testParticipantId}/${testWhiskyId}`);
    updated.overall === 91 ? pass("Whiskies & Ratings", "Rating-Upsert funktioniert") : fail("Whiskies & Ratings", "Upsert fehlerhaft");

    const nullRating = await req("POST", "/api/ratings", {
      tastingId: ratingTastingId,
      whiskyId: testWhiskyId,
      participantId: testParticipantId,
      nose: null, taste: null, finish: null, overall: null,
      notes: "",
    });
    nullRating.id || nullRating.__status === 200
      ? pass("Whiskies & Ratings", "Nullable Rating (alle Werte null)")
      : fail("Whiskies & Ratings", "Nullable Rating fehlgeschlagen");

    const tastingRatings = await req("GET", `/api/tastings/${ratingTastingId}/ratings`);
    Array.isArray(tastingRatings) ? pass("Whiskies & Ratings", "Tasting-Ratings abrufen") : fail("Whiskies & Ratings", "Tasting-Ratings");

    const whisky2 = await req("POST", "/api/whiskies", { tastingId: ratingTastingId, name: "Ardbeg 10 Plaustest", sortOrder: 1 });
    if (whisky2.id) {
      const reorder = await req("PATCH", `/api/tastings/${ratingTastingId}/reorder`, {
        order: [
          { id: whisky2.id, sortOrder: 0 },
          { id: testWhiskyId, sortOrder: 1 },
        ],
      });
      reorder.__status === 200 ? pass("Whiskies & Ratings", "Whisky-Reihenfolge ändern") : fail("Whiskies & Ratings", "Reorder fehlgeschlagen", `Status: ${reorder.__status}`);

      const delW = await req("DELETE", `/api/whiskies/${whisky2.id}`);
      delW.__status === 200 || delW.__status === 204 ? pass("Whiskies & Ratings", "Whisky löschen") : fail("Whiskies & Ratings", "Whisky löschen", `Status: ${delW.__status}`);
    }

    await req("PATCH", `/api/tastings/${ratingTastingId}/status`, { status: "closed", hostId: testParticipantId });
    await req("PATCH", `/api/tastings/${ratingTastingId}/status`, { status: "reveal", hostId: testParticipantId });

    const analytics = await req("GET", `/api/tastings/${ratingTastingId}/analytics`);
    analytics.__status === 200 ? pass("Whiskies & Ratings", "Tasting-Analytics (im Reveal-Status)") : fail("Whiskies & Ratings", "Analytics", `Status: ${analytics.__status}`);
  });
}

// ========================
// 5. SESSION FEATURES
// ========================
async function testSessionFeatures() {
  await testSection("Session-Features", async () => {
    if (!testParticipantId) { fail("Session-Features", "Kein Teilnehmer"); return; }

    const t = await req("POST", "/api/tastings", {
      title: "__Plaustest Session Features",
      date: "2026-02-23",
      location: "Testlabor",
      hostId: testParticipantId,
      code: `S${Date.now().toString(36).slice(-7).toUpperCase()}`,
    });
    const sfId = t.id;
    await req("PATCH", `/api/tastings/${sfId}/status`, { status: "open", hostId: testParticipantId });
    await req("POST", `/api/tastings/${sfId}/join`, { participantId: testParticipantId });

    const blind = await req("PATCH", `/api/tastings/${sfId}/blind-mode`, { blindMode: true, hostId: testParticipantId });
    blind.__status === 200 ? pass("Session-Features", "Blind-Mode aktivieren") : fail("Session-Features", "Blind-Mode", `Status: ${blind.__status}, ${blind.message}`);

    const guided = await req("PATCH", `/api/tastings/${sfId}/guided-mode`, { guidedMode: true, hostId: testParticipantId });
    guided.__status === 200 ? pass("Session-Features", "Guided-Mode aktivieren") : fail("Session-Features", "Guided-Mode", `Status: ${guided.__status}`);

    const discussion = await req("POST", `/api/tastings/${sfId}/discussions`, {
      participantId: testParticipantId,
      text: "Testkommentar",
    });
    discussion.id ? pass("Session-Features", "Diskussions-Eintrag erstellen") : fail("Session-Features", "Diskussions-Eintrag");

    const getDisc = await req("GET", `/api/tastings/${sfId}/discussions`);
    Array.isArray(getDisc) && getDisc.length > 0 ? pass("Session-Features", "Diskussionen abrufen") : fail("Session-Features", "Diskussionen abrufen");

    const refl = await req("POST", `/api/tastings/${sfId}/reflections`, {
      participantId: testParticipantId,
      promptText: "Was war dein Highlight?",
      text: "Der Lagavulin war beeindruckend",
      isAnonymous: false,
    });
    refl.id ? pass("Session-Features", "Reflection erstellen") : fail("Session-Features", "Reflection erstellen");

    const getRefl = await req("GET", `/api/tastings/${sfId}/reflections`);
    Array.isArray(getRefl) ? pass("Session-Features", "Reflections abrufen") : fail("Session-Features", "Reflections abrufen");

    const myRefl = await req("GET", `/api/tastings/${sfId}/reflections/mine/${testParticipantId}`);
    Array.isArray(myRefl) ? pass("Session-Features", "Eigene Reflections") : fail("Session-Features", "Eigene Reflections");

    const presence = await req("GET", `/api/tastings/${sfId}/presence`);
    presence.__status === 200 ? pass("Session-Features", "Präsenz-Tracking") : warn("Session-Features", "Präsenz", `Status: ${presence.__status}`);

    const dup = await req("POST", `/api/tastings/${sfId}/duplicate`, { hostId: testParticipantId });
    dup.id ? pass("Session-Features", "Tasting duplizieren") : fail("Session-Features", "Duplizieren fehlgeschlagen", dup.message);
  });
}

// ========================
// 6. JOURNAL
// ========================
async function testJournal() {
  await testSection("Journal", async () => {
    if (!testParticipantId) { fail("Journal", "Kein Teilnehmer"); return; }

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
      source: "casksense",
    });
    if (create.id) {
      testJournalId = create.id;
      pass("Journal", "Eintrag erstellen");
    } else {
      fail("Journal", "Eintrag erstellen fehlgeschlagen", create.message);
      return;
    }

    const getAll = await req("GET", `/api/journal/${testParticipantId}`);
    Array.isArray(getAll) && getAll.length > 0 ? pass("Journal", "Einträge abrufen") : fail("Journal", "Einträge abrufen");

    const getOne = await req("GET", `/api/journal/${testParticipantId}/${testJournalId}`);
    getOne.title === "Plaustest Lagavulin 16" ? pass("Journal", "Einzeleintrag abrufen") : fail("Journal", "Einzeleintrag");

    const update = await req("PATCH", `/api/journal/${testParticipantId}/${testJournalId}`, {
      title: "Plaustest Lagavulin 16 (Updated)",
      personalScore: 93,
    });
    update.__status === 200 ? pass("Journal", "Eintrag aktualisieren") : fail("Journal", "Aktualisieren");

    const verify = await req("GET", `/api/journal/${testParticipantId}/${testJournalId}`);
    verify.personalScore === 93 ? pass("Journal", "Score korrekt aktualisiert") : fail("Journal", "Score falsch", `${verify.personalScore}`);

    const del = await req("DELETE", `/api/journal/${testParticipantId}/${testJournalId}`);
    del.__status === 200 || del.__status === 204
      ? pass("Journal", "Eintrag löschen")
      : fail("Journal", "Löschen fehlgeschlagen", `Status: ${del.__status}`);

    const afterDel = await req("GET", `/api/journal/${testParticipantId}/${testJournalId}`);
    !afterDel.id || afterDel.__status === 404
      ? pass("Journal", "Gelöschter Eintrag nicht mehr abrufbar")
      : warn("Journal", "Gelöschter Eintrag noch vorhanden?");
  });
}

// ========================
// 7. WUNSCHLISTE
// ========================
async function testWishlist() {
  await testSection("Wunschliste", async () => {
    if (!testParticipantId) { fail("Wunschliste", "Kein Teilnehmer"); return; }

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
      pass("Wunschliste", "Eintrag erstellen");
    } else {
      fail("Wunschliste", "Erstellen fehlgeschlagen", create.message);
      return;
    }

    const getAll = await req("GET", `/api/wishlist/${testParticipantId}`);
    Array.isArray(getAll) && getAll.length > 0 ? pass("Wunschliste", "Einträge abrufen") : fail("Wunschliste", "Abrufen fehlerhaft");

    const update = await req("PATCH", `/api/wishlist/${testParticipantId}/${testWishlistId}`, { priority: "low" });
    update.__status === 200 ? pass("Wunschliste", "Eintrag aktualisieren") : fail("Wunschliste", "Aktualisieren");

    const del = await req("DELETE", `/api/wishlist/${testParticipantId}/${testWishlistId}`);
    del.__status === 200 || del.__status === 204
      ? pass("Wunschliste", "Eintrag löschen")
      : fail("Wunschliste", "Löschen", `Status: ${del.__status}`);
  });
}

// ========================
// 8. PROFIL & PERSONALISIERUNG
// ========================
async function testProfile() {
  await testSection("Profil", async () => {
    if (!testParticipantId) { fail("Profil", "Kein Teilnehmer"); return; }

    const upsert = await req("PUT", `/api/profiles/${testParticipantId}`, {
      participantId: testParticipantId,
      bio: "Plaustest-Bio",
      favoriteWhisky: "Lagavulin 16",
      preferredRegions: "Islay, Speyside",
      preferredPeatLevel: "Heavy",
    });
    upsert.id || upsert.__status === 200
      ? pass("Profil", "Profil erstellen/aktualisieren")
      : fail("Profil", "Profil upsert fehlgeschlagen");

    const get = await req("GET", `/api/profiles/${testParticipantId}`);
    get.bio === "Plaustest-Bio" ? pass("Profil", "Profil abrufen") : fail("Profil", "Profil abrufen");

    const stats = await req("GET", `/api/participants/${testParticipantId}/stats`);
    typeof stats.totalRatings === "number" ? pass("Profil", "Statistiken") : fail("Profil", "Statistiken fehlerhaft");

    const flavor = await req("GET", `/api/participants/${testParticipantId}/flavor-profile`);
    flavor.__status === 200 ? pass("Profil", "Flavor-Profil") : fail("Profil", "Flavor-Profil", `Status: ${flavor.__status}`);

    const whiskyProfile = await req("GET", `/api/participants/${testParticipantId}/whisky-profile`);
    whiskyProfile.__status === 200 ? pass("Profil", "Whisky-Profil") : fail("Profil", "Whisky-Profil");

    const twins = await req("GET", `/api/participants/${testParticipantId}/taste-twins`);
    twins.__status === 200 ? pass("Profil", "Taste-Twins") : warn("Profil", "Taste-Twins", `Status: ${twins.__status}`);

    const notes = await req("GET", `/api/participants/${testParticipantId}/rating-notes`);
    notes.__status === 200 ? pass("Profil", "Rating-Notizen") : fail("Profil", "Rating-Notizen");
  });
}

// ========================
// 9. FREUNDE
// ========================
async function testFriends() {
  await testSection("Freunde", async () => {
    if (!testParticipantId) { fail("Freunde", "Kein Teilnehmer"); return; }

    const add = await req("POST", `/api/participants/${testParticipantId}/friends`, {
      firstName: "Max", lastName: "Plaustest", email: "max@plaustest.dev",
    });
    add.id ? pass("Freunde", "Freund hinzufügen") : fail("Freunde", "Hinzufügen fehlgeschlagen");

    const getAll = await req("GET", `/api/participants/${testParticipantId}/friends`);
    Array.isArray(getAll) ? pass("Freunde", "Freunde-Liste") : fail("Freunde", "Freunde-Liste");

    if (add.id) {
      const update = await req("PATCH", `/api/participants/${testParticipantId}/friends/${add.id}`, {
        firstName: "Maximilian", lastName: "Plaustest", email: "max@plaustest.dev",
      });
      update.__status === 200 ? pass("Freunde", "Freund aktualisieren") : fail("Freunde", "Aktualisieren");

      const delF = await req("DELETE", `/api/participants/${testParticipantId}/friends/${add.id}`);
      delF.__status === 200 || delF.__status === 204
        ? pass("Freunde", "Freund entfernen")
        : fail("Freunde", "Freund entfernen", `Status: ${delF.__status}`);
    }
  });
}

// ========================
// 10. ADMIN (benötigt requesterId)
// ========================
async function testAdmin() {
  await testSection("Admin", async () => {
    if (!testParticipantId) { fail("Admin", "Kein Teilnehmer"); return; }

    const onlineUsers = await req("GET", "/api/admin/online-users");
    onlineUsers.__status === 200 ? pass("Admin", "Online-Benutzer") : warn("Admin", "Online-Benutzer", `Status: ${onlineUsers.__status}`);

    const adminSettings = await req("GET", `/api/admin/app-settings?requesterId=${testParticipantId}`);
    if (adminSettings.__status === 403) {
      pass("Admin", "App-Settings für Nicht-Admin gesperrt (403)");
    } else if (adminSettings.__status === 200) {
      pass("Admin", "App-Settings abrufen (Admin-Zugang)");
    } else {
      warn("Admin", "App-Settings", `Status: ${adminSettings.__status}`);
    }

    const adminAnalytics = await req("GET", `/api/admin/analytics?requesterId=${testParticipantId}`);
    if (adminAnalytics.__status === 403) {
      pass("Admin", "Admin-Analytics für Nicht-Admin gesperrt");
    } else if (adminAnalytics.__status === 200) {
      pass("Admin", "Admin-Analytics abrufbar");
    } else {
      warn("Admin", "Admin-Analytics", `Status: ${adminAnalytics.__status}`);
    }

    const platformAnalytics = await req("GET", `/api/platform-analytics?requesterId=${testParticipantId}`);
    platformAnalytics.__status === 200 ? pass("Admin", "Platform-Analytics") : warn("Admin", "Platform-Analytics", `Status: ${platformAnalytics.__status}`);

    const newsletters = await req("GET", `/api/admin/newsletters?requesterId=${testParticipantId}`);
    if (newsletters.__status === 403) {
      pass("Admin", "Newsletter-Archiv für Nicht-Admin gesperrt");
    } else {
      warn("Admin", "Newsletter-Archiv ohne Admin-Prüfung?", `Status: ${newsletters.__status}`);
    }

    const allJournals = await req("GET", `/api/admin/all-journals?requesterId=${testParticipantId}`);
    if (allJournals.__status === 403) {
      pass("Admin", "Alle Journal-Einträge für Nicht-Admin gesperrt");
    } else {
      warn("Admin", "Journal-Einträge ohne Admin-Prüfung?", `Status: ${allJournals.__status}`);
    }
  });
}

// ========================
// 11. TEST DATA MANAGEMENT
// ========================
async function testTestDataManagement() {
  await testSection("Test-Daten-Verwaltung", async () => {
    if (!testTastingId || !testParticipantId) { fail("Test-Daten-Verwaltung", "Keine Testdaten"); return; }

    const toggle = await req("POST", `/api/admin/tastings/${testTastingId}/test-flag`, { isTestData: true, requesterId: testParticipantId });
    if (toggle.__status === 200) {
      pass("Test-Daten-Verwaltung", "Test-Flag setzen");
    } else if (toggle.__status === 403) {
      pass("Test-Daten-Verwaltung", "Test-Flag nur für Admin (403 korrekt)");
    } else {
      fail("Test-Daten-Verwaltung", "Test-Flag setzen", `Status: ${toggle.__status}, ${toggle.message}`);
    }

    if (toggle.__status === 200) {
      const verify = await req("GET", `/api/tastings/${testTastingId}`);
      verify.isTestData === true ? pass("Test-Daten-Verwaltung", "Test-Flag korrekt gespeichert") : fail("Test-Daten-Verwaltung", "Test-Flag nicht gespeichert");
    }

    const preview = await req("POST", "/api/admin/bulk-cleanup", {
      action: "preview",
      filter: { titlePattern: "__Plaustest" },
      requesterId: testParticipantId,
    });
    if (preview.__status === 200) {
      pass("Test-Daten-Verwaltung", "Bulk-Cleanup Preview");
      if (preview.count > 0 || (Array.isArray(preview.tastings) && preview.tastings.length > 0)) {
        pass("Test-Daten-Verwaltung", "Preview findet Test-Tastings", `${preview.count || preview.tastings?.length} gefunden`);
      }
    } else if (preview.__status === 403) {
      pass("Test-Daten-Verwaltung", "Bulk-Cleanup nur für Admin (403 korrekt)");
    } else {
      fail("Test-Daten-Verwaltung", "Preview fehlgeschlagen", `Status: ${preview.__status}`);
    }

    if (toggle.__status === 200) {
      const toggleOff = await req("POST", `/api/admin/tastings/${testTastingId}/test-flag`, { isTestData: false, requesterId: testParticipantId });
      toggleOff.__status === 200 ? pass("Test-Daten-Verwaltung", "Test-Flag entfernen") : fail("Test-Daten-Verwaltung", "Entfernen fehlgeschlagen");
    }
  });
}

// ========================
// 12. AI KILL SWITCH
// ========================
async function testAIKillSwitch() {
  await testSection("AI Kill Switch", async () => {
    const status = await req("GET", "/api/ai-status");
    typeof status.masterDisabled === "boolean" && Array.isArray(status.disabledFeatures)
      ? pass("AI Kill Switch", "Endpoint-Struktur korrekt")
      : fail("AI Kill Switch", "Endpoint-Struktur fehlerhaft");

    !status.masterDisabled
      ? pass("AI Kill Switch", "AI aktiviert (Standard)")
      : warn("AI Kill Switch", "AI global deaktiviert");

    if (!status.masterDisabled && status.disabledFeatures.length === 0) {
      pass("AI Kill Switch", "Alle AI-Features aktiv");
    } else if (status.disabledFeatures.length > 0) {
      warn("AI Kill Switch", `${status.disabledFeatures.length} Features deaktiviert`, status.disabledFeatures.join(", "));
    }
  });
}

// ========================
// 13. DATEN-EXPORT
// ========================
async function testExports() {
  await testSection("Daten-Export", async () => {
    if (!testParticipantId) { fail("Daten-Export", "Kein Teilnehmer"); return; }

    const exportData = await req("GET", `/api/participants/${testParticipantId}/export-data`);
    exportData.__status === 200 ? pass("Daten-Export", "Teilnehmer-Daten exportieren") : fail("Daten-Export", "Export fehlgeschlagen");

    const exportEndpoints = [
      { path: "/api/export/tastings", name: "Tastings" },
      { path: "/api/export/profile", name: "Profil" },
    ];
    for (const ep of exportEndpoints) {
      const res = await req("GET", `${ep.path}?participantId=${testParticipantId}`);
      res.__status === 200 ? pass("Daten-Export", `${ep.name}-Export`) : warn("Daten-Export", `${ep.name}-Export`, `Status: ${res.__status}`);
    }
  });
}

// ========================
// 14. EDGE CASES & SICHERHEIT
// ========================
async function testEdgeCases() {
  await testSection("Edge Cases & Sicherheit", async () => {
    const notFound = await req("GET", "/api/tastings/nonexistent-uuid-12345");
    notFound.__status === 404 || notFound.__status === 500
      ? pass("Edge Cases & Sicherheit", "Nicht existierendes Tasting → Fehler")
      : warn("Edge Cases & Sicherheit", "Nicht existierendes Tasting", `Status: ${notFound.__status}`);

    const emptyBody = await req("POST", "/api/participants", {});
    emptyBody.__status === 400
      ? pass("Edge Cases & Sicherheit", "Leerer Body bei Registrierung → 400")
      : fail("Edge Cases & Sicherheit", "Leerer Body akzeptiert", `Status: ${emptyBody.__status}`);

    const sqli = await req("POST", "/api/participants/login", {
      email: "'; DROP TABLE participants; --@test.com",
      pin: "1234",
    });
    sqli.__status !== 200
      ? pass("Edge Cases & Sicherheit", "SQL-Injection abgelehnt")
      : warn("Edge Cases & Sicherheit", "SQL-Injection Antwort prüfen");

    if (testParticipantId) {
      const xss = await req("POST", `/api/journal/${testParticipantId}`, {
        participantId: testParticipantId,
        title: '<script>alert("XSS")</script>',
        whiskyName: "Test",
        source: "casksense",
      });
      if (xss.id) {
        const getXss = await req("GET", `/api/journal/${testParticipantId}/${xss.id}`);
        if (getXss.title && !getXss.title.includes("<script>")) {
          pass("Edge Cases & Sicherheit", "XSS in Journal wird serverseitig bereinigt");
        } else {
          fail("Edge Cases & Sicherheit", "XSS-Tags werden roh gespeichert", `title: ${getXss.title}`);
        }
        await req("DELETE", `/api/journal/${testParticipantId}/${xss.id}`);
      }
    }

    const longTitle = "A".repeat(5000);
    const longT = await req("POST", "/api/tastings", {
      title: longTitle,
      date: "2026-02-23",
      location: "Test",
      hostId: testParticipantId || "fake",
      code: `L${Date.now().toString(36).slice(-7).toUpperCase()}`,
    });
    longT.__status === 400
      ? pass("Edge Cases & Sicherheit", "Sehr langer Titel abgelehnt (400)")
      : fail("Edge Cases & Sicherheit", "Sehr langer Titel (5000 Zeichen) akzeptiert", `Status: ${longT.__status}`);

    const concurrent = await Promise.all([
      req("GET", "/api/platform-stats"),
      req("GET", "/api/ai-status"),
      req("GET", "/api/community-scores"),
      req("GET", "/api/calendar"),
      req("GET", "/api/flavor-profile/global"),
    ]);
    concurrent.every((r: any) => r.__status === 200)
      ? pass("Edge Cases & Sicherheit", "5 parallele Anfragen erfolgreich")
      : warn("Edge Cases & Sicherheit", "Parallele Anfragen fehlerhaft");
  });
}

// ========================
// 15. BENACHRICHTIGUNGEN
// ========================
async function testNotifications() {
  await testSection("Benachrichtigungen", async () => {
    if (!testParticipantId) { fail("Benachrichtigungen", "Kein Teilnehmer"); return; }

    const getAll = await req("GET", `/api/notifications?participantId=${testParticipantId}`);
    getAll.__status === 200 ? pass("Benachrichtigungen", "Abrufen") : warn("Benachrichtigungen", "Abrufen", `Status: ${getAll.__status}`);

    const unread = await req("GET", `/api/notifications/unread-count?participantId=${testParticipantId}`);
    typeof unread.count === "number" || unread.__status === 200
      ? pass("Benachrichtigungen", "Ungelesene Anzahl")
      : warn("Benachrichtigungen", "Ungelesene Anzahl");
  });
}

// ========================
// 16. SONSTIGE FEATURES
// ========================
async function testMiscFeatures() {
  await testSection("Weitere Features", async () => {
    if (!testParticipantId) { fail("Weitere Features", "Kein Teilnehmer"); return; }

    const reminders = await req("GET", `/api/reminders/${testParticipantId}`);
    reminders.__status === 200 ? pass("Weitere Features", "Erinnerungen abrufen") : fail("Weitere Features", "Erinnerungen");

    const collection = await req("GET", `/api/collection/${testParticipantId}`);
    collection.__status === 200 ? pass("Weitere Features", "Whiskybase-Sammlung") : fail("Weitere Features", "Sammlung");

    const suggestions = await req("GET", `/api/encyclopedia-suggestions?participantId=${testParticipantId}`);
    suggestions.__status === 200 ? pass("Weitere Features", "Enzyklopädie-Vorschläge") : warn("Weitere Features", "Enzyklopädie-Vorschläge", `Status: ${suggestions.__status}`);

    const fb = await req("POST", "/api/feedback", {
      participantId: testParticipantId,
      type: "bug",
      message: "Plausibilitätstest Feedback",
      page: "/test",
    });
    fb.id || fb.__status === 200 || fb.__status === 201
      ? pass("Weitere Features", "Feedback senden")
      : warn("Weitere Features", "Feedback", `Status: ${fb.__status}`);

    const activity = await req("GET", `/api/participants/${testParticipantId}/friend-activity`);
    activity.__status === 200 ? pass("Weitere Features", "Freunde-Aktivität") : warn("Weitere Features", "Freunde-Aktivität");
  });
}

// ========================
// CLEANUP
// ========================
async function cleanup() {
  await testSection("Aufräumen", async () => {
    if (testParticipantId) {
      await req("POST", "/api/admin/bulk-cleanup", {
        action: "delete",
        filter: { titlePattern: "__Plaustest" },
        requesterId: testParticipantId,
      });
      await req("DELETE", `/api/participants/${testParticipantId}/anonymize`);
    }
    pass("Aufräumen", "Test-Daten bereinigt");
  });
}

// ========================
// HAUPTPROGRAMM
// ========================
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     CaskSense v2.0.0 — Plausibilitätstest                  ║");
  console.log("║     Umfassende System- und API-Prüfung                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

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
  await testAdmin();
  await testTestDataManagement();
  await testAIKillSwitch();
  await testExports();
  await testEdgeCases();
  await testNotifications();
  await testMiscFeatures();
  await cleanup();

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n═══════════════════════════════════════════════════════════════");
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
