import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, Square, Trash2, Play, Pause, Loader2 } from "lucide-react";
import { v } from "@/lib/themeVars";
import { pidHeaders } from "@/lib/api";

interface VoiceMemo {
  id: string;
  tastingId: string;
  whiskyId: string;
  participantId: string;
  audioUrl: string | null;
  transcript: string | null;
  durationSeconds: number | null;
  createdAt: string;
  participantName?: string;
}

interface VoiceMemoRecorderProps {
  tastingId: string;
  whiskyId: string;
  participantId: string;
  onMemoCreated?: (memo: VoiceMemo) => void;
  readOnly?: boolean;
}

const MAX_DURATION = 30;

export default function VoiceMemoRecorder({
  tastingId,
  whiskyId,
  participantId,
  onMemoCreated,
  readOnly = false,
}: VoiceMemoRecorderProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const queryKey = ["voice-memos", tastingId, whiskyId];

  const { data: memos = [] } = useQuery<VoiceMemo[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(
        `/api/tastings/${tastingId}/whiskies/${whiskyId}/voice-memos`,
        { headers: pidHeaders() }
      );
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (memoId: string) => {
      const res = await fetch(
        `/api/tastings/${tastingId}/voice-memos/${memoId}`,
        { method: "DELETE", headers: pidHeaders() }
      );
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "";
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        uploadMemo(blob);
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError(t("m2.voiceMemo.permissionDenied", "Microphone access denied"));
      } else {
        setError(err.message || "Recording failed");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  };

  const uploadMemo = async (blob: Blob) => {
    setUploading(true);
    setError(null);
    try {
      const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("mp4") ? "mp4" : "ogg";
      const formData = new FormData();
      formData.append("audio", blob, `memo.${ext}`);
      formData.append("durationSeconds", String(elapsed));

      const res = await fetch(
        `/api/tastings/${tastingId}/whiskies/${whiskyId}/voice-memo`,
        {
          method: "POST",
          headers: pidHeaders(),
          body: formData,
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errData.message || "Upload failed");
      }

      const memo = await res.json();
      queryClient.invalidateQueries({ queryKey });
      onMemoCreated?.(memo);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = (memo: VoiceMemo) => {
    if (!memo.audioUrl) return;

    if (playingId === memo.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(memo.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play();
    setPlayingId(memo.id);
  };

  const handleDelete = (memo: VoiceMemo) => {
    if (!confirm(t("m2.voiceMemo.deleteConfirm", "Delete voice memo?"))) return;
    deleteMutation.mutate(memo.id);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      style={{
        padding: "12px 0",
      }}
      data-testid="voice-memo-recorder"
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: v.textSecondary,
          marginBottom: 10,
          fontFamily: "system-ui, sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
        data-testid="text-voice-memo-title"
      >
        {t("m2.voiceMemo.sectionTitle", "Voice Memos")}
      </div>

      {!readOnly && (
        <div style={{ marginBottom: 12 }}>
          {recording ? (() => {
            const progress = elapsed / MAX_DURATION;
            const barColor = elapsed >= 28 ? "#d48040" : elapsed >= 24 ? "#e0a830" : v.accent;
            return (
            <div
              style={{
                padding: "12px 14px",
                background: v.elevated,
                borderRadius: 12,
                border: `1px solid ${v.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 8px",
                    background: `color-mix(in srgb, ${v.danger} 15%, transparent)`,
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: v.danger,
                      animation: "cs-pulse 1.5s ease-in-out infinite",
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 700, color: v.danger, fontFamily: "system-ui, sans-serif", letterSpacing: "0.06em" }}>REC</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: v.muted,
                    fontFamily: "system-ui, sans-serif",
                    fontWeight: 500,
                    fontVariantNumeric: "tabular-nums",
                  }}
                  data-testid="text-recording-status"
                >
                  {formatTime(elapsed)} / {formatTime(MAX_DURATION)}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={stopRecording}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: v.accent,
                    color: v.bg,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                  data-testid="button-stop-recording"
                >
                  <Square style={{ width: 14, height: 14 }} />
                  {t("m2.voiceMemo.stop", "Stop")}
                </button>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 4,
                  borderRadius: 999,
                  background: `color-mix(in srgb, ${v.border} 40%, ${v.elevated})`,
                  overflow: "hidden",
                  position: "relative",
                }}
                data-testid="progress-recording-bar"
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress * 100}%`,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, color-mix(in srgb, ${barColor} 50%, #8a6a3e), ${barColor})`,
                    transition: "width 150ms ease-out, background 600ms ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                      animation: "cs-sheen 2.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            </div>
            );
          })() : uploading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: v.elevated,
                borderRadius: 12,
                border: `1px solid ${v.border}`,
              }}
            >
              <Loader2
                style={{
                  width: 16,
                  height: 16,
                  color: v.accent,
                  animation: "spin 1s linear infinite",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  color: v.muted,
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid="text-uploading-status"
              >
                {t("m2.voiceMemo.uploading", "Transcribing...")}
              </span>
            </div>
          ) : (
            <button
              onClick={startRecording}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: v.elevated,
                color: v.accent,
                border: `1px solid ${v.border}`,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                width: "100%",
                justifyContent: "center",
              }}
              data-testid="button-start-recording"
            >
              <Mic style={{ width: 16, height: 16 }} />
              {t("m2.voiceMemo.record", "Record Voice Memo")}
              <span
                style={{
                  fontSize: 11,
                  color: v.muted,
                  fontWeight: 400,
                  marginLeft: 4,
                }}
              >
                ({t("m2.voiceMemo.maxDuration", "Max 30 seconds")})
              </span>
            </button>
          )}

          {error && (
            <div
              style={{
                fontSize: 12,
                color: v.danger,
                marginTop: 6,
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="text-voice-memo-error"
            >
              {error}
            </div>
          )}
        </div>
      )}

      {memos.length === 0 && (
        <div
          style={{
            fontSize: 13,
            color: v.muted,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "8px 0",
          }}
          data-testid="text-voice-memo-empty"
        >
          {t("m2.voiceMemo.empty", "No voice memos yet")}
        </div>
      )}

      {memos.map((memo) => (
        <div
          key={memo.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 12px",
            background: v.elevated,
            borderRadius: 10,
            border: `1px solid ${v.border}`,
            marginBottom: 8,
          }}
          data-testid={`card-voice-memo-${memo.id}`}
        >
          {memo.audioUrl && (
            <button
              onClick={() => togglePlay(memo)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 16,
                background: v.accent,
                color: v.bg,
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
                marginTop: 2,
              }}
              data-testid={`button-play-memo-${memo.id}`}
              title={t("m2.voiceMemo.play", "Play")}
            >
              {playingId === memo.id ? (
                <Pause style={{ width: 14, height: 14 }} />
              ) : (
                <Play style={{ width: 14, height: 14, marginLeft: 2 }} />
              )}
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            {memo.participantName && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: v.textSecondary,
                  fontFamily: "system-ui, sans-serif",
                  marginBottom: 2,
                }}
                data-testid={`text-memo-participant-${memo.id}`}
              >
                {memo.participantName}
              </div>
            )}
            {memo.transcript && (
              <div
                style={{
                  fontSize: 13,
                  color: v.text,
                  fontFamily: "system-ui, sans-serif",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
                data-testid={`text-memo-transcript-${memo.id}`}
              >
                "{memo.transcript}"
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                color: v.muted,
                marginTop: 4,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {memo.durationSeconds ? `${formatTime(memo.durationSeconds)}` : ""}
              {memo.createdAt &&
                ` · ${new Date(memo.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </div>
          </div>

          {memo.participantId === participantId && !readOnly && (
            <button
              onClick={() => handleDelete(memo)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 14,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: v.muted,
                flexShrink: 0,
              }}
              data-testid={`button-delete-memo-${memo.id}`}
              title={t("m2.voiceMemo.deleteConfirm", "Delete voice memo?")}
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      ))}

      <style>{`
        @keyframes cs-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes cs-sheen {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
