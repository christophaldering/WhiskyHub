import { useCallback, useEffect, useRef, useState } from "react"

export type VoiceStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "denied"
  | "unsupported"
  | "error"

export interface UseVoiceCohostOptions {
  language: "de" | "en"
  onTranscript: (text: string) => void
  speechMuted?: boolean
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null
  onend:    (() => void) | null
  onerror:  ((ev: { error?: string }) => void) | null
  onstart:  (() => void) | null
}

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
  length: number
}
interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionResultEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface BrowserSpeechWindow extends Window {
  SpeechRecognition?: { new(): SpeechRecognitionLike }
  webkitSpeechRecognition?: { new(): SpeechRecognitionLike }
}

function getRecognitionCtor(): { new(): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null
  const w = window as BrowserSpeechWindow
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export interface UseVoiceCohostReturn {
  status:       VoiceStatus
  isListening:  boolean
  errorMessage: string | null
  toggle:       () => void
  start:        () => void
  stop:         () => void
  speak:        (text: string) => void
  cancelSpeech: () => void
  supported:    boolean
}

export function useVoiceCohost(opts: UseVoiceCohostOptions): UseVoiceCohostReturn {
  const { language, onTranscript, speechMuted } = opts

  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListeningRef = useRef<boolean>(false)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const Ctor = getRecognitionCtor()
  const supported = Ctor !== null

  useEffect(() => {
    if (!Ctor) {
      setStatus("unsupported")
    }
  }, [Ctor])

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.onresult = null } catch {}
      try { recognitionRef.current.onend    = null } catch {}
      try { recognitionRef.current.onerror  = null } catch {}
      try { recognitionRef.current.onstart  = null } catch {}
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  const startInternal = useCallback(() => {
    if (!Ctor) {
      setStatus("unsupported")
      return
    }
    if (recognitionRef.current) return
    try {
      const rec = new Ctor()
      rec.lang = language === "de" ? "de-DE" : "en-US"
      rec.continuous = true
      rec.interimResults = false
      rec.onstart = () => {
        setStatus("listening")
        setErrorMessage(null)
      }
      rec.onresult = (ev) => {
        let finalText = ""
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i]
          if (result.isFinal) {
            finalText += result[0].transcript
          }
        }
        const trimmed = finalText.trim()
        if (trimmed) {
          setStatus("processing")
          onTranscriptRef.current(trimmed)
        }
      }
      rec.onerror = (ev) => {
        const code = ev.error || "unknown"
        if (code === "not-allowed" || code === "service-not-allowed") {
          wantListeningRef.current = false
          setStatus("denied")
          setErrorMessage(language === "de"
            ? "Mikrofon-Zugriff abgelehnt. Bitte in den Browser-Einstellungen erlauben."
            : "Microphone access denied. Please allow it in browser settings.")
          cleanup()
          return
        }
        if (code === "no-speech" || code === "aborted") {
          return
        }
        setStatus("error")
        setErrorMessage(code)
      }
      rec.onend = () => {
        recognitionRef.current = null
        if (wantListeningRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
          restartTimerRef.current = setTimeout(() => {
            if (wantListeningRef.current) startInternal()
          }, 250)
        } else {
          setStatus((s) => (s === "denied" || s === "error" || s === "unsupported" ? s : "idle"))
        }
      }
      recognitionRef.current = rec
      rec.start()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "start failed"
      setStatus("error")
      setErrorMessage(msg)
      cleanup()
    }
  }, [Ctor, cleanup, language])

  const start = useCallback(() => {
    if (!Ctor) {
      setStatus("unsupported")
      return
    }
    wantListeningRef.current = true
    startInternal()
  }, [Ctor, startInternal])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    cleanup()
    setStatus((s) => (s === "denied" || s === "unsupported" ? s : "idle"))
  }, [cleanup])

  const toggle = useCallback(() => {
    if (status === "listening" || status === "processing" || status === "speaking") {
      stop()
    } else {
      start()
    }
  }, [status, start, stop])

  const cancelSpeech = useCallback(() => {
    if (typeof window === "undefined") return
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel() } catch {}
    }
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current)
      speakingTimeoutRef.current = null
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!text || speechMuted) {
      setStatus(() => (wantListeningRef.current ? "listening" : "idle"))
      return
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    try {
      const synth = window.speechSynthesis
      synth.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = language === "de" ? "de-DE" : "en-US"
      utter.rate = 1.05
      utter.pitch = 1
      utter.volume = 1
      const wasListening = wantListeningRef.current
      if (wasListening && recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
      const resumeListening = () => {
        if (wasListening) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
          restartTimerRef.current = setTimeout(() => {
            if (wantListeningRef.current && !recognitionRef.current) startInternal()
          }, 350)
        }
      }
      utter.onstart = () => setStatus("speaking")
      utter.onend = () => {
        setStatus(() => (wantListeningRef.current ? "listening" : "idle"))
        resumeListening()
      }
      utter.onerror = () => {
        setStatus(() => (wantListeningRef.current ? "listening" : "idle"))
        resumeListening()
      }
      synth.speak(utter)
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current)
      speakingTimeoutRef.current = setTimeout(() => {
        setStatus(() => (wantListeningRef.current ? "listening" : "idle"))
        resumeListening()
      }, Math.max(2500, text.length * 90))
    } catch {
      setStatus(() => (wantListeningRef.current ? "listening" : "idle"))
    }
  }, [language, speechMuted, startInternal])

  useEffect(() => {
    return () => {
      wantListeningRef.current = false
      cleanup()
      cancelSpeech()
    }
  }, [cleanup, cancelSpeech])

  useEffect(() => {
    if (wantListeningRef.current) {
      cleanup()
      startInternal()
    }
  }, [language, cleanup, startInternal])

  return {
    status,
    isListening: status === "listening" || status === "processing" || status === "speaking",
    errorMessage,
    toggle,
    start,
    stop,
    speak,
    cancelSpeech,
    supported,
  }
}
