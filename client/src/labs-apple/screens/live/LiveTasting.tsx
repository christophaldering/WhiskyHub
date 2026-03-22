// CaskSense Apple — LiveTasting VOLLSTÄNDIG (Ersatz für original)
// + VoiceMemo, FlavourStudio, Paper Sheet Scanner hint, vollständiger Reveal
import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { WhiskyData, RatingData } from '../../types/rating'
import { RatingFlow } from '../rating/RatingFlow'
import { VoiceMemoRecorder } from '../../components/VoiceMemoRecorder'
import * as Icon from '../../icons/Icons'

// ── RevealSequence ─────────────────────────────────────────────────────────
const RevealSequence: React.FC<{ th: ThemeTokens; t: Translations; whisky: WhiskyData; revealedFields: Set<string> }> = ({ th, t, whisky, revealedFields }) => {
  const hasName    = revealedFields.has('name')
  const hasDetails = revealedFields.has('details')
  const hasPhoto   = revealedFields.has('photo')
  const none       = revealedFields.size === 0

  return (
    <div style={{ padding: `${SP.md}px`, textAlign: 'center', minHeight: 140 }}>
      {none && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SP.sm }}>
          <div style={{ opacity: 0.3 }}><Icon.EyeOff color={th.faint} size={44} /></div>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.faint }}>{t.liveBlindSample}</span>
        </div>
      )}
      {hasName && (
        <div style={{ animation: 'fadeUp 600ms ease' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: th.phases.palate.accent, marginBottom: SP.xs }}>{t.liveRevealTitle}</div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 34, fontWeight: 600, margin: `0 0 ${SP.sm}px` }}>{whisky.name || '—'}</h2>
        </div>
      )}
      {hasDetails && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: SP.xs }}>
          {[whisky.distillery, whisky.region, whisky.cask, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).map((chip, i) => (
            <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 12, background: th.phases.palate.dim, color: th.phases.palate.accent, animation: `fadeUp 300ms ease ${i * 80}ms both` }}>{chip}</span>
          ))}
        </div>
      )}
      {hasPhoto && whisky.photoUrl && (
        <img src={whisky.photoUrl} alt={whisky.name} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, marginTop: SP.md, animation: 'fadeUp 500ms ease' }} />
      )}
      {revealedFields.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SP.md, color: th.green, fontSize: 13 }}>
          <Icon.Check color={th.green} size={14} />{t.liveRevealDone}
        </div>
      )}
    </div>
  )
}

// ── LiveAmbient ─────────────────────────────────────────────────────────────
const LiveAmbient: React.FC<{ th: ThemeTokens; t: Translations }> = ({ th, t }) => {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState<string | null>(null)

  const sounds = [
    { id: 'fire',  label: t.liveAmbientFire,  icon: <Icon.Flame color={th.phases.finish.accent} size={16} /> },
    { id: 'rain',  label: t.liveAmbientRain,  icon: <Icon.Sound color={th.phases.nose.accent} size={16} /> },
    { id: 'night', label: t.liveAmbientNight, icon: <Icon.Music color={th.phases.palate.accent} size={16} /> },
    { id: 'off',   label: t.liveAmbientOff,   icon: <Icon.SoundOff color={th.faint} size={16} /> },
  ]

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden', marginTop: SP.md }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `${SP.sm}px ${SP.md}px`, background: 'none', border: 'none', cursor: 'pointer', color: th.text }}>
        <Icon.Sound color={active ? th.gold : th.muted} size={16} />
        <span style={{ flex: 1, fontSize: 14, textAlign: 'left', color: th.muted }}>
          {t.liveAmbient}{active && active !== 'off' ? ` · ${sounds.find(s => s.id === active)?.label}` : ''}
        </span>
        <Icon.ChevronDown color={th.faint} size={14} />
      </button>
      {open && (
        <div style={{ display: 'flex', gap: SP.xs, padding: `0 ${SP.md}px ${SP.md}px`, flexWrap: 'wrap' }}>
          {sounds.map(s => (
            <button key={s.id} onClick={() => setActive(s.id === 'off' ? null : s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer', background: active === s.id ? th.phases.palate.dim : th.bgCard, border: `1px solid ${active === s.id ? th.phases.palate.accent : th.border}`, color: th.text, fontSize: 13, transition: 'all 150ms' }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LiveLobby ──────────────────────────────────────────────────────────────
const LiveLobby: React.FC<{ th: ThemeTokens; t: Translations; tasting: any; participants: any[]; participantId: string }> = ({ th, t, tasting, participants, participantId }) => (
  <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: SP.lg }}>
    <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Playfair Display, serif', marginBottom: SP.md, textAlign: 'center' }}>{tasting?.name}</div>
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: th.gold, marginBottom: SP.lg }}>{t.liveLobby}</div>
    <div style={{ fontSize: 15, color: th.muted, marginBottom: SP.xs }}>{t.liveLobbySub}</div>
    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.faint, marginBottom: SP.xl }}>{t.liveLobbyPour}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.sm, justifyContent: 'center' }}>
      {participants.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: p.id === participantId ? `${th.gold}15` : th.bgCard, border: `1px solid ${p.id === participantId ? th.gold : th.border}`, borderRadius: 20, padding: '6px 14px' }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: th.green }} />
          <span style={{ fontSize: 13, color: p.id === participantId ? th.gold : th.text }}>{p.name}</span>
        </div>
      ))}
    </div>
  </div>
)

// ── LiveTasting (main) ─────────────────────────────────────────────────────
interface Props { th: ThemeTokens; t: Translations; tastingId: string; participantId: string; lang: 'de' | 'en'; onResults: () => void }

export const LiveTasting: React.FC<Props> = ({ th, t, tastingId, participantId, lang, onResults }) => {
  const [tasting, setTasting]     = useState<any>(null)
  const [whiskies, setWhiskies]   = useState<WhiskyData[]>([])
  const [participants, setParts]  = useState<any[]>([])
  const [revealedFields, setRF]   = useState<Set<string>>(new Set())
  const [showRevealFlash, setFlash] = useState(false)
  const [visible, setVisible]     = useState(true)
  const [showVoice, setShowVoice] = useState(false)
  const prevIdxRef = useRef(-1)

  const load = async () => {
    try {
      const [tRes, wRes, pRes] = await Promise.all([
        fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } }),
        fetch(`/api/tastings/${tastingId}/whiskies`, { headers: { 'x-participant-id': participantId } }),
        fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }),
      ])
      if (tRes.ok) {
        const data = await tRes.json()
        setTasting(data)
        if (data.status === 'closed' || data.status === 'archived') { onResults(); return }
        // Reveal fields
        if (data.guidedRevealStep > 0) {
          const fields = new Set<string>()
          if (data.guidedRevealStep >= 1) fields.add('name')
          if (data.guidedRevealStep >= 2) fields.add('details')
          if (data.guidedRevealStep >= 3) fields.add('photo')
          setRF(fields)
        }
        // Breathing pause
        if (prevIdxRef.current !== -1 && data.guidedWhiskyIndex !== prevIdxRef.current) {
          setVisible(false); setTimeout(() => setVisible(true), 350)
        }
        prevIdxRef.current = data.guidedWhiskyIndex
      }
      if (wRes.ok) setWhiskies(await wRes.json())
      if (pRes.ok) setParts(await pRes.json())
    } catch { }
  }

  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id) }, [tastingId])

  // SSE
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/tastings/${tastingId}/events?participantId=${participantId}`)
      es.addEventListener('reveal_triggered', () => { setFlash(true); setTimeout(() => setFlash(false), 600); load() })
      es.addEventListener('status_changed',   () => load())
      es.addEventListener('presentation_changed', () => load())
    } catch { }
    return () => es?.close()
  }, [tastingId])

  if (!tasting) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={32} /></div>

  if (tasting.status === 'draft') return <LiveLobby th={th} t={t} tasting={tasting} participants={participants} participantId={participantId} />

  const currentWhisky: WhiskyData = (whiskies[tasting.guidedWhiskyIndex || 0] || whiskies[0] || { blind: tasting.format === 'blind' }) as WhiskyData
  const total    = whiskies.length || 1
  const dramIdx  = (tasting.guidedWhiskyIndex || 0) + 1
  const isBlind  = tasting.format === 'blind'
  const currentWhiskyId = (currentWhisky as any).id || ''

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Reveal flash overlay */}
      {showRevealFlash && (
        <div style={{ position: 'fixed', inset: 0, animation: 'revealFlash 600ms ease forwards', zIndex: 60, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ animation: 'saveFlash 400ms ease' }}><Icon.Sparkle color={th.gold} size={56} /></div>
        </div>
      )}

      {/* Sub-header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px` }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: SP.xs }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < dramIdx - 1 ? th.gold : i === dramIdx - 1 ? `${th.gold}80` : th.border }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, color: th.muted }}>{t.liveDram} {dramIdx} {t.liveOf} {total}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: th.green, animation: 'ping 1.5s infinite' }} />
            <span style={{ fontSize: 12, color: th.green }}>Live</span>
          </div>
        </div>
      </div>

      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms', paddingBottom: 130 }}>
        {/* Whisky info / reveal */}
        {isBlind
          ? <RevealSequence th={th} t={t} whisky={currentWhisky} revealedFields={revealedFields} />
          : (
            <div style={{ padding: SP.md }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{currentWhisky.name || `Dram ${dramIdx}`}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
                {[currentWhisky.region, currentWhisky.cask, currentWhisky.age ? `${currentWhisky.age}y` : null].filter(Boolean).map((v, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: th.bgCard, color: th.muted, border: `1px solid ${th.border}` }}>{v}</span>
                ))}
              </div>
            </div>
          )
        }

        {/* Rating */}
        <div style={{ padding: `0 ${SP.md}px` }}>
          <RatingFlow
            th={th} t={t}
            whisky={{ ...currentWhisky, blind: isBlind && revealedFields.size === 0 }}
            tastingId={tastingId}
            dramIdx={dramIdx}
            total={total}
            tastingStatus={tasting.status}
            participantId={participantId}
            onDone={() => {}}
            onBack={() => {}}
          />
        </div>

        {/* Voice Memo */}
        <div style={{ margin: `${SP.md}px ${SP.md}px 0` }}>
          <button onClick={() => setShowVoice(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: `1px solid ${th.border}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', color: th.muted, fontSize: 13, minHeight: 44 }}>
            <Icon.Mic color={showVoice ? th.phases.nose.accent : th.muted} size={16} />
            {t.liveVoiceMemo}
          </button>
          {showVoice && currentWhiskyId && (
            <div style={{ marginTop: SP.sm }}>
              <VoiceMemoRecorder
                th={th}
                participantId={participantId}
                uploadUrl={`/api/tastings/${tastingId}/whiskies/${currentWhiskyId}/voice-memo`}
                fetchUrl={`/api/tastings/${tastingId}/whiskies/${currentWhiskyId}/voice-memos`}
              />
            </div>
          )}
        </div>

        {/* Ambient */}
        <div style={{ padding: `0 ${SP.md}px` }}>
          <LiveAmbient th={th} t={t} />
        </div>
      </div>
    </div>
  )
}
