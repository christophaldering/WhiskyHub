import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { Mic, Square, Loader2, Play, Pause, Trash2 } from "lucide-react";

const MAX_DURATION = 30;

interface SoloVoiceMemoData {
  audioUrl: string | null;
  transcript: string;
  durationSeconds: number;
  localBlobUrl?: string;
}

interface SoloVoiceMemoRecorderProps {
  onMemoChange: (data: SoloVoiceMemoData | null) => void;
  memo: SoloVoiceMemoData | null;
  participantId: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function SoloVoiceMemoRecorder({ onMemoChange, memo, participantId }: SoloVoiceMemoRecorderProps) {
  const { t } = useTranslation();

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef(0);

  const pidHeaders = (): Record<string, string> => {
    return participantId ? { "x-participant-id": participantId } : {};
  };

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
      elapsedRef.current = 0;

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          elapsedRef.current = next;
          if (next >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return next;
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
      formData.append("durationSeconds", String(elapsedRef.current || elapsed));

      const res = await fetch("/api/journal/voice-memo", {
        method: "POST",
        headers: pidHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errData.message || "Upload failed");
      }

      const data = await res.json();
      const localBlobUrl = URL.createObjectURL(blob);
      onMemoChange({
        audioUrl: data.audioUrl,
        transcript: data.transcript,
        durationSeconds: data.durationSeconds,
        localBlobUrl,
      });
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    if (memo?.localBlobUrl) {
      URL.revokeObjectURL(memo.localBlobUrl);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
    onMemoChange(null);
  };

  const togglePlayback = () => {
    const url = memo?.localBlobUrl || memo?.audioUrl;
    if (!url) return;

    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  };

  return (
    <div data-testid="solo-voice-memo-recorder">
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
                data-testid="text-solo-recording-status"
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
                data-testid="button-solo-stop-recording"
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
              data-testid="progress-solo-recording-bar"
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
          <span style={{ fontSize: 13, color: v.muted, fontFamily: "system-ui, sans-serif" }}>
            {t("m2.voiceMemo.uploading", "Processing voice memo...")}
          </span>
        </div>
      ) : memo ? (
        <div
          style={{
            padding: "10px 14px",
            background: v.elevated,
            borderRadius: 12,
            border: `1px solid ${v.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: memo.transcript ? 8 : 0 }}>
            <button
              onClick={togglePlayback}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: v.accent,
                color: v.bg,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              data-testid="button-solo-memo-play"
            >
              {playing ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: v.text, fontFamily: "system-ui, sans-serif" }}>
                {t("m2.voiceMemo.title", "Voice Memo")}
              </span>
              {memo.durationSeconds > 0 && (
                <span style={{ fontSize: 12, color: v.muted, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(memo.durationSeconds)}
                </span>
              )}
            </div>
            <button
              onClick={handleDelete}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: v.muted,
                padding: 4,
              }}
              data-testid="button-solo-memo-delete"
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {memo.transcript && memo.transcript !== "[Transcription failed]" && (
            <div style={{ fontSize: 12, color: v.muted, lineHeight: 1.5, fontStyle: "italic", fontFamily: "system-ui, sans-serif" }}>
              "{memo.transcript}"
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={startRecording}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: v.elevated,
            border: `1px solid ${v.border}`,
            borderRadius: 12,
            cursor: "pointer",
            color: v.text,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "system-ui, sans-serif",
            width: "100%",
          }}
          data-testid="button-solo-start-recording"
        >
          <Mic style={{ width: 16, height: 16, color: v.accent }} />
          {t("m2.voiceMemo.recordSolo", "Record a voice note")}
        </button>
      )}

      {error && (
        <div style={{ fontSize: 12, color: v.danger, marginTop: 6 }}>{error}</div>
      )}

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
