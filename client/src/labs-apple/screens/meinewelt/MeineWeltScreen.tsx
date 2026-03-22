// CaskSense Apple — MeineWeltScreen VOLLSTÄNDIG (Ersatz für original)
// Alle Sub-Screens: Profil, Analytics, Flavour Wheel, Vergleich, Empfehlungen, Journal, Kalender
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { TasteAnalytics } from './TasteAnalytics'
import { FlavourWheel } from './FlavourWheel'
import { WhiskyCompare } from './WhiskyCompare'
import { Recommendations } from './Recommendations'
import * as Icon from '../../icons/Icons'
import { ConnoisseurReport } from './ConnoisseurReport'
import { AICuration, Benchmark, CollectionAnalysis } from './AIFeatures'

// ── TasteProfile mit SVG-Radar ────────────────────────────────────────────
const TasteProfile: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en'; onBack: () => void }> = ({ th, t, participantId, lang, onBack }) => {
  const [profile, setProfile] = useState<any>(null)
  const [compare, setCompare] = useState<'me' | 'friends' | 'global'>('me')

  useEffect(() => {
    fetch(`/api/participants/${participantId}/flavor-profile`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setProfile).catch(() => setProfile({ dimensions: { nose: 82, palate: 78, finish: 76, overall: 80 } }))
  }, [participantId])

  const dims = ['nose', 'palate', 'finish', 'overall'] as const
  const dimLabels = { nose: t.ratingNose, palate: t.ratingPalate, finish: t.ratingFinish, overall: t.ratingOverall }
  const vals = dims.map(d => profile?.dimensions?.[d] || 75)

  // SVG Radar
  const W = 220, cx = 110, cy = 110, R = 80
  const angles = dims.map((_, i) => (i / dims.length) * 2 * Math.PI - Math.PI / 2)
  const points = (values: number[]) => values.map((v, i) => {
    const r = ((v - 60) / 40) * R
    return [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])]
  })
  const toPath = (pts: number[][]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'

  const userPts   = points(vals)
  const avgPts    = points([78, 76, 74, 77])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.mwProfileTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.mwProfileSub}</p>

      {/* Compare mode */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg }}>
        {([['me', t.mwJustMe], ['friends', t.mwFriends], ['global', t.mwGlobal]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setCompare(id)} style={{ flex: 1, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', background: compare === id ? th.gold : th.bgCard, color: compare === id ? '#1a0f00' : th.muted, fontSize: 13, fontWeight: compare === id ? 700 : 400, transition: 'all 150ms' }}>{label}</button>
        ))}
      </div>

      {/* Radar */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.md, display: 'flex', justifyContent: 'center' }}>
        <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map(s => (
            <polygon key={s} points={angles.map(a => `${cx + R * s * Math.cos(a)},${cy + R * s * Math.sin(a)}`).join(' ')}
              fill="none" stroke={th.border} strokeWidth="1" />
          ))}
          {/* Axes */}
          {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)} stroke={th.border} strokeWidth="1" />)}
          {/* Avg polygon */}
          {compare !== 'me' && <path d={toPath(avgPts)} fill={`${th.faint}30`} stroke={th.faint} strokeWidth="1.5" strokeDasharray="4 2" />}
          {/* User polygon */}
          <path d={toPath(userPts)} fill={`${th.gold}25`} stroke={th.gold} strokeWidth="2" />
          {/* Dots */}
          {userPts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="5" fill={th.gold} />)}
          {/* Labels */}
          {dims.map((d, i) => {
            const lx = cx + (R + 16) * Math.cos(angles[i])
            const ly = cy + (R + 16) * Math.sin(angles[i])
            return <text key={d} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={th.muted} fontFamily="DM Sans">{dimLabels[d]}</text>
          })}
        </svg>
      </div>

      {/* Dimension bars */}
      {dims.map(d => {
        const score = profile?.dimensions?.[d] || 75
        const pct = ((score - 60) / 40) * 100
        const pt = th.phases[d]
        const ratingCount = profile?.dimensionCounts?.[d] || 0
        const confidence = ratingCount > 20 ? { label: 'Sicher', color: th.gold } : ratingCount > 10 ? { label: 'Gut', color: th.muted } : { label: 'Wenig Daten', color: th.faint }
        return (
          <div key={d} style={{ marginBottom: SP.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: th.muted }}>{dimLabels[d]}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${confidence.color}15`, color: confidence.color }}>{confidence.label}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: pt.accent }}>{score}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: th.border, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${pt.accent}88, ${pt.accent})`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── JournalList ─────────────────────────────────────────────────────────────
const JournalList: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [entries, setEntries]  = useState<any[]>([])
  const [search, setSearch]    = useState('')
  const [sort, setSort]        = useState<'date' | 'score' | 'name'>('date')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [offset, setOffset]    = useState(0)

  const load = (off: number) => {
    fetch(`/api/journal?limit=20&offset=${off}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => {
        if (off === 0) setEntries(data || [])
        else setEntries(e => [...e, ...(data || [])])
      }).catch(() => {})
  }
  useEffect(() => { load(0) }, [participantId])

  const filtered = entries
    .filter(e => !search || (e.whiskeyName || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'score') return (b.scores?.overall || 0) - (a.scores?.overall || 0)
      if (sort === 'name') return (a.whiskeyName || '').localeCompare(b.whiskeyName || '')
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.mwJournalTitle}</h1>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.mwJournalSearch}
        style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />

      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {([['date', 'Datum'], ['score', 'Score'], ['name', 'Name']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSort(id)} style={{ height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', background: sort === id ? th.gold : th.bgCard, color: sort === id ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: sort === id ? 700 : 400 }}>{label}</button>
        ))}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{t.mwJournalEmpty}</div>}

      {filtered.map(entry => {
        const score = entry.scores?.overall || entry.overallScore || 0
        const isOpen = expanded === entry.id
        return (
          <div key={entry.id} style={{ borderBottom: `1px solid ${th.border}` }}>
            <button onClick={() => setExpanded(isOpen ? null : entry.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700, color: th.text }}>{entry.whiskeyName || '—'}</div>
                <div style={{ fontSize: 12, color: th.faint, marginTop: 2 }}>
                  {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('de') : ''}
                  {entry.region ? ` · ${entry.region}` : ''}
                  {entry.caskType ? ` · ${entry.caskType}` : ''}
                </div>
              </div>
              {score > 0 && <span style={{ fontSize: 22, fontWeight: 700, color: score >= 85 ? th.gold : score >= 75 ? th.green : th.muted }}>{score}</span>}
              <Icon.ChevronDown color={th.faint} size={16} />
            </button>
            {isOpen && (
              <div style={{ paddingBottom: SP.md, paddingLeft: 4 }}>
                {(['nose', 'palate', 'finish', 'overall'] as const).map(dim => {
                  const s = entry.scores?.[dim]
                  if (!s) return null
                  const labels = { nose: t.ratingNose, palate: t.ratingPalate, finish: t.ratingFinish, overall: t.ratingOverall }
                  return (
                    <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: th.faint, width: 60 }}>{labels[dim]}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: th.border, overflow: 'hidden' }}>
                        <div style={{ width: `${((s - 60) / 40) * 100}%`, height: '100%', background: th.phases[dim].accent }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: th.phases[dim].accent, width: 28 }}>{s}</span>
                    </div>
                  )
                })}
                {entry.notes && typeof entry.notes === 'object' && Object.entries(entry.notes).some(([, v]) => v) && (
                  <div style={{ marginTop: SP.sm, fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontStyle: 'italic', color: th.muted, lineHeight: 1.5 }}>
                    {Object.values(entry.notes).filter(Boolean).join(' · ')}
                  </div>
                )}
                {entry.flavorTags && typeof entry.flavorTags === 'object' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: SP.xs }}>
                    {Object.values(entry.flavorTags).flat().filter(Boolean).slice(0, 8).map((tag: any, i) => (
                      <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${th.gold}15`, color: th.gold }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {entries.length >= 20 && (
        <button onClick={() => { const next = offset + 20; setOffset(next); load(next) }}
          style={{ width: '100%', height: 44, borderRadius: 14, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14, marginTop: SP.md }}>
          Mehr laden
        </button>
      )}
    </div>
  )
}

// ── TastingCalendar ─────────────────────────────────────────────────────────
const TastingCalendar: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [events, setEvents]     = useState<any[]>([])
  const [currentDate, setDate]  = useState(new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter]     = useState<'all' | 'mine' | 'friends'>('all')

  useEffect(() => {
    fetch('/api/calendar', { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setEvents(data || [])).catch(() => {})
  }, [participantId])

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleDateString('de', { month: 'long', year: 'numeric' })

  const eventsByDay: Record<number, any[]> = {}
  events.forEach(e => {
    if (!e.date) return
    const d = new Date(e.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!eventsByDay[day]) eventsByDay[day] = []
      eventsByDay[day].push(e)
    }
  })

  const selectedEvents = selected ? (eventsByDay[parseInt(selected)] || []) : []
  const statusColor = (s: string) => s === 'open' ? th.green : s === 'closed' ? th.gold : th.faint

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, margin: 0 }}>{monthName}</h1>
        <div style={{ display: 'flex', gap: SP.xs }}>
          <button onClick={() => setDate(new Date(year, month - 1, 1))} style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${th.border}`, background: 'none', cursor: 'pointer', color: th.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Back color={th.muted} size={14} /></button>
          <button onClick={() => setDate(new Date(year, month + 1, 1))} style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${th.border}`, background: 'none', cursor: 'pointer', color: th.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.ChevronRight color={th.muted} size={14} /></button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {([['all', t.mwCalendarAll], ['mine', t.mwCalendarMine], ['friends', t.mwCalendarFriends]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ flex: 1, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', background: filter === id ? th.gold : th.bgCard, color: filter === id ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: filter === id ? 700 : 400 }}>{label}</button>
        ))}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: SP.xs }}>
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: th.faint, padding: '4px 0' }}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: SP.md }}>
        {Array.from({ length: (firstDay === 0 ? 6 : firstDay - 1) }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = eventsByDay[day] || []
          const isSelected = selected === String(day)
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
          return (
            <button key={day} onClick={() => setSelected(isSelected ? null : String(day))} style={{ aspectRatio: '1', borderRadius: 10, border: `1px solid ${isSelected ? th.gold : th.border}`, background: isSelected ? `${th.gold}15` : isToday ? `${th.phases.nose.dim}` : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? th.gold : th.text }}>{day}</span>
              {dayEvents.length > 0 && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {dayEvents.slice(0, 3).map((e, ei) => <div key={ei} style={{ width: 5, height: 5, borderRadius: 2.5, background: statusColor(e.status) }} />)}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day events */}
      {selectedEvents.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selected}. {monthName.split(' ')[0]}</div>
          {selectedEvents.map((e, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{e.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${statusColor(e.status)}15`, color: statusColor(e.status) }}>{e.status}</span>
              </div>
              {e.location && <div style={{ fontSize: 12, color: th.faint, marginTop: 4 }}>{e.location}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── ProfileEdit ─────────────────────────────────────────────────────────────
const ProfileEdit: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [name, setName]   = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/participants/${participantId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(p => setName(p.name || '')).catch(() => {})
  }, [participantId])

  const save = async () => {
    await fetch(`/api/participants/${participantId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ name }) })
    setSaved(true); setTimeout(() => { setSaved(false); onBack() }, 1000)
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 120 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>{t.mwProfileEdit}</h1>
      <div style={{ marginBottom: SP.md }}>
        <label style={{ fontSize: 11, color: th.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.mwProfileName}</label>
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 16, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
      </div>
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button onClick={save} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: saved ? th.bgCard : `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: saved ? th.green : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saved ? <><Icon.Check color={th.green} size={20} />{t.ratingDone}</> : t.mwProfileSave}
        </button>
      </div>
    </div>
  )
}

// ── MeineWeltHub ─────────────────────────────────────────────────────────────
const MeineWeltHub: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onNav: (s: string) => void }> = ({ th, t, participantId, onNav }) => {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!participantId) return
    fetch(`/api/participants/${participantId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setProfile).catch(() => {})
  }, [participantId])

  const ratingCount = profile?.ratingCount || 0
  const navItems = [
    { id: 'profile',    icon: <Icon.Profile color={th.phases.nose.accent} size={28} />,     label: t.mwProfileTitle,   phase: 'nose'    as const },
    { id: 'analytics',  icon: <Icon.Analytics color={th.phases.palate.accent} size={28} />,  label: t.mwAnalyticsTitle, phase: 'palate'  as const },
    { id: 'wheel',      icon: <Icon.Report color={th.phases.finish.accent} size={28} />,      label: t.mwWheelTitle,     phase: 'finish'  as const },
    { id: 'journal',    icon: <Icon.Journal color={th.phases.overall.accent} size={28} />,    label: t.mwJournalTitle,   phase: 'overall' as const },
    { id: 'compare',    icon: <Icon.Compare color={th.phases.nose.accent} size={28} />,       label: t.mwCompareTitle,   phase: 'nose'    as const },
    { id: 'connoisseur', icon: <Icon.Report color={th.phases.finish.accent} size={28} />,      label: 'Connoisseur Report', phase: 'finish'  as const },
    { id: 'ai-curation', icon: <Icon.Insight color={th.phases.nose.accent} size={28} />,     label: 'KI-Kuration',        phase: 'nose'    as const },
    { id: 'reco',       icon: <Icon.Star color={th.phases.palate.accent} size={28} />,        label: t.mwRecoTitle,      phase: 'palate'  as const },
    { id: 'connoisseur',icon: <Icon.Report color={th.phases.finish.accent} size={28} />,     label: 'Connoisseur Report',phase: 'finish' as const },
    { id: 'curation',   icon: <Icon.Insight color={th.phases.overall.accent} size={28} />,   label: 'KI-Kuration',      phase: 'overall' as const },
    { id: 'benchmark',  icon: <Icon.BookOpen color={th.phases.nose.accent} size={28} />,     label: 'Benchmark',        phase: 'nose'    as const },
    { id: 'collection', icon: <Icon.Analytics color={th.phases.palate.accent} size={28} />,  label: 'Collection',       phase: 'palate'  as const },
    { id: 'collection', icon: <Icon.Whisky color={th.phases.overall.accent} size={28} />,    label: 'Collection Sync', phase: 'overall' as const },
    { id: 'calendar',   icon: <Icon.Calendar color={th.phases.finish.accent} size={28} />,    label: t.mwCalendarTitle,  phase: 'finish'  as const },
  ]

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.lg }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: 0 }}>{t.mwTitle}</h1>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, margin: `${SP.xs}px 0 0` }}>{t.mwSub}</p>
        </div>
        <button onClick={() => onNav('edit')} style={{ background: 'none', border: `1px solid ${th.border}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: th.muted, fontSize: 13 }}>{t.mwProfileEdit}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { label: t.mwStatTastings, value: profile?.tastingCount || '—' },
          { label: t.mwStatRatings,  value: ratingCount || '—' },
          { label: t.mwStatAvg,      value: profile?.avgScore ? Math.round(profile.avgScore) : '—' },
          { label: t.mwStatActivity, value: profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—' },
        ].map((s, i) => (
          <div key={i} style={{ height: 64, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: th.gold, lineHeight: 1 }}>{s.value}</span>
            <span style={{ fontSize: 11, color: th.faint }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Unlock progress */}
      {ratingCount < 10 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.sm }}>
            <span style={{ fontSize: 13, color: th.muted }}>{t.mwUnlockAt}</span>
            <span style={{ fontSize: 13, color: th.gold }}>{Math.min(ratingCount, 10)}/10</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(ratingCount, 10) * 10}%`, height: '100%', background: th.phases.overall.accent }} />
          </div>
          <div style={{ fontSize: 12, color: th.faint, marginTop: SP.xs }}>{t.mwUnlockProgress.replace('{n}', String(Math.max(0, 10 - ratingCount)))}</div>
        </div>
      )}

      {/* Nav grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{ height: 88, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = th.phases[item.phase].dim; (e.currentTarget as HTMLElement).style.borderColor = th.phases[item.phase].accent }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = th.bgCard; (e.currentTarget as HTMLElement).style.borderColor = th.border }}>
            {item.icon}
            <span style={{ fontSize: 12, color: th.muted, fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── MeineWeltScreen (Root) ───────────────────────────────────────────────────
interface Props { th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en' }

export const MeineWeltScreen: React.FC<Props> = ({ th, t, participantId, lang }) => {
  const [sub, setSub] = useState<string | null>(null)
  const goBack = () => setSub(null)

  if (sub === 'profile')   return <TasteProfile th={th} t={t} participantId={participantId} lang={lang} onBack={goBack} />
  if (sub === 'analytics') return <TasteAnalytics th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'wheel')     return <FlavourWheel th={th} t={t} participantId={participantId} lang={lang} onBack={goBack} />
  if (sub === 'connoisseur') return <ConnoisseurReport th={th} t={t} participantId={participantId} lang={lang} onBack={goBack} />
  if (sub === 'ai-curation') return <AICuration th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'compare')   return <WhiskyCompare th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'reco')      return <Recommendations th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'journal')   return <JournalList th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'calendar')  return <TastingCalendar th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'edit')       return <ProfileEdit th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'connoisseur') return <ConnoisseurReport th={th} t={t} participantId={participantId} lang={lang} onBack={goBack} />
  if (sub === 'curation')  return <AICuration th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'benchmark') return <Benchmark th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'collection')return <CollectionAnalysis th={th} t={t} participantId={participantId} onBack={goBack} />

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <MeineWeltHub th={th} t={t} participantId={participantId} onNav={setSub} />
    </div>
  )
}
