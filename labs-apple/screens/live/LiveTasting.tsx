// CaskSense Apple — LiveTasting (Phase 5)
import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import { WhiskyData, RatingData } from '../types/rating'
import { RatingFlow } from '../screens/rating/RatingFlow'
import * as Icon from '../icons/Icons'

// ── RevealSequence ─────────────────────────────────────────────────────────
const RevealSequence: React.FC<{ th: ThemeTokens; t: Translations; whisky: WhiskyData; revealedFields: Set<string> }> = ({ th, t, whisky, revealedFields }) => {
  const hasName    = revealedFields.has('name')
  const hasDetails = revealedFields.has('details')
  const hasPhoto   = revealedFields.has('photo')

  return (
    <div style={{ padding: `${SP.md}px`, textAlign: 'center', minHeight: 120 }}>
      {!hasName && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SP.sm, opacity: 0.4 }}>
          <Icon.EyeOff color={th.faint} size={40} />
          <span style={{ color: th.faint, fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>{t.liveBlindSample}</span>
        </div>
      )}
      {hasName && (
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 34, fontWeight: 600, animation: 'fadeUp 600ms ease', margin: `0 0 ${SP.sm}px` }}>
          {whisky.name || '—'}
        </h2>
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

// ── LiveAmbient ────────────────────────────────────────────────────────────
const LiveAmbient: React.FC<{ th: ThemeTokens; t: Translations }> = ({ th, t }) => {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const sounds = [
    { id: 'fire',  label: t.liveAmbientFire,  icon: <Icon.Flame color={th.phases.finish.accent} size={18} /> },
    { id: 'rain',  label: t.liveAmbientRain,  icon: <Icon.Sound color={th.phases.nose.accent} size={18} /> },
    { id: 'night', label: t.liveAmbientNight, icon: <Icon.Music color={th.phases.palate.accent} size={18} /> },
    { id: 'off',   label: t.liveAmbientOff,   icon: <Icon.SoundOff color={th.faint} size={18} /> },
  ]

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden', marginTop: SP.md }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `${SP.sm}px ${SP.md}px`, background: 'none', border: 'none', cursor: 'pointer', color: th.text }}>
        <Icon.Sound color={active ? th.gold : th.muted} size={18} />
        <span style={{ flex: 1, fontSize: 14, textAlign: 'left', color: th.muted }}>{t.liveAmbient}{active && active !== 'off' ? ` · ${sounds.find(s => s.id === active)?.label}` : ''}</span>
        <Icon.ChevronDown color={th.faint} size={16} />
      </button>
      {open && (
        <div style={{ display: 'flex', gap: SP.sm, padding: `0 ${SP.md}px ${SP.md}px`, flexWrap: 'wrap' }}>
          {sounds.map(s => (
            <button key={s.id} onClick={() => setActive(s.id === 'off' ? null : s.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer', background: active === s.id ? th.phases.palate.dim : th.bgCard, border: `1px solid ${active === s.id ? th.phases.palate.accent : th.border}`, color: th.text, fontSize: 13, transition: 'all 150ms' }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LiveTasting ─────────────────────────────────────────────────────────────
interface Props { th: ThemeTokens; t: Translations; tastingId: string; participantId: string; onResults: () => void }

export const LiveTasting: React.FC<Props> = ({ th, t, tastingId, participantId, onResults }) => {
  const [tasting, setTasting]     = useState<any>(null)
  const [whiskies, setWhiskies]   = useState<WhiskyData[]>([])
  const [participants, setParts]  = useState<any[]>([])
  const [revealedFields, setRF]   = useState<Set<string>>(new Set())
  const [showFlash, setFlash]     = useState(false)
  const [visible, setVisible]     = useState(true)
  const prevIdxRef = useRef<number>(-1)

  const load = async () => {
    const [tRes, wRes, pRes] = await Promise.all([
      fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } }),
      fetch(`/api/tastings/${tastingId}/whiskies`, { headers: { 'x-participant-id': participantId } }),
      fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }),
    ])
    if (tRes.ok) {
      const data = await tRes.json()
      setTasting(data)
      if (data.status === 'closed' || data.status === 'archived') { onResults(); return }
      if (data.guidedRevealStep > 0) {
        const fields = new Set<string>()
        if (data.guidedRevealStep >= 1) fields.add('name')
        if (data.guidedRevealStep >= 2) fields.add('details')
        if (data.guidedRevealStep >= 3) fields.add('photo')
        setRF(fields)
      }
      // Breathing pause on dram change
      if (prevIdxRef.current !== -1 && data.guidedWhiskyIndex !== prevIdxRef.current) {
        setVisible(false); setTimeout(() => setVisible(true), 350)
      }
      prevIdxRef.current = data.guidedWhiskyIndex
    }
    if (wRes.ok) setWhiskies(await wRes.json())
    if (pRes.ok) setParts(await pRes.json())
  }

  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id) }, [tastingId])

  // SSE hook (import from existing)
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/tastings/${tastingId}/events?participantId=${participantId}`)
      es.addEventListener('reveal_triggered', () => { setFlash(true); setTimeout(() => setFlash(false), 500); load() })
      es.addEventListener('status_changed', () => load())
      es.addEventListener('presentation_changed', () => load())
    } catch { /* fallback to polling */ }
    return () => es?.close()
  }, [tastingId])

  if (!tasting) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={32} /></div>

  const currentWhisky: WhiskyData = (whiskies[tasting.guidedWhiskyIndex] || whiskies[0] || { blind: tasting.format === 'blind' }) as WhiskyData
  const total = whiskies.length || 1
  const dramIdx = (tasting.guidedWhiskyIndex || 0) + 1

  if (tasting.status === 'draft') {
    return (
      <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: SP.lg }}>
        <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Playfair Display, serif', marginBottom: SP.md }}>{tasting.name}</div>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: th.gold, marginBottom: SP.lg }}>{t.liveLobby}</div>
        <div style={{ fontSize: 15, color: th.muted, marginBottom: SP.xs }}>{t.liveLobbySub}</div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.faint }}>{t.liveLobbyPour}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: SP.xl, flexWrap: 'wrap', justifyContent: 'center' }}>
          {participants.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: '6px 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: th.green }} />
              <span style={{ fontSize: 13 }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Reveal flash overlay */}
      {showFlash && <div style={{ position: 'fixed', inset: 0, animation: 'revealFlash 500ms ease forwards', zIndex: 50, pointerEvents: 'none' }}><div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'saveFlash 400ms ease' }}><Icon.Sparkle color={th.gold} size={48} /></div></div>}

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
        {/* Whisky reveal or info */}
        {tasting.format === 'blind'
          ? <RevealSequence th={th} t={t} whisky={currentWhisky} revealedFields={revealedFields} />
          : (
            <div style={{ padding: SP.md }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{currentWhisky.name}</h2>
              <div style={{ display: 'flex', gap: SP.xs, flexWrap: 'wrap' }}>
                {[currentWhisky.region, currentWhisky.cask].filter(Boolean).map((v, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: th.bgCard, color: th.muted }}>{v}</span>
                ))}
              </div>
            </div>
          )
        }

        {/* Rating */}
        <div style={{ padding: `0 ${SP.md}px` }}>
          <RatingFlow
            th={th} t={t}
            whisky={{ ...currentWhisky, blind: tasting.format === 'blind' && revealedFields.size === 0 }}
            tastingId={tastingId}
            dramIdx={dramIdx}
            total={total}
            tastingStatus={tasting.status}
            participantId={participantId}
            onDone={() => {}}
            onBack={() => {}}
          />
        </div>

        {/* Ambient */}
        <div style={{ padding: `0 ${SP.md}px` }}>
          <LiveAmbient th={th} t={t} />
        </div>
      </div>
    </div>
  )
}
