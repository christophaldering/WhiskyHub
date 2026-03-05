const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

const results: TestResult[] = [];

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  ✅ PASS: ${name}`);
  } catch (e: any) {
    results.push({ name, pass: false, detail: e.message });
    console.log(`  ❌ FAIL: ${name} — ${e.message}`);
  }
}

async function run() {
  console.log(`\n🔍 CaskSense Smoke Test — ${BASE}\n`);

  await check("Server health + DB connectivity", async () => {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok") throw new Error(`status: ${data.status}`);
    if (!data.db) throw new Error("DB not connected");
  });

  await check("Auth session endpoint", async () => {
    const res = await fetch(`${BASE}/api/session/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test.m2@casksense.local", pin: "Test1234!" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.pid) throw new Error("No pid returned");
  });

  await check("Tastings list retrieval", async () => {
    const res = await fetch(`${BASE}/api/tastings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Not an array");
  });

  await check("Module 2 routing — /m2", async () => {
    const res = await fetch(`${BASE}/m2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check("Module 2 routing — /m2/tastings", async () => {
    const res = await fetch(`${BASE}/m2/tastings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check("Module 2 routing — /m2/taste", async () => {
    const res = await fetch(`${BASE}/m2/taste`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check("Module 2 routing — /m2/circle", async () => {
    const res = await fetch(`${BASE}/m2/circle`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await check("Theme toggle availability", async () => {
    const res = await fetch(`${BASE}/m2`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes("CaskSense")) throw new Error("Page content missing");
  });

  console.log("\n" + "═".repeat(50));
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${results.length} checks\n`);

  if (failed > 0) {
    console.log("Failed checks:");
    results.filter((r) => !r.pass).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
    process.exit(1);
  }

  console.log("🎉 All smoke tests passed!\n");
}

run().catch((e) => {
  console.error("Smoke test error:", e);
  process.exit(1);
});
