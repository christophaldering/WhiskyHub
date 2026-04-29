import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Sparkles, Send, Loader2, Wine, Calendar, Building2, BookOpen, Square,
} from "lucide-react";
import { triggerHaptic } from "@/labs/hooks/useHaptic";
import StatsChartCard, { type StatsToolPayload } from "./StatsChartCard";

interface AskSource {
  type: "whisky" | "tasting" | "distillery" | "lexicon";
  id: string;
  title: string;
  subtitle?: string;
  route: string;
}

type KnowledgeMode = "user_data" | "general" | "mixed";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AskSource[];
  truncated?: boolean;
  knowledgeMode?: KnowledgeMode;
  toolPayloads?: StatsToolPayload[];
}

interface EmbeddedAskBarProps {
  tastingId: string;
  tastingTitle?: string | null;
  isParticipant: boolean;
  testIdPrefix?: string;
}

export default function EmbeddedAskBar({ tastingId, tastingTitle, isParticipant, testIdPrefix = "embedded-ask" }: EmbeddedAskBarProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  const isDe = lang === "de";
  const [, navigate] = useLocation();

  const [query, setQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const askAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastUserMsgRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const examples = useMemo(() => {
    if (isDe) {
      return [
        "Wer war meinem Geschmack am nächsten?",
        "Welcher Dram hat polarisiert?",
        "Wie konsistent war ich?",
        "Was war der Top-Whisky?",
        "Wie hat das Reveal verändert?",
      ];
    }
    return [
      "Who was closest to my taste?",
      "Which dram divided us most?",
      "How consistent were my ratings?",
      "What was the top whisky?",
      "How did the reveal change scores?",
    ];
  }, [isDe]);

  useEffect(() => {
    return () => {
      askAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const node = lastUserMsgRef.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [chatMessages]);

  const sendAsk = useCallback(async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isStreaming || !isParticipant) return;

    const historyForRequest = chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
    const userMsg: ChatMessage = { role: "user", content: question };
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "" };
    const assistantIdx = chatMessages.length + 1;
    setChatMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setQuery("");
    setStreamError(null);
    setIsStreaming(true);
    triggerHaptic("light");

    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;
    const myRequestId = requestIdRef.current + 1;
    requestIdRef.current = myRequestId;

    const isStale = () => requestIdRef.current !== myRequestId;

    const removePlaceholderIfEmpty = () => {
      if (isStale()) return;
      setChatMessages((prev) => {
        if (assistantIdx >= prev.length) return prev;
        const candidate = prev[assistantIdx];
        if (!candidate || candidate.role !== "assistant" || candidate.content) return prev;
        const next = [...prev];
        next.splice(assistantIdx, 1);
        return next;
      });
    };

    const pid = sessionStorage.getItem("session_pid") || localStorage.getItem("casksense_participant_id");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (pid) headers["x-participant-id"] = pid;

    try {
      const res = await fetch("/api/labs/ask", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question,
          locale: lang,
          conversationHistory: historyForRequest,
          tastingContext: { tastingId },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof (data as { message?: unknown })?.message === "string"
          ? (data as { message: string }).message
          : (isDe ? "Antwort konnte nicht geladen werden." : "Failed to load answer.");
        throw new Error(msg);
      }
      if (!res.body) {
        throw new Error(isDe ? "Keine Antwort vom Server." : "No response body.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let finalSources: AskSource[] | undefined;
      let finalKnowledgeMode: KnowledgeMode | undefined;
      let finalToolPayloads: StatsToolPayload[] | undefined;
      let streamErr: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload) as { delta?: string; done?: boolean; sources?: AskSource[]; knowledgeMode?: string; toolPayloads?: StatsToolPayload[]; error?: string };
            if (typeof evt.delta === "string") {
              accumulated += evt.delta;
              const snapshot = accumulated;
              if (isStale()) continue;
              setChatMessages((prev) => {
                if (assistantIdx >= prev.length) return prev;
                const candidate = prev[assistantIdx];
                if (!candidate || candidate.role !== "assistant") return prev;
                const next = [...prev];
                next[assistantIdx] = { ...candidate, content: snapshot };
                return next;
              });
            } else if (evt.done) {
              if (Array.isArray(evt.sources)) finalSources = evt.sources;
              if (evt.knowledgeMode === "user_data" || evt.knowledgeMode === "general" || evt.knowledgeMode === "mixed") {
                finalKnowledgeMode = evt.knowledgeMode;
              }
              if (Array.isArray(evt.toolPayloads)) {
                finalToolPayloads = evt.toolPayloads.filter(
                  (p): p is StatsToolPayload =>
                    !!p && typeof p === "object" && typeof (p as StatsToolPayload).name === "string",
                );
              }
            } else if (evt.error) {
              streamErr = String(evt.error);
            }
          } catch {
            continue;
          }
        }
      }

      if (streamErr && !accumulated) {
        throw new Error(streamErr);
      }

      if (isStale()) return;
      const truncated = streamErr !== null;
      setChatMessages((prev) => {
        if (assistantIdx >= prev.length) return prev;
        const candidate = prev[assistantIdx];
        if (!candidate || candidate.role !== "assistant") return prev;
        const next = [...prev];
        next[assistantIdx] = {
          role: "assistant",
          content: accumulated,
          sources: finalSources,
          truncated,
          knowledgeMode: finalKnowledgeMode,
          toolPayloads: finalToolPayloads,
        };
        return next;
      });
      if (truncated && streamErr) setStreamError(streamErr);
      triggerHaptic("medium");
    } catch (err) {
      const error = err as { name?: string; message?: string };
      if (error.name === "AbortError") {
        removePlaceholderIfEmpty();
        return;
      }
      if (isStale()) return;
      setStreamError(error.message ?? (isDe ? "Unbekannter Fehler." : "Unknown error."));
      removePlaceholderIfEmpty();
    } finally {
      if (!isStale()) setIsStreaming(false);
    }
  }, [chatMessages, isDe, isParticipant, isStreaming, lang, tastingId, tastingTitle]);

  const stopStreaming = useCallback(() => {
    askAbortRef.current?.abort();
  }, []);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;
    void sendAsk(query);
  }, [query, sendAsk]);

  const handleSourceClick = useCallback((source: AskSource) => {
    triggerHaptic("light");
    navigate(source.route);
  }, [navigate]);

  if (!isParticipant) {
    return (
      <div
        data-testid={`${testIdPrefix}-no-access`}
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 14,
          border: "1px dashed var(--labs-border)",
          color: "var(--labs-text-muted)",
          fontSize: 13,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        {isDe
          ? "Nur Host und Teilnehmer dieses Tastings können Fragen dazu stellen."
          : "Only the host and participants of this tasting can ask questions about it."}
      </div>
    );
  }

  const hasMessages = chatMessages.length > 0;

  return (
    <div
      data-testid={testIdPrefix}
      style={{
        marginTop: 32,
        padding: 18,
        borderRadius: 16,
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(201, 169, 97, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-text)" }}>
            {isDe ? "Frag CaskSense zu diesem Tasting" : "Ask CaskSense about this tasting"}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
            {tastingTitle
              ? (isDe ? `Bezogen auf „${tastingTitle}"` : `Scoped to "${tastingTitle}"`)
              : (isDe ? "Bezogen auf dieses Tasting" : "Scoped to this tasting")}
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: hasMessages ? 460 : undefined,
          overflowY: hasMessages ? "auto" : "visible",
          overscrollBehavior: "contain",
        }}
      >
        {!hasMessages && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {examples.map((ex, i) => (
              <button
                key={ex}
                type="button"
                onClick={() => sendAsk(ex)}
                disabled={isStreaming}
                data-testid={`${testIdPrefix}-example-${i}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "var(--labs-bg)",
                  border: "1px solid var(--labs-border)",
                  color: "var(--labs-text-secondary)",
                  fontSize: 12,
                  cursor: isStreaming ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: isStreaming ? 0.6 : 1,
                  transition: "border-color 200ms ease, color 200ms ease",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {(() => {
          let lastUserIdx = -1;
          for (let i = chatMessages.length - 1; i >= 0; i--) {
            if (chatMessages[i].role === "user") { lastUserIdx = i; break; }
          }
          return chatMessages.map((msg, idx) => {
            const isStreamingPlaceholder =
              msg.role === "assistant" && isStreaming && idx === chatMessages.length - 1 && !msg.content;
            return (
              <div
                key={`msg-${idx}`}
                ref={msg.role === "user" && idx === lastUserIdx ? lastUserMsgRef : undefined}
                data-testid={msg.role === "assistant" && idx === chatMessages.length - 1 && isStreaming ? `${testIdPrefix}-streaming` : `${testIdPrefix}-message-${idx}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    maxWidth: "92%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? "var(--labs-accent)" : "var(--labs-bg)",
                    color: msg.role === "user" ? "var(--labs-bg)" : "var(--labs-text)",
                    border: msg.role === "assistant" ? "1px solid var(--labs-border)" : "none",
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    minHeight: msg.role === "assistant" ? 22 : undefined,
                  }}
                >
                  {isStreamingPlaceholder ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--labs-text-muted)" }}>
                      <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                      {isDe ? "Denkt nach..." : "Thinking..."}
                    </span>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && msg.toolPayloads && msg.toolPayloads.length > 0 && (
                  <div
                    data-testid={`${testIdPrefix}-stats-charts-${idx}`}
                    style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}
                  >
                    {msg.toolPayloads.map((payload, pIdx) => (
                      <StatsChartCard
                        key={`${payload.name}-${pIdx}`}
                        payload={payload}
                        isDe={isDe}
                        testId={`${testIdPrefix}-stats-chart-${msg.toolPayloads && msg.toolPayloads.length > 1 ? `${payload.name}-${pIdx}` : payload.name}`}
                      />
                    ))}
                  </div>
                )}
                {msg.role === "assistant" && msg.truncated && (
                  <div
                    data-testid={`${testIdPrefix}-truncated-${idx}`}
                    style={{
                      fontSize: 11,
                      color: "rgba(220, 120, 80, 0.95)",
                      background: "rgba(220, 120, 80, 0.08)",
                      border: "1px solid rgba(220, 120, 80, 0.25)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {isDe ? "Antwort abgeschnitten" : "Answer truncated"}
                  </div>
                )}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: "92%" }}
                    data-testid={`${testIdPrefix}-sources-${idx}`}
                  >
                    {msg.sources.map((src, srcIdx) => {
                      const Icon = src.type === "whisky" ? Wine
                        : src.type === "tasting" ? Calendar
                        : src.type === "distillery" ? Building2
                        : BookOpen;
                      const labelType = src.type === "whisky" ? (isDe ? "Whisky" : "Whisky")
                        : src.type === "tasting" ? (isDe ? "Tasting" : "Tasting")
                        : src.type === "distillery" ? (isDe ? "Brennerei" : "Distillery")
                        : (isDe ? "Begriff" : "Term");
                      return (
                        <button
                          key={`${src.type}-${src.id}-${srcIdx}`}
                          type="button"
                          onClick={() => handleSourceClick(src)}
                          data-testid={`${testIdPrefix}-chip-source-${src.type}-${src.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 9px",
                            borderRadius: 999,
                            background: "var(--labs-bg)",
                            border: "1px solid var(--labs-border)",
                            color: "var(--labs-text-secondary)",
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            maxWidth: 220,
                          }}
                          title={src.title}
                        >
                          <Icon style={{ width: 11, height: 11, color: "var(--labs-accent)", flexShrink: 0 }} />
                          <span style={{ fontWeight: 600 }}>{srcIdx + 1}.</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {src.title}
                          </span>
                          <span style={{ color: "var(--labs-text-muted)", fontSize: 10, flexShrink: 0 }}>{labelType}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })()}

        {streamError && (
          <div
            data-testid={`${testIdPrefix}-error`}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(220, 80, 80, 0.08)",
              border: "1px solid rgba(220, 80, 80, 0.3)",
              color: "var(--labs-text)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {streamError}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          padding: 8,
          borderRadius: 12,
          background: "var(--labs-bg)",
          border: "1px solid var(--labs-border)",
        }}
      >
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={isDe ? "Frag etwas zu diesem Tasting..." : "Ask anything about this tasting..."}
          disabled={isStreaming}
          rows={1}
          data-testid={`${testIdPrefix}-input`}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--labs-text)",
            fontSize: 14,
            lineHeight: 1.5,
            fontFamily: "inherit",
            resize: "none",
            maxHeight: 120,
            padding: "6px 4px",
          }}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stopStreaming}
            data-testid={`${testIdPrefix}-stop`}
            aria-label={isDe ? "Stoppen" : "Stop"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--labs-border)",
              background: "var(--labs-bg)",
              color: "var(--labs-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Square style={{ width: 14, height: 14 }} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!query.trim()}
            data-testid={`${testIdPrefix}-send`}
            aria-label={isDe ? "Senden" : "Send"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: query.trim() ? "var(--labs-accent)" : "var(--labs-border)",
              color: "var(--labs-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: query.trim() ? "pointer" : "not-allowed",
              opacity: query.trim() ? 1 : 0.6,
              transition: "background 150ms ease",
            }}
          >
            <Send style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>
    </div>
  );
}
