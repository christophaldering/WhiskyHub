import { searchOnline } from "../lib/onlineSearch.js";
import type { AutoHandoutSource, AutoHandoutImage } from "@shared/schema";
import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";

const FETCH_TIMEOUT_MS = 6000;
const MAX_TEXT_PER_SOURCE = 6000;
const MAX_REDIRECTS = 3;

// SSRF guard: reject URLs that would target the local network or non-HTTP(S)
// schemes. We resolve DNS and check the resulting IPs against private CIDR
// ranges before letting `fetch` connect. We also follow redirects manually so
// every hop is re-validated.
function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("fe80")) return true; // link local
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
    return false;
  }
  return true; // unknown format → treat as unsafe
}

async function isUrlSafeForOutbound(rawUrl: string): Promise<boolean> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return false; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host.toLowerCase() === "localhost") return false;
  // If literal IP, check it directly
  if (net.isIP(host)) return !isPrivateIp(host);
  try {
    const records = await dnsLookup(host, { all: true });
    if (!records.length) return false;
    return records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isUrlSafeForOutbound(current))) return null;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(current, {
        ...init,
        signal: ctrl.signal,
        headers: { "User-Agent": "CaskSenseAutoHandout/1.0", ...(init?.headers || {}) },
        redirect: "manual",
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) return r;
        current = new URL(loc, current).toString();
        continue;
      }
      return r;
    } catch {
      return null;
    } finally {
      clearTimeout(tid);
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RawSource extends AutoHandoutSource {
  text: string;
}

export interface DistilleryResearchResult {
  sources: RawSource[];
  images: AutoHandoutImage[];
}

export interface WhiskyResearchResult {
  sources: RawSource[];
}

async function fetchWikipedia(distillery: string, lang: "de" | "en"): Promise<RawSource | null> {
  const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(distillery.replace(/\s+/g, "_"))}`;
  const r = await fetchWithTimeout(summaryUrl);
  if (!r || !r.ok) return null;
  try {
    const data: any = await r.json();
    if (!data.extract) return null;
    const text = data.extract as string;
    return {
      url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(distillery)}`,
      title: data.title || distillery,
      snippet: text.slice(0, 280),
      source: "wikipedia",
      text: text.slice(0, MAX_TEXT_PER_SOURCE),
    };
  } catch {
    return null;
  }
}

async function fetchWikipediaImages(distillery: string, lang: "de" | "en"): Promise<AutoHandoutImage[]> {
  // Wikipedia REST media-list endpoint — Wikipedia images are CC-licensed via Commons.
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(distillery.replace(/\s+/g, "_"))}`;
  const r = await fetchWithTimeout(url);
  if (!r || !r.ok) return [];
  try {
    const data: any = await r.json();
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    const out: AutoHandoutImage[] = [];
    for (const it of items) {
      if (it.type !== "image") continue;
      const src = it.srcset?.[0]?.src || it.original?.source;
      if (!src) continue;
      const fullUrl = src.startsWith("//") ? `https:${src}` : src;
      out.push({
        url: fullUrl,
        title: it.title?.replace(/^File:/, "") || distillery,
        source: "Wikipedia / Wikimedia Commons",
        license: "Wikimedia Commons (Lizenz pro Bild prüfen — meist CC BY-SA)",
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(it.title || "")}`,
      });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchUrlText(url: string, source: AutoHandoutSource["source"], title: string): Promise<RawSource | null> {
  const r = await fetchWithTimeout(url);
  if (!r || !r.ok) return null;
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("html") && !ct.includes("text")) return null;
  try {
    const html = await r.text();
    const text = stripHtml(html).slice(0, MAX_TEXT_PER_SOURCE);
    if (text.length < 120) return null;
    return { url, title, snippet: text.slice(0, 280), source, text };
  } catch {
    return null;
  }
}

function classifyHost(url: string): AutoHandoutSource["source"] {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h.includes("wikipedia")) return "wikipedia";
    if (h.includes("whiskybase")) return "whiskybase";
    if (h.includes("forum") || h.includes("reddit") || h.includes("whisky.de/forum")) return "forum";
    if (h.includes("news") || h.includes("magazin") || h.includes("magazine")) return "news";
    if (h.includes("blog")) return "blog";
    return "web";
  } catch {
    return "web";
  }
}

export async function researchDistillery(distilleryName: string): Promise<DistilleryResearchResult> {
  const sources: RawSource[] = [];
  const images: AutoHandoutImage[] = [];

  // 1. Wikipedia DE + EN summaries (parallel)
  const [wpDe, wpEn, wpDeImg, wpEnImg] = await Promise.all([
    fetchWikipedia(distilleryName, "de"),
    fetchWikipedia(distilleryName, "en"),
    fetchWikipediaImages(distilleryName, "de"),
    fetchWikipediaImages(distilleryName, "en"),
  ]);
  if (wpDe) sources.push(wpDe);
  if (wpEn) sources.push(wpEn);
  for (const img of [...wpDeImg, ...wpEnImg]) {
    if (!images.find((i) => i.url === img.url)) images.push(img);
    if (images.length >= 8) break;
  }

  // 2. Web search for blogs / news / forums (uses configured provider — gracefully empty if none)
  try {
    const search = await searchOnline(`${distilleryName} distillery whisky`);
    for (const cand of search.candidates.slice(0, 6)) {
      if (!cand.externalUrl) continue;
      if (sources.find((s) => s.url === cand.externalUrl)) continue;
      const fetched = await fetchUrlText(
        cand.externalUrl,
        classifyHost(cand.externalUrl),
        cand.name || distilleryName,
      );
      if (fetched) sources.push(fetched);
      if (sources.length >= 8) break;
    }
  } catch (e) {
    console.warn("[auto-handout] web search failed:", e);
  }

  return { sources, images };
}

export async function researchWhisky(
  whiskyName: string,
  distillery: string | null,
  whiskybaseId: string | null,
): Promise<WhiskyResearchResult> {
  const sources: RawSource[] = [];

  // 1. Whiskybase URL (link only — page is JS-heavy and rights-sensitive, so we
  //    just register it as a citation; the AI gets the basics from the catalog).
  if (whiskybaseId) {
    sources.push({
      url: `https://www.whiskybase.com/whiskies/whisky/${whiskybaseId}`,
      title: `Whiskybase #${whiskybaseId}`,
      snippet: `${whiskyName}${distillery ? ` (${distillery})` : ""}`,
      source: "whiskybase",
      text: `${whiskyName}${distillery ? ` from ${distillery}` : ""} — listed on Whiskybase as #${whiskybaseId}.`,
    });
  }

  // 2. Web search for the specific bottling
  try {
    const q = `${distillery ? distillery + " " : ""}${whiskyName} whisky review`;
    const search = await searchOnline(q);
    for (const cand of search.candidates.slice(0, 4)) {
      if (!cand.externalUrl) continue;
      if (sources.find((s) => s.url === cand.externalUrl)) continue;
      const fetched = await fetchUrlText(cand.externalUrl, classifyHost(cand.externalUrl), cand.name || whiskyName);
      if (fetched) sources.push(fetched);
      if (sources.length >= 6) break;
    }
  } catch {}

  return { sources };
}
