import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Square, Loader2, Play, Pause, Trash2 } from "lucide-react";

const MAX_DURATION = 30;

export interface LabsVoiceMemoData {
  audioUrl: string | null;
  transcript: string;
  durationSeconds: number;
  localBlobUrl?: string;
}

interface LabsVoiceMemoRecorderProps {
  onMemoChange: (data: LabsVoiceMemoData | null) => void;
  memo: LabsVoiceMemoData | null;
  participantId: string;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function LabsVoiceMemoRecorder({ onMemoChange, memo, participantId }: LabsVoiceMemoRecorderProps) {
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

  const stopRecording = useCallback(() => {
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
  }, []);

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
    <div data-testid="labs-voice-memo-recorder">
      {recording ? (() => {
        const progress = elapsed / MAX_DURATION;
        const barColor = elapsed >= 28 ? "var(--labs-danger)" : elapsed >= 24 ? "var(--labs-accent-hover)" : "var(--labs-accent)";
        return (
          <div
            style={{
              padding: "12px 14px",
              background: "var(--labs-surface-elevated)",
              borderRadius: "var(--labs-radius-sm)",
              border: "1px solid var(--labs-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 8px",
                  background: "var(--labs-danger-muted)",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--labs-danger)",
                    animation: "cs-pulse 1.5s ease-in-out infinite",
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-danger)", fontFamily: "inherit", letterSpacing: "0.06em" }}>REC</span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--labs-text-muted)",
                  fontFamily: "inherit",
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
                data-testid="text-labs-recording-status"
              >
                {formatTime(elapsed)} / {formatTime(MAX_DURATION)}
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={stopRecording}
                className="labs-btn-primary"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13 }}
                data-testid="button-labs-stop-recording"
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
                background: "var(--labs-border)",
                overflow: "hidden",
                position: "relative",
              }}
              data-testid="progress-labs-recording-bar"
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress * 100}%`,
                  borderRadius: 999,
                  background: barColor,
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
            background: "var(--labs-surface-elevated)",
            borderRadius: "var(--labs-radius-sm)",
            border: "1px solid var(--labs-border)",
          }}
        >
          <Loader2
            style={{
              width: 16,
              height: 16,
              color: "var(--labs-accent)",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--labs-text-muted)", fontFamily: "inherit" }}>
            {t("m2.voiceMemo.uploading", "Processing voice memo...")}
          </span>
        </div>
      ) : memo ? (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--labs-surface-elevated)",
            borderRadius: "var(--labs-radius-sm)",
            border: "1px solid var(--labs-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: memo.transcript ? 8 : 0 }}>
            <button
              onClick={togglePlayback}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--labs-accent)",
                color: "var(--labs-bg)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              data-testid="button-labs-memo-play"
            >
              {playing ? <Pause style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text)", fontFamily: "inherit" }}>
                {t("m2.voiceMemo.title", "Voice Memo")}
              </span>
              {memo.durationSeconds > 0 && (
                <span style={{ fontSize: 12, color: "var(--labs-text-muted)", marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>
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
                color: "var(--labs-text-muted)",
                padding: 4,
              }}
              data-testid="button-labs-memo-delete"
            >
              <Trash2 style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {memo.transcript && memo.transcript !== "[Transcription failed]" && (
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.5, fontStyle: "italic", fontFamily: "inherit" }}>
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
            gap: 14,
            padding: "14px 16px",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 18%, transparent) 0%, color-mix(in srgb, var(--labs-accent) 8%, transparent) 42%, color-mix(in srgb, var(--labs-bg) 92%, transparent) 100%)",
            border: "1px solid color-mix(in srgb, var(--labs-accent) 32%, transparent)",
            borderRadius: "var(--labs-radius)",
            cursor: "pointer",
            width: "100%",
            fontFamily: "inherit",
            boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--labs-text) 6%, transparent), 0 8px 20px rgba(0,0,0,0.18)",
            transition: "transform 180ms ease, box-shadow 180ms ease",
            textAlign: "left" as const,
          }}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.985)"; }}
          onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          data-testid="button-labs-start-recording"
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: "radial-gradient(circle at 30% 25%, var(--labs-accent-hover) 0%, var(--labs-accent) 42%, color-mix(in srgb, var(--labs-accent) 60%, black) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              animation: "cs-orb-breathe 3s ease-in-out infinite",
              boxShadow: "0 2px 12px color-mix(in srgb, var(--labs-accent) 35%, transparent)",
            }}
          >
            <Mic style={{ width: 20, height: 20, color: "var(--labs-accent-dark)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3 }}>
              {t("m2.voiceMemo.title", "Voice Memo")}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--labs-text-muted)", lineHeight: 1.4, marginTop: 2 }}>
              {t("m2.voiceMemo.tapToSpeak", "Tap to speak · up to 30s")}
            </div>
          </div>
          <div
            style={{
              height: 22,
              padding: "0 10px",
              borderRadius: 999,
              background: "var(--labs-accent-muted)",
              border: "1px solid color-mix(in srgb, var(--labs-accent) 32%, transparent)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--labs-accent)",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            30s
          </div>
        </button>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "var(--labs-danger)", marginTop: 6 }}>{error}</div>
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
        @keyframes cs-orb-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 2px 12px color-mix(in srgb, var(--labs-accent) 35%, transparent); }
          50% { transform: scale(1.06); box-shadow: 0 4px 18px color-mix(in srgb, var(--labs-accent) 50%, transparent); }
        }
      `}</style>
    </div>
  );
}