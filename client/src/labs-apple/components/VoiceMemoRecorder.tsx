// CaskSense Apple — VoiceMemoRecorder
// Vollständige Implementierung: Aufnahme → Upload → Transkription → Wiedergabe
import React, { useState, useRef, useEffect } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import * as Icon from '../icons/Icons'

interface VoiceMemo {
  id:         string
  url:        string
  transcript?: string
  duration:   number
}

interface Props {
  th:            ThemeTokens
  participantId: string
  uploadUrl:     string   // z.B. /api/tastings/:id/whiskies/:wid/voice-memo
  fetchUrl:      string   // z.B. /api/tastings/:id/whiskies/:wid/voice-memos
  label?:        string
}

export const VoiceMemoRecorder: React.FC<Props> = ({ th, participantId, uploadUrl, fetchUrl, label }) => {
  const [memos, setMemos]       = useState<VoiceMemo[]>([])
  const [recording, setRecording] = useState(false)
  const [duration, setDuration]   = useState(0)
  const [uploading, setUploading] = useState(false)
  const [playing, setPlaying]     = useState<string | null>(null)
  const [transcript, setTranscript] = useState<Record<string, boolean>>({}) // open state
  const [available, setAvailable] = useState(true)

  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunks    = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  // Load existing memos
  useEffect(() => {
    fetch(fetchUrl, { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : []).then(data => setMemos(Array.isArray(data) ? data : [])).catch(() => {})
  }, [fetchUrl])

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setAvailable(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = e => chunks.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        await uploadMemo()
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= 30) { mr.stop(); return d }
          return d + 1
        })
      }, 1000)
    } catch { setAvailable(false) }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
    setRecording(false)
  }

  const uploadMemo = async () => {
    setUploading(true)
    try {
      const blob = new Blob(chunks.current, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('file', blob, 'memo.webm')
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'x-participant-id': participantId }, body: fd })
      if (res.ok) {
        const data = await res.json()
        setMemos(m => [data, ...m])
      }
    } catch { } finally { setUploading(false) }
  }

  const deleteMemo = async (id: string) => {
    try {
      await fetch(`${uploadUrl}/${id}`, { method: 'DELETE', headers: { 'x-participant-id': participantId } })
      setMemos(m => m.filter(x => x.id !== id))
      if (audioRefs.current[id]) { audioRefs.current[id].pause(); delete audioRefs.current[id] }
    } catch { }
  }

  const togglePlay = (memo: VoiceMemo) => {
    if (playing === memo.id) {
      audioRefs.current[memo.id]?.pause()
      setPlaying(null)
    } else {
      Object.values(audioRefs.current).forEach(a => a.pause())
      if (!audioRefs.current[memo.id]) {
        const audio = new Audio(memo.url)
        audio.onended = () => setPlaying(null)
        audioRefs.current[memo.id] = audio
      }
      audioRefs.current[memo.id].play()
      setPlaying(memo.id)
    }
  }

  const progressColor = duration >= 25 ? '#e06060' : duration >= 20 ? th.amber : th.gold
  const pct = (duration / 30) * 100

  if (!available) return (
    <div style={{ padding: `${SP.sm}px 0`, color: th.faint, fontSize: 13, fontStyle: 'italic' }}>
      Sprachaufnahme nicht verfügbar
    </div>
  )

  return (
    <div>
      {label && <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>}

      {/* Record button */}
      {!recording && !uploading && (
        <button onClick={startRecording} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '0 16px', borderRadius: 14, border: `1px solid ${th.border}`, background: th.bgCard, cursor: 'pointer', color: th.muted, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
          <Icon.Mic color={th.phases.nose.accent} size={20} />
          Sprachnotiz aufnehmen
        </button>
      )}

      {/* Recording UI */}
      {recording && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.sm }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#e06060', animation: 'blink 1s infinite' }} />
            <span style={{ fontSize: 12, color: '#e06060', fontWeight: 700, letterSpacing: '0.1em' }}>REC</span>
            <span style={{ fontSize: 13, color: th.muted, marginLeft: 'auto' }}>{duration}s / 30s</span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 2, background: th.border, marginBottom: SP.md, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${th.gold}, ${progressColor})`, transition: 'width 1s linear' }} />
          </div>
          <button onClick={stopRecording} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: '#c03030', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon.Stop color="#fff" size={18} />Stopp
          </button>
        </div>
      )}

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SP.sm}px 0`, color: th.muted, fontSize: 13 }}>
          <Icon.Spinner color={th.gold} size={16} />Wird hochgeladen…
        </div>
      )}

      {/* Memos list */}
      {memos.map(memo => (
        <div key={memo.id} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.sm, marginTop: SP.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => togglePlay(memo)} style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: playing === memo.id ? th.phases.nose.dim : `${th.gold}15`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playing === memo.id ? <Icon.Stop color={th.phases.nose.accent} size={16} /> : <Icon.Play color={th.gold} size={16} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: th.text }}>Notiz · {memo.duration}s</div>
              {memo.transcript && (
                <button onClick={() => setTranscript(t => ({ ...t, [memo.id]: !t[memo.id] }))} style={{ fontSize: 11, color: th.phases.nose.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                  {transcript[memo.id] ? 'Transkription ausblenden' : 'Transkription anzeigen'}
                </button>
              )}
            </div>
            <button onClick={() => deleteMemo(memo.id)} style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Trash color={th.faint} size={16} />
            </button>
          </div>
          {memo.transcript && transcript[memo.id] && (
            <div style={{ marginTop: SP.sm, paddingTop: SP.sm, borderTop: `1px solid ${th.border}`, fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: th.muted, lineHeight: 1.5 }}>
              {memo.transcript}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
