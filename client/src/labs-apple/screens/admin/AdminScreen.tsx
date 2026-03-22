// CaskSense Apple — AdminScreen (Phase F)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const AdminScreen: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [stats, setStats]   = useState<any>(null)
  const [parts, setParts]   = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab]       = useState<'overview' | 'participants'>('overview')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/activity-summary', { headers: { 'x-participant-id': participantId } }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/participants?limit=100', { headers: { 'x-participant-id': participantId } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, p]) => {
      if (s) setStats(s)
      if (p) setParts(Array.isArray(p) ? p : (p?.participants || []))
    })
  }, [participantId])

  const filtered = parts.filter(p =>
    !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const statCards = stats ? [
    { label: 'Sessions', value: stats.totalSessions || 0, color: th.gold },
    { label: 'Aktive Nutzer', value: stats.activeUsers || 0, color: th.green },
    { label: 'Ø Dauer (min)', value: Math.round((stats.avgDuration || 0) / 60), color: th.phases.nose.accent },
    { label: 'Gesamt (h)', value: Math.round((stats.totalTime || 0) / 3600), color: th.phases.palate.accent },
  ] : []

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Admin</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${th.gold}20`, color: th.gold, marginLeft: 4 }}>INTERN</span>
      </div>
      <div style={{ padding: SP.md }}>
        <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg }}>
          {([['overview', 'Übersicht'], ['participants', 'Nutzer']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', background: tab === id ? th.gold : th.bgCard, color: tab === id ? '#1a0f00' : th.muted, fontSize: 13, fontWeight: tab === id ? 700 : 400 }}>{label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            {statCards.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
                {statCards.map((s, i) => (
                  <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: th.faint, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aktionen</div>
            {[
              { label: 'Test-Daten seeden', endpoint: '/api/admin/seed-pilot', color: th.phases.nose.accent },
              { label: 'Flavour-Kategorien seeden', endpoint: '/api/admin/flavour-seed', color: th.phases.palate.accent },
            ].map((a, i) => (
              <button key={i} onClick={async () => {
                try { const r = await fetch(a.endpoint, { method: 'POST', headers: { 'x-participant-id': participantId } }); alert(r.ok ? '✓ Erfolgreich' : '✗ Fehler') } catch { alert('Netzwerkfehler') }
              }} style={{ width: '100%', height: 48, borderRadius: 12, border: `1px solid ${a.color}33`, background: `${a.color}10`, color: a.color, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.sm }}>{a.label}</button>
            ))}
          </div>
        )}

        {tab === 'participants' && (
          <div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name oder E-Mail suchen…"
              style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
            <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{filtered.length} Nutzer</div>
            {filtered.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>{(p.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name || '—'}</div>
                  <div style={{ fontSize: 11, color: th.faint }}>{p.email || 'Gast'}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {p.isAdmin && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${th.gold}20`, color: th.gold }}>Admin</span>}
                  {p.emailVerified && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: `${th.green}20`, color: th.green }}>OK</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
