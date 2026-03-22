// CaskSense Apple — AI Features: AICuration + Benchmark + CollectionAnalysis (Phase C+D)

import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'
import { collectionApi } from '@/lib/api'
import { distilleries } from '@/data/distilleries'

// ─────────────────────────────────────────────────────────────────────────────
// AI CURATION
// ─────────────────────────────────────────────────────────────────────────────
interface CurationProps { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const AICuration: React.FC<CurationProps> = ({ th, t, participantId, onBack }) => {
  const [tastings, setTastings]   = useState<any[]>([])
  const [selected, setSelected]   = useState<string>('')
  const [results, setResults]     = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch(`/api/tastings?participantId=${participantId}&role=host`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setTastings(data || [])).catch(() => {})
  }, [participantId])

  const curate = async () => {
    if (!selected) return
    setLoading(true); setError(''); setResults([])
    try {
      const res = await fetch(`/api/tastings/${selected}/ai-curation`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ participantId }) })
      if (!res.ok) throw new Error((await res.json()).message || 'Fehler')
      const data = await res.json()
      setResults(data?.suggestions || data || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>KI-Kuration</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>KI schlägt passende Whiskies basierend auf deinem Lineup vor.</p>

      <div style={{ marginBottom: SP.lg }}>
        <label style={{ fontSize: 11, color: th.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tasting wählen</label>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '0 12px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}>
          <option value="">— Tasting auswählen —</option>
          {tastings.map(ta => <option key={ta.id} value={ta.id}>{ta.name}</option>)}
        </select>
      </div>

      {error && <div style={{ fontSize: 13, color: '#e06060', marginBottom: SP.md }}>{error}</div>}

      <button onClick={curate} disabled={!selected || loading} style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: !selected ? 'default' : 'pointer', background: !selected ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: !selected ? th.faint : '#1a0f00', fontSize: 16, fontWeight: 700, marginBottom: SP.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><Icon.Spinner color="#1a0f00" size={18} />Wird analysiert…</> : 'Vorschläge generieren'}
      </button>

      {results.map((r, i) => (
        <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.sm, animation: `fadeUp 300ms ease ${i * 60}ms both` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.xs }}>
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: th.faint }}>{r.distillery}{r.region ? ` · ${r.region}` : ''}</div>
            </div>
            {r.matchScore && <span style={{ fontSize: 22, fontWeight: 700, color: r.matchScore >= 85 ? th.gold : th.muted }}>{r.matchScore}%</span>}
          </div>
          {r.reason && <div style={{ fontSize: 14, color: th.muted, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', lineHeight: 1.5 }}>{r.reason}</div>}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK / WISHLIST
// ─────────────────────────────────────────────────────────────────────────────
interface BenchmarkProps { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const Benchmark: React.FC<BenchmarkProps> = ({ th, t, participantId, onBack }) => {
  const [tab, setTab]         = useState<'all' | 'wishlist' | 'journal'>('all')
  const [entries, setEntries] = useState<any[]>([])
  const [text, setText]       = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [error, setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadEntries = () => {
    fetch(`/api/participants/${participantId}/benchmark`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(d => setEntries(d || [])).catch(() => {})
  }
  useEffect(() => { loadEntries() }, [participantId])

  const analyze = async () => {
    if (!text.trim()) return
    setAnalyzing(true); setError(''); setSuggestions([])
    try {
      const res = await fetch(`/api/participants/${participantId}/benchmark/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ text })
      })
      if (!res.ok) throw new Error((await res.json()).message || 'Fehler')
      const data = await res.json()
      setSuggestions(data?.entries || data || [])
    } catch (e: any) { setError(e.message) }
    finally { setAnalyzing(false) }
  }

  const handleFile = async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/participants/${participantId}/benchmark/analyze`, { method: 'POST', headers: { 'x-participant-id': participantId }, body: fd })
      const data = await res.json(); setSuggestions(data?.entries || data || [])
    } catch { } finally { setAnalyzing(false) }
  }

  const saveEntry = async (entry: any, dest: 'wishlist' | 'journal') => {
    await fetch(`/api/participants/${participantId}/benchmark`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ ...entry, type: dest }) })
    loadEntries()
    setSuggestions(s => s.filter(x => x !== entry))
  }

  const filtered = tab === 'all' ? entries : entries.filter(e => e.type === tab)

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Benchmark & Wishlist</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Text oder PDF einfügen — KI extrahiert Whiskies und du klassifizierst sie.</p>

      {/* Input */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Füge eine Whisky-Liste, Rezension oder Notizen ein…" rows={4}
          style={{ width: '100%', borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '10px 12px', resize: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
        <div style={{ display: 'flex', gap: SP.sm }}>
          <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.bgCard, color: th.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Upload color={th.muted} size={16} />PDF
          </button>
          <button onClick={analyze} disabled={!text.trim() || analyzing} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', cursor: !text.trim() ? 'default' : 'pointer', background: !text.trim() ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: !text.trim() ? th.faint : '#1a0f00', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {analyzing ? <><Icon.Spinner color="#1a0f00" size={16} />Analysiert…</> : 'KI analysieren'}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: SP.lg }}>
          <div style={{ fontSize: 12, color: th.gold, fontWeight: 700, marginBottom: SP.sm }}>Gefundene Whiskies — wohin damit?</div>
          {suggestions.map((s, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontWeight: 700, marginBottom: SP.xs }}>{s.name}</div>
              {s.distillery && <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{s.distillery}{s.region ? ` · ${s.region}` : ''}</div>}
              <div style={{ display: 'flex', gap: SP.sm }}>
                <button onClick={() => saveEntry(s, 'wishlist')} style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid ${th.phases.palate.accent}44`, background: th.phases.palate.dim, color: th.phases.palate.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>→ Wishlist</button>
                <button onClick={() => saveEntry(s, 'journal')} style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid ${th.phases.nose.accent}44`, background: th.phases.nose.dim, color: th.phases.nose.accent, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>→ Diary</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Library tabs */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {(['all', 'wishlist', 'journal'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', background: tab === tb ? th.gold : th.bgCard, color: tab === tb ? '#1a0f00' : th.muted, fontSize: 13, fontWeight: tab === tb ? 700 : 400 }}>
            {tb === 'all' ? 'Alle' : tb === 'wishlist' ? 'Wishlist' : 'Diary'}
          </button>
        ))}
      </div>

      {filtered.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
          <span style={{ flex: 1, fontSize: 14, color: th.text }}>{e.name}</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: e.type === 'wishlist' ? th.phases.palate.dim : th.phases.nose.dim, color: e.type === 'wishlist' ? th.phases.palate.accent : th.phases.nose.accent }}>{e.type}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const _distilleryRegionMap = new Map<string, string>()
for (const d of distilleries) {
  _distilleryRegionMap.set(d.name.toLowerCase(), d.region)
}

function deriveRegion(distillery: string | null): string {
  if (!distillery) return 'Unknown'
  const lower = distillery.toLowerCase().trim()
  let found = 'Other'
  _distilleryRegionMap.forEach((region, name) => {
    if (lower.includes(name) || name.includes(lower)) found = region
  })
  return found
}

interface CollProps { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const CollectionAnalysis: React.FC<CollProps> = ({ th, t, participantId, onBack }) => {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    collectionApi.getAll(participantId)
      .then((data: any) => setItems(Array.isArray(data) ? data : []))
      .catch(() => { setItems([]); setError(true) })
      .finally(() => setLoading(false))
  }, [participantId])

  const HBar: React.FC<{ label: string; count: number; max: number; color: string }> = ({ label, count, max, color }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: th.muted }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
        <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )

  if (loading) return <div style={{ padding: SP.md, display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Icon.Spinner color={th.gold} size={28} /></div>

  if (error) return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.lg, textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: th.muted }}>Sammlung konnte nicht geladen werden.</p>
      </div>
    </div>
  )

  if (items.length === 0) return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.lg, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: th.text, margin: '0 0 6px' }}>Noch keine Sammlung</p>
        <p style={{ fontSize: 13, color: th.muted, margin: 0 }}>Importiere deine Whiskybase-Sammlung, um detaillierte Analysen freizuschalten.</p>
      </div>
    </div>
  )

  const regionCounts = new Map<string, number>()
  const caskCounts = new Map<string, number>()
  let ratingSum = 0
  let ratingCount = 0
  const topRated: { name: string; score: number }[] = []

  for (const item of items) {
    const region = deriveRegion(item.distillery)
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1)

    if (item.caskType) {
      const ct = item.caskType.trim()
      if (ct) caskCounts.set(ct, (caskCounts.get(ct) || 0) + 1)
    }

    if (item.personalRating != null && item.personalRating > 0) {
      ratingSum += item.personalRating
      ratingCount++
      topRated.push({ name: item.name, score: item.personalRating })
    } else if (item.communityRating != null && item.communityRating > 0) {
      ratingSum += item.communityRating
      ratingCount++
      topRated.push({ name: item.name, score: item.communityRating })
    }
  }

  const avgRating = ratingCount > 0 ? Math.round(ratingSum / ratingCount) : 0
  const sortedTopRated = topRated.sort((a, b) => b.score - a.score).slice(0, 10)
  const regions = Object.fromEntries(Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1]))
  const casks = Object.fromEntries(Array.from(caskCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10))

  const maxRegion = Math.max(...Object.values(regions)) as number
  const maxCask = Object.keys(casks).length > 0 ? Math.max(...Object.values(casks)) as number : 1

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Collection Analysis</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Tiefenanalyse deiner Whisky-Sammlung.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[{ label: 'Flaschen', value: items.length }, { label: 'Ø Bewertung', value: avgRating > 0 ? avgRating : '–' }].map((s, i) => (
          <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: th.gold }}>{s.value}</div>
            <div style={{ fontSize: 11, color: th.faint }}>{s.label}</div>
          </div>
        ))}
      </div>

      {Object.keys(regions).length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
          <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.md, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Regionen</div>
          {Object.entries(regions).map(([region, count]) => <HBar key={region} label={region} count={count as number} max={maxRegion} color={th.phases.palate.accent} />)}
        </div>
      )}

      {Object.keys(casks).length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
          <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.md, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fasstypen</div>
          {Object.entries(casks).map(([cask, count]) => <HBar key={cask} label={cask} count={count as number} max={maxCask} color={th.phases.finish.accent} />)}
        </div>
      )}

      {sortedTopRated.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
          <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.md, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top bewertet</div>
          {sortedTopRated.map((w, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 14, color: th.text }}>{w.name}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: th.gold }}>{w.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
