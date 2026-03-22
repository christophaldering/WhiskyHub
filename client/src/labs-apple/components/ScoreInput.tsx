// CaskSense Apple — ScoreInput (Custom Track, kein input[type=range])
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ThemeTokens } from '../theme/tokens'
import { Translations } from '../theme/i18n'

interface Props {
  value:    number
  onChange: (v: number) => void
  phaseId:  'nose' | 'palate' | 'finish' | 'overall'
  th:       ThemeTokens
  t:        Translations
}

function getBandColor(score: number): string {
  if (score >= 90) return '#d4a847'
  if (score >= 85) return '#c4a040'
  if (score >= 80) return '#86c678'
  if (score >= 70) return '#7ab8c4'
  return 'rgba(200,180,160,0.5)'
}

function getBandLabel(score: number, t: Translations): string {
  if (score >= 90) return t.band90
  if (score >= 85) return t.band85
  if (score >= 80) return t.band80
  if (score >= 75) return t.band75
  if (score >= 70) return t.band70
  return t.band0
}

export const ScoreInput: React.FC<Props> = ({ value, onChange, phaseId, th, t }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const dragging = useRef(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pct = ((value - 60) / 40) * 100
  const bandColor = getBandColor(value)
  const phase = th.phases[phaseId]

  const fromX = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pctRaw = (clientX - rect.left) / rect.width
    const score = Math.round(60 + pctRaw * 40)
    onChange(Math.max(60, Math.min(100, score)))
  }, [onChange])

  useEffect(() => {
    const onMove = (e: MouseEvent)  => { if (dragging.current) fromX(e.clientX) }
    const onUp   = ()               => { dragging.current = false }
    const onTMove = (e: TouchEvent) => { if (dragging.current) fromX(e.touches[0].clientX) }
    const onTEnd  = ()              => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTMove, { passive: true })
    window.addEventListener('touchend', onTEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTMove)
      window.removeEventListener('touchend', onTEnd)
    }
  }, [fromX])

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select() } }, [editing])

  const commitDraft = () => {
    const v = parseInt(draft)
    if (!isNaN(v) && v >= 60 && v <= 100) onChange(v)
    setEditing(false)
  }

  const ticks = [60, 65, 70, 75, 80, 85, 90, 95, 100]
  const quickPicks = [70, 75, 80, 85, 90]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Score display + band label */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: th.faint, marginBottom: 4 }}>{t.ratingTapEdit}</div>
          {editing ? (
            <input
              ref={inputRef}
              type="number" min="60" max="100"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={e => { if (e.key === 'Enter') commitDraft() }}
              style={{
                width: 80, fontSize: 52, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                background: 'transparent', border: 'none', outline: 'none',
                color: bandColor, padding: 0,
              }}
            />
          ) : (
            <div onClick={() => { setDraft(String(value)); setEditing(true) }}
              style={{ fontSize: 52, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', color: bandColor, cursor: 'pointer', lineHeight: 1 }}>
              {value}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', paddingBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: bandColor }}>{getBandLabel(value, t)}</div>
          <div style={{ fontSize: 12, color: th.faint }}>{t.ratingOf} 100</div>
        </div>
      </div>

      {/* Custom track */}
      <div
        ref={trackRef}
        onMouseDown={e => { dragging.current = true; fromX(e.clientX) }}
        onTouchStart={e => { dragging.current = true; fromX(e.touches[0].clientX) }}
        style={{ height: 44, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        {/* Track background */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: th.border }} />
        {/* Track fill */}
        <div style={{
          position: 'absolute', left: 0, width: `${pct}%`, height: 6, borderRadius: 3,
          background: `linear-gradient(90deg, ${phase.accent}88, ${phase.accent})`,
        }} />
        {/* Thumb */}
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 22px)`,
          width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 12,
            background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
            boxShadow: `0 0 10px ${th.gold}66`,
          }} />
        </div>
      </div>

      {/* Tick labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {ticks.map(t2 => (
          <span key={t2} style={{ fontSize: 10, color: t2 === value ? bandColor : th.faint, fontFamily: 'DM Sans, sans-serif', fontWeight: t2 === value ? 700 : 400 }}>
            {t2}
          </span>
        ))}
      </div>

      {/* Quick pick buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {quickPicks.map(q => {
          const active = value === q
          return (
            <button key={q} onClick={() => onChange(q)} style={{
              flex: 1, height: 44, borderRadius: 10, cursor: 'pointer', transition: 'all 150ms',
              background: active ? phase.dim : th.bgCard,
              border: `1px solid ${active ? phase.accent : th.border}`,
              color: active ? phase.accent : th.muted,
              fontSize: 14, fontWeight: active ? 700 : 400, fontFamily: 'DM Sans, sans-serif',
            }}>
              {q}
            </button>
          )
        })}
      </div>
    </div>
  )
}
