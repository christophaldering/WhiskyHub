// CaskSense Apple — Making-Of Timeline (Phase F)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const MakingOf: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [chapters, setChapters] = useState<any[]>([])
  const [stats, setStats]       = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [hasAccess, setAccess]  = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/making-of', { headers: { 'x-participant-id': participantId } })
      .then(r => { if (r.status === 403) { setAccess(false); return null }; setAccess(true); return r.json() })
      .then(d => { if (d) { setChapters(d?.chapters || []); setStats(d?.stats) } })
      .catch(() => setAccess(false))
      .finally(() => setLoading(false))
  }, [participantId])

  if (loading) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={28} /></div>

  if (hasAccess === false) return (
    <div style={{ padding: SP.md }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <div style={{ textAlign: 'center', padding: `${SP.xxxl}px 0` }}>
        <Icon.Lock color={th.faint} size={40} />
        <div style={{ marginTop: SP.lg, fontFamily: 'Playfair Display, serif', fontSize: 22, color: th.muted }}>Kein Zugang</div>
        <div style={{ marginTop: SP.sm, fontSize: 14, color: th.faint }}>Nur für autorisierte Nutzer</div>
      </div>
    </div>
  )

  const CHAPTER_COLORS = [th.phases.nose.accent, th.gold, th.phases.palate.accent, th.green, th.phases.finish.accent, '#d4a847', '#a8b870']

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Making of CaskSense</h1>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.xl}px` }}>
        Die Geschichte hinter der App — in 7 Whisky-Metaphern
      </p>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SP.sm, marginBottom: SP.xl }}>
          {[
            { label: 'Commits', value: stats.commits?.toLocaleString('de') || '—' },
            { label: 'Tage', value: stats.days || '—' },
            { label: 'Features', value: stats.features || '—' },
          ].map((s, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: SP.sm, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: th.gold }}>{s.value}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${th.gold}, ${th.border})` }} />

        {chapters.map((ch, i) => (
          <div key={i} style={{ display: 'flex', gap: SP.md, marginBottom: SP.xl, paddingLeft: 8 }}>
            {/* Dot */}
            <div style={{ width: 18, height: 18, borderRadius: 9, background: CHAPTER_COLORS[i % CHAPTER_COLORS.length], border: `3px solid ${th.bg}`, marginTop: 4, flexShrink: 0, zIndex: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: CHAPTER_COLORS[i % CHAPTER_COLORS.length], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Kapitel {i + 1}
              </div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{ch.title}</h3>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, lineHeight: 1.7, margin: `0 0 ${SP.md}px` }}>{ch.narrative}</p>
              {ch.milestones?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
                  {ch.milestones.map((m: string, mi: number) => (
                    <div key={mi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 5, height: 5, borderRadius: 2.5, background: CHAPTER_COLORS[i % CHAPTER_COLORS.length], marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: th.muted }}>{m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {chapters.length === 0 && (
          <div style={{ paddingLeft: 40, textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
            Timeline wird geladen…
          </div>
        )}
      </div>
    </div>
  )
}
