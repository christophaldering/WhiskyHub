import { useState, useRef, useCallback, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Mic, Trash, Spinner } from "../../icons";

interface MemoData {
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onMemoSaved?: (memo: MemoData) => void;
}

export default function SoloVoiceMemo({ th, t, participantId, onMemoSaved }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [progress, setProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supported] = useState(() => typeof MediaRecorder !== "undefined");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const MAX_SECONDS = 30;

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

        setUploading(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "memo.webm");
          form.append("durationSeconds", String(elapsed));

          const res = await fetch("/api/journal/voice-memo", {
            method: "POST",
            headers: { "x-participant-id": participantId },
            body: form,
          });

          if (!res.ok) throw new Error("Upload failed");

          const data = await res.json();
          const memoData: MemoData = {
            audioUrl: data.audioUrl,
            transcript: data.transcript || "",
            durationSeconds: data.durationSeconds || elapsed,
          };
          setMemo(memoData);
          onMemoSaved?.(memoData);
        } catch {
          // silently fail - the memo is optional
        } finally {
          setUploading(false);
        }
      };

      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setProgress(0);

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setProgress(Math.min(elapsed / MAX_SECONDS, 1));
        if (elapsed >= MAX_SECONDS) {
          stopRecording();
        }
      }, 200);
    } catch {
      // mic not available
    }
  }, [participantId, onMemoSaved, stopRecording]);

  const handleMicClick = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleDelete = () => {
    setMemo(null);
    setShowDeleteConfirm(false);
  };

  if (!supported) {
    return (
      <p style={{ fontFamily: FONT.body, fontSize: 13, color: th.muted, textAlign: "center", padding: `${SP.sm}px 0` }} data-testid="solo-mic-unsupported">
        {t.soloVoiceMemo}
      </p>
    );
  }

  if (uploading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: SP.sm,
        padding: SP.md,
      }} data-testid="solo-memo-uploading">
        <Spinner color={th.muted} size={20} />
        <span style={{ fontFamily: FONT.body, fontSize: 14, color: th.muted }}>
          {t.soloUploading}
        </span>
      </div>
    );
  }

  if (memo) {
    return (
      <div style={{ padding: `${SP.sm}px 0` }} data-testid="solo-memo-result">
        {memo.transcript && memo.transcript !== "[Transcription failed]" && (
          <p style={{
            fontFamily: FONT.body,
            fontSize: 14,
            color: th.text,
            fontStyle: "italic",
            margin: `0 0 ${SP.sm}px`,
            lineHeight: 1.5,
          }} data-testid="solo-memo-transcript">
            "{memo.transcript}"
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
          <span style={{ fontFamily: FONT.body, fontSize: 12, color: th.muted }}>
            {memo.durationSeconds}s
          </span>
          {showDeleteConfirm ? (
            <div style={{ display: "flex", gap: SP.sm }}>
              <button
                onClick={handleDelete}
                data-testid="solo-memo-confirm-delete"
                style={{
                  padding: `${SP.xs}px ${SP.sm}px`,
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${th.amber}`,
                  background: "none",
                  color: th.amber,
                  fontFamily: FONT.body,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {t.soloDeleteConfirm}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                data-testid="solo-memo-cancel-delete"
                style={{
                  padding: `${SP.xs}px ${SP.sm}px`,
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  color: th.muted,
                  fontFamily: FONT.body,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {t.soloCancel}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="solo-memo-delete-btn"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: SP.xs,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Trash color={th.muted} size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: SP.sm,
      padding: `${SP.sm}px 0`,
    }} data-testid="solo-memo-recorder">
      <button
        onClick={handleMicClick}
        data-testid="solo-mic-btn"
        className={recording ? "v2-pulse-ring" : ""}
        style={{
          width: 80,
          height: 80,
          borderRadius: RADIUS.full,
          border: recording ? `3px solid #dc3232` : `2px solid ${th.border}`,
          background: recording ? "rgba(220,50,50,0.15)" : th.bgCard,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Mic color={recording ? "#dc3232" : th.muted} size={32} />
      </button>

      {recording && (
        <>
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: "#dc3232" }} data-testid="solo-recording-label">
            {t.soloRecording}
          </span>
          <div style={{
            width: "100%",
            maxWidth: 200,
            height: 4,
            borderRadius: 2,
            background: th.border,
            overflow: "hidden",
          }}>
            <div style={{
              width: `${progress * 100}%`,
              height: "100%",
              background: "#dc3232",
              borderRadius: 2,
              transition: "width 0.2s linear",
            }} data-testid="solo-recording-progress" />
          </div>
        </>
      )}

      {!recording && (
        <span style={{ fontFamily: FONT.body, fontSize: 13, color: th.muted }}>
          {t.soloVoiceMemo}
        </span>
      )}
    </div>
  );
}
