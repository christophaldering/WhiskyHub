import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Trophy, Wine, Users,
  Camera, Upload, Trash2, Play, Pause, Download,
  Sparkles, Star, Eye, EyeOff, Loader2, Check, BookOpen, MapPin, Calendar, Mail, Plus, CheckCheck,
  Maximize, Minimize, RefreshCw,
} from "lucide-react";
import { getParticipantId, pidHeaders } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { stripGuestSuffix, formatScore } from "@/lib/utils";
import { useUpload } from "@/hooks/use-upload";
import { exportStoryPdf, type PdfProgressCallback } from "@/lib/pdf-story";
import ModalPortal from "@/labs/components/ModalPortal";

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

const STORY = {
  bg: "#0B0906",
  text: "#F5EDE0",
  dim: "#A89A85",
  amber: "#C9A961",
  amberGlow: "rgba(201,169,97,0.12)",
  amberBorder: "rgba(201,169,97,0.25)",
} as const;

function ActLabel({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ width: 28, height: 1, background: STORY.amber, marginBottom: 8 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: STORY.amber }}>
          {number}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: STORY.dim, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
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

function Act1Opening({ tasting, eventPhotos, openingNarration }: { tasting: any; eventPhotos: any[]; openingNarration: string }) {
  const mainPhoto = eventPhotos[0];
  return (
    <SlideContainer>
      {mainPhoto && (
        <>
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: `url(${mainPhoto.photoUrl}) center/cover no-repeat`,
            opacity: 0.3,
          }} />
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: "linear-gradient(to top, #0B0906 30%, rgba(11,9,6,0.6) 100%)",
          }} />
        </>
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
        <ActLabel number="Akt I" title="Eröffnung" />
        <BookOpen style={{ width: 44, height: 44, color: STORY.amber, marginBottom: 20 }} />
        <h1 className="labs-serif" style={{
          fontSize: "clamp(28px, 5vw, 60px)", fontWeight: 700,
          color: STORY.text, lineHeight: 1.05, marginBottom: 16,
        }}>
          {tasting.title}
        </h1>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          {tasting.date && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: STORY.dim }}>
              <Calendar style={{ width: 13, height: 13 }} />
              {tasting.date}
            </span>
          )}
          {tasting.location && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: STORY.dim }}>
              <MapPin style={{ width: 13, height: 13 }} />
              {tasting.location}
            </span>
          )}
        </div>
        {(openingNarration || tasting.hostReflection) && (
          <p style={{
            fontSize: 16, color: STORY.dim, fontStyle: "italic",
            lineHeight: 1.75, maxWidth: 540, margin: "0 auto",
            borderLeft: `2px solid ${STORY.amber}`, paddingLeft: 20,
            textAlign: "left",
          }}>
            {openingNarration || tasting.hostReflection}
          </p>
        )}
      </div>
    </SlideContainer>
  );
}

function Act2Whisky({ whisky, index, totalWhiskies, blindMode, portrait }: { whisky: any; index: number; totalWhiskies: number; blindMode: boolean; portrait: string }) {
  const label = blindMode ? `Dram ${String.fromCharCode(65 + index)}` : (whisky.name || `Whisky ${index + 1}`);
  const displayText = portrait || (!blindMode && whisky.notes ? (whisky.notes.length > 240 ? whisky.notes.slice(0, 240) + "…" : whisky.notes) : "");
  return (
    <SlideContainer>
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt II" title={`Die Whiskys · ${index + 1} / ${totalWhiskies}`} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ width: 120, height: 160, flexShrink: 0 }}>
            <WhiskyImage imageUrl={whisky.imageUrl} name={label} size={120} height={160} whiskyId={whisky.id} />
          </div>
          <div style={{ textAlign: "center", width: "100%" }}>
            <h2 className="labs-serif" style={{
              fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
              color: STORY.text, marginBottom: 8, lineHeight: 1.1,
            }}>
              {label}
            </h2>
            {!blindMode && (
              <p style={{ fontSize: 14, color: STORY.dim, marginBottom: 12 }}>
                {[whisky.distillery, whisky.region, whisky.country].filter(Boolean).join(" · ")}
              </p>
            )}
            {!blindMode && (whisky.age || whisky.abv) && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: displayText ? 20 : 0 }}>
                {whisky.age && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: STORY.amberGlow, border: `1px solid ${STORY.amberBorder}`, fontSize: 12, color: STORY.amber, fontWeight: 600 }}>
                    {whisky.age}y
                  </span>
                )}
                {whisky.abv && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: STORY.text, fontWeight: 600 }}>
                    {whisky.abv}%
                  </span>
                )}
                {whisky.caskType && (
                  <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12, color: STORY.dim }}>
                    {whisky.caskType}
                  </span>
                )}
              </div>
            )}
            {displayText && (
              <p style={{
                marginTop: 4, fontSize: 15, color: STORY.dim,
                lineHeight: 1.75, fontStyle: "italic", maxWidth: 460, margin: "0 auto",
                borderLeft: `2px solid ${STORY.amber}`, paddingLeft: 18,
                textAlign: "left",
              }}>
                {displayText}
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
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt III" title="Die Verkoster" />
        <Users style={{ width: 40, height: 40, color: STORY.amber, display: "block", margin: "0 auto 20px" }} />
        <h2 className="labs-serif" style={{
          fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
          color: STORY.text, marginBottom: 32, textAlign: "center",
        }}>
          {tasters.length} {tasters.length === 1 ? "Verkoster" : "Verkoster"} · Eine Mission
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          {tasters.map((tp: any) => {
            const name = stripGuestSuffix(tp.participant?.name || tp.participant?.email || "Anonymous");
            const sketch = participantFunFacts[name] ?? "";
            return (
              <div key={tp.participantId} style={{
                padding: "16px 20px", borderRadius: 14, width: "clamp(160px, 28vw, 280px)",
                background: STORY.amberGlow, border: `1px solid ${STORY.amberBorder}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center",
              }} data-testid={`story-taster-${tp.participantId}`}>
                <div style={{
                  width: 46, height: 46, borderRadius: 23,
                  background: `linear-gradient(135deg, ${STORY.amber}, #e8c878)`,
                  color: STORY.bg, fontSize: 17, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: STORY.text }}>{name}</span>
                {sketch && (
                  <span style={{ fontSize: 13, color: STORY.dim, lineHeight: 1.55, fontStyle: "italic" }}>
                    {sketch}
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
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{
              fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 900,
              color: rank <= 3 ? STORY.amber : STORY.dim,
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
              marginBottom: 8,
            }}>
              #{rank}
            </div>
            <h2 className="labs-serif" style={{
              fontSize: "clamp(20px, 4vw, 38px)", fontWeight: 700,
              color: STORY.text, marginBottom: 6, lineHeight: 1.1,
            }}>
              {whisky.name || "Unknown"}
            </h2>
            {whisky.distillery && (
              <p style={{ fontSize: 14, color: STORY.dim, marginBottom: 16 }}>{whisky.distillery}</p>
            )}
            {whisky.avgOverall != null && (
              <div style={{
                fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900,
                color: STORY.amber, marginBottom: 16,
                fontVariantNumeric: "tabular-nums",
              }}>
                {formatScore(whisky.avgOverall)}
                <span style={{ fontSize: "0.4em", color: STORY.dim, fontWeight: 400 }}>
                  {" "}/ {maxScore}
                </span>
              </div>
            )}
            {aiComment && (
              <p style={{
                fontSize: 15, color: STORY.dim, fontStyle: "italic",
                lineHeight: 1.75, maxWidth: 440, margin: "0 auto",
                borderLeft: `2px solid ${STORY.amber}`, paddingLeft: 18,
                textAlign: "left",
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

function Act5Surprise({ blindReveal, tasting, blindNarration }: { blindReveal: any[]; tasting: any; blindNarration: string }) {
  const hasRevealData = blindReveal.some(w => w.guesses.length > 0);
  return (
    <SlideContainer>
      <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt V" title="Die Überraschung" />
        <Sparkles style={{ width: 40, height: 40, color: STORY.amber, display: "block", margin: "0 auto 20px" }} />
        <h2 className="labs-serif" style={{
          fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
          color: STORY.text, marginBottom: 12, textAlign: "center",
        }}>
          Blind-Tasting-Auflösung
        </h2>
        {blindNarration ? (
          <p style={{
            fontSize: 15, color: STORY.dim, fontStyle: "italic",
            lineHeight: 1.75, maxWidth: 540, margin: "0 auto 24px",
            borderLeft: `2px solid ${STORY.amber}`, paddingLeft: 18, textAlign: "left",
          }}>
            {blindNarration}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: STORY.dim, marginBottom: 24, textAlign: "center" }}>
            {tasting.blindMode ? "Wer hatte Recht? Wer lag daneben?" : "Das Tasting war nicht blind."}
          </p>
        )}
        {hasRevealData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {blindReveal.filter(w => w.guesses.length > 0).slice(0, 5).map((w: any) => {
              const sorted = [...w.guesses].sort((a, b) => (a.delta ?? 99) - (b.delta ?? 99));
              const best = sorted[0];
              const worst = sorted[sorted.length - 1];
              return (
                <div key={w.whiskyId} style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: STORY.text, marginBottom: 8 }}>
                    {w.whiskyName || "Whisky"} · {w.guesses[0]?.actualAbv != null ? `${w.guesses[0].actualAbv}% ABV` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {best && (
                      <span style={{ fontSize: 12, color: "#6ee7b7", display: "flex", alignItems: "center", gap: 4 }}>
                        <Check style={{ width: 12, height: 12 }} />
                        Nächste: {best.guessAbv}% (Δ {best.delta?.toFixed(1)}%)
                      </span>
                    )}
                    {worst && worst !== best && (
                      <span style={{ fontSize: 12, color: "#fca5a5", display: "flex", alignItems: "center", gap: 4 }}>
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
        <p style={{ color: STORY.dim }}>Noch keine Ergebnisse.</p>
      </SlideContainer>
    );
  }
  return (
    <SlideContainer>
      <style>{`
        @keyframes story-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .story-winner-title { background: linear-gradient(90deg, ${STORY.amber}, #e8c878, ${STORY.amber}); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: story-shimmer 3.5s linear infinite; }
      `}</style>
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt VI" title="Der Sieger" />
        <Trophy style={{ width: 52, height: 52, color: "#FFD700", display: "block", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 160 }}>
            <WhiskyImage imageUrl={winner.imageUrl} name={winner.name || "Winner"} size={120} height={160} whiskyId={winner.id} />
          </div>
          <div style={{ textAlign: "center", width: "100%" }}>
            <h2 className="labs-serif story-winner-title" style={{
              fontSize: "clamp(24px, 5vw, 52px)", fontWeight: 900,
              lineHeight: 1.05, marginBottom: 8,
            }}>
              {winner.name || "Unknown"}
            </h2>
            {winner.distillery && (
              <p style={{ fontSize: 15, color: STORY.dim, marginBottom: 16 }}>{winner.distillery}</p>
            )}
            <div style={{
              fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900,
              color: STORY.amber, marginBottom: 20,
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatScore(winner.avgOverall ?? 0)}
              <span style={{ fontSize: "0.4em", color: STORY.dim, fontWeight: 400 }}>
                {" "}/ {maxScore}
              </span>
            </div>
            {(winnerNarration || aiComment) && (
              <p style={{
                fontSize: 16, color: STORY.dim, fontStyle: "italic",
                lineHeight: 1.75, maxWidth: 480, margin: "0 auto",
                borderLeft: `2px solid ${STORY.amber}`, paddingLeft: 20,
                textAlign: "left",
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

function Act7Finale({ tasting, whiskies, eventPhotos, closingReflection, aiNarrative, isHost, onGenerateNarrative, narrativeLoading }: {
  tasting: any; whiskies: any[]; eventPhotos: any[];
  closingReflection: string;
  aiNarrative: string | null;
  isHost: boolean;
  onGenerateNarrative: () => void;
  narrativeLoading: boolean;
}) {
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const closingPhoto = eventPhotos[eventPhotos.length - 1];
  const narrativePreview = aiNarrative ? aiNarrative.slice(0, 320) + (aiNarrative.length > 320 ? "…" : "") : null;
  return (
    <SlideContainer centered={false}>
      {closingPhoto && (
        <>
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: `url(${closingPhoto.photoUrl}) center/cover no-repeat`,
            opacity: 0.25,
          }} />
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            background: "linear-gradient(to top, #0B0906 40%, rgba(11,9,6,0.5) 100%)",
          }} />
        </>
      )}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ActLabel number="Akt VII" title="Das Bild des Abends" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {whiskies.slice(0, 8).map((w: any, i: number) => (
            <div key={w.id} style={{ opacity: 1 - i * 0.08 }}>
              <WhiskyImage imageUrl={w.imageUrl} name={w.name || "?"} size={50} height={64} whiskyId={w.id} />
            </div>
          ))}
        </div>
        <h2 className="labs-serif" style={{
          fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
          color: STORY.text, marginBottom: 8,
        }}>
          Ein Abend. Unvergesslich.
        </h2>
        <p style={{ fontSize: 14, color: STORY.dim, marginBottom: closingReflection ? 20 : 28 }}>
          {tasting.date} · {tasting.location}
        </p>
        {closingReflection && (
          <p style={{
            fontSize: 15, color: STORY.dim, fontStyle: "italic",
            lineHeight: 1.75, maxWidth: 540,
            borderLeft: `2px solid ${STORY.amber}`, paddingLeft: 18,
            marginBottom: 24,
          }}>
            {closingReflection}
          </p>
        )}

        {/* Abendnarration section */}
        {aiNarrative ? (
          <div style={{ marginBottom: 24, maxWidth: 580 }}>
            <button
              onClick={() => setNarrativeExpanded(e => !e)}
              style={{
                display: "flex", alignItems: "center", gap: 8, background: "none",
                border: "none", cursor: "pointer", padding: 0, marginBottom: 10,
              }}
              data-testid="story-expand-narrative-btn"
            >
              <div style={{ width: 20, height: 1, background: STORY.amber }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: STORY.amber }}>
                Abendgeschichte
              </span>
              <span style={{ fontSize: 11, color: STORY.dim, marginLeft: 4 }}>
                {narrativeExpanded ? "▲" : "▼"}
              </span>
            </button>
            <p style={{
              fontSize: 14, color: STORY.dim, lineHeight: 1.7,
              borderLeft: `1px solid rgba(201,169,97,0.3)`, paddingLeft: 16,
              maxHeight: narrativeExpanded ? "none" : undefined,
              overflow: "hidden",
            }}>
              {narrativeExpanded ? aiNarrative : narrativePreview}
            </p>
          </div>
        ) : isHost ? (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={onGenerateNarrative}
              disabled={narrativeLoading}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                background: STORY.amberGlow, border: `1px solid ${STORY.amberBorder}`,
                color: STORY.amber, fontSize: 13, fontWeight: 600,
                opacity: narrativeLoading ? 0.7 : 1,
              }}
              data-testid="story-generate-narrative-btn"
            >
              {narrativeLoading
                ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                : <Sparkles style={{ width: 13, height: 13 }} />}
              {narrativeLoading ? "Generiere…" : "Abendgeschichte generieren"}
            </button>
          </div>
        ) : null}

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 20px", borderRadius: 10,
          background: STORY.amberGlow, border: `1px solid ${STORY.amberBorder}`,
        }}>
          <Wine style={{ width: 14, height: 14, color: STORY.amber }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: STORY.amber, letterSpacing: "0.06em" }}>
            CaskSense
          </span>
        </div>
      </div>
    </SlideContainer>
  );
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
        await addEventPhoto(tastingId, result.objectPath).catch(e => setError(e.message));
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

// ---- Story Email Share Dialog ----
function StoryEmailDialog({
  open, onClose, storyData, eventPhotos, tastingId,
}: {
  open: boolean; onClose: () => void; storyData: any; eventPhotos: any[]; tastingId: string;
}) {
  const participants: any[] = storyData?.participants ?? [];
  const tasting = storyData?.tasting;

  const participantEmailEntries = participants
    .filter((tp: any) => tp.participant?.email && !tp.excludedFromResults)
    .map((tp: any) => ({ email: tp.participant.email as string, name: stripGuestSuffix(tp.participant.name || tp.participant.email) }));

  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(() => new Set(participantEmailEntries.map(e => e.email)));
  const [customInput, setCustomInput] = useState("");
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [sendState, setSendState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [sendError, setSendError] = useState("");
  // Tracks whether a cached PDF is available for this session (either pre-existing or uploaded during this session)
  const [sessionHasCache, setSessionHasCache] = useState<boolean>(Boolean(tasting?.storyPdfObjectKey));
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function toggleEmail(email: string) {
    setCheckedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  }

  function addCustomEmail() {
    const trimmed = customInput.trim();
    if (!emailRegex.test(trimmed)) return;
    if (!customEmails.includes(trimmed) && !participantEmailEntries.some(e => e.email === trimmed)) {
      setCustomEmails(prev => [...prev, trimmed]);
      setCheckedEmails(prev => new Set([...prev, trimmed]));
    }
    setCustomInput("");
  }

  function removeCustomEmail(email: string) {
    setCustomEmails(prev => prev.filter(e => e !== email));
    setCheckedEmails(prev => { const n = new Set(prev); n.delete(email); return n; });
  }

  async function handleSend() {
    const recipients = [...checkedEmails];
    if (recipients.length === 0) return;
    setSendState("sending");
    setSendError("");
    try {
      let pdfBase64: string | undefined;
      if (!sessionHasCache) {
        // No cached PDF available — render it now; server will cache it for future sends
        pdfBase64 = await exportStoryPdf({ ...storyData, eventPhotos }, true) as string;
      }
      let res = await fetch(`/api/tastings/${tastingId}/story-pdf-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...pidHeaders() },
        body: JSON.stringify({ recipients, ...(pdfBase64 ? { pdfBase64 } : {}), tastingTitle: tasting?.title }),
      });
      let data = await res.json();
      // If the server reported stale/missing cache, clear local flag and retry once with fresh render
      if (!res.ok && res.status === 400 && data.message === "PDF data required") {
        setSessionHasCache(false);
        pdfBase64 = await exportStoryPdf({ ...storyData, eventPhotos }, true) as string;
        res = await fetch(`/api/tastings/${tastingId}/story-pdf-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...pidHeaders() },
          body: JSON.stringify({ recipients, pdfBase64, tastingTitle: tasting?.title }),
        });
        data = await res.json();
      }
      if (!res.ok) throw new Error(data.message || "Fehler beim Senden");
      // Only mark cache as available when server confirms it was persisted
      if (data.cacheStored) setSessionHasCache(true);
      setSendResult({ sent: data.sent, failed: data.failed });
      setSendState("done");
    } catch (e: any) {
      setSendError(e.message || "Unbekannter Fehler");
      setSendState("error");
    }
  }

  function handleClose() {
    setSendState("idle"); setSendResult(null); setSendError(""); onClose();
  }

  const allEmails = [...participantEmailEntries.map(e => e.email), ...customEmails];
  const selectedCount = [...checkedEmails].filter(e => allEmails.includes(e)).length;

  return (
    <ModalPortal open={open} onClose={handleClose} testId="story-email-dialog" closeOnEscape={sendState !== "sending"}>
      <div style={{
        background: "var(--labs-surface, #1e1a14)", border: "1px solid rgba(212,162,86,0.2)",
        borderRadius: 12, padding: "28px 28px 24px", width: "100%", maxWidth: 440,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--labs-text, #f5f0e8)" }}>Story PDF versenden</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--labs-text-muted, #8a7e6d)" }}>PDF per E-Mail an Teilnehmer senden</p>
          </div>
          <button className="labs-btn-ghost" style={{ padding: 6 }} onClick={handleClose} disabled={sendState === "sending"} data-testid="story-email-dialog-close">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {sendState === "done" && sendResult ? (
          <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(56,161,105,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCheck style={{ width: 24, height: 24, color: "#38a169" }} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--labs-text, #f5f0e8)" }}>
              {sendResult.sent} von {sendResult.sent + sendResult.failed} E-Mail{sendResult.sent !== 1 ? "s" : ""} gesendet
            </p>
            {sendResult.failed > 0 && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--labs-danger, #e53e3e)" }}>{sendResult.failed} fehlgeschlagen</p>
            )}
            <button className="labs-btn-secondary" style={{ marginTop: 8 }} onClick={handleClose} data-testid="story-email-done-close">Schließen</button>
          </div>
        ) : (
          <>
            {participantEmailEntries.length > 0 && (
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted, #8a7e6d)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Teilnehmer</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {participantEmailEntries.map(({ email, name }) => (
                    <label key={email} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "7px 10px", borderRadius: 8, background: checkedEmails.has(email) ? "rgba(212,162,86,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${checkedEmails.has(email) ? "rgba(212,162,86,0.25)" : "rgba(255,255,255,0.06)"}`, transition: "all 0.15s" }} data-testid={`story-email-participant-${email}`}>
                      <input type="checkbox" checked={checkedEmails.has(email)} onChange={() => toggleEmail(email)} style={{ accentColor: "#d4a256", width: 16, height: 16 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text, #f5f0e8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted, #8a7e6d)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {customEmails.length > 0 && (
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted, #8a7e6d)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Weitere Empfänger</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {customEmails.map(email => (
                    <div key={email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(212,162,86,0.08)", border: "1px solid rgba(212,162,86,0.2)" }}>
                      <Mail style={{ width: 13, height: 13, color: "#d4a256", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--labs-text, #f5f0e8)", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</span>
                      <button onClick={() => removeCustomEmail(email)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--labs-text-muted, #8a7e6d)" }} data-testid={`story-email-remove-${email}`}>
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted, #8a7e6d)", textTransform: "uppercase", letterSpacing: "0.08em" }}>E-Mail hinzufügen</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomEmail(); } }}
                  placeholder="name@beispiel.de"
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--labs-text, #f5f0e8)", outline: "none" }}
                  data-testid="story-email-custom-input"
                />
                <button
                  className="labs-btn-ghost"
                  style={{ padding: "8px 12px", flexShrink: 0 }}
                  onClick={addCustomEmail}
                  disabled={!emailRegex.test(customInput.trim())}
                  data-testid="story-email-add-btn"
                >
                  <Plus style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>

            {sendState === "error" && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--labs-danger, #e53e3e)" }}>{sendError}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="labs-btn-ghost" onClick={handleClose} disabled={sendState === "sending"} data-testid="story-email-cancel">
                Abbrechen
              </button>
              <button
                className="labs-btn-primary"
                onClick={handleSend}
                disabled={selectedCount === 0 || sendState === "sending"}
                data-testid="story-email-send-btn"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {sendState === "sending" ? (
                  <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Generiere & sende…</>
                ) : (
                  <><Mail style={{ width: 14, height: 14 }} /> {selectedCount > 0 ? `An ${selectedCount} senden` : "Senden"}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalPortal>
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
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
      else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          navigate(`/labs/results/${tastingId}`);
        }
      }
      else if (e.key === " ") { e.preventDefault(); setAutoPlay(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, navigate, tastingId]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const handleStoryToggle = async () => {
    if (!tasting) return;
    setStoryToggling(true);
    await toggleStoryEnabled(tastingId, !tasting.storyEnabled).catch(console.error);
    await qc.invalidateQueries({ queryKey: ["tasting-story", tastingId] });
    setStoryToggling(false);
  };

  const handleRegenerateSlides = async () => {
    if (!tastingId || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/story?refresh=true`, { headers: pidHeaders() });
      if (res.ok) {
        const fresh = await res.json();
        qc.setQueryData(["tasting-story", tastingId], fresh);
        toast({ title: "Story neu generiert", description: "Die KI-Texte wurden aktualisiert." });
      } else {
        toast({ title: "Regenerierung fehlgeschlagen", description: "Die Story konnte nicht neu generiert werden.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Regenerierung fehlgeschlagen", description: "Verbindungsfehler beim Neu-Generieren.", variant: "destructive" });
    }
    setIsRegenerating(false);
  };

  const handleGenerateNarrative = async () => {
    if (!tastingId || narrativeLoading) return;
    setNarrativeLoading(true);
    try {
      const pid = currentParticipant?.id;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (pid) headers["x-participant-id"] = pid;
      const res = await fetch(`/api/tastings/${tastingId}/ai-narrative`, { method: "POST", headers, body: JSON.stringify({ language: "de" }) });
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["tasting-story", tastingId] });
      } else {
        toast({ title: "Abendgeschichte fehlgeschlagen", description: "Die KI-Narration konnte nicht generiert werden.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Abendgeschichte fehlgeschlagen", description: "Verbindungsfehler beim Generieren der Narration.", variant: "destructive" });
    }
    setNarrativeLoading(false);
  };

  const handlePdfExport = async () => {
    if (!storyData || isPdfExporting) return;
    setIsPdfExporting(true);
    setPdfProgress(null);
    const onProgress: PdfProgressCallback = (current, total, label) => {
      setPdfProgress({ current, total, label });
    };
    try {
      await exportStoryPdf({ ...storyData, eventPhotos }, false, onProgress);
      toast({ title: "PDF erfolgreich exportiert", description: "Die Story wurde als PDF heruntergeladen." });
    } catch (err) {
      toast({
        title: "PDF-Export fehlgeschlagen",
        description: (err instanceof Error ? err.message : null) || "Beim Erstellen des PDFs ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsPdfExporting(false);
      setPdfProgress(null);
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
      <div style={{ position: "fixed", inset: 0, background: STORY.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <Loader2 style={{ width: 32, height: 32, color: STORY.amber, animation: "spin 1s linear infinite" }} />
        <p style={{ color: STORY.dim, fontSize: 14 }}>Lade Story…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !storyData) {
    return (
      <div style={{ position: "fixed", inset: 0, background: STORY.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 24 }}>
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

  const { whiskies, sortedRanking, participants, blindReveal, aiComments, participantFunFacts, winnerNarration, winner, openingNarration, discoveryTexts, blindNarration, closingReflection } = storyData;
  const currentSlide = slides[slideIndex];

  return (
    <>
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, background: STORY.bg, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 100 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="story-presentation-overlay"
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
      {/* Film grain overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat", backgroundSize: "200px 200px",
        opacity: 0.04, mixBlendMode: "overlay",
      }} />

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", pointerEvents: "none",
        background: "linear-gradient(rgba(0,0,0,0.4) 0%, transparent 100%)",
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
          {isHost && (
            <button
              className="labs-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, opacity: isRegenerating ? 0.6 : 1 }}
              onClick={handleRegenerateSlides}
              disabled={isRegenerating}
              data-testid="story-regenerate-btn"
              title="KI-Texte neu generieren"
            >
              <RefreshCw style={{ width: 13, height: 13, animation: isRegenerating ? "spin 1s linear infinite" : "none" }} />
              <span>{isRegenerating ? "Generiere…" : "Neu generieren"}</span>
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
          {isHost && (
            <button
              className="labs-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowEmailDialog(true)}
              data-testid="story-email-share-btn"
            >
              <Mail style={{ width: 13, height: 13 }} />
              <span>Teilen</span>
            </button>
          )}
          <span style={{
            fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)",
            padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.08)",
            fontVariantNumeric: "tabular-nums",
          }} data-testid="story-slide-indicator">
            {slideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
            aria-label={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)", cursor: "pointer", backdropFilter: "blur(8px)",
            }}
            data-testid="story-fullscreen-btn"
          >
            {isFullscreen ? <Minimize style={{ width: 14, height: 14 }} /> : <Maximize style={{ width: 14, height: 14 }} />}
          </button>
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
              <Act1Opening tasting={tasting} eventPhotos={eventPhotos} openingNarration={openingNarration ?? ""} />
            )}
            {currentSlide?.type === "act2-whisky" && (
              <Act2Whisky
                whisky={whiskies[currentSlide.index]}
                index={currentSlide.index}
                totalWhiskies={whiskies.length}
                blindMode={!!tasting.blindMode}
                portrait={(storyData.whiskyPortraits ?? {})[whiskies[currentSlide.index]?.name] ?? ""}
              />
            )}
            {currentSlide?.type === "act3-tasters" && (
              <Act3Tasters participants={participants} participantFunFacts={participantFunFacts ?? {}} />
            )}
            {currentSlide?.type === "act4-discovery" && (() => {
              const revIdx = sortedRanking.length - 1 - currentSlide.index;
              const w = sortedRanking[revIdx];
              const discText = (discoveryTexts ?? {})[w?.name] ?? aiComments?.[w?.name] ?? "";
              return w ? (
                <Act4Discovery
                  whisky={w}
                  rank={revIdx + 1}
                  totalWhiskies={sortedRanking.length}
                  aiComment={discText}
                  maxScore={maxScore}
                />
              ) : null;
            })()}
            {currentSlide?.type === "act5-surprise" && (
              <Act5Surprise blindReveal={blindReveal ?? []} tasting={tasting} blindNarration={blindNarration ?? ""} />
            )}
            {currentSlide?.type === "act6-winner" && (
              <Act6Winner
                winner={winner}
                aiComment={aiComments?.[winner?.name] ?? ""}
                winnerNarration={(storyData.winnerStory ?? "") || (winnerNarration ?? "")}
                maxScore={maxScore}
              />
            )}
            {currentSlide?.type === "act7-finale" && (
              <Act7Finale
                tasting={tasting}
                whiskies={whiskies}
                eventPhotos={eventPhotos}
                closingReflection={closingReflection ?? ""}
                aiNarrative={tasting?.aiNarrative ?? null}
                isHost={isHost}
                onGenerateNarrative={handleGenerateNarrative}
                narrativeLoading={narrativeLoading}
              />
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
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
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
                background: i === slideIndex ? STORY.amber : "rgba(255,255,255,0.2)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.2s",
              }}
              data-testid={`story-dot-${i}`}
            />
          ))}
          {slides.length > 16 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums" }}>
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

    {isHost && storyData && (
      <StoryEmailDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        storyData={storyData}
        eventPhotos={eventPhotos}
        tastingId={tastingId}
      />
    )}

    <AnimatePresence>
      {isPdfExporting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
          }}
          data-testid="pdf-progress-overlay"
        >
          <div style={{
            background: "var(--labs-surface)",
            border: "1px solid rgba(212,162,86,0.3)",
            borderRadius: 18,
            padding: "32px 36px",
            minWidth: 300, maxWidth: 400, width: "90%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          }}>
            <Loader2 style={{ width: 32, height: 32, color: STORY.amber, animation: "spin 1s linear infinite" }} />
            <div style={{ width: "100%", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: STORY.text, marginBottom: 6 }}>
                PDF wird erstellt…
              </p>
              <p style={{ fontSize: 12, color: STORY.dim, marginBottom: 16 }} data-testid="pdf-progress-label">
                {pdfProgress
                  ? `Seite ${pdfProgress.current} von ${pdfProgress.total} · ${pdfProgress.label}`
                  : "Vorbereitung…"}
              </p>
              <div style={{
                width: "100%", height: 6, borderRadius: 3,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}>
                <motion.div
                  animate={{ width: pdfProgress ? `${Math.min(100, Math.round((pdfProgress.current / pdfProgress.total) * 100))}%` : "0%" }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{
                    height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${STORY.amber}, #e8c878)`,
                  }}
                  data-testid="pdf-progress-bar"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
