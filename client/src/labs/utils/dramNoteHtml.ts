import type { DramNoteData } from "./dramNotePdf";

const SECTIONS = ["Nase", "Gaumen", "Abgang", "Gesamteindruck"];
const EN: Record<string, string> = { Nase: "Nose", Gaumen: "Palate", Abgang: "Finish", Gesamteindruck: "Overall" };

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseSections(text: string) {
  const lines = (text || "").split(/\r?\n/);
  const out: { header: string | null; body: string }[] = [];
  let cur: { header: string | null; body: string } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (SECTIONS.includes(line)) { if (cur) out.push(cur); cur = { header: line, body: "" }; }
    else { if (!cur) cur = { header: null, body: "" }; cur.body += (cur.body ? "\n" : "") + raw; }
  }
  if (cur) out.push(cur);
  return out;
}

function fmtDate(iso?: string | null, isDe = true): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(isDe ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export function buildDramNoteHtml(data: DramNoteData, isDe = true): string {
  const sections = parseSections(data.narrative);
  const s = data.scores || {};
  const scoreItems = [
    { label: isDe ? "Nase" : "Nose", val: s.nose },
    { label: isDe ? "Gaumen" : "Palate", val: s.palate },
    { label: isDe ? "Abgang" : "Finish", val: s.finish },
    { label: isDe ? "Gesamt" : "Overall", val: s.overall },
  ].filter((x) => x.val != null);
  const scoreRow = scoreItems.length
    ? `<div class="scores">${scoreItems.map((x) => `<div class="score"><div class="sv">${Number(x.val).toFixed(0)}</div><div class="sl">${esc(x.label)}</div></div>`).join("")}</div>`
    : "";
  const meta = [data.tastingName ? esc(data.tastingName) : "", fmtDate(data.dateISO, isDe), data.tasterName ? esc(data.tasterName) : ""].filter(Boolean).join(" &middot; ");
  const photo = data.photoDataUrl ? `<div class="photo"><img src="${data.photoDataUrl}" alt=""/></div>` : "";
  const body = sections.map((sec) => {
    const head = sec.header ? `<h2>${esc(isDe ? sec.header : (EN[sec.header] || sec.header))}</h2>` : "";
    return `${head}<p>${esc(sec.body.trim()).replace(/\n/g, "<br/>")}</p>`;
  }).join("");
  return `<!doctype html><html lang="${isDe ? "de" : "en"}"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(data.whiskyName)} &middot; CaskSense</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0B0906;--cream:#F5EDE0;--gold:#D4A847;--amber:#C47A3A;--muted:#9a8f7a}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--cream);font-family:'DM Sans',system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:680px;margin:0 auto;padding:48px 24px 80px}
.brand{font-size:11px;letter-spacing:.35em;text-transform:uppercase;color:var(--gold);text-align:center;margin-bottom:28px}
h1{font-family:'Playfair Display',serif;font-weight:700;font-size:34px;line-height:1.15;text-align:center}
.meta{text-align:center;font-size:13px;color:var(--muted);margin-top:10px}
.rule{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:28px 0;opacity:.6}
.photo{margin:24px 0;border-radius:14px;overflow:hidden}
.photo img{display:block;width:100%;height:auto}
.scores{display:flex;gap:14px;justify-content:center;margin:24px 0}
.score{text-align:center;min-width:58px}
.sv{font-family:'Playfair Display',serif;font-weight:700;font-size:26px;color:var(--gold)}
.sl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:2px}
h2{font-weight:600;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--amber);margin:26px 0 8px}
p{font-family:'Cormorant Garamond',serif;font-size:20px;line-height:1.55}
.foot{margin-top:48px;text-align:center;font-size:11px;color:var(--muted);letter-spacing:.05em}
</style></head>
<body><div class="wrap">
<div class="brand">C A S K S E N S E</div>
<h1>${esc(data.whiskyName)}</h1>
${meta ? `<div class="meta">${meta}</div>` : ""}
<div class="rule"></div>
${photo}
${scoreRow}
${body}
<div class="foot">${isDe ? "Festgehalten mit CaskSense" : "Captured with CaskSense"}</div>
</div></body></html>`;
}

export function openDramNoteHtml(data: DramNoteData, isDe = true): void {
  const blob = new Blob([buildDramNoteHtml(data, isDe)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  setTimeout(() => { URL.revokeObjectURL(url); }, 60000);
}
