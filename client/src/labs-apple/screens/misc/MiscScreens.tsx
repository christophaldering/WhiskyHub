// CaskSense Apple — Phase D+E+F: Vocabulary, Research, MakingOf, AdminScreen
// SoloVoiceMemo und BarcodeScanner werden direkt in SoloFlow.tsx eingebettet

import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

// ─────────────────────────────────────────────────────────────────────────────
// VOCABULARY / TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
const VOCAB_CARDS = [
  { style: 'Islay', color: '#6e7a7a', nose: 'Torfrauch, Jod, Asche, Meeresbrise, Teer', palate: 'Rauchig, salzig, medizinisch, würzig, phenolisch', finish: 'Lang, trocken, rauchig, mineralisch' },
  { style: 'Speyside', color: '#c8a46e', nose: 'Heather, Honig, Vanille, frische Früchte, dezente Sherry-Noten', palate: 'Cremig, fruchtig, elegant, malzig, nussig', finish: 'Mittellang, warm, leicht süß, sanft würzig' },
  { style: 'Highland', color: '#8b6914', nose: 'Heidekraut, Trockenfrüchte, Nüsse, Leder, Holz', palate: 'Vollmundig, würzig, erdig, malzig mit Fruchtakzenten', finish: 'Lang, trocken, Eichenholz, leicht würzig' },
  { style: 'Sherry Cask', color: '#a05010', nose: 'Rosinen, Pflaumen, Weihnachtsgewürze, dunkle Früchte, Kakao', palate: 'Reich, vollmundig, Trockenfrüchte, Schokolade, Zimt', finish: 'Lang, warm, Sherry, Trockenfrüchte, Gewürze' },
  { style: 'Bourbon Cask', color: '#e8a84a', nose: 'Vanille, Karamell, Kokosnuss, frische Eiche, Früchte', palate: 'Süß, vanillig, leicht butterig, fruchtig', finish: 'Mittellang, süßlich, Vanille, mild würzig' },
  { style: 'Japanese', color: '#d4a0c8', nose: 'Delikat, blumig, tropische Früchte, helles Holz, Reis', palate: 'Elegant, ausgewogen, leicht, Pflaume, Sandelholz', finish: 'Mittellang, seidig, zart, nachhaltig' },
  { style: 'Irish', color: '#97c459', nose: 'Frisch, leicht, Zitrus, Vanille, Apfel, dezente Malznoten', palate: 'Weich, cremig, fruchtig, floral, mild süß', finish: 'Kurz bis mittel, weich, angenehm' },
  { style: 'Bourbon/Rye USA', color: '#e85d24', nose: 'Mais, Vanille, Eichenholz, Karamell, Gewürze', palate: 'Süß, vollmundig, Mais, Pfeffer, Vanille, Eiche', finish: 'Lang, warm, Eiche, Gewürze, Vanille' },
]

interface VocabProps { th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }

export const Vocabulary: React.FC<VocabProps> = ({ th, t, lang, onBack }) => {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    try { navigator.clipboard.writeText(text) } catch { }
    setCopied(key); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Vokabular & Templates</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Copy-Paste Tasting-Notizen nach Stil — tippe auf eine Zeile zum Kopieren.</p>

      {VOCAB_CARDS.map(card => (
        <div key={card.style} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: SP.sm }}>
          <button onClick={() => setExpanded(expanded === card.style ? null : card.style)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: card.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: th.text, textAlign: 'left' }}>{card.style}</span>
            <Icon.ChevronDown color={th.faint} size={16} />
          </button>
          {expanded === card.style && (
            <div style={{ borderTop: `1px solid ${th.border}` }}>
              {[['Nase', card.nose, 'nose'], ['Gaumen', card.palate, 'palate'], ['Abgang', card.finish, 'finish']].map(([label, text, key]) => (
                <button key={key} onClick={() => copy(text as string, card.style + key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: copied === card.style + key ? `${th.green}10` : 'none', border: 'none', cursor: 'pointer', borderBottom: key !== 'finish' ? `1px solid ${th.border}` : 'none', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, color: th.faint, width: 48, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                  <span style={{ flex: 1, fontSize: 13, color: th.muted, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', lineHeight: 1.4 }}>{text}</span>
                  {copied === card.style + key ? <Icon.Check color={th.green} size={14} /> : <Icon.Copy color={th.faint} size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCH / RABBIT HOLE
// ─────────────────────────────────────────────────────────────────────────────
const RABBIT_HOLE = [
  { title: 'Bewertungsmodelle', sub: 'Wie Score-Skalen funktionieren', items: ['Parker vs 100-Punkt-Skala', 'Whisky Magazine Methodik', 'Jim Murray Ansatz', 'CaskSense Score-Normalisierung', 'Was eine Standardabweichung bedeutet'] },
  { title: 'Sensorik & Wahrnehmung', sub: 'Die Wissenschaft des Riechens', items: ['Retronasal vs orthonasal', 'Wie das Gehirn Aromen erkennt', 'Anosmie und Supertaster', 'Einfluss der Temperatur auf Aromen', 'Warum Hunger die Wahrnehmung verändert'] },
  { title: 'Destillation & Reifung', sub: 'Vom Korn zum Glas', items: ['Pot Still vs Column Still', 'Maischen, Gären, Brennen', 'Angel\'s Share — was das Fass nimmt', 'Einfluss des Holzes auf den Geschmack', 'Doppelreifung und Finishing'] },
  { title: 'Statistik & Verkostung', sub: 'Zahlen hinter den Scores', items: ['Blindverkostung vs offene Verkostung', 'Reihenfolgeeffekte erkennen', 'Regression zur Mitte', 'Wie Gruppenscores entstehen', 'Was "Konsens" bei einer Verkostung bedeutet'] },
  { title: 'Regionen & Terroir', sub: 'Geographie des Geschmacks', items: ['Bedeutet Region wirklich Geschmack?', 'Wasserqualität und ihr Einfluss', 'Klimaeinfluss auf die Reifung', 'Schottland vs Japan vs USA', 'GI-Schutz für Whisky-Bezeichnungen'] },
]

interface ResearchProps { th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }

export const Research: React.FC<ResearchProps> = ({ th, t, lang, onBack }) => {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Research & Deep Dives</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Die Wissenschaft und Statistik hinter der Verkostung.</p>

      {RABBIT_HOLE.map(section => (
        <div key={section.title} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: SP.sm }}>
          <button onClick={() => setExpanded(expanded === section.title ? null : section.title)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon.BookOpen color={th.phases.palate.accent} size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: th.text }}>{section.title}</div>
              <div style={{ fontSize: 12, color: th.faint }}>{section.sub}</div>
            </div>
            <Icon.ChevronDown color={th.faint} size={16} />
          </button>
          {expanded === section.title && (
            <div style={{ borderTop: `1px solid ${th.border}`, padding: `${SP.sm}px ${SP.md}px ${SP.md}px` }}>
              {section.items.map((item, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < section.items.length - 1 ? `1px solid ${th.border}` : 'none', fontSize: 14, color: th.muted, fontFamily: 'Cormorant Garamond, serif', lineHeight: 1.5 }}>
                  · {item}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAKING-OF TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
interface MakingOfProps { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const MakingOf: React.FC<MakingOfProps> = ({ th, t, participantId, onBack }) => {
  const [timeline, setTimeline] = useState<any[]>([])
  const [access, setAccess]     = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/making-of', { headers: { 'x-participant-id': participantId } })
      .then(r => { if (r.status === 403) { setAccess(false); return null } return r.json() })
      .then(d => { if (d) { setTimeline(d); setAccess(true) } })
      .catch(() => setAccess(false))
  }, [participantId])

  if (access === false) return (
    <div style={{ padding: SP.md }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <div style={{ textAlign: 'center', padding: SP.xl }}>
        <Icon.Lock color={th.faint} size={36} />
        <div style={{ fontSize: 16, color: th.muted, marginTop: SP.md }}>Diese Seite ist nur für ausgewählte Mitglieder.</div>
      </div>
    </div>
  )

  if (access === null) return <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Making of CaskSense</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px`, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Die Geschichte hinter der App — von der ersten Idee bis heute.</p>

      {timeline.map((chapter: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: SP.md, marginBottom: SP.xl, animation: `fadeUp 400ms ease ${i * 100}ms both` }}>
          {/* Timeline line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg, ${th.gold}, #c47a3a)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1a0f00' }}>{i + 1}</div>
            {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(${th.gold}, transparent)`, marginTop: 4, minHeight: 40 }} />}
          </div>
          <div style={{ flex: 1, paddingTop: 8 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, color: th.gold, marginBottom: SP.xs }}>{chapter.title}</div>
            <div style={{ fontSize: 11, color: th.faint, marginBottom: SP.sm }}>{chapter.date}</div>
            <div style={{ fontSize: 15, color: th.muted, lineHeight: 1.6, fontFamily: 'Cormorant Garamond, serif' }}>{chapter.text}</div>
            {chapter.stats && (
              <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.sm, flexWrap: 'wrap' }}>
                {Object.entries(chapter.stats).map(([k, v]) => (
                  <div key={k} style={{ background: `${th.gold}15`, border: `1px solid ${th.gold}30`, borderRadius: 10, padding: '4px 12px' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: th.gold }}>{v as string}</span>
                    <span style={{ fontSize: 11, color: th.faint, marginLeft: 4 }}>{k}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface AdminProps { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const AdminScreen: React.FC<AdminProps> = ({ th, t, participantId, onBack }) => {
  const [tab, setTab]       = useState<'participants' | 'sessions' | 'flavour'>('participants')
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/admin/activity-summary', { headers: { 'x-participant-id': participantId } })
      .then(r => { if (r.status === 403) { setIsAdmin(false); return null } return r.json() })
      .then(d => { if (d) { setData(d); setIsAdmin(true) } })
      .catch(() => setIsAdmin(false))
  }, [participantId])

  if (isAdmin === false) return (
    <div style={{ padding: SP.md }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15 }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <div style={{ textAlign: 'center', padding: SP.xl }}>
        <Icon.Lock color={th.faint} size={36} />
        <div style={{ fontSize: 16, color: th.muted, marginTop: SP.md }}>Kein Admin-Zugriff.</div>
      </div>
    </div>
  )

  if (isAdmin === null) return <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>

  const stats = data || {}

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>Admin</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { label: 'Aktive Nutzer', value: stats.activeUsers || '—' },
          { label: 'Sessions heute', value: stats.totalSessions || '—' },
          { label: 'Ø Sitzungsdauer', value: stats.avgDuration ? `${Math.round(stats.avgDuration / 60)}m` : '—' },
          { label: 'Gesamtzeit', value: stats.totalTime ? `${Math.round(stats.totalTime / 3600)}h` : '—' },
        ].map((s, i) => (
          <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: th.gold }}>{s.value}</div>
            <div style={{ fontSize: 11, color: th.faint }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {(['participants', 'sessions', 'flavour'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', background: tab === tb ? th.gold : th.bgCard, color: tab === tb ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: tab === tb ? 700 : 400 }}>
            {tb === 'participants' ? 'Nutzer' : tb === 'sessions' ? 'Sessions' : 'Aromen'}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <div>
          {(stats.topUsers || []).map((u: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
              <div>
                <div style={{ fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: th.faint }}>{u.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: th.gold }}>{u.sessions} Sessions</div>
                <div style={{ fontSize: 11, color: th.faint }}>{u.emailVerified ? 'Verifiziert' : 'Nicht verifiziert'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
          <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>Tägliche Aktivität (letzte 14 Tage)</div>
          {(stats.dailyChart || []).map((d: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: th.faint, width: 40 }}>{d.date?.slice(5) || ''}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: th.border, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((d.count / (stats.maxDay || 1)) * 100, 100)}%`, height: '100%', background: th.gold }} />
              </div>
              <span style={{ fontSize: 11, color: th.gold, width: 20 }}>{d.count}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'flavour' && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
          <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.sm }}>Flavour-Kategorien werden über die Admin-API verwaltet.</div>
          <div style={{ fontSize: 12, color: th.faint }}>POST /api/admin/flavour-seed — Seed aus hardcoded Daten</div>
          <button onClick={async () => {
            const res = await fetch('/api/admin/flavour-seed', { method: 'POST', headers: { 'x-participant-id': participantId } })
            alert(res.ok ? 'Seed erfolgreich' : 'Fehler')
          }} style={{ marginTop: SP.md, height: 44, padding: '0 20px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}>
            Flavour-Daten neu einspielen
          </button>
        </div>
      )}
    </div>
  )
}
