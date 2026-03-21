import { useState, useRef, useCallback, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Mic, MicOff, Trash, ChevronDown } from "../../icons";

interface MemoData {
  audioUrl: string;
  transcript: string;
  durationSeconds: number;
}

interface LiveVoiceMemoProps {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  memo: MemoData | null;
  onMemoSaved: (memo: MemoData) => void;
  onMemoDeleted: () => void;
}

const MAX_SECONDS = 30;
const WARN_SECONDS = 24;

export default function LiveVoiceMemo({
  th, t, participantId, memo, onMemoSaved, onMemoDeleted,
}: LiveVoiceMemoProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [supported] = useState(() => typeof MediaRecorder !== "undefined");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

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
          onMemoSaved({
            audioUrl: data.audioUrl,
            transcript: data.transcript || "",
            durationSeconds: data.durationSeconds || elapsed,
          });
        } catch {
          // silently fail
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
    setShowDeleteConfirm(false);
    onMemoDeleted();
  };

  const elapsedSeconds = Math.round(progress * MAX_SECONDS);
  const isWarning = elapsedSeconds >= WARN_SECONDS;
  const barColor = isWarning ? th.amber : th.gold;

  if (!supported) return null;

  if (uploading) {
    return (
      <div
        style={{
          padding: `${SP.md}px`,
          background: th.bgCard,
          borderRadius: RADIUS.md,
          border: `1px solid ${th.border}`,
          textAlign: "center",
        }}
        data-testid="live-voice-uploading"
      >
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: th.muted, margin: 0 }}>
          {t.liveUploading}
        </p>
      </div>
    );
  }

  if (memo) {
    return (
      <div
        style={{
          padding: `${SP.md}px`,
          background: th.bgCard,
          borderRadius: RADIUS.md,
          border: `1px solid ${th.border}`,
        }}
        data-testid="live-voice-playback"
      >
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
          <Mic color={th.gold} size={16} />
          <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 500, color: th.text, flex: 1 }}>
            {t.liveVoiceMemo}
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 12, color: th.muted }}>
            {memo.durationSeconds}s
          </span>
        </div>

        <audio
          src={memo.audioUrl}
          controls
          style={{ width: "100%", height: 36, marginBottom: SP.sm }}
          data-testid="live-voice-audio"
        />

        {memo.transcript && (
          <div>
            <button
              onClick={() => setShowTranscript((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: SP.xs,
                background: "none",
                border: "none",
                color: th.muted,
                cursor: "pointer",
                padding: 0,
                fontFamily: FONT.body,
                fontSize: 12,
                marginBottom: showTranscript ? SP.sm : 0,
              }}
              data-testid="live-voice-transcript-toggle"
            >
              <ChevronDown
                color={th.muted}
                size={14}
                style={{ transform: showTranscript ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
              />
              {t.liveTranscript}
            </button>
            {showTranscript && (
              <p
                style={{
                  fontFamily: FONT.body,
                  fontSize: 13,
                  color: th.muted,
                  margin: 0,
                  padding: `${SP.sm}px`,
                  background: th.bgHover,
                  borderRadius: RADIUS.sm,
                }}
                data-testid="live-voice-transcript-text"
              >
                {memo.transcript}
              </p>
            )}
          </div>
        )}

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: SP.xs,
              background: "none",
              border: "none",
              color: th.amber,
              cursor: "pointer",
              padding: 0,
              fontFamily: FONT.body,
              fontSize: 12,
              marginTop: SP.sm,
            }}
            data-testid="live-voice-delete"
          >
            <Trash color={th.amber} size={14} />
            {t.liveDeleteMemo}
          </button>
        ) : (
          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.sm }}>
            <button
              onClick={handleDelete}
              style={{
                flex: 1,
                padding: `${SP.sm}px`,
                fontSize: 13,
                fontFamily: FONT.body,
                background: th.amber,
                color: "#fff",
                border: "none",
                borderRadius: RADIUS.sm,
                cursor: "pointer",
                minHeight: TOUCH_MIN,
              }}
              data-testid="live-voice-confirm-delete"
            >
              {t.liveDeleteConfirm}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                flex: 1,
                padding: `${SP.sm}px`,
                fontSize: 13,
                fontFamily: FONT.body,
                background: th.bgHover,
                color: th.text,
                border: "none",
                borderRadius: RADIUS.sm,
                cursor: "pointer",
                minHeight: TOUCH_MIN,
              }}
              data-testid="live-voice-cancel-delete"
            >
              {t.liveCancel}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: `${SP.md}px`,
        background: th.bgCard,
        borderRadius: RADIUS.md,
        border: `1px solid ${recording ? barColor : th.border}`,
        transition: "border-color 0.3s",
      }}
      data-testid="live-voice-record"
    >
      {recording && (
        <div style={{ marginBottom: SP.sm }}>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: th.bgHover,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: barColor,
                borderRadius: 2,
                transition: "width 0.2s, background 0.3s",
              }}
              data-testid="live-voice-progress"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: SP.xs }}>
            <span style={{ fontFamily: FONT.body, fontSize: 11, color: isWarning ? th.amber : th.muted }}>
              {t.liveRecording}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 11, color: isWarning ? th.amber : th.muted }}>
              {elapsedSeconds}s / {MAX_SECONDS}s
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleMicClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          width: "100%",
          minHeight: TOUCH_MIN,
          background: recording ? th.amber : "transparent",
          border: recording ? "none" : `1px solid ${th.border}`,
          borderRadius: RADIUS.full,
          color: recording ? "#fff" : th.text,
          cursor: "pointer",
          fontFamily: FONT.body,
          fontSize: 14,
          fontWeight: 500,
          transition: "all 0.2s",
        }}
        data-testid="live-voice-mic-btn"
      >
        {recording ? (
          <>
            <MicOff color="#fff" size={18} />
            {t.liveRecording}
          </>
        ) : (
          <>
            <Mic color={th.text} size={18} />
            {t.liveVoiceMemo}
          </>
        )}
      </button>
    </div>
  );
}
