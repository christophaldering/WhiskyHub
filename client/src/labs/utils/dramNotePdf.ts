import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { saveJsPdf } from "@/lib/pdf";
import heroWhisky from "@/assets/images/hero-whisky.png";

export type DramNoteData = {
  whiskyName: string;
  dateISO?: string | null;
  tastingName?: string | null;
  tasterName?: string | null;
  narrative: string;
  scores?: { nose?: number|null; palate?: number|null; finish?: number|null; overall?: number|null };
  photoDataUrl?: string | null;
};

const SECTIONS = ["Nase","Gaumen","Abgang","Gesamteindruck"];
const EN: Record<string,string> = { Nase:"Nose", Gaumen:"Palate", Abgang:"Finish", Gesamteindruck:"Overall" };

function fmtDateTime(iso?: string|null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("de-DE",{ day:"numeric", month:"long", year:"numeric", timeZone:"Europe/Berlin" });
    const time = d.toLocaleTimeString("de-DE",{ hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" });
    return date + " \u00b7 " + time + " Uhr";
  } catch { return ""; }
}
function esc(s: string): string { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function parseSections(text: string){ const lines=(text||"").split(/\r?\n/); const out:{header:string|null;body:string}[]=[]; let cur:{header:string|null;body:string}|null=null; for(const raw of lines){const line=raw.trim(); if(SECTIONS.includes(line)){if(cur)out.push(cur);cur={header:line,body:""};} else {if(!cur)cur={header:null,body:""}; cur.body+=(cur.body?"\n":"")+raw;}} if(cur)out.push(cur); return out; }

export async function downloadDramNotePdf(data: DramNoteData): Promise<void> {
  const blocks = parseSections(data.narrative);
  const s = data.scores || {};
  const scoreItems = [
    s.nose!=null?("Nase <b>"+s.nose+"</b>"):null,
    s.palate!=null?("Gaumen <b>"+s.palate+"</b>"):null,
    s.finish!=null?("Abgang <b>"+s.finish+"</b>"):null,
    s.overall!=null?("Gesamt <b>"+s.overall+"</b>"):null,
  ].filter(Boolean).join('<span class="dot">\u00b7</span>');
  const sectionsHtml = blocks.map(b=>{ const head=b.header?('<h3 class="sec-head">'+esc(b.header)+'<span class="en">'+(EN[b.header]||"")+'</span></h3>'):""; const body=(b.body||"").trim(); const bodyHtml=body?('<p class="sec-body">'+esc(body).replace(/\n/g,"<br>")+'</p>'):""; return (head||bodyHtml)?('<div class="sec">'+head+bodyHtml+'</div>'):""; }).join("");
  const contextLine = data.tastingName ? ('<div class="context">Im Tasting \u00ab'+esc(data.tastingName)+'\u00bb</div>') : "";
  const taster = data.tasterName ? ('<div class="taster">Verkostet von '+esc(data.tasterName)+'</div>') : "";
  const photoHtml = data.photoDataUrl ? ('<div class="photo" style="background-image:url(\''+data.photoDataUrl+'\')"></div>') : "";
  const dateLine = fmtDateTime(data.dateISO);

  const node = document.createElement("div");
  node.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#f7f2e8;z-index:-1;";
  node.innerHTML = '<style>'
    + '.cs-doc *{box-sizing:border-box;margin:0;}'
    + '.cs-doc{width:794px;background:#f7f2e8;color:#1a1510;font-family:\'DM Sans\',system-ui,sans-serif;}'
    + '.cs-hero{position:relative;height:250px;background-image:url(\''+heroWhisky+'\');background-size:cover;background-position:center 42%;display:flex;align-items:center;justify-content:center;text-align:center;}'
    + '.cs-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,9,6,.42),rgba(11,9,6,.16) 38%,rgba(11,9,6,.58));}'
    + '.cs-hero-in{position:relative;z-index:2;}'
    + '.cs-wm{font-family:\'Playfair Display\',serif;font-weight:600;font-size:48px;letter-spacing:-.02em;color:#d4a847;text-shadow:0 2px 18px rgba(0,0,0,.55);}'
    + '.cs-tag{font-size:11px;font-weight:500;letter-spacing:.32em;text-transform:uppercase;color:#efe6d4;margin-top:14px;text-shadow:0 1px 10px rgba(0,0,0,.6);}'
    + '.cs-body{padding:34px 48px 16px;}'
    + '.cs-ey{font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#c47a3a;margin-bottom:10px;}'
    + '.cs-title{font-family:\'Playfair Display\',serif;font-weight:700;font-size:34px;line-height:1.1;color:#0b0906;}'
    + '.cs-meta{font-size:12px;color:#857862;letter-spacing:.02em;margin-top:8px;}'
    + '.context{font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:500;font-size:17px;color:#c47a3a;margin-top:4px;}'
    + '.taster{font-size:12px;color:#857862;margin-top:6px;}'
    + '.cs-scores{margin-top:16px;display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:#857862;align-items:baseline;}'
    + '.cs-scores b{font-family:\'Playfair Display\',serif;font-weight:600;font-size:19px;color:#c47a3a;margin-left:5px;}'
    + '.cs-scores .dot{margin:0 4px;color:#c9bca3;}'
    + '.cs-rule{height:1px;background:#e3d9c6;margin:22px 0;}'
    + '.photo{width:100%;height:230px;border-radius:3px;background-size:cover;background-position:center;margin-bottom:24px;}'
    + '.sec{margin-bottom:20px;}'
    + '.sec-head{font-family:\'Playfair Display\',serif;font-weight:600;font-size:18px;color:#d4a847;margin-bottom:4px;}'
    + '.sec-head .en{font-size:9px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#857862;margin-left:8px;}'
    + '.sec-body{font-family:\'Cormorant Garamond\',serif;font-size:19px;line-height:1.6;color:#1a1510;font-weight:500;}'
    + '.cs-foot{padding:14px 48px 30px;text-align:center;}'
    + '.cs-foot .gl{height:2px;background:linear-gradient(90deg,transparent,#d4a847 18%,#d4a847 82%,transparent);opacity:.7;margin-bottom:14px;}'
    + '.cs-foot .tx{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#857862;}'
    + '</style>'
    + '<div class="cs-doc">'
    + '<div class="cs-hero"><div class="cs-hero-in"><div class="cs-wm">CaskSense</div><div class="cs-tag">Where tasting becomes reflection</div></div></div>'
    + '<div class="cs-body">'
    + '<div class="cs-ey">Verkostungsnotiz</div>'
    + '<div class="cs-title">'+esc(data.whiskyName||"Verkostungsnotiz")+'</div>'
    + (dateLine?('<div class="cs-meta">'+dateLine+'</div>'):"")
    + contextLine + taster
    + (scoreItems?('<div class="cs-scores">'+scoreItems+'</div>'):"")
    + '<div class="cs-rule"></div>'
    + photoHtml + sectionsHtml
    + '</div>'
    + '<div class="cs-foot"><div class="gl"></div><div class="tx">Where Tasting becomes Reflection \u00b7 casksense.com</div></div>'
    + '</div>';
  document.body.appendChild(node);
  try {
    try { await (document as any).fonts?.ready; } catch {}
    await new Promise<void>((resolve)=>{ const img=new Image(); img.onload=()=>resolve(); img.onerror=()=>resolve(); img.src=heroWhisky as string; });
    await new Promise((r)=>setTimeout(r,150));
    const target = (node.firstElementChild as HTMLElement) || node;
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#f7f2e8", useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height / canvas.width) * imgW;
    if (imgH <= pageH) { doc.addImage(imgData,"JPEG",0,0,imgW,imgH); }
    else { let remaining=imgH; let position=0; while(remaining>0){ doc.addImage(imgData,"JPEG",0,position,imgW,imgH); remaining-=pageH; if(remaining>0){ doc.addPage(); position-=pageH; } } }
    const safe = (data.whiskyName||"Notiz").replace(/[^a-zA-Z0-9\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc_-]+/g,"-").slice(0,50);
    await saveJsPdf(doc, "CaskSense-Verkostungsnotiz-"+safe+".pdf");
  } finally { document.body.removeChild(node); }
}
