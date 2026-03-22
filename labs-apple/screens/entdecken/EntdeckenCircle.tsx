// CaskSense Apple — EntdeckenScreen + CircleScreen (Phase 8)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import * as Icon from '../icons/Icons'

// ── EntdeckenHub ──────────────────────────────────────────────────────────
const EntdeckenHub: React.FC<{ th: ThemeTokens; t: Translations; onNav: (s: string) => void }> = ({ th, t, onNav }) => {
  const items = [
    { id: 'explore', icon: <Icon.Whisky color={th.phases.palate.accent} size={28} />,   label: t.entExplore,   sub: t.entExploreSub,   phaseId: 'palate'  as const },
    { id: 'lexikon', icon: <Icon.BookOpen color={th.phases.nose.accent} size={28} />,    label: t.entLexikon,   sub: t.entLexikonSub,   phaseId: 'nose'    as const },
    { id: 'guide',   icon: <Icon.Report color={th.phases.finish.accent} size={28} />,    label: t.entGuide,     sub: t.entGuideSub,     phaseId: 'finish'  as const },
    { id: 'dest',    icon: <Icon.Distillery color={th.phases.overall.accent} size={28} />,label: t.entDest,     sub: t.entDestSub,      phaseId: 'overall' as const },
    { id: 'bottlers',icon: <Icon.Globe color={th.phases.nose.accent} size={28} />,       label: t.entBottlers,  sub: t.entBottlersSub,  phaseId: 'nose'    as const },
    { id: 'history', icon: <Icon.History color={th.phases.palate.accent} size={28} />,   label: t.entHistory,   sub: t.entHistorySub,   phaseId: 'palate'  as const },
  ]

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.entTitle}</h1>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.entSub}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
        {items.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left', transition: 'all 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = th.phases[item.phaseId].accent }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = th.border }}
          >
            {item.icon}
            <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>{item.label}</span>
            <span style={{ fontSize: 11, color: th.faint, lineHeight: 1.4 }}>{item.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── ExploreWhiskies ────────────────────────────────────────────────────────
const ExploreWhiskies: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('avg')

  useEffect(() => {
    fetch(`/api/labs/explore/whiskies?search=${search}&sort=${sort}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setWhiskies(data || [])).catch(() => {})
  }, [search, sort, participantId])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.entExplore}</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.entSearch} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {[['avg', t.entSortAvg], ['most', t.entSortMost], ['alpha', t.entSortAlpha]].map(([id, label]) => (
          <button key={id} onClick={() => setSort(id as string)} style={{ height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', background: sort === id ? th.gold : th.bgCard, color: sort === id ? '#1a0f00' : th.muted, fontSize: 13, fontWeight: sort === id ? 700 : 400 }}>{label}</button>
        ))}
      </div>
      {whiskies.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{w.name || w.whiskeyName}</div>
            <div style={{ fontSize: 12, color: th.faint, marginTop: 2 }}>{w.distillery}{w.region ? ` · ${w.region}` : ''}</div>
          </div>
          {w.avgScore && <span style={{ fontSize: 18, fontWeight: 700, color: '#d4a847' }}>{Math.round(w.avgScore)}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Simple Lexikon ─────────────────────────────────────────────────────────
const Lexikon: React.FC<{ th: ThemeTokens; t: Translations; onBack: () => void }> = ({ th, t, onBack }) => {
  const [search, setSearch] = useState('')
  const terms = [
    { term: 'Terroir', def: 'Einfluss von Umgebung, Klima und Geographie auf den Geschmack des Whiskys.' },
    { term: 'Dram', def: 'Ein Schluck oder eine Portion Whisky, typischerweise 25–40ml.' },
    { term: 'Cask Strength', def: 'Whisky direkt aus dem Fass, ohne Verdünnung. Oft über 55% ABV.' },
    { term: 'Single Malt', def: 'Malzwhisky aus einer einzigen Destillerie.' },
    { term: 'Blended', def: 'Mischung aus verschiedenen Whiskys (oft Malt + Grain).' },
    { term: 'ABV', def: 'Alcohol by Volume — Alkoholgehalt in Prozent.' },
    { term: 'NAS', def: 'No Age Statement — Whisky ohne Altersangabe.' },
    { term: 'Peated', def: 'Torfiger Whisky. Gerste wird mit Torfrauch getrocknet.' },
    { term: 'Finish', def: 'Der Nachgeschmack nach dem Schlucken. Wie lange und wie sich der Geschmack hält.' },
    { term: 'Nose', def: 'Die Nase — das Aromenspektrum, das man beim Riechen wahrnimmt.' },
  ]
  const filtered = terms.filter(t2 => !search || t2.term.toLowerCase().includes(search.toLowerCase()) || t2.def.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.entLexikon}</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.entLexSearch} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
      {filtered.map((entry, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: `1px solid ${th.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: th.gold, marginBottom: 4 }}>{entry.term}</div>
          <div style={{ fontSize: 14, color: th.muted, lineHeight: 1.5 }}>{entry.def}</div>
        </div>
      ))}
    </div>
  )
}

// ── EntdeckenScreen ────────────────────────────────────────────────────────
export const EntdeckenScreen: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [sub, setSub] = useState<string | null>(null)
  const goBack = () => setSub(null)

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      {sub === null      && <EntdeckenHub th={th} t={t} onNav={setSub} />}
      {sub === 'explore' && <ExploreWhiskies th={th} t={t} participantId={participantId} onBack={goBack} />}
      {sub === 'lexikon' && <Lexikon th={th} t={t} onBack={goBack} />}
      {sub && !['explore', 'lexikon'].includes(sub) && (
        <div style={{ padding: SP.md }}>
          <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
          <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Coming soon…</div>
        </div>
      )}
    </div>
  )
}

// ── Leaderboard ────────────────────────────────────────────────────────────
function hashAlias(id: string): string {
  const adjectives = ['Peated', 'Sherried', 'Smoky', 'Aged', 'Cask', 'Malty', 'Spiced', 'Golden']
  const nouns = ['Fox', 'Flask', 'Dram', 'Cask', 'Glen', 'Still', 'Barrel', 'Mash']
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return `${adjectives[Math.abs(h) % adjectives.length]} ${nouns[Math.abs(h >> 4) % nouns.length]}`
}

const Leaderboard: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [board, setBoard] = useState<any[]>([])
  const [myEntry, setMine] = useState<any>(null)

  useEffect(() => {
    fetch('/api/community/leaderboard', { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => {
        setBoard(data || [])
        setMine((data || []).find((e: any) => e.participantId === participantId))
      }).catch(() => {})
  }, [participantId])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      {myEntry && (
        <div style={{ background: `${th.gold}12`, border: `1px solid ${th.gold}44`, borderRadius: 20, padding: SP.lg, marginBottom: SP.lg, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t.circleYourRank}</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: th.gold, margin: '8px 0 4px' }}>#{myEntry.rank || '—'}</div>
          <div style={{ fontSize: 14, color: th.muted }}>{t.circlePercentile}: {myEntry.percentile || '—'}%</div>
        </div>
      )}
      {board.map((entry, i) => {
        const isMe = entry.participantId === participantId
        const isFriend = entry.isFriend
        const displayName = isMe ? (entry.name + ' (' + t.youLabel + ')') : isFriend ? entry.name : hashAlias(entry.participantId || String(i))
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
            <span style={{ fontSize: 14, color: th.faint, width: 24 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 400, color: isMe ? th.gold : th.text }}>{displayName}</div>
              {isFriend && <span style={{ fontSize: 10, color: th.green, background: `${th.green}15`, padding: '1px 6px', borderRadius: 8 }}>{t.circleFriend}</span>}
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: entry.avgScore >= 85 ? '#d4a847' : th.muted }}>{entry.avgScore ? Math.round(entry.avgScore) : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── FriendsTab ──────────────────────────────────────────────────────────────
const FriendsTab: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [friends, setFriends] = useState<any[]>([])
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/participants/${participantId}/friends`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setFriends(data || [])).catch(() => {})
  }, [participantId])

  const doSearch = async (q: string) => {
    setSearch(q)
    if (!q.trim()) { setResults([]); return }
    // Simple client-side filter from friends list for now
    setResults(friends.filter(f => f.name.toLowerCase().includes(q.toLowerCase())))
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <input value={search} onChange={e => doSearch(e.target.value)} placeholder={t.circleSearchFriend} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
      {friends.length === 0 && (
        <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{t.circleFeedEmpty}</div>
      )}
      {friends.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: th.phases.nose.accent }}>
            {(f.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
            <div style={{ fontSize: 12, color: th.faint }}>{f.online ? t.circleOnline : ''}</div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: f.online ? th.green : th.faint }} />
        </div>
      ))}
    </div>
  )
}

// ── CircleScreen ──────────────────────────────────────────────────────────
export const CircleScreen: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [tab, setTab] = useState<'friends' | 'board' | 'sessions' | 'feed'>('friends')
  const tabs: [typeof tab, string][] = [['friends', t.circleFriends], ['board', t.circleBoard], ['sessions', t.circleSessions], ['feed', t.circleFeed]]

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ padding: `${SP.lg}px ${SP.md}px ${SP.md}px` }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: 0 }}>{t.circleTitle}</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, margin: `${SP.xs}px 0 0` }}>{t.circleSub}</p>
      </div>

      {/* Segmented control */}
      <div style={{ display: 'flex', gap: SP.xs, padding: `0 ${SP.md}px ${SP.md}px`, overflowX: 'auto' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flexShrink: 0, height: 44, padding: '0 16px', borderRadius: 22, border: 'none', cursor: 'pointer', background: tab === id ? th.gold : th.bgCard, color: tab === id ? '#1a0f00' : th.muted, fontSize: 14, fontWeight: tab === id ? 700 : 400, transition: 'all 150ms' }}>{label}</button>
        ))}
      </div>

      {tab === 'friends'  && <FriendsTab th={th} t={t} participantId={participantId} />}
      {tab === 'board'    && <Leaderboard th={th} t={t} participantId={participantId} />}
      {tab === 'sessions' && <div style={{ padding: SP.md, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{t.circleSessions} — Coming soon.</div>}
      {tab === 'feed'     && <div style={{ padding: SP.md, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{t.circleFeedEmpty}</div>}
    </div>
  )
}
