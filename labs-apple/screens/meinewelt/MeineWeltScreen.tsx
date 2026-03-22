// CaskSense Apple — MeineWeltScreen (Phase 7)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import * as Icon from '../icons/Icons'

// ── MeineWeltHub ──────────────────────────────────────────────────────────
const MeineWeltHub: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onNav: (screen: string) => void }> = ({ th, t, participantId, onNav }) => {
  const [profile, setProfile] = useState<any>(null)
  const [flavor, setFlavor]   = useState<any>(null)

  useEffect(() => {
    if (!participantId) return
    Promise.all([
      fetch(`/api/participants/${participantId}`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/participants/${participantId}/flavor-profile`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
    ]).then(([p, f]) => { setProfile(p); setFlavor(f) }).catch(() => {})
  }, [participantId])

  const ratingCount = profile?.ratingCount || 0
  const unlockProgress = Math.min(ratingCount, 10)

  const navItems = [
    { id: 'profile',   icon: <Icon.Profile color={th.phases.nose.accent} size={28} />,    label: t.mwProfileTitle,   phaseId: 'nose'    as const },
    { id: 'analytics', icon: <Icon.Analytics color={th.phases.palate.accent} size={28} />, label: t.mwAnalyticsTitle, phaseId: 'palate'  as const },
    { id: 'connoisseur',icon: <Icon.Report color={th.phases.finish.accent} size={28} />,   label: t.connoisseurTitle, phaseId: 'finish'  as const },
    { id: 'journal',   icon: <Icon.Journal color={th.phases.overall.accent} size={28} />,  label: t.mwJournalTitle,   phaseId: 'overall' as const },
    { id: 'compare',   icon: <Icon.Compare color={th.phases.nose.accent} size={28} />,     label: t.mwCompareTitle,   phaseId: 'nose'    as const },
    { id: 'calendar',  icon: <Icon.Calendar color={th.phases.palate.accent} size={28} />,  label: t.mwCalendarTitle,  phaseId: 'palate'  as const },
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

      {/* Stats 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { label: t.mwStatTastings, value: profile?.tastingCount || '—' },
          { label: t.mwStatRatings,  value: ratingCount || '—' },
          { label: t.mwStatAvg,      value: profile?.avgScore ? Math.round(profile.avgScore) : '—' },
          { label: t.mwStatActivity, value: profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—' },
        ].map((stat, i) => (
          <div key={i} style={{ height: 64, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: th.gold, lineHeight: 1 }}>{stat.value}</span>
            <span style={{ fontSize: 11, color: th.faint }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Unlock progress */}
      {ratingCount < 10 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.sm }}>
            <span style={{ fontSize: 13, color: th.muted }}>{t.mwUnlockAt}</span>
            <span style={{ fontSize: 13, color: th.gold }}>{unlockProgress}/10</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
            <div style={{ width: `${unlockProgress * 10}%`, height: '100%', background: th.phases.overall.accent, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: th.faint, marginTop: SP.xs }}>{t.mwUnlockProgress.replace('{n}', String(10 - unlockProgress))}</div>
        </div>
      )}

      {/* Nav grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{ height: 88, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = th.phases[item.phaseId].dim; (e.currentTarget as HTMLElement).style.borderColor = th.phases[item.phaseId].accent }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = th.bgCard; (e.currentTarget as HTMLElement).style.borderColor = th.border }}
          >
            {item.icon}
            <span style={{ fontSize: 12, color: th.muted, fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── JournalList ────────────────────────────────────────────────────────────
const JournalList: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [entries, setEntries] = useState<any[]>([])
  const [search, setSearch]   = useState('')

  useEffect(() => {
    fetch(`/api/journal?limit=20&offset=0`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setEntries(data || [])).catch(() => {})
  }, [participantId])

  const filtered = entries.filter(e => !search || (e.whiskeyName || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.mwJournalTitle}</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.mwJournalSearch} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{t.mwJournalEmpty}</div>}
      {filtered.map((entry, i) => {
        const overallScore = entry.scores?.overall || entry.overallScore || 0
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${th.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontWeight: 700 }}>{entry.whiskeyName || '—'}</div>
              <div style={{ fontSize: 12, color: th.faint, marginTop: 2 }}>{entry.date ? new Date(entry.date).toLocaleDateString() : ''}{entry.region ? ` · ${entry.region}` : ''}</div>
            </div>
            {overallScore > 0 && <span style={{ fontSize: 22, fontWeight: 700, color: overallScore >= 85 ? '#d4a847' : overallScore >= 75 ? '#86c678' : th.muted }}>{overallScore}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── TasteProfile ──────────────────────────────────────────────────────────
const TasteProfile: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [profile, setProfile] = useState<any>(null)
  const [compareMode, setCompare] = useState<'me' | 'friends' | 'global'>('me')

  useEffect(() => {
    fetch(`/api/participants/${participantId}/flavor-profile`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setProfile).catch(() => {})
  }, [participantId])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.sm}px` }}>{t.mwProfileTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.mwProfileSub}</p>

      <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.lg }}>
        {([['me', t.mwJustMe], ['friends', t.mwFriends], ['global', t.mwGlobal]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setCompare(id)} style={{ flex: 1, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', background: compareMode === id ? th.gold : th.bgCard, color: compareMode === id ? '#1a0f00' : th.muted, fontSize: 13, fontWeight: compareMode === id ? 700 : 400, transition: 'all 150ms' }}>{label}</button>
        ))}
      </div>

      {/* Dimension bars */}
      {(['nose', 'palate', 'finish', 'overall'] as const).map(dim => {
        const score = profile?.dimensions?.[dim] || 75
        const pct = ((score - 60) / 40) * 100
        const pt = th.phases[dim]
        const labels = { nose: t.ratingNose, palate: t.ratingPalate, finish: t.ratingFinish, overall: t.ratingOverall }
        return (
          <div key={dim} style={{ marginBottom: SP.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: th.muted }}>{labels[dim]}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: pt.accent }}>{score}</span>
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

// ── ProfileEdit ────────────────────────────────────────────────────────────
const ProfileEdit: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [name, setName] = useState('')
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
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>{t.mwProfileEdit}</h1>
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

// ── MeineWeltScreen ────────────────────────────────────────────────────────
interface Props { th: ThemeTokens; t: Translations; participantId: string }

export const MeineWeltScreen: React.FC<Props> = ({ th, t, participantId }) => {
  const [sub, setSub] = useState<string | null>(null)

  const goBack = () => setSub(null)

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      {sub === null     && <MeineWeltHub th={th} t={t} participantId={participantId} onNav={setSub} />}
      {sub === 'profile' && <TasteProfile th={th} t={t} participantId={participantId} onBack={goBack} />}
      {sub === 'journal' && <JournalList th={th} t={t} participantId={participantId} onBack={goBack} />}
      {sub === 'edit'   && <ProfileEdit th={th} t={t} participantId={participantId} onBack={goBack} />}
      {/* Other sub-screens render as placeholder */}
      {sub && !['profile', 'journal', 'edit'].includes(sub) && (
        <div style={{ padding: SP.md, paddingBottom: 80 }}>
          <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
          <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Coming soon…</div>
        </div>
      )}
    </div>
  )
}
