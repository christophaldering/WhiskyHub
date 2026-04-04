import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// 1. Alle .tsx Dateien in client/src/labs/pages/ sammeln
function getFiles(dir) {
  const files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) files.push(...getFiles(full));
    else if (f.endsWith(".tsx") || f.endsWith(".ts")) files.push(full);
  }
  return files;
}

const labsDir = "client/src/labs";
const files = getFiles(labsDir);

// 2. Alle t("key") und t('key') Aufrufe extrahieren
const keySet = new Set();
for (const file of files) {
  const raw = readFileSync(file, "utf-8");
  const matches = raw.matchAll(/\bt\(\s*["'`]([^"'`\n]+)["'`]/g);
  for (const m of matches) {
    keySet.add(m[1].split(",")[0].trim());
  }
}

// 3. i18n.ts einlesen und EN + DE Werte extrahieren
const i18nRaw = readFileSync("client/src/lib/i18n.ts", "utf-8");
const deStart = i18nRaw.indexOf("\n  de:");
const enBlock = i18nRaw.slice(0, deStart);
const deBlock = i18nRaw.slice(deStart);

// Flatten verschachteltes Objekt
function flattenStr(block) {
  const result = {};
  // Match key: "value" oder key: `value`
  const lines = block.split("\n");
  const stack = [];
  const pathStack = [];

  for (const line of lines) {
    const keyMatch = line.match(/^\s+([a-zA-Z][a-zA-Z0-9_]*):\s*["'`](.*?)["'`],?\s*$/);
    const objOpen = line.match(/^\s+([a-zA-Z][a-zA-Z0-9_]*):\s*\{/);
    const objClose = line.match(/^\s+\},?/);

    if (keyMatch) {
      const key = [...pathStack, keyMatch[1]].join(".");
      result[key] = keyMatch[2]
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
    } else if (objOpen) {
      pathStack.push(objOpen[1]);
    } else if (objClose && pathStack.length > 0) {
      pathStack.pop();
    }
  }
  return result;
}

const enFlat = flattenStr(enBlock);
const deFlat = flattenStr(deBlock);

// 4. Gegenüberstellung erstellen
const keys = Array.from(keySet).sort();

const rows = [];
let missing = 0, identical = 0, translated = 0, notFound = 0;

for (const key of keys) {
  const en = enFlat[key];
  const de = deFlat[key];

  let status;
  if (!en && !de) { status = "❓ NOT FOUND"; notFound++; }
  else if (!de) { status = "❌ DE FEHLT"; missing++; }
  else if (en === de) { status = "⚠️  IDENTISCH"; identical++; }
  else { status = "✅ ÜBERSETZT"; translated++; }

  rows.push({ key, en: en || "—", de: de || "—", status });
}

// 5. Report schreiben
const lines = [];
lines.push("═══════════════════════════════════════════════════════════════════════");
lines.push("CASKSENSE i18n AUDIT — LABS SEITEN");
lines.push(`Erstellt: ${new Date().toLocaleString("de-DE")}`);
lines.push("═══════════════════════════════════════════════════════════════════════");
lines.push("");
lines.push(`Analysierte Dateien:  ${files.length} (client/src/labs/**)`);
lines.push(`Gefundene t()-Keys:   ${keys.length}`);
lines.push(`✅ Übersetzt:         ${translated}`);
lines.push(`⚠️  Identisch EN=DE:  ${identical}`);
lines.push(`❌ DE fehlt:          ${missing}`);
lines.push(`❓ Key nicht in i18n: ${notFound}`);
lines.push("");

// Gruppe 1: DE fehlt
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push(`❌ DE FEHLT (${missing} Keys) — muss übersetzt werden`);
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
for (const r of rows.filter(r => r.status.startsWith("❌"))) {
  lines.push(`  ${r.key}`);
  lines.push(`    EN: ${r.en.slice(0, 100)}`);
}
lines.push("");

// Gruppe 2: Identisch
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push(`⚠️  IDENTISCH EN=DE (${identical} Keys) — prüfen ob Markenbegriff oder fehlende Übersetzung`);
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
for (const r of rows.filter(r => r.status.startsWith("⚠️"))) {
  lines.push(`  ${r.key}: "${r.en.slice(0, 80)}"`);
}
lines.push("");

// Gruppe 3: Nicht gefunden
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push(`❓ KEY NICHT IN i18n (${notFound} Keys) — hardcoded Fallback aktiv`);
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
for (const r of rows.filter(r => r.status.startsWith("❓"))) {
  lines.push(`  ${r.key}`);
}
lines.push("");

// Gruppe 4: Vollständige Tabelle
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push("VOLLSTÄNDIGE TABELLE");
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push("STATUS     | KEY                                    | EN                          | DE");
lines.push("-----------|----------------------------------------|-----------------------------|-----------------------------");
for (const r of rows) {
  const status = r.status.slice(0, 10).padEnd(10);
  const key = r.key.slice(0, 38).padEnd(38);
  const en = r.en.slice(0, 27).padEnd(27);
  const de = r.de.slice(0, 27);
  lines.push(`${status} | ${key} | ${en} | ${de}`);
}

const report = lines.join("\n");
writeFileSync("/tmp/i18n-labs-audit.txt", report, "utf-8");
console.log("Fertig! Report gespeichert.");
console.log(`Keys analysiert: ${keys.length}`);
console.log(`✅ Übersetzt: ${translated}`);
console.log(`⚠️  Identisch: ${identical}`);
console.log(`❌ DE fehlt: ${missing}`);
console.log(`❓ Nicht in i18n: ${notFound}`);
