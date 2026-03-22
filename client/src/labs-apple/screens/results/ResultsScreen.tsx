// CaskSense Apple — ResultsScreen (Phase 6)
// Fix: TastingRecap + SessionNarrative eingebunden statt Platzhalter
// Ablage: client/src/labs-apple/screens/results/ResultsScreen.tsx

import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { TastingRecap } from './TastingRecap'
import { SessionNarrative } from './SessionNarrative'
import * as Icon from '../../icons/Icons'

function avg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}
function getBandColor(s: number) {
  if (s >= 90) return '#d4a847'
  if (s >= 85) return '#c4a040'
  if (s >= 80) return '#86c678'
  if (s >= 70) return '#7ab8c4'
  return 'rgba(200,180,160,0.5)'
}

const MarkdownText: React.FC<{ text: string; th: ThemeTokens }> = ({ text, th }) => {
  const lines = text.split('\n')
  return (
    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, lineHeight: 1.7, color: th.text }}>
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, margin: '20px 0 8px' }}>{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: '24px 0 10px' }}>{line.slice(2)}</h2>
        if (line.startsWith('- '))
          return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>· {line.slice(2)}</div>
        if (!line.trim())
          return <div key={i} style={{ height: 12 }} />
        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
        return <p key={i} style={{ margin: '0 0 8px' }} dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </div>
  )
}

const InsightsTab: React.FC<{
  th: ThemeTokens
  t: Translations
  tastingId: string
  participantId: string
}> = ({ th, t, tastingId, participantId }) => {
  const [ratings, setRatings]   = useState<any[]>([])
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [activeTab, setActive]  = useState(0)

  useEffect(() => {
    const h = { 'x-participant-id': participantId }
    Promise.all([
      fetch(`/api/tastings/${tastingId}/ratings`,  { headers: h }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/whiskies`, { headers: h }).then(r => r.json()),
    ]).then(([r, w]) => { setRatings(r || []); setWhiskies(w || []) }).catch(() => {})
  }, [tastingId])

  const myRatings  = ratings.filter(r => r.participantId === participantId)
  const myOverall  = avg(myRatings.filter(r => r.dimension === 'overall').map(r => r.score))
  const allOverall = avg(ratings.filter(r => r.dimension === 'overall').map(r => r.score))
  const delta      = Math.round((myOverall - allOverall) * 10) / 10
  const tabs       = [t.resultsOverview, t.resultsVsGroup, t.resultsPriceSurp, t.resultsCaskProfile]

  return (
    <div>
      <div style={{ display: 'flex', gap: SP.xs, padding: `${SP.sm}px ${SP.md}px`, overflowX: 'auto' }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18,
            border: 'none', cursor: 'pointer', fontSize: 13, transition: 'all 150ms',
            background: activeTab === i ? th.gold : th.bgCard,
            color:      activeTab === i ? '#1a0f00' : th.muted,
            fontWeight: activeTab === i ? 700 : 400,
          }}>{tab}</button>
        ))}
      </div>

      <div style={{ padding: SP.md }}>
        {activeTab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
            {[
              { icon: <Icon.Star color={th.gold} size={20} />, label: t.resultsFavorite,
                value: myRatings.length > 0 ? whiskies.find(w => w.id === [...myRatings].filter(r => r.dimension === 'overall').sort((a, b) => b.score - a.score)[0]?.whiskeyId)?.name || '—' : '—' },
              { icon: <Icon.Trophy color={th.gold} size={20} />, label: t.resultsGroupWinner,
                value: allOverall > 0 ? `Ø ${Math.round(allOverall)}` : '—' },
              { icon: <Icon.Users color={th.muted} size={20} />, label: t.resultsMostDebated, value: '—' },
              { icon: <Icon.TrendUp color={th.green} size={20} />, label: t.resultsSurprise, value: '—' },
            ].map((card, i) => (
              <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
                {card.icon}
                <div style={{ fontSize: 11, color: th.muted, marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic' }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.md }}>{t.resultsInsight1}</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, marginBottom: SP.lg }}>
              {delta > 0 ? 'Du warst heute großzügiger als die Gruppe.' : delta < 0 ? 'Du warst heute kritischer als die Gruppe.' : 'Du lagst genau im Gruppen-Schnitt.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: getBandColor(myOverall) }}>{Math.round(myOverall) || '—'}</div>
                <div style={{ fontSize: 12, color: th.muted }}>{t.resultsYourAvg}</div>
              </div>
              <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, padding: '4px 12px', borderRadius: 12, background: delta >= 0 ? `${th.green}20` : 'rgba(200,60,60,0.15)', color: delta >= 0 ? th.green : '#e06060' }}>
                  {delta >= 0 ? '+' : ''}{delta}
                </span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: getBandColor(allOverall) }}>{Math.round(allOverall) || '—'}</div>
                <div style={{ fontSize: 12, color: th.muted }}>{t.resultsGroupAvg}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.md }}>{t.resultsInsight2}</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, marginBottom: SP.lg }}>{t.resultsPriceCorr}</div>
            {whiskies.map((w, i) => {
              const wAvg = Math.round(avg(ratings.filter(r => r.whiskeyId === w.id && r.dimension === 'overall').map(r => r.score)))
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: SP.sm, padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
                  <span style={{ width: 24, fontSize: 12, color: th.faint }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontSize: 14 }}>{w.name || `Sample ${i + 1}`}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: getBandColor(wAvg) }}>{wAvg || '—'}</span>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 3 && (
          <div>
            <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.md }}>{t.resultsInsight3}</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, marginBottom: SP.lg }}>Dein Gaumen in diesem Tasting.</div>
            {(['nose', 'palate', 'finish', 'overall'] as const).map(dim => {
              const dimAvg = Math.round(avg(myRatings.filter(r => r.dimension === dim).map(r => r.score)))
              const pct    = Math.max(0, ((dimAvg - 60) / 40) * 100)
              const pt     = th.phases[dim]
              const labels = { nose: t.ratingNose, palate: t.ratingPalate, finish: t.ratingFinish, overall: t.ratingOverall }
              return (
                <div key={dim} style={{ marginBottom: SP.md }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: th.muted }}>{labels[dim]}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: getBandColor(dimAvg) }}>{dimAvg || '—'}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pt.accent, transition: 'width 600ms ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: SP.md }}>
        {tabs.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ height: 8, width: activeTab === i ? 28 : 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: activeTab === i ? th.gold : th.faint, transition: 'all 200ms', padding: 0 }} />
        ))}
      </div>
    </div>
  )
}

const ConnoisseurReport: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [reports, setReports] = useState<any[]>([])
  const [active, setActive]   = useState<any | null>(null)
  const [generating, setGen]  = useState(false)
  const [activeTab, setTab]   = useState(0)
  const [lang, setLang]       = useState<'de' | 'en'>('de')

  useEffect(() => {
    fetch(`/api/participants/${participantId}/connoisseur-reports`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => { setReports(data || []); if (data?.[0]) setActive(data[0]) }).catch(() => {})
  }, [participantId])

  const generate = async () => {
    setGen(true)
    try {
      const res = await fetch(`/api/participants/${participantId}/connoisseur-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ language: lang }),
      })
      const data = await res.json(); setActive(data); setReports(r => [data, ...r])
    } catch { } finally { setGen(false) }
  }

  if (!active) return (
    <div style={{ padding: SP.lg, textAlign: 'center' }}>
      <Icon.Report color={th.faint} size={48} />
      <div style={{ fontSize: 15, color: th.muted, margin: `${SP.md}px 0` }}>{t.connoisseurTitle}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: SP.lg }}>
        {(['de', 'en'] as const).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ height: 36, padding: '0 16px', borderRadius: 18, border: `1px solid ${lang === l ? th.gold : th.border}`, background: lang === l ? `${th.gold}12` : 'none', color: lang === l ? th.gold : th.muted, cursor: 'pointer', fontSize: 13 }}>{l.toUpperCase()}</button>
        ))}
      </div>
      <button onClick={generate} disabled={generating} style={{ height: 52, padding: '0 28px', borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto', opacity: generating ? 0.6 : 1 }}>
        {generating ? <><Icon.Spinner color="#1a0f00" size={18} />{t.connoisseurLoading}</> : t.connoisseurGenerate}
      </button>
    </div>
  )

  const reportTabs = [t.connoisseurTabReport, t.connoisseurTabWhisky, t.connoisseurTabAroma, t.connoisseurTabHist]
  return (
    <div style={{ padding: SP.md }}>
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md, overflowX: 'auto' }}>
        {reportTabs.map((tab, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', fontSize: 13, background: activeTab === i ? th.gold : th.bgCard, color: activeTab === i ? '#1a0f00' : th.muted, fontWeight: activeTab === i ? 700 : 400 }}>{tab}</button>
        ))}
      </div>
      {activeTab === 0 && (active.content ? <MarkdownText text={active.content} th={th} /> : <div style={{ color: th.muted, fontStyle: 'italic' }}>—</div>)}
      {activeTab === 3 && reports.map((r, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${th.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>{new Date(r.createdAt).toLocaleDateString()}</span>
          <button onClick={() => setActive(r)} style={{ fontSize: 12, color: th.gold, background: 'none', border: 'none', cursor: 'pointer' }}>Anzeigen</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.lg }}>
        <button onClick={generate} disabled={generating} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${th.gold}44`, background: 'none', color: th.gold, cursor: 'pointer', fontSize: 13, opacity: generating ? 0.6 : 1 }}>{t.connoisseurRegen}</button>
      </div>
    </div>
  )
}

interface Props {
  th: ThemeTokens
  t: Translations
  tastingId: string
  participantId: string
  isHost: boolean
  lang?: 'de' | 'en'
}

export const ResultsScreen: React.FC<Props> = ({ th, t, tastingId, participantId, isHost, lang = 'de' }) => {
  const [activeTab, setTab] = useState(0)
  const tabs = [t.resultsTitle, t.recapTitle, t.connoisseurTitle, ...(isHost ? [t.narrativeTitle] : [])]

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ padding: `${SP.lg}px ${SP.md}px ${SP.md}px` }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: 0 }}>{t.resultsTitle}</h1>
      </div>
      <div style={{ display: 'flex', gap: SP.xs, padding: `0 ${SP.md}px ${SP.md}px`, overflowX: 'auto' }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, transition: 'all 150ms', background: activeTab === i ? th.gold : th.bgCard, color: activeTab === i ? '#1a0f00' : th.muted, fontWeight: activeTab === i ? 700 : 400 }}>{tab}</button>
        ))}
      </div>
      {activeTab === 0 && <InsightsTab th={th} t={t} tastingId={tastingId} participantId={participantId} />}
      {activeTab === 1 && <TastingRecap th={th} t={t} tastingId={tastingId} participantId={participantId} />}
      {activeTab === 2 && <ConnoisseurReport th={th} t={t} participantId={participantId} />}
      {activeTab === 3 && isHost && <SessionNarrative th={th} t={t} tastingId={tastingId} participantId={participantId} lang={lang} />}
    </div>
  )
}
