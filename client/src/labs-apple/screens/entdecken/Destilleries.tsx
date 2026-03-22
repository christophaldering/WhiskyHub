// CaskSense Apple — Distilleries (Weltkarte / Regional Compass)
// Ablage: client/src/labs-apple/screens/entdecken/Distilleries.tsx

import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Distillery {
  id: string
  name: string
  country: string
  region: string
  founded?: number
  description?: string
  website?: string
}

const REGIONS: { id: string; label: string; color: string; countries: string[] }[] = [
  { id: 'scotland',  label: 'Scotland',   color: '#a8c4d4', countries: ['Scotland'] },
  { id: 'ireland',   label: 'Ireland',    color: '#86c678', countries: ['Ireland'] },
  { id: 'usa',       label: 'USA',        color: '#d4a847', countries: ['USA', 'United States'] },
  { id: 'japan',     label: 'Japan',      color: '#c47a3a', countries: ['Japan'] },
  { id: 'rest',      label: 'Weitere',    color: '#9b8ea8', countries: [] },
]

function getRegion(country: string) {
  for (const r of REGIONS) {
    if (r.countries.some(c => country?.toLowerCase().includes(c.toLowerCase()))) return r
  }
  return REGIONS[REGIONS.length - 1]
}

const ScotlandRegions = [
  { id: 'speyside',    label: 'Speyside',    x: 310, y: 120 },
  { id: 'highland',   label: 'Highland',    x: 270, y: 100 },
  { id: 'islay',      label: 'Islay',       x: 200, y: 175 },
  { id: 'lowland',    label: 'Lowland',     x: 280, y: 160 },
  { id: 'campbeltown',label: 'Campbeltown', x: 230, y: 165 },
  { id: 'islands',    label: 'Islands',     x: 220, y: 120 },
]

interface Props {
  th: ThemeTokens
  t: Translations
  participantId: string
}

export const Distilleries: React.FC<Props> = ({ th, t, participantId }) => {
  const [distilleries, setDist]   = useState<Distillery[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [activeRegion, setRegion] = useState<string | null>(null)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [view, setView]           = useState<'list' | 'map'>('map')

  useEffect(() => {
    fetch('/api/labs/discover/distilleries', { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setDist(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = distilleries.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.region?.toLowerCase().includes(search.toLowerCase())
    const matchRegion = !activeRegion || getRegion(d.country).id === activeRegion
    return matchSearch && matchRegion
  })

  const countByRegion = (id: string) => distilleries.filter(d => getRegion(d.country).id === id).length

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: `${SP.lg}px ${SP.md}px ${SP.sm}px` }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>
          {t.entDest || 'Destillerien'}
        </h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, margin: 0 }}>
          {t.entDestSub || 'Weltkarte der Brennereien'}
        </p>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: SP.xs, padding: `0 ${SP.md}px ${SP.sm}px` }}>
        {(['map', 'list'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            height: 36, padding: '0 18px', borderRadius: 18, border: 'none',
            cursor: 'pointer', fontSize: 13, transition: 'all 150ms',
            background: view === v ? th.gold : th.bgCard,
            color:      view === v ? '#1a0f00' : th.muted,
            fontWeight: view === v ? 700 : 400,
          }}>
            {v === 'map' ? (t.entDestMap || 'Karte') : (t.entDestList || 'Liste')}
          </button>
        ))}
      </div>

      {/* Suche */}
      <div style={{ padding: `0 ${SP.md}px ${SP.sm}px` }}>
        <div style={{ position: 'relative' }}>
          <Icon.Search color={th.faint} size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.entSearch || 'Suche...'}
            style={{
              width: '100%', height: 44, paddingLeft: 40, paddingRight: 16,
              borderRadius: 12, border: `1px solid ${th.border}`,
              background: th.inputBg, color: th.text, fontSize: 15,
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>
      </div>

      {/* Regions-Filter */}
      <div style={{ display: 'flex', gap: SP.xs, padding: `0 ${SP.md}px ${SP.md}px`, overflowX: 'auto' }}>
        <button onClick={() => setRegion(null)} style={{
          flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 16, border: 'none',
          cursor: 'pointer', fontSize: 12, transition: 'all 150ms',
          background: !activeRegion ? th.gold : th.bgCard,
          color:      !activeRegion ? '#1a0f00' : th.muted,
          fontWeight: !activeRegion ? 700 : 400,
        }}>{t.entFilterAll || 'Alle'}</button>
        {REGIONS.map(r => (
          <button key={r.id} onClick={() => setRegion(activeRegion === r.id ? null : r.id)} style={{
            flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 16,
            border: `1px solid ${activeRegion === r.id ? r.color : th.border}`,
            cursor: 'pointer', fontSize: 12, transition: 'all 150ms',
            background: activeRegion === r.id ? `${r.color}20` : th.bgCard,
            color:      activeRegion === r.id ? r.color : th.muted,
            fontWeight: activeRegion === r.id ? 700 : 400,
          }}>
            {r.label} {countByRegion(r.id) > 0 && `(${countByRegion(r.id)})`}
          </button>
        ))}
      </div>

      {/* Karten-Ansicht — Regional Compass */}
      {view === 'map' && (
        <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, overflow: 'hidden' }}>
            {/* Scotland Compass */}
            <div style={{ padding: SP.md, borderBottom: `1px solid ${th.border}` }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: REGIONS[0].color, marginBottom: SP.sm }}>
                Scotland · Regional Compass
              </div>
              <svg viewBox="0 0 400 220" width="100%" style={{ display: 'block' }}>
                {/* Hintergrund */}
                <rect width="400" height="220" fill="transparent" />
                {/* Verbindungslinien */}
                {ScotlandRegions.map(r => (
                  <line key={r.id} x1="280" y1="140" x2={r.x} y2={r.y}
                    stroke={`${REGIONS[0].color}30`} strokeWidth="1" strokeDasharray="3 3" />
                ))}
                {/* Zentrum */}
                <circle cx="280" cy="140" r="6" fill={REGIONS[0].color} opacity="0.6" />
                {/* Region-Punkte */}
                {ScotlandRegions.map(r => {
                  const count = distilleries.filter(d =>
                    d.region?.toLowerCase().includes(r.id) ||
                    d.country?.toLowerCase().includes('scotland')
                  ).length
                  const isActive = activeRegion === 'scotland'
                  return (
                    <g key={r.id}>
                      <circle cx={r.x} cy={r.y} r={isActive ? 10 : 8}
                        fill={`${REGIONS[0].color}${isActive ? '40' : '20'}`}
                        stroke={REGIONS[0].color} strokeWidth="1.5" style={{ cursor: 'pointer' }}
                        onClick={() => setRegion(activeRegion === 'scotland' ? null : 'scotland')}
                      />
                      <text x={r.x} y={r.y - 14} textAnchor="middle"
                        fill={REGIONS[0].color} fontSize="10" fontFamily="DM Sans, sans-serif">
                        {r.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Andere Regionen als Kacheln */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: th.border }}>
              {REGIONS.slice(1).map(r => {
                const count = countByRegion(r.id)
                const isActive = activeRegion === r.id
                return (
                  <div key={r.id} onClick={() => setRegion(isActive ? null : r.id)}
                    style={{
                      padding: SP.md, cursor: 'pointer', transition: 'all 150ms',
                      background: isActive ? `${r.color}15` : th.bgCard,
                    }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: r.color, marginBottom: 6 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? r.color : th.text }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: th.faint, marginTop: 2 }}>{count} Destillerien</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Listen-Ansicht */}
      <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint }}>
            <Icon.Spinner color={th.gold} size={28} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: SP.xl }}>
            <Icon.Globe color={th.faint} size={40} />
            <div style={{ fontSize: 15, color: th.muted, marginTop: SP.md }}>
              Keine Destillerien gefunden.
            </div>
          </div>
        )}

        {!loading && filtered.map(d => {
          const region = getRegion(d.country)
          const isOpen = expanded === d.id
          return (
            <div key={d.id} style={{
              background: th.bgCard, border: `1px solid ${isOpen ? region.color + '60' : th.border}`,
              borderRadius: 16, marginBottom: SP.sm, overflow: 'hidden', transition: 'all 150ms',
            }}>
              <div onClick={() => setExpanded(isOpen ? null : d.id)}
                style={{ display: 'flex', alignItems: 'center', gap: SP.md, padding: SP.md, cursor: 'pointer', minHeight: 44 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: region.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Playfair Display, serif' }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: th.faint, marginTop: 2 }}>
                    {[d.region, d.country].filter(Boolean).join(' · ')}
                    {d.founded ? ` · Gegr. ${d.founded}` : ''}
                  </div>
                </div>
                <Icon.ChevronDown color={th.faint} size={16}
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }} />
              </div>
              {isOpen && (
                <div style={{ padding: `0 ${SP.md}px ${SP.md}px`, borderTop: `1px solid ${th.border}` }}>
                  {d.description && (
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, margin: `${SP.sm}px 0` }}>
                      {d.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs, marginTop: SP.sm }}>
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: `${region.color}15`, color: region.color }}>
                      {region.label}
                    </span>
                    {d.region && d.region !== d.country && (
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: th.bgCard, color: th.muted, border: `1px solid ${th.border}` }}>
                        {d.region}
                      </span>
                    )}
                  </div>
                  {d.website && (
                    <a href={d.website} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: SP.sm, fontSize: 13, color: th.gold, textDecoration: 'none' }}>
                      <Icon.Globe color={th.gold} size={14} />
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
