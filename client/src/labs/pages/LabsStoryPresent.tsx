import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Trophy, Wine, Users,
  Camera, Upload, Trash2, Play, Pause, Download,
  Sparkles, Star, Eye, EyeOff, Loader2, Check, BookOpen, MapPin, Calendar,
} from "lucide-react";
import { getParticipantId, pidHeaders } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { stripGuestSuffix, formatScore } from "@/lib/utils";
import { useUpload } from "@/hooks/use-upload";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";

interface LabsStoryPresentProps {
  params: { id: string };
}

// ---- API helpers ----
async function fetchStoryData(tastingId: string) {
  const res = await fetch(`/api/tastings/${tastingId}/story`, { headers: pidHeaders() });
  if (!res.ok) throw new Error((await res.json()).message ?? "Failed to load story");
  return res.json();
}

async function fetchEventPhotos(tastingId: string) {
  const res = await fetch(`/api/tastings/${tastingId}/event-photos`, { headers: pidHeaders() });
  if (!res.ok) return [];
  return res.json();
}

async function addEventPhoto(tastingId: string, photoUrl: string, caption?: string) {
  const res = await fetch(`/api/tastings/${tastingId}/event-photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ photoUrl, caption }),
  });
  if (!res.ok) throw new Error((await res.json()).message ?? "Upload failed");
  return res.json();
}

async function deleteEventPhoto(tastingId: string, photoId: string) {
  await fetch(`/api/tastings/${tastingId}/event-photos/${photoId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
  });
}

async function toggleStoryEnabled(tastingId: string, enabled: boolean) {
  const res = await fetch(`/api/tastings/${tastingId}/story-enabled`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ storyEnabled: enabled }),
  });
  if (!res.ok) throw new Error("Failed to update story access");
  return res.json();
}

// ---- Slide types ----
type Slide =
  | { type: "act1-opening" }
  | { type: "act2-whisky"; index: number }
  | { type: "act3-tasters" }
  | { type: "act4-discovery"; index: number }
  | { type: "act5-surprise" }
  | { type: "act6-winner" }
  | { type: "act7-finale" };

function buildSlides(whiskyCount: number, sortedCount: number, hasBlind: boolean): Slide[] {
  const slides: Slide[] = [];
  slides.push({ type: "act1-opening" });
  for (let i = 0; i < whiskyCount; i++) slides.push({ type: "act2-whisky", index: i });
  slides.push({ type: "act3-tasters" });
  for (let i = 0; i < sortedCount; i++) slides.push({ type: "act4-discovery", index: i });
  if (hasBlind) slides.push({ type: "act5-surprise" });
  slides.push({ type: "act6-winner" });
  slides.push({ type: "act7-finale" });
  return slides;
}

// ---- Slide components ----

function ActLabel({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
        color: "var(--labs-accent)", padding: "3px 10px", borderRadius: 6,
        background: "rgba(212,162,86,0.12)", border: "1px solid rgba(212,162,86,0.25)",
      }}>
        {number}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {title}
      </span>
    </div>
  );
}

function SlideContainer({ children, centered = true }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: centered ? "center" : "flex-start",
      justifyContent: centered ? "center" : "flex-start",
      padding: "clamp(24px, 5vw, 60px)",
      textAlign: centered ? "center" : "left",
      overflowY: "auto",
    }}>
      {children}
    </div>
  );
}

function Act1Opening({ tasting, eventPhotos }: { tasting: any; eventPhotos: any[] }) {
  const mainPhoto = eventPhotos[0];
  return (
    <SlideContainer>
      {mainPhoto && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: `url(${mainPhoto.photoUrl}) center/cover no-repeat`,
          opacity: 0.15,
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
        <ActLabel number="Akt I" title="Eröffnung" />
        <BookOpen style={{ width: 48, height: 48, color: "var(--labs-accent)", marginBottom: 20 }} />
        <h1 className="labs-serif" style={{
          fontSize: "clamp(28px, 5vw, 64px)", fontWeight: 700,
          color: "var(--labs-text)", lineHeight: 1.05, marginBottom: 16,
        }}>
          {tasting.title}
        </h1>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          {tasting.date && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, color: "var(--labs-text-muted)" }}>
              <Calendar style={{ width: 14, height: 14 }} />
              {tasting.date}
            </span>
          )}
          {tasting.location && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, color: "var(--labs-text-muted)" }}>
              <MapPin style={{ width: 14, height: 14 }} />
              {tasting.location}
            </span>
          )}
        </div>
        {tasting.hostReflection && (
          <p style={{
            fontSize: 18, color: "var(--labs-text-muted)", fontStyle: "italic",
            lineHeight: 1.6, maxWidth: 520, margin: "0 auto",
            padding: "16px 24px", borderRadius: 12,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            "{tasting.hostReflection}"
          </p>
        )}
      </div>
    </SlideContainer>
  );
}

function Act2Whisky({ whisky, index, totalWhiskies, blindMode }: { whisky: any; index: number; totalWhiskies: number; blindMode: boolean }) {
  const label = blindMode ? `Dram ${String.fromCharCode(65 + index)}` : (whisky.name || `Whisky ${index + 1}`);
  return (
    <SlideContainer>
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt II" title={`Die Whiskys · ${index + 1} / ${totalWhiskies}`} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ width: 120, height: 160, flexShrink: 0 }}>
            <WhiskyImage imageUrl={whisky.imageUrl} name={label} size={120} height={160} whiskyId={whisky.id} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 className="labs-serif" style={{
              fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
              color: "var(--labs-text)", marginBottom: 8, lineHeight: 1.1,
            }}>
              {label}
            </h2>
            {!blindMode && (
              <p style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 12 }}>
                {[whisky.distillery, whisky.region, whisky.country].filter(Boolean).join(" · ")}
              </p>
            )}
            {!blindMode && (whisky.age || whisky.abv) && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {whisky.age && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(212,162,86,0.1)", border: "1px solid rgba(212,162,86,0.25)", fontSize: 12, color: "var(--labs-accent)", fontWeight: 600 }}>
                    {whisky.age}y
                  </span>
                )}
                {whisky.abv && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "var(--labs-text)", fontWeight: 600 }}>
                    {whisky.abv}%
                  </span>
                )}
                {whisky.caskType && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "var(--labs-text)" }}>
                    {whisky.caskType}
                  </span>
                )}
              </div>
            )}
            {!blindMode && whisky.notes && (
              <p style={{
                marginTop: 16, fontSize: 14, color: "var(--labs-text-muted)",
                lineHeight: 1.6, fontStyle: "italic", maxWidth: 420,
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
              }}>
                {whisky.notes.length > 200 ? whisky.notes.slice(0, 200) + "…" : whisky.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}

function Act3Tasters({ participants, participantFunFacts }: { participants: any[]; participantFunFacts: Record<string, string> }) {
  const tasters = participants.filter(p => !p.excludedFromResults);
  return (
    <SlideContainer>
      <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt III" title="Die Verkoster" />
        <Users style={{ width: 44, height: 44, color: "var(--labs-accent)", marginBottom: 16, display: "block", margin: "0 auto 20px" }} />
        <h2 className="labs-serif" style={{
          fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
          color: "var(--labs-text)", marginBottom: 32, textAlign: "center",
        }}>
          {tasters.length} {tasters.length === 1 ? "Verkoster" : "Verkoster"} · Eine Mission
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {tasters.map((tp: any) => {
            const name = stripGuestSuffix(tp.participant?.name || tp.participant?.email || "Anonymous");
            const funFact = participantFunFacts[name] ?? "";
            return (
              <div key={tp.participantId} style={{
                padding: "14px 18px", borderRadius: 16, width: "clamp(160px, 28vw, 260px)",
                background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.2)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center",
              }} data-testid={`story-taster-${tp.participantId}`}>
                <div style={{
                  width: 48, height: 48, borderRadius: 24,
                  background: "linear-gradient(135deg, var(--labs-accent), #e8c878)",
                  color: "var(--labs-bg)", fontSize: 18, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{name}</span>
                {funFact && (
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.4, fontStyle: "italic" }}>
                    {funFact}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SlideContainer>
  );
}

function Act4Discovery({ whisky, rank, totalWhiskies, aiComment, maxScore }: {
  whisky: any; rank: number; totalWhiskies: number; aiComment: string; maxScore: number;
}) {
  return (
    <SlideContainer>
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt IV" title={`Entdeckungen · Platz ${rank}`} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 90, height: 120, flexShrink: 0 }}>
            <WhiskyImage imageUrl={whisky.imageUrl} name={whisky.name || "?"} size={90} height={120} whiskyId={whisky.id} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 900,
              color: rank <= 3 ? "var(--labs-accent)" : "var(--labs-text-muted)",
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
              marginBottom: 8,
            }}>
              #{rank}
            </div>
            <h2 className="labs-serif" style={{
              fontSize: "clamp(20px, 4vw, 38px)", fontWeight: 700,
              color: "var(--labs-text)", marginBottom: 6, lineHeight: 1.1,
            }}>
              {whisky.name || "Unknown"}
            </h2>
            {whisky.distillery && (
              <p style={{ fontSize: 14, color: "var(--labs-text-muted)", marginBottom: 16 }}>{whisky.distillery}</p>
            )}
            {whisky.avgOverall != null && (
              <div style={{
                fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900,
                color: "var(--labs-accent)", marginBottom: 16,
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatScore(whisky.avgOverall)}
                <span style={{ fontSize: "0.4em", color: "var(--labs-text-muted)", fontWeight: 400 }}>
                  {" "}/ {maxScore}
                </span>
              </div>
            )}
            {aiComment && (
              <p style={{
                fontSize: 14, color: "var(--labs-text-muted)", fontStyle: "italic",
                lineHeight: 1.6, maxWidth: 420, margin: "0 auto",
                padding: "12px 16px", borderRadius: 10,
                background: "rgba(212,162,86,0.05)", border: "1px solid rgba(212,162,86,0.15)",
              }}>
                {aiComment}
              </p>
            )}
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}

function Act5Surprise({ blindReveal, tasting }: { blindReveal: any[]; tasting: any }) {
  const hasRevealData = blindReveal.some(w => w.guesses.length > 0);
  return (
    <SlideContainer>
      <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt V" title="Die Überraschung" />
        <Sparkles style={{ width: 44, height: 44, color: "var(--labs-accent)", marginBottom: 16, display: "block", margin: "0 auto 20px" }} />
        <h2 className="labs-serif" style={{
          fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
          color: "var(--labs-text)", marginBottom: 12, textAlign: "center",
        }}>
          Blind-Tasting-Auflösung
        </h2>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", marginBottom: 28, textAlign: "center" }}>
          {tasting.blindMode ? "Wer hatte Recht? Wer lag daneben?" : "Das Tasting war nicht blind."}
        </p>
        {hasRevealData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {blindReveal.filter(w => w.guesses.length > 0).slice(0, 5).map((w: any) => {
              const sorted = [...w.guesses].sort((a, b) => (a.delta ?? 99) - (b.delta ?? 99));
              const best = sorted[0];
              const worst = sorted[sorted.length - 1];
              return (
                <div key={w.whiskyId} style={{
                  padding: "14px 18px", borderRadius: 12,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", marginBottom: 8 }}>
                    {w.whiskyName || "Whisky"} · {w.guesses[0]?.actualAbv != null ? `${w.guesses[0].actualAbv}% ABV` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {best && (
                      <span style={{ fontSize: 12, color: "var(--labs-success)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Check style={{ width: 12, height: 12 }} />
                        Nächste Schätzung: {best.guessAbv}% (Δ {best.delta?.toFixed(1)}%)
                      </span>
                    )}
                    {worst && worst !== best && (
                      <span style={{ fontSize: 12, color: "var(--labs-danger)", display: "flex", alignItems: "center", gap: 4 }}>
                        Weiteste: {worst.guessAbv}% (Δ {worst.delta?.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SlideContainer>
  );
}

function Act6Winner({ winner, aiComment, winnerNarration, maxScore }: {
  winner: any; aiComment: string; winnerNarration: string; maxScore: number;
}) {
  if (!winner) {
    return (
      <SlideContainer>
        <ActLabel number="Akt VI" title="Der Sieger" />
        <p style={{ color: "var(--labs-text-muted)" }}>Noch keine Ergebnisse.</p>
      </SlideContainer>
    );
  }
  return (
    <SlideContainer>
      <style>{`
        @keyframes story-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .story-winner-title { background: linear-gradient(90deg, var(--labs-accent), #e8c878, var(--labs-accent)); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: story-shimmer 3s linear infinite; }
      `}</style>
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt VI" title="Der Sieger" />
        <Trophy style={{ width: 56, height: 56, color: "#FFD700", marginBottom: 20, display: "block", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 160 }}>
            <WhiskyImage imageUrl={winner.imageUrl} name={winner.name || "Winner"} size={120} height={160} whiskyId={winner.id} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 className="labs-serif story-winner-title" style={{
              fontSize: "clamp(24px, 5vw, 52px)", fontWeight: 900,
              lineHeight: 1.05, marginBottom: 8,
            }}>
              {winner.name || "Unknown"}
            </h2>
            {winner.distillery && (
              <p style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 16 }}>{winner.distillery}</p>
            )}
            <div style={{
              fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900,
              color: "var(--labs-accent)", marginBottom: 20,
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatScore(winner.avgOverall ?? 0)}
              <span style={{ fontSize: "0.4em", color: "var(--labs-text-muted)", fontWeight: 400 }}>
                {" "}/ {maxScore}
              </span>
            </div>
            {(winnerNarration || aiComment) && (
              <p style={{
                fontSize: 16, color: "var(--labs-text-muted)", fontStyle: "italic",
                lineHeight: 1.6, maxWidth: 460, margin: "0 auto",
                padding: "16px 20px", borderRadius: 12,
                background: "rgba(212,162,86,0.06)", border: "1px solid rgba(212,162,86,0.2)",
              }}>
                {winnerNarration || aiComment}
              </p>
            )}
          </div>
        </div>
      </div>
    </SlideContainer>
  );
}

function Act7Finale({ tasting, whiskies, eventPhotos }: { tasting: any; whiskies: any[]; eventPhotos: any[] }) {
  const closingPhoto = eventPhotos[eventPhotos.length - 1];
  return (
    <SlideContainer>
      {closingPhoto && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: `url(${closingPhoto.photoUrl}) center/cover no-repeat`,
          opacity: 0.12,
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", width: "100%", textAlign: "center" }}>
        <ActLabel number="Akt VII" title="Das Bild des Abends" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 28 }}>
          {whiskies.slice(0, 8).map((w: any, i: number) => (
            <div key={w.id} style={{ opacity: 1 - i * 0.08 }}>
              <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={54} height={70} whiskyId={w.id} />
            </div>
          ))}
        </div>
        <h2 className="labs-serif" style={{
          fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
          color: "var(--labs-text)", marginBottom: 12,
        }}>
          Ein Abend. Unvergesslich.
        </h2>
        <p style={{ fontSize: 15, color: "var(--labs-text-muted)", marginBottom: 32 }}>
          {tasting.date} · {tasting.location}
        </p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 24px", borderRadius: 12,
          background: "rgba(212,162,86,0.12)", border: "1px solid rgba(212,162,86,0.3)",
        }}>
          <Wine style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)", letterSpacing: "0.06em" }}>
            CaskSense
          </span>
        </div>
      </div>
    </SlideContainer>
  );
}

// ---- PDF Export ----
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function exportStoryPdf(storyData: any) {
  const { tasting, sortedRanking, participants, eventPhotos, winner, winnerNarration, aiComments, blindReveal, participantFunFacts } = storyData;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, marginX = 18, contentW = pageW - marginX * 2;
  const accent: [number, number, number] = [212, 162, 86];
  const muted: [number, number, number] = [138, 126, 109];
  const bg: [number, number, number] = [26, 23, 20];
  const textColor: [number, number, number] = [245, 240, 232];
  const surface: [number, number, number] = [38, 34, 28];

  const drawBg = () => { doc.setFillColor(...bg); doc.rect(0, 0, pageW, pageH, "F"); };

  const drawHeader = () => {
    doc.setFillColor(...accent); doc.rect(0, 0, pageW, 2.5, "F");
  };

  const drawFooter = (pageLabel?: string) => {
    const fy = pageH - 11;
    doc.setDrawColor(...accent); doc.setLineWidth(0.25); doc.line(marginX, fy - 3, pageW - marginX, fy - 3);
    doc.setFontSize(6.5); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
    doc.text("CaskSense Story", marginX, fy);
    doc.text(pageLabel || tasting.title || "Tasting", pageW - marginX, fy, { align: "right" });
  };

  const drawActLabel = (number: string, title: string, yPos: number) => {
    const badgeW = doc.getTextWidth(number) + 8;
    doc.setFillColor(212, 162, 86); doc.roundedRect(marginX, yPos - 4, badgeW, 6.5, 1, 1, "F");
    doc.setFontSize(6.5); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
    doc.text(number, marginX + 4, yPos + 0.5);
    doc.setFontSize(7); doc.setTextColor(...muted); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), marginX + badgeW + 5, yPos + 0.5);
    return yPos + 10;
  };

  const addTextWrapped = (text: string, x: number, yRef: number, maxWidth: number, fontSize: number, color: [number,number,number], style: "normal"|"bold"|"italic" = "normal"): number => {
    doc.setFontSize(fontSize); doc.setTextColor(...color); doc.setFont("helvetica", style);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => { doc.text(line, x, yRef); yRef += fontSize * 0.45; });
    return yRef;
  };

  const drawSurface = (x: number, y: number, w: number, h: number) => {
    doc.setFillColor(...surface); doc.roundedRect(x, y, w, h, 2, 2, "F");
    doc.setDrawColor(212, 162, 86); doc.setLineWidth(0.2); doc.roundedRect(x, y, w, h, 2, 2, "S");
  };

  // Preload event photo images
  const eventPhotoB64s: (string | null)[] = await Promise.all(
    (eventPhotos || []).slice(0, 10).map((ep: any) => fetchImageAsBase64(ep.photoUrl))
  );

  // Preload whisky images
  const whiskyImgB64s: Map<string, string | null> = new Map();
  for (const w of (sortedRanking || []).slice(0, 12)) {
    if (w.coverImageUrl || w.imageUrl) {
      whiskyImgB64s.set(w.id, await fetchImageAsBase64(w.coverImageUrl || w.imageUrl));
    }
  }

  const tasters = (participants || []).filter((p: any) => !p.excludedFromResults);

  // ===== PAGE 1: ACT I · COVER / OPENING =====
  drawBg(); drawHeader();
  let y = 18;

  // Event photo as atmospheric background strip at top
  const firstPhoto = eventPhotoB64s[0];
  if (firstPhoto) {
    try {
      // Full-width photo strip in the upper portion
      doc.addImage(firstPhoto, "JPEG", 0, 0, pageW, 110, undefined, "FAST");
      // Dark vignette overlay at bottom of photo (stepped opacity fade to dark bg)
      doc.setFillColor(...bg);
      for (let i = 0; i < 6; i++) {
        doc.setGState(doc.GState({ opacity: 0.15 + i * 0.15 }));
        doc.rect(0, 80 + i * 5, pageW, 6, "F");
      }
      doc.setGState(doc.GState({ opacity: 1 }));
      // Solid dark bar at bottom of photo to blend into bg
      doc.setFillColor(...bg); doc.rect(0, 108, pageW, 4, "F");
      y = 118;
    } catch { /* skip */ }
  }

  // Act label
  y = drawActLabel("AKT I", "Eröffnung", y);

  doc.setFontSize(24); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(tasting.title || "Tasting Story", contentW);
  titleLines.slice(0, 3).forEach((l: string) => { doc.text(l, pageW / 2, y, { align: "center" }); y += 11; });
  y += 2;

  doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
  const metaParts = [tasting.date, tasting.location].filter(Boolean).join("  ·  ");
  if (metaParts) { doc.text(metaParts, pageW / 2, y, { align: "center" }); y += 10; }

  // Gold divider
  doc.setDrawColor(...accent); doc.setLineWidth(0.4); doc.line(marginX + 20, y, pageW - marginX - 20, y); y += 10;

  // Host reflection if available
  if (tasting.hostReflection) {
    drawSurface(marginX, y, contentW, 22);
    y += 5;
    y = addTextWrapped(`"${tasting.hostReflection.slice(0, 200)}"`, marginX + 5, y, contentW - 10, 8, muted, "italic") + 4;
    y += 6;
  }

  // Participants line
  if (tasters.length > 0) {
    doc.setFontSize(7); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
    doc.text(`${tasters.length} VERKOSTER`, pageW / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8.5); doc.setTextColor(...textColor); doc.setFont("helvetica", "normal");
    const names = tasters.map((t: any) => stripGuestSuffix(t.participant?.name || "?")).join("  ·  ");
    const nlines = doc.splitTextToSize(names, contentW);
    nlines.slice(0, 2).forEach((l: string) => { doc.text(l, pageW / 2, y, { align: "center" }); y += 5; });
    y += 6;
  }

  // Quick ranking overview on cover
  if ((sortedRanking || []).length > 0) {
    doc.setFontSize(7); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
    doc.text("TOP RANKING", marginX, y); y += 5;
    (sortedRanking || []).slice(0, 5).forEach((w: any, i: number) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(8.5); doc.setTextColor(...(i < 3 ? accent : textColor));
      const medal = `#${i + 1}`;
      doc.text(`${medal}  ${(w.name || "?").slice(0, 44)}`, marginX, y);
      if (w.avgOverall != null) {
        doc.setFont("helvetica", "bold");
        doc.text(formatScore(w.avgOverall), pageW - marginX, y, { align: "right" });
      }
      y += 6.5;
    });
  }

  drawFooter("Eröffnung");

  // ===== PAGE: ACT III · DIE VERKOSTER =====
  if (tasters.length > 0) {
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    y = drawActLabel("AKT III", "Die Verkoster", y);

    doc.setFontSize(18); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    doc.text(`${tasters.length} Verkoster · Eine Mission`, pageW / 2, y, { align: "center" }); y += 18;

    // Taster cards arranged in a grid (3 per row)
    const cardCols = 3;
    const cardW = (contentW - (cardCols - 1) * 6) / cardCols;
    const cardH = 26;
    let cardCol = 0;
    const cardStartY = y;

    tasters.forEach((tp: any, idx: number) => {
      const name = stripGuestSuffix(tp.participant?.name || tp.participant?.email || "?");
      const funFact = participantFunFacts?.[name] ?? "";
      const initial = name.charAt(0).toUpperCase();
      const cx = marginX + cardCol * (cardW + 6);
      const cy = cardStartY + Math.floor(idx / cardCols) * (cardH + 6);

      if (cy + cardH > pageH - 22) return;

      // Card background
      drawSurface(cx, cy, cardW, cardH);

      // Circular avatar
      const avatarR = 7;
      const avatarX = cx + avatarR + 4;
      const avatarY = cy + cardH / 2;
      doc.setFillColor(...accent); doc.circle(avatarX, avatarY, avatarR, "F");
      doc.setFontSize(8); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
      doc.text(initial, avatarX, avatarY + 2.5, { align: "center" });

      // Name + fun fact
      const textX = cx + avatarR * 2 + 8;
      const textMaxW = cardW - avatarR * 2 - 12;
      doc.setFontSize(8); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
      doc.text(name.slice(0, 18), textX, cy + cardH / 2 - (funFact ? 2 : -2));
      if (funFact) {
        doc.setFontSize(6); doc.setTextColor(...muted); doc.setFont("helvetica", "italic");
        const ffLines = doc.splitTextToSize(funFact.slice(0, 60), textMaxW);
        ffLines.slice(0, 2).forEach((l: string, li: number) => {
          doc.text(l, textX, cy + cardH / 2 + 4 + li * 4);
        });
      }

      cardCol++;
      if (cardCol >= cardCols) cardCol = 0;
    });

    y = cardStartY + Math.ceil(tasters.length / cardCols) * (cardH + 6) + 4;
    drawFooter("Die Verkoster");
  }

  // ===== PAGES: ACT IV · ENTDECKUNGEN (per-whisky detail pages) =====
  for (let i = 0; i < (sortedRanking || []).length; i++) {
    const w = sortedRanking[i];
    doc.addPage(); drawBg(); drawHeader();
    y = 18;

    y = drawActLabel("AKT IV", `Entdeckungen · Platz ${i + 1}`, y);

    // Large rank number
    const rankText = `#${i + 1}`;
    const rankFontSize = 36;
    doc.setFontSize(rankFontSize); doc.setTextColor(...(i < 3 ? accent : muted)); doc.setFont("helvetica", "bold");
    doc.text(rankText, marginX, y + rankFontSize * 0.35); 

    // Whisky photo on right
    const imgB64 = whiskyImgB64s.get(w.id);
    const hasImg = !!imgB64;
    const imgX = pageW - marginX - 58;
    const imgH = 80;
    if (hasImg) {
      try {
        doc.addImage(imgB64!, "JPEG", imgX, y - 2, 58, imgH, undefined, "FAST");
        // Subtle gold border around image
        doc.setDrawColor(...accent); doc.setLineWidth(0.3);
        doc.rect(imgX, y - 2, 58, imgH, "S");
      } catch { /* skip */ }
    }

    const textAreaW = hasImg ? contentW - 66 : contentW;
    const nameStartY = y + rankFontSize * 0.4;

    // Name
    doc.setFontSize(17); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    const wNameLines = doc.splitTextToSize(w.name || "Unknown", textAreaW);
    let ny = nameStartY;
    wNameLines.slice(0, 2).forEach((l: string) => { doc.text(l, marginX, ny); ny += 9; });

    // Distillery / region / abv badges
    if (w.distillery) {
      doc.setFontSize(8.5); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text(w.distillery + (w.region ? ` · ${w.region}` : ""), marginX, ny); ny += 6;
    }
    // Detail badges (age, ABV)
    const badges: string[] = [];
    if (w.age) badges.push(`${w.age}y`);
    if (w.abv) badges.push(`${w.abv}% ABV`);
    if (w.caskType) badges.push(w.caskType);
    if (badges.length > 0) {
      let bx = marginX;
      badges.forEach((b) => {
        const bw = doc.getTextWidth(b) + 8;
        if (bx + bw < marginX + textAreaW) {
          drawSurface(bx, ny - 4, bw, 7);
          doc.setFontSize(6.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
          doc.text(b, bx + 4, ny + 0.5);
          bx += bw + 4;
        }
      });
      ny += 10;
    }

    y = Math.max(ny, hasImg ? y + imgH + 6 : ny) + 4;

    // Score display — large, prominent
    if (w.avgOverall != null) {
      // Gold accent bar
      doc.setFillColor(...accent); doc.rect(marginX, y, contentW, 0.5, "F"); y += 6;

      doc.setFontSize(32); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text(formatScore(w.avgOverall), marginX, y + 10);
      doc.setFontSize(8); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text("Ø GESAMTSCORE", marginX + doc.getTextWidth(formatScore(w.avgOverall)) + 4, y + 10);
      y += 18;

      // Sub-scores in stylized boxes
      const scores: [string, number|null][] = [["Nose", w.avgNose], ["Taste", w.avgTaste], ["Finish", w.avgFinish]];
      const validScores = scores.filter(([, v]) => v != null);
      if (validScores.length > 0) {
        const boxW = 38, boxH = 18, gap = 6;
        validScores.forEach(([label, val], si) => {
          const bx = marginX + si * (boxW + gap);
          drawSurface(bx, y, boxW, boxH);
          doc.setFontSize(11); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
          doc.text(formatScore(val!), bx + boxW / 2, y + 8, { align: "center" });
          doc.setFontSize(6); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
          doc.text(label.toUpperCase(), bx + boxW / 2, y + 14, { align: "center" });
        });
        y += boxH + 8;
      }
    }

    // Separator
    doc.setDrawColor(...muted); doc.setLineWidth(0.15); doc.line(marginX, y, pageW - marginX, y); y += 8;

    // AI story comment
    if (aiComments?.[w.name]) {
      doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text("STORY", marginX, y); y += 5;
      y = addTextWrapped(`"${aiComments[w.name]}"`, marginX, y, contentW, 8.5, muted, "italic") + 6;
    }

    // Taster notes excerpts
    if (w.ratings && w.ratings.length > 0) {
      const notesArr = w.ratings.filter((r: any) => r.notes?.trim()).slice(0, 3);
      if (notesArr.length > 0 && y < pageH - 40) {
        doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
        doc.text("TASTING NOTES", marginX, y); y += 5;
        for (const r of notesArr) {
          if (y > pageH - 28) break;
          const tasterName = tasters.find((t: any) => t.participantId === r.participantId)?.participant?.name || "";
          if (tasterName) {
            doc.setFontSize(6.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
            doc.text(stripGuestSuffix(tasterName).toUpperCase(), marginX, y); y += 4;
          }
          y = addTextWrapped(r.notes.slice(0, 180), marginX + 3, y, contentW - 6, 7.5, textColor) + 3;
        }
      }
    }

    drawFooter(`Platz ${i + 1} · ${(w.name || "?").slice(0, 30)}`);
  }

  // ===== PAGE: ACT V · BLIND-TASTING AUFLÖSUNG =====
  const blindData = (blindReveal || []).filter((w: any) => w.guesses && w.guesses.length > 0);
  if (blindData.length > 0) {
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    y = drawActLabel("AKT V", "Die Überraschung", y);

    doc.setFontSize(20); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    doc.text("Blind-Tasting-Auflösung", pageW / 2, y, { align: "center" }); y += 8;
    doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
    doc.text("Wer hatte Recht? Wer lag daneben?", pageW / 2, y, { align: "center" }); y += 14;

    for (const w of blindData.slice(0, 6)) {
      if (y > pageH - 40) break;
      const sorted = [...w.guesses].sort((a: any, b: any) => (a.delta ?? 99) - (b.delta ?? 99));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const rowH = worst && worst !== best ? 26 : 20;
      drawSurface(marginX, y, contentW, rowH);

      doc.setFontSize(8.5); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
      const abvLabel = w.guesses[0]?.actualAbv != null ? `  ·  ${w.guesses[0].actualAbv}% ABV` : "";
      doc.text((w.whiskyName || "Whisky").slice(0, 40) + abvLabel, marginX + 5, y + 7);

      if (best) {
        doc.setFontSize(7); doc.setTextColor(106, 176, 76); doc.setFont("helvetica", "normal");
        const bestTasterName = tasters.find((t: any) => t.participantId === best.participantId)?.participant?.name || "";
        const bestLabel = bestTasterName ? `${stripGuestSuffix(bestTasterName)}: ` : "";
        doc.text(`✓ Nächste Schätzung: ${bestLabel}${best.guessAbv}% (Δ ${best.delta?.toFixed(1)}%)`, marginX + 5, y + 13);
      }
      if (worst && worst !== best) {
        doc.setFontSize(7); doc.setTextColor(220, 80, 80); doc.setFont("helvetica", "normal");
        const worstTasterName = tasters.find((t: any) => t.participantId === worst.participantId)?.participant?.name || "";
        const worstLabel = worstTasterName ? `${stripGuestSuffix(worstTasterName)}: ` : "";
        doc.text(`✗ Weiteste Schätzung: ${worstLabel}${worst.guessAbv}% (Δ ${worst.delta?.toFixed(1)}%)`, marginX + 5, y + 19);
      }

      y += rowH + 5;
    }
    drawFooter("Die Überraschung");
  }

  // ===== PAGE: ACT VI · DER SIEGER =====
  if (winner) {
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    y = drawActLabel("AKT VI", "Der Sieger", y);

    // Winner photo centered and large
    const winnerImg = whiskyImgB64s.get(winner.id);
    if (winnerImg) {
      try {
        const wImgW = 72, wImgH = 96;
        const wImgX = (pageW - wImgW) / 2;
        doc.addImage(winnerImg, "JPEG", wImgX, y, wImgW, wImgH, undefined, "FAST");
        // Gold frame
        doc.setDrawColor(...accent); doc.setLineWidth(0.5);
        doc.rect(wImgX, y, wImgW, wImgH, "S");
        y += wImgH + 10;
      } catch { /* skip */ }
    }

    // Gold label
    const labelTxt = "DER SIEGER DES ABENDS";
    const labelW = doc.getTextWidth(labelTxt) + 14;
    doc.setFontSize(8); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
    doc.setFillColor(...accent); doc.roundedRect((pageW - labelW) / 2, y - 4, labelW, 8, 2, 2, "F");
    doc.text(labelTxt, pageW / 2, y + 1, { align: "center" }); y += 12;

    doc.setFontSize(24); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    const winLines = doc.splitTextToSize(winner.name || "", contentW - 20);
    winLines.slice(0, 2).forEach((l: string) => { doc.text(l, pageW / 2, y, { align: "center" }); y += 11; });

    if (winner.distillery) {
      doc.setFontSize(10); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text(winner.distillery, pageW / 2, y, { align: "center" }); y += 8;
    }

    if (winner.avgOverall != null) {
      doc.setFontSize(38); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text(formatScore(winner.avgOverall), pageW / 2, y + 14, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text("/ 100", pageW / 2 + doc.getTextWidth(formatScore(winner.avgOverall)) / 2 + 3, y + 14);
      y += 24;
    }

    if (winnerNarration) {
      y += 4;
      doc.setDrawColor(...accent); doc.setLineWidth(0.3);
      doc.line(marginX + 15, y, pageW - marginX - 15, y); y += 8;
      drawSurface(marginX + 8, y, contentW - 16, 30);
      y += 5;
      y = addTextWrapped(`"${winnerNarration}"`, marginX + 12, y, contentW - 24, 9, muted, "italic") + 6;
    }

    drawFooter("Der Sieger");
  }

  // ===== EVENT PHOTOS PAGES =====
  const photoEntries = (eventPhotos || []).filter((_: any, i: number) => eventPhotoB64s[i]);
  if (photoEntries.length > 0) {
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
    doc.text("EVENT FOTOS", pageW / 2, y, { align: "center" }); y += 10;

    const cols = 2, photoW = (contentW - 6) / cols, photoH = photoW * 0.65;
    let col = 0;
    for (let pi = 0; pi < photoEntries.length; pi++) {
      const b64 = eventPhotoB64s[pi];
      if (!b64) continue;
      const px = marginX + col * (photoW + 6);
      if (y + photoH > pageH - 22) {
        drawFooter("Event Fotos"); doc.addPage(); drawBg(); drawHeader(); y = 18;
        doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
        doc.text("EVENT FOTOS", pageW / 2, y, { align: "center" }); y += 10;
        col = 0;
      }
      try {
        doc.addImage(b64, "JPEG", px, y, photoW, photoH, undefined, "FAST");
        // Gold border on photos
        doc.setDrawColor(...accent); doc.setLineWidth(0.2); doc.rect(px, y, photoW, photoH, "S");
        const caption = photoEntries[pi].caption;
        if (caption) {
          doc.setFontSize(6.5); doc.setTextColor(...muted); doc.setFont("helvetica", "italic");
          doc.text(caption.slice(0, 38), px, y + photoH + 4);
        }
      } catch { /* skip broken image */ }
      col++;
      if (col >= cols) { col = 0; y += photoH + 14; }
    }
    if (col > 0) y += photoH + 14;
    drawFooter("Event Fotos");
  }

  // ===== PAGE: ACT VII · FINALE =====
  doc.addPage(); drawBg(); drawHeader();
  y = 18;

  // Last event photo as dramatic background if available
  const lastPhotoB64 = eventPhotoB64s.length > 0 ? eventPhotoB64s[eventPhotoB64s.length - 1] : null;
  if (lastPhotoB64) {
    try {
      doc.addImage(lastPhotoB64, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      // Heavy dark overlay so text is readable
      doc.setFillColor(...bg);
      doc.setGState(doc.GState({ opacity: 0.78 }));
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
      drawHeader();
    } catch { /* skip */ }
  }

  y = drawActLabel("AKT VII", "Das Bild des Abends", y);

  // Mini whisky bottle collage across the top
  const collageWhiskies = (sortedRanking || []).slice(0, 6).filter((w: any) => whiskyImgB64s.get(w.id));
  if (collageWhiskies.length > 0) {
    const thumbW = 22, thumbH = 30;
    const totalThumbW = collageWhiskies.length * (thumbW + 4) - 4;
    const thumbStartX = (pageW - totalThumbW) / 2;
    collageWhiskies.forEach((w: any, idx: number) => {
      const b64 = whiskyImgB64s.get(w.id);
      if (!b64) return;
      const tx = thumbStartX + idx * (thumbW + 4);
      const opacity = 1 - idx * 0.1;
      try {
        if (opacity < 1) {
          doc.setGState(doc.GState({ opacity }));
        }
        doc.addImage(b64, "JPEG", tx, y, thumbW, thumbH, undefined, "FAST");
        doc.setGState(doc.GState({ opacity: 1 }));
        doc.setDrawColor(...accent); doc.setLineWidth(0.2); doc.rect(tx, y, thumbW, thumbH, "S");
      } catch { /* skip */ }
    });
    y += thumbH + 16;
  } else {
    y += 10;
  }

  // Closing headline
  doc.setFontSize(28); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
  doc.text("Ein Abend.", pageW / 2, y, { align: "center" }); y += 13;
  doc.setFontSize(20); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
  doc.text("Unvergesslich.", pageW / 2, y, { align: "center" }); y += 16;

  // Meta: date · location
  doc.setFontSize(9.5); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
  const closingMeta = [tasting.date, tasting.location].filter(Boolean).join("  ·  ");
  if (closingMeta) { doc.text(closingMeta, pageW / 2, y, { align: "center" }); y += 16; }

  // Gold divider
  doc.setDrawColor(...accent); doc.setLineWidth(0.4); doc.line(marginX + 30, y, pageW - marginX - 30, y); y += 14;

  // Rankings summary (compact)
  doc.setFontSize(7); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
  doc.text("VOLLSTÄNDIGES RANKING", pageW / 2, y, { align: "center" }); y += 7;
  (sortedRanking || []).forEach((w: any, i: number) => {
    if (y > pageH - 40) return;
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(8); doc.setTextColor(...(i < 3 ? accent : textColor));
    doc.text(`#${i + 1}  ${(w.name || "?").slice(0, 40)}`, marginX + 10, y);
    if (w.avgOverall != null) {
      doc.setFont("helvetica", "bold");
      doc.text(formatScore(w.avgOverall), pageW - marginX - 10, y, { align: "right" });
    }
    y += 5.5;
  });

  y += 10;
  // CaskSense branding badge
  const brandLabel = "CaskSense";
  const brandW = doc.getTextWidth(brandLabel) + 18;
  doc.setFillColor(...accent); doc.roundedRect((pageW - brandW) / 2, y, brandW, 9, 2, 2, "F");
  doc.setFontSize(8); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
  doc.text(brandLabel, pageW / 2, y + 6, { align: "center" });

  drawFooter("Finale");

  const safeName = (tasting.title || "story").replace(/[^a-zA-Z0-9]/g, "_");
  saveJsPdf(doc, `${safeName}_story.pdf`);
}

// ---- Photo Upload Panel ----
function PhotoUploadPanel({ tastingId, photos, onRefresh, canUpload }: {
  tastingId: string; photos: any[]; onRefresh: () => void; canUpload: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useUpload();
  const qc = useQueryClient();

  const handleFiles = async (files: FileList) => {
    if (!files.length) return;
    const remaining = 10 - photos.length;
    if (remaining <= 0) { setError("Maximal 10 Fotos erlaubt."); return; }
    setUploading(true);
    setError(null);
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      const result = await uploadFile(file);
      if (result?.objectPath) {
        const publicUrl = result.objectPath.startsWith("http") ? result.objectPath : `/api/uploads/serve/${result.objectPath}`;
        await addEventPhoto(tastingId, publicUrl).catch(e => setError(e.message));
      }
    }
    setUploading(false);
    onRefresh();
    qc.invalidateQueries({ queryKey: ["event-photos", tastingId] });
  };

  const handleDelete = async (photoId: string) => {
    await deleteEventPhoto(tastingId, photoId);
    onRefresh();
    qc.invalidateQueries({ queryKey: ["event-photos", tastingId] });
  };

  return (
    <div style={{ padding: "16px 20px", borderRadius: 14, background: "var(--labs-surface)", border: "1px solid var(--labs-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Camera style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
          Event-Fotos ({photos.length}/10)
        </span>
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
          · Atmosphäre, Tisch, Gruppenmoment
        </span>
      </div>

      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: "relative", width: 64, height: 64 }} data-testid={`event-photo-${p.id}`}>
              <img
                src={p.photoUrl}
                alt={p.caption || "Event photo"}
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--labs-border)" }}
              />
              {canUpload && (
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{
                    position: "absolute", top: -6, right: -6, width: 18, height: 18,
                    borderRadius: 9, background: "var(--labs-danger)", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", padding: 0,
                  }}
                  data-testid={`delete-photo-${p.id}`}
                >
                  <X style={{ width: 10, height: 10 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canUpload && photos.length < 10 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={e => e.target.files && handleFiles(e.target.files)}
            data-testid="event-photo-file-input"
          />
          <button
            className="labs-btn-secondary flex items-center gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ fontSize: 13 }}
            data-testid="button-upload-event-photo"
          >
            {uploading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: 14, height: 14 }} />}
            {uploading ? "Hochladen…" : "Fotos hochladen"}
          </button>
          {error && <p style={{ color: "var(--labs-danger)", fontSize: 12, marginTop: 6 }}>{error}</p>}
        </>
      )}
    </div>
  );
}

// ---- Main Component ----
export default function LabsStoryPresent({ params }: LabsStoryPresentProps) {
  const tastingId = params.id;
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const qc = useQueryClient();

  const [slideIndex, setSlideIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showPhotoPanel, setShowPhotoPanel] = useState(false);
  const [storyToggling, setStoryToggling] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { data: storyData, isLoading, error } = useQuery({
    queryKey: ["tasting-story", tastingId],
    queryFn: () => fetchStoryData(tastingId),
    retry: 1,
  });

  const { data: eventPhotos = [], refetch: refetchPhotos } = useQuery({
    queryKey: ["event-photos", tastingId],
    queryFn: () => fetchEventPhotos(tastingId),
  });

  const tasting = storyData?.tasting;
  const isHost = currentParticipant?.id === tasting?.hostId;
  const maxScore = tasting?.ratingScale ?? 100;

  const slides: Slide[] = useMemo(() => {
    if (!storyData) return [];
    const { whiskies, sortedRanking, blindReveal } = storyData;
    const hasBlind = tasting?.blindMode && blindReveal?.some((w: any) => w.guesses.length > 0);
    return buildSlides(whiskies?.length ?? 0, sortedRanking?.length ?? 0, hasBlind);
  }, [storyData, tasting]);

  const goTo = useCallback((idx: number) => {
    const next = Math.max(0, Math.min(idx, slides.length - 1));
    setDirection(next >= slideIndex ? 1 : -1);
    setSlideIndex(next);
  }, [slides.length, slideIndex]);

  const goNext = useCallback(() => goTo(slideIndex + 1), [goTo, slideIndex]);
  const goPrev = useCallback(() => goTo(slideIndex - 1), [goTo, slideIndex]);

  // Auto-play
  useEffect(() => {
    if (autoPlay && slides.length > 0) {
      timerRef.current = setInterval(() => {
        setSlideIndex(i => {
          const next = i + 1;
          if (next >= slides.length) { setAutoPlay(false); return i; }
          setDirection(1);
          return next;
        });
      }, 8000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoPlay, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      else if (e.key === "Escape") navigate(`/labs/results/${tastingId}`);
      else if (e.key === " ") { e.preventDefault(); setAutoPlay(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, navigate, tastingId]);

  const handleStoryToggle = async () => {
    if (!tasting) return;
    setStoryToggling(true);
    await toggleStoryEnabled(tastingId, !tasting.storyEnabled).catch(console.error);
    await qc.invalidateQueries({ queryKey: ["tasting-story", tastingId] });
    setStoryToggling(false);
  };

  const handlePdfExport = async () => {
    if (!storyData || isPdfExporting) return;
    setIsPdfExporting(true);
    try {
      await exportStoryPdf({ ...storyData, eventPhotos });
    } finally {
      setIsPdfExporting(false);
    }
  };

  // Touch/swipe
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
    touchStartX.current = null;
  };

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d < 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  };

  if (isLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--labs-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--labs-text-muted)", fontSize: 14 }}>Lade Story…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !storyData) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--labs-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24 }}>
        <p style={{ color: "var(--labs-danger)", fontSize: 16, fontWeight: 600 }}>Story nicht verfügbar</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>
          {(error as Error)?.message || "Keine Daten gefunden."}
        </p>
        <button className="labs-btn-secondary" onClick={() => navigate(`/labs/results/${tastingId}`)}>
          Zurück
        </button>
      </div>
    );
  }

  const { whiskies, sortedRanking, participants, blindReveal, aiComments, participantFunFacts, winnerNarration, winner } = storyData;
  const currentSlide = slides[slideIndex];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "var(--labs-bg)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 100 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="story-presentation-overlay"
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", pointerEvents: "none",
      }}>
        <div style={{ pointerEvents: "auto", display: "flex", gap: 8 }}>
          <button
            className="labs-btn-ghost"
            style={{ padding: "6px 12px", fontSize: 13 }}
            onClick={() => navigate(`/labs/results/${tastingId}`)}
            data-testid="story-close-btn"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
          {isHost && (
            <button
              className="labs-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 13 }}
              onClick={() => setShowPhotoPanel(p => !p)}
              data-testid="story-toggle-photo-panel"
            >
              <Camera style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          {isHost && (
            <button
              className="labs-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
              onClick={handleStoryToggle}
              disabled={storyToggling}
              data-testid="story-share-toggle"
            >
              {storyToggling ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> :
                tasting?.storyEnabled ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
              <span>{tasting?.storyEnabled ? "Story verbergen" : "Story freigeben"}</span>
            </button>
          )}
          <button
            className="labs-btn-ghost"
            style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, opacity: isPdfExporting ? 0.6 : 1 }}
            onClick={handlePdfExport}
            disabled={isPdfExporting}
            data-testid="story-pdf-export"
          >
            {isPdfExporting ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Download style={{ width: 13, height: 13 }} />}
            {isPdfExporting ? "Exportiere…" : "PDF"}
          </button>
          <span style={{
            fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)",
            padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
            fontVariantNumeric: "tabular-nums",
          }} data-testid="story-slide-indicator">
            {slideIndex + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Photo panel overlay */}
      <AnimatePresence>
        {showPhotoPanel && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            style={{
              position: "absolute", top: 52, left: 16, right: 16, zIndex: 30,
              maxWidth: 540, margin: "0 auto",
            }}
          >
            <PhotoUploadPanel
              tastingId={tastingId}
              photos={eventPhotos}
              onRefresh={refetchPhotos}
              canUpload={isHost}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }} onClick={() => goNext()}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slideIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 320, damping: 32 }, opacity: { duration: 0.18 } }}
            style={{ position: "absolute", inset: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {currentSlide?.type === "act1-opening" && (
              <Act1Opening tasting={tasting} eventPhotos={eventPhotos} />
            )}
            {currentSlide?.type === "act2-whisky" && (
              <Act2Whisky
                whisky={whiskies[currentSlide.index]}
                index={currentSlide.index}
                totalWhiskies={whiskies.length}
                blindMode={!!tasting.blindMode}
              />
            )}
            {currentSlide?.type === "act3-tasters" && (
              <Act3Tasters participants={participants} participantFunFacts={participantFunFacts ?? {}} />
            )}
            {currentSlide?.type === "act4-discovery" && (() => {
              const revIdx = sortedRanking.length - 1 - currentSlide.index;
              const w = sortedRanking[revIdx];
              return w ? (
                <Act4Discovery
                  whisky={w}
                  rank={revIdx + 1}
                  totalWhiskies={sortedRanking.length}
                  aiComment={aiComments?.[w.name] ?? ""}
                  maxScore={maxScore}
                />
              ) : null;
            })()}
            {currentSlide?.type === "act5-surprise" && (
              <Act5Surprise blindReveal={blindReveal ?? []} tasting={tasting} />
            )}
            {currentSlide?.type === "act6-winner" && (
              <Act6Winner
                winner={winner}
                aiComment={aiComments?.[winner?.name] ?? ""}
                winnerNarration={winnerNarration ?? ""}
                maxScore={maxScore}
              />
            )}
            {currentSlide?.type === "act7-finale" && (
              <Act7Finale tasting={tasting} whiskies={whiskies} eventPhotos={eventPhotos} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Click zones (left/right) */}
        <div
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "30%", zIndex: 10, cursor: "pointer" }}
          onClick={e => { e.stopPropagation(); goPrev(); }}
        />
        <div
          style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "30%", zIndex: 10, cursor: "pointer" }}
          onClick={e => { e.stopPropagation(); goNext(); }}
        />
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: "10px 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)",
      }}>
        <button
          className="labs-btn-ghost"
          style={{ padding: "8px 16px" }}
          onClick={goPrev}
          disabled={slideIndex === 0}
          data-testid="story-prev-btn"
        >
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {slides.length <= 16 && slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === slideIndex ? 20 : 6,
                height: 6, borderRadius: 3,
                background: i === slideIndex ? "var(--labs-accent)" : "rgba(255,255,255,0.2)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.2s",
              }}
              data-testid={`story-dot-${i}`}
            />
          ))}
          {slides.length > 16 && (
            <span style={{ fontSize: 12, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {slideIndex + 1} / {slides.length}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="labs-btn-ghost"
            style={{ padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => setAutoPlay(p => !p)}
            data-testid="story-autoplay-btn"
          >
            {autoPlay
              ? <Pause style={{ width: 14, height: 14 }} />
              : <Play style={{ width: 14, height: 14 }} />}
          </button>
          <button
            className="labs-btn-ghost"
            style={{ padding: "8px 16px" }}
            onClick={goNext}
            disabled={slideIndex === slides.length - 1}
            data-testid="story-next-btn"
          >
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
