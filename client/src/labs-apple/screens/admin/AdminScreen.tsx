// CaskSense Apple — AdminScreen (Phase F)
import React, { useState, useEffect, useCallback, Fragment } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'
import { adminApi } from '@/lib/api'
import { apiRequest } from '@/lib/queryClient'

interface AdminParticipant {
  id: string
  name: string
  email: string | null
  role: string
  language: string | null
  createdAt: string | null
  hostedTastings: number
  isHost: boolean
  emailVerified: boolean
}

interface AdminTasting {
  id: string
  title: string
  date: string
  location: string
  status: string
  code: string
  hostName: string
  hostId: string
  participantCount: number
  whiskyCount: number
  blindMode: boolean | null
  isTestData: boolean | null
}

interface AdminOverview {
  participants: AdminParticipant[]
  tastings: AdminTasting[]
  stats: {
    totalParticipants: number
    totalHosts: number
    totalTastings: number
    totalAdmins: number
  }
}

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

type AppleAdminTab = 'overview' | 'participants' | 'tastings' | 'cleanup' | 'online' | 'activity' | 'sessions' | 'analytics'

const TAB_LABELS: Record<AppleAdminTab, string> = {
  overview: 'Übersicht',
  participants: 'Nutzer',
  tastings: 'Tastings',
  cleanup: 'Cleanup',
  online: 'Online',
  activity: 'Aktivität',
  sessions: 'Sessions',
  analytics: 'Analytics',
}

const dangerColor = '#e04040'
const infoColor = '#5a9fd4'

const selectBase = (th: ThemeTokens): React.CSSProperties => ({
  padding: '6px 10px', borderRadius: 10, border: `1px solid ${th.border}`,
  background: th.inputBg, color: th.text, fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
})

const formatRelative = (ts: string | null | undefined): string => {
  if (!ts) return '–'
  const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

const formatDuration = (min: number): string => {
  if (min < 1) return '<1m'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const formatDate = (ts: string | null): string => {
  if (!ts) return '–'
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const formatTime = (ts: string | null): string => {
  if (!ts) return '–'
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export const AdminScreen: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [tab, setTab] = useState<AppleAdminTab>('overview')
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(false)
    adminApi.getOverview(participantId)
      .then((d: AdminOverview) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [participantId])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} data-testid="admin-back" style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Admin</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${th.gold}20`, color: th.gold, marginLeft: 4 }}>INTERN</span>
      </div>

      <div style={{ padding: SP.md }}>
        <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg, overflowX: 'auto', flexWrap: 'wrap' }} data-testid="admin-tabs">
          {(Object.keys(TAB_LABELS) as AppleAdminTab[]).map(id => (
            <button key={id} onClick={() => setTab(id)} data-testid={`admin-tab-${id}`} style={{
              flex: '1 1 auto', minWidth: 60, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer',
              background: tab === id ? th.gold : th.bgCard,
              color: tab === id ? '#1a0f00' : th.muted,
              fontSize: 12, fontWeight: tab === id ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0, padding: '0 10px',
            }}>{TAB_LABELS[id]}</button>
          ))}
        </div>

        {loading && (tab === 'overview' || tab === 'participants' || tab === 'tastings' || tab === 'cleanup') && (
          <div style={{ textAlign: 'center', padding: SP.xxl }}>
            <Icon.Spinner color={th.gold} size={28} />
          </div>
        )}

        {!loading && error && (tab === 'overview' || tab === 'participants' || tab === 'tastings' || tab === 'cleanup') && (
          <div style={{ textAlign: 'center', padding: SP.xxl }}>
            <Icon.AlertTriangle color={dangerColor} size={32} />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: SP.sm }}>Fehler beim Laden</div>
            <div style={{ fontSize: 12, color: th.faint, marginTop: 4, marginBottom: SP.md }}>Admin-Daten konnten nicht geladen werden.</div>
            <button onClick={fetchData} data-testid="admin-retry" style={{
              padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: th.gold, color: '#1a0f00', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
            }}>Erneut versuchen</button>
          </div>
        )}

        {!loading && !error && data && tab === 'overview' && <OverviewTab th={th} data={data} participantId={participantId} />}
        {!loading && !error && data && tab === 'participants' && <ParticipantsTab th={th} data={data} participantId={participantId} onRefresh={fetchData} />}
        {!loading && !error && data && tab === 'tastings' && <TastingsTab th={th} data={data} participantId={participantId} onRefresh={fetchData} />}
        {!loading && !error && data && tab === 'cleanup' && <CleanupTab th={th} data={data} participantId={participantId} onRefresh={fetchData} />}

        {tab === 'online' && <OnlineTab th={th} participantId={participantId} />}
        {tab === 'activity' && <ActivityTab th={th} participantId={participantId} />}
        {tab === 'sessions' && <SessionsTab th={th} participantId={participantId} />}
        {tab === 'analytics' && <AnalyticsTab th={th} participantId={participantId} />}
      </div>
    </div>
  )
}

function OverviewTab({ th, data, participantId }: { th: ThemeTokens; data: AdminOverview; participantId: string }) {
  const statCards = [
    { label: 'Users', value: data.stats.totalParticipants, color: th.green },
    { label: 'Hosts', value: data.stats.totalHosts, color: th.phases.nose.accent },
    { label: 'Tastings', value: data.stats.totalTastings, color: th.gold },
    { label: 'Admins', value: data.stats.totalAdmins, color: th.phases.palate.accent },
  ]

  return (
    <div data-testid="admin-overview-tab">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {statCards.map((s, i) => (
          <div key={i} data-testid={`admin-stat-${s.label.toLowerCase()}`} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: th.faint, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aktionen</div>
      {[
        { label: 'Test-Daten seeden', endpoint: '/api/admin/seed-pilot', color: th.phases.nose.accent },
        { label: 'Flavour-Kategorien seeden', endpoint: '/api/admin/flavour-seed', color: th.phases.palate.accent },
      ].map((a, i) => (
        <button key={i} data-testid={`admin-action-${i}`} onClick={async () => {
          try { const r = await fetch(a.endpoint, { method: 'POST', headers: { 'x-participant-id': participantId } }); alert(r.ok ? '✓ Erfolgreich' : '✗ Fehler') } catch { alert('Netzwerkfehler') }
        }} style={{ width: '100%', height: 48, borderRadius: 12, border: `1px solid ${a.color}33`, background: `${a.color}10`, color: a.color, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.sm }}>{a.label}</button>
      ))}
    </div>
  )
}

function ParticipantsTab({ th, data, participantId, onRefresh }: { th: ThemeTokens; data: AdminOverview; participantId: string; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [mutating, setMutating] = useState<string | null>(null)

  const filtered = data.participants.filter(p => {
    if (filterRole !== 'all' && p.role !== filterRole) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const updateRole = async (pid: string, role: string) => {
    setMutating(pid)
    try {
      await adminApi.updateRole(pid, role, participantId)
      onRefresh()
    } catch { alert('Fehler beim Aktualisieren der Rolle') } finally { setMutating(null) }
  }

  const deleteParticipant = async (pid: string, name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    setMutating(pid)
    try {
      await adminApi.deleteParticipant(pid, participantId)
      onRefresh()
    } catch { alert('Fehler beim Löschen') } finally { setMutating(null) }
  }

  const sStyle = selectBase(th)

  return (
    <div data-testid="admin-participants-tab">
      <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.md }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name oder E-Mail suchen…" data-testid="admin-input-search-participants"
          style={{ flex: 1, minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} data-testid="admin-select-filter-role" style={{ ...sStyle, minHeight: 44 }}>
          <option value="all">Alle</option>
          <option value="admin">Admin</option>
          <option value="host">Host</option>
          <option value="user">User</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{filtered.length} Nutzer</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: SP.xxl, color: th.muted, fontSize: 14 }}>Keine Ergebnisse</div>
      ) : filtered.map(p => {
        const isTest = p.email?.endsWith('@casksense.local')
        const isSelf = p.id === participantId
        return (
          <div key={p.id} data-testid={`admin-participant-${p.id}`} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
            borderBottom: `1px solid ${th.border}`, opacity: mutating === p.id ? 0.5 : 1,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              background: p.role === 'admin' ? `${th.gold}20` : p.role === 'host' ? `${infoColor}20` : th.phases.nose.dim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, flexShrink: 0,
              color: p.role === 'admin' ? th.gold : p.role === 'host' ? infoColor : th.phases.nose.accent,
            }}>{(p.name || '?')[0].toUpperCase()}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name || '—'}</span>
                {isSelf && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: `${th.gold}20`, color: th.gold }}>Du</span>}
                {isTest && <span data-testid={`admin-test-badge-${p.id}`} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: `${th.phases.nose.accent}20`, color: th.phases.nose.accent, fontWeight: 700 }}>TEST</span>}
              </div>
              <div style={{ fontSize: 11, color: th.faint, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                <span>{p.email || 'Gast'}</span>
                {p.email && !isTest && (
                  p.emailVerified
                    ? <Icon.CheckCircle color={th.green} size={12} />
                    : <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: 6, border: `1.5px solid ${dangerColor}`, alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ width: 6, height: 1.5, background: dangerColor, borderRadius: 1, transform: 'rotate(45deg)' }} />
                      </span>
                )}
                <span>· {p.hostedTastings} Tastings</span>
                {p.createdAt && <span>· {new Date(p.createdAt).toLocaleDateString('de-DE')}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <select value={p.role} onChange={e => updateRole(p.id, e.target.value)} disabled={isSelf}
                data-testid={`admin-select-role-${p.id}`}
                style={{ ...sStyle, fontSize: 11, padding: '4px 8px', opacity: isSelf ? 0.5 : 1 }}>
                <option value="user">User</option>
                <option value="host">Host</option>
                <option value="admin">Admin</option>
              </select>
              {!isSelf && (
                <button onClick={() => deleteParticipant(p.id, p.name)} data-testid={`admin-delete-participant-${p.id}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <Icon.Trash color={dangerColor} size={16} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TastingsTab({ th, data, participantId, onRefresh }: { th: ThemeTokens; data: AdminOverview; participantId: string; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showTestData, setShowTestData] = useState(false)
  const [mutating, setMutating] = useState<string | null>(null)

  const statusColor = (s: string) => {
    if (s === 'open') return th.green
    if (s === 'closed') return th.gold
    if (s === 'reveal') return infoColor
    if (s === 'archived') return th.faint
    return th.muted
  }

  const filtered = data.tastings.filter(ta => {
    if (ta.code === 'DEMO') return false
    if (!showTestData && ta.isTestData) return false
    if (filterStatus !== 'all' && ta.status !== filterStatus) return false
    if (search && !ta.title.toLowerCase().includes(search.toLowerCase()) && !ta.hostName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const deleteTasting = async (id: string, title: string) => {
    if (!confirm(`"${title}" wirklich löschen?`)) return
    setMutating(id)
    try {
      await adminApi.deleteTasting(id, participantId)
      onRefresh()
    } catch { alert('Fehler beim Löschen') } finally { setMutating(null) }
  }

  const toggleTestFlag = async (id: string, currentValue: boolean | null) => {
    setMutating(id)
    try {
      await apiRequest('POST', `/api/admin/tastings/${id}/test-flag`, { requesterId: participantId, isTestData: !currentValue })
      onRefresh()
    } catch { alert('Fehler beim Aktualisieren') } finally { setMutating(null) }
  }

  const sStyle = selectBase(th)

  return (
    <div data-testid="admin-tastings-tab">
      <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.md, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tasting oder Host suchen…" data-testid="admin-input-search-tastings"
          style={{ flex: 1, minWidth: 140, minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} data-testid="admin-select-filter-status" style={{ ...sStyle, minHeight: 44 }}>
          <option value="all">Alle Status</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="reveal">Reveal</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={() => setShowTestData(!showTestData)} data-testid="admin-toggle-show-test" style={{
          minHeight: 44, padding: '6px 12px', borderRadius: 12,
          border: `1px solid ${showTestData ? th.phases.nose.accent : th.border}`,
          background: showTestData ? `${th.phases.nose.accent}15` : 'transparent',
          color: showTestData ? th.phases.nose.accent : th.muted,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ fontSize: 14 }}>🧪</span> Test
        </button>
      </div>

      <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{filtered.length} Tastings</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: SP.xxl, color: th.muted, fontSize: 14 }}>Keine Ergebnisse</div>
      ) : filtered.map(ta => (
        <div key={ta.id} data-testid={`admin-tasting-${ta.id}`} style={{
          background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14,
          padding: '12px 14px', marginBottom: SP.sm, opacity: mutating === ta.id ? 0.5 : 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{ta.title}</span>
                <span data-testid={`admin-tasting-status-${ta.id}`} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                  background: `${statusColor(ta.status)}20`, color: statusColor(ta.status),
                }}>{ta.status}</span>
                {ta.isTestData && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: `${th.phases.nose.accent}20`, color: th.phases.nose.accent, fontWeight: 700 }}>TEST</span>}
              </div>
              <div style={{ fontSize: 11, color: th.faint, display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Host color={th.faint} size={11} /> {ta.hostName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Calendar color={th.faint} size={11} /> {ta.date}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Users color={th.faint} size={11} /> {ta.participantCount}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Whisky color={th.faint} size={11} /> {ta.whiskyCount}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => toggleTestFlag(ta.id, ta.isTestData)} data-testid={`admin-toggle-test-${ta.id}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <span style={{ fontSize: 16, opacity: ta.isTestData ? 1 : 0.35 }}>🧪</span>
              </button>
              <button onClick={() => deleteTasting(ta.id, ta.title)} data-testid={`admin-delete-tasting-${ta.id}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <Icon.Trash color={dangerColor} size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CleanupTab({ th, data, participantId, onRefresh }: { th: ThemeTokens; data: AdminOverview; participantId: string; onRefresh: () => void }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const testTastings = data.tastings.filter(ta => ta.isTestData)

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const selectAllTest = () => setSelectedIds(new Set(testTastings.map(t => t.id)))
  const clearSelection = () => setSelectedIds(new Set())

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size} Tastings wirklich löschen?`)) return
    setDeleting(true)
    try {
      let failed = 0
      for (const id of selectedIds) {
        try {
          await adminApi.deleteTasting(id, participantId)
        } catch { failed++ }
      }
      setSelectedIds(new Set())
      onRefresh()
      if (failed > 0) alert(`${failed} Tastings konnten nicht gelöscht werden`)
    } catch { alert('Fehler beim Löschen') } finally { setDeleting(false) }
  }

  return (
    <div data-testid="admin-cleanup-tab">
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
          <Icon.Trash color={dangerColor} size={18} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>Bulk Cleanup</span>
        </div>

        <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>
          {testTastings.length} Test-Tastings gefunden · {selectedIds.size} ausgewählt
        </div>

        <div style={{ display: 'flex', gap: SP.md, marginBottom: SP.md }}>
          <button onClick={selectAllTest} data-testid="admin-cleanup-select-all" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: th.gold, fontSize: 12, fontWeight: 600, padding: 0,
          }}>Select all test</button>
          <button onClick={clearSelection} data-testid="admin-cleanup-clear" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: th.muted, fontSize: 12, padding: 0,
          }}>Clear</button>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: SP.md }}>
          {data.tastings.map(ta => {
            const selected = selectedIds.has(ta.id)
            return (
              <div key={ta.id} onClick={() => toggleId(ta.id)} data-testid={`admin-cleanup-item-${ta.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10,
                cursor: 'pointer', marginBottom: 2,
                background: selected ? `${dangerColor}12` : 'transparent',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${selected ? dangerColor : th.faint}`,
                  background: selected ? dangerColor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && <Icon.Check color="#fff" size={12} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ta.title}
                    {ta.isTestData && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 5, background: `${th.phases.nose.accent}20`, color: th.phases.nose.accent, fontWeight: 700 }}>TEST</span>}
                  </div>
                  <div style={{ fontSize: 11, color: th.faint }}>{ta.hostName} · {ta.date} · {ta.status}</div>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={bulkDelete} disabled={selectedIds.size === 0 || deleting} data-testid="admin-cleanup-delete" style={{
          width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
          background: selectedIds.size > 0 ? dangerColor : th.faint,
          color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: deleting ? 0.6 : 1,
        }}>
          {deleting ? <Icon.Spinner color="#fff" size={18} /> : <Icon.Trash color="#fff" size={16} />}
          {selectedIds.size} löschen
        </button>
      </div>
    </div>
  )
}

function OnlineTab({ th, participantId }: { th: ThemeTokens; participantId: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOnline = () => {
    fetch('/api/admin/online-users?minutes=10', { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setUsers([]); setLoading(false) })
  }

  useEffect(() => {
    fetchOnline()
    const interval = setInterval(fetchOnline, 15000)
    return () => clearInterval(interval)
  }, [participantId])

  const cardStyle_: React.CSSProperties = {
    background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: `${SP.sm}px ${SP.md}px`
  }

  return (
    <div data-testid="admin-online-tab">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Live color={th.green} size={16} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Online Nutzer</span>
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: th.bgCard, color: th.muted }}>{users.length}</span>
        </div>
        <span style={{ fontSize: 11, color: th.faint }}>Auto-Refresh 15s</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}><Icon.Spinner color={th.gold} size={24} /></div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: th.faint }}>Keine Nutzer online.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
          {users.map((u: any) => (
            <div key={u.id} data-testid={`admin-online-user-${u.id}`} style={cardStyle_}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: th.phases.nose.accent }}>
                    {(u.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5,
                    border: `2px solid ${th.bg}`,
                    background: (Date.now() - new Date(u.lastSeenAt).getTime()) < 120000 ? th.green : th.gold
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{u.name || '—'}</span>
                    {u.role === 'admin' && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 5, background: `${th.gold}20`, color: th.gold, fontWeight: 700 }}>Admin</span>}
                    {u.role === 'host' && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 5, background: `${th.phases.nose.dim}`, color: th.phases.nose.accent, fontWeight: 700 }}>Host</span>}
                  </div>
                  {u.email && <div style={{ fontSize: 11, color: th.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>}
                </div>
                <span style={{ fontSize: 11, color: th.faint, flexShrink: 0 }}>{formatRelative(u.lastSeenAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityTab({ th, participantId }: { th: ThemeTokens; participantId: string }) {
  const [hours, setHours] = useState(24)
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const timeOpts = [
    { hours: 1, label: '1h' }, { hours: 6, label: '6h' }, { hours: 12, label: '12h' },
    { hours: 24, label: '24h' }, { hours: 168, label: '7d' }, { hours: 720, label: '30d' },
    { hours: 0, label: 'Alle' },
  ]

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ hours: String(hours) })
    if (roleFilter !== 'all') params.set('role', roleFilter)
    fetch(`/api/admin/user-activity?${params}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setUsers([]); setLoading(false) })
  }, [hours, roleFilter, participantId])

  const filtered = users.filter((u: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  const pillStyle = (active: boolean): React.CSSProperties => ({
    height: 32, borderRadius: 16, border: `1px solid ${active ? th.gold : th.border}`,
    background: active ? `${th.gold}15` : th.bgCard, color: active ? th.gold : th.muted,
    fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', padding: '0 12px',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', minHeight: 40, borderRadius: 12, border: `1px solid ${th.border}`,
    background: th.inputBg, color: th.text, fontSize: 14, padding: '8px 12px',
    outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box'
  }

  return (
    <div data-testid="admin-activity-tab">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
        <Icon.Globe color={th.gold} size={16} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Nutzer-Aktivität</span>
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: th.bgCard, color: th.muted }}>{filtered.length}</span>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: SP.sm }}>
        {timeOpts.map(opt => (
          <button key={opt.hours} data-testid={`admin-activity-time-${opt.hours}`} onClick={() => setHours(opt.hours)} style={pillStyle(hours === opt.hours)}>{opt.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.md }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name oder E-Mail…"
          data-testid="admin-activity-search"
          style={{ ...inputStyle, flex: 1 }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          data-testid="admin-activity-role-filter"
          style={{ ...inputStyle, width: 'auto', minWidth: 90, flex: 'none' }}>
          <option value="all">Alle</option>
          <option value="admin">Admin</option>
          <option value="host">Host</option>
          <option value="user">User</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}><Icon.Spinner color={th.gold} size={24} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: th.faint }}>Keine Nutzer im gewählten Zeitraum.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
          {filtered.map((u: any) => (
            <div key={u.id} data-testid={`admin-activity-user-${u.id}`} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{u.name || '—'}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: th.bgHover, color: th.faint, textTransform: 'uppercase', fontWeight: 700 }}>{u.role || ''}</span>
                  </div>
                  {u.email && <div style={{ fontSize: 11, color: th.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{formatRelative(u.lastSeenAt)}</div>
                  <div style={{ fontSize: 10, color: th.faint }}>zuletzt</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${th.border}` }}>
                <span style={{ fontSize: 12, color: th.muted }}>
                  <Icon.Whisky color={th.faint} size={12} /> {u.tastingCount ?? 0} Tastings
                </span>
                <span style={{ fontSize: 12, color: th.muted }}>
                  <Icon.Overall color={th.faint} size={12} /> {u.ratingCount ?? 0} Ratings
                </span>
                <span style={{ fontSize: 12, color: th.muted }}>
                  <Icon.Edit color={th.faint} size={12} /> {u.journalCount ?? 0} Drams
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionsTab({ th, participantId }: { th: ThemeTokens; participantId: string }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [userSearch, setUserSearch] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [userSessions, setUserSessions] = useState<any[]>([])
  const [userSessionsLoading, setUserSessionsLoading] = useState(false)

  const getFromDate = () => {
    if (timeRange === 'all') return undefined
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    return new Date(Date.now() - days * 86400000).toISOString()
  }

  useEffect(() => {
    setSummaryLoading(true)
    const params = new URLSearchParams({ participantId })
    const from = getFromDate()
    if (from) params.set('from', from)
    fetch(`/api/admin/activity-summary?${params}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSummary(d); setSummaryLoading(false) })
      .catch(() => { setSummary(null); setSummaryLoading(false) })
  }, [participantId, timeRange])

  useEffect(() => {
    if (!selectedUser) { setUserSessions([]); return }
    setUserSessionsLoading(true)
    const params = new URLSearchParams({ requesterId: participantId })
    const from = getFromDate()
    if (from) params.set('from', from)
    fetch(`/api/admin/activity-sessions/${selectedUser}?${params}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setUserSessions(Array.isArray(d) ? d : []); setUserSessionsLoading(false) })
      .catch(() => { setUserSessions([]); setUserSessionsLoading(false) })
  }, [selectedUser, participantId, timeRange])

  const rangeOpts: { value: typeof timeRange; label: string }[] = [
    { value: '7d', label: '7 Tage' },
    { value: '30d', label: '30 Tage' },
    { value: '90d', label: '90 Tage' },
    { value: 'all', label: 'Gesamt' },
  ]

  const filteredUsers = (summary?.topUsers || []).filter((u: any) => {
    if (!userSearch) return true
    const q = userSearch.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  const heatmapData = (): number[][] => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    const sessions = summary?.byHour || []
    for (const s of sessions) {
      for (let day = 0; day < 7; day++) {
        grid[day][s.hour] = (grid[day][s.hour] || 0) + Math.round(s.sessions / 7)
      }
    }
    return grid
  }

  const heatmapMax = (): number => {
    const grid = heatmapData()
    let max = 1
    for (const row of grid) for (const v of row) if (v > max) max = v
    return max
  }

  const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  const cardStyle_: React.CSSProperties = {
    background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center'
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    height: 30, borderRadius: 15, border: `1px solid ${active ? th.gold : th.border}`,
    background: active ? `${th.gold}15` : th.bgCard, color: active ? th.gold : th.muted,
    fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', padding: '0 10px',
  })

  if (selectedUser) {
    const userData = (summary?.topUsers || []).find((u: any) => u.id === selectedUser)
    return (
      <div data-testid="admin-sessions-user-detail">
        <button onClick={() => setSelectedUser(null)} data-testid="admin-sessions-back"
          style={{ background: 'none', border: 'none', color: th.gold, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: SP.md }}>
          <Icon.Back color={th.gold} size={16} /> Zurück
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: th.phases.nose.accent }}>
            {(userData?.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{userData?.name || 'User'}</div>
            {userData?.email && <div style={{ fontSize: 11, color: th.faint }}>{userData.email}</div>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
          <div style={cardStyle_}>
            <div style={{ fontSize: 20, fontWeight: 700, color: th.gold }}>{userData?.sessions || 0}</div>
            <div style={{ fontSize: 10, color: th.faint, marginTop: 2 }}>Sessions</div>
          </div>
          <div style={cardStyle_}>
            <div style={{ fontSize: 20, fontWeight: 700, color: th.gold }}>{formatDuration(userData?.totalMinutes || 0)}</div>
            <div style={{ fontSize: 10, color: th.faint, marginTop: 2 }}>Gesamt</div>
          </div>
          <div style={cardStyle_}>
            <div style={{ fontSize: 20, fontWeight: 700, color: th.gold }}>{formatDuration(userData?.sessions ? Math.round((userData.totalMinutes || 0) / userData.sessions) : 0)}</div>
            <div style={{ fontSize: 10, color: th.faint, marginTop: 2 }}>Ø Dauer</div>
          </div>
        </div>

        {userSessionsLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}><Icon.Spinner color={th.gold} size={24} /></div>
        ) : userSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: th.faint }}>Keine Sessions gefunden.</div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.sm }}>Session Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {userSessions.map((s: any) => (
                <div key={s.id} data-testid={`admin-session-entry-${s.id}`} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: `${SP.sm}px ${SP.md}px`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: s.durationMinutes > 0 ? th.gold : th.faint, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(s.startedAt)}</span>
                      <span style={{ fontSize: 12, color: th.muted }}>{formatTime(s.startedAt)} – {formatTime(s.endedAt)}</span>
                    </div>
                    {s.pageContext && <div style={{ fontSize: 11, color: th.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.pageContext}</div>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: th.gold, flexShrink: 0 }}>{formatDuration(s.durationMinutes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div data-testid="admin-sessions-tab">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Live color={th.gold} size={16} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Session Tracking</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {rangeOpts.map(opt => (
            <button key={opt.value} data-testid={`admin-sessions-range-${opt.value}`} onClick={() => setTimeRange(opt.value)} style={pillStyle(timeRange === opt.value)}>{opt.label}</button>
          ))}
        </div>
      </div>

      {summaryLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}><Icon.Spinner color={th.gold} size={24} /></div>
      ) : !summary ? (
        <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: th.faint }}>Keine Daten verfügbar.</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
            {[
              { label: 'Sessions', value: summary.totalSessions ?? 0 },
              { label: 'Aktive Nutzer', value: summary.uniqueUsers ?? summary.activeUsers ?? 0 },
              { label: 'Ø Dauer', value: formatDuration(summary.avgDurationMinutes ?? Math.round((summary.avgDuration || 0) / 60)) },
              { label: 'Gesamtzeit', value: formatDuration(summary.totalMinutes ?? Math.round((summary.totalTime || 0) / 60)) },
            ].map((s, i) => (
              <div key={i} data-testid={`admin-sessions-stat-${i}`} style={cardStyle_}>
                <div style={{ fontSize: 22, fontWeight: 700, color: th.gold, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: th.faint, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {(summary.byHour || []).length > 0 && (
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.lg }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.sm }}>Aktivität nach Stunde</div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '32px repeat(24, 1fr)', gap: 2 }}>
                  <div />
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: 8, color: th.faint }}>{i}</div>
                  ))}
                  {heatmapData().map((row, dayIdx) => (
                    <Fragment key={dayIdx}>
                      <div style={{ fontSize: 9, color: th.faint, display: 'flex', alignItems: 'center' }}>{dayLabels[dayIdx]}</div>
                      {row.map((val, hourIdx) => {
                        const intensity = val / heatmapMax()
                        return (
                          <div
                            key={`${dayIdx}-${hourIdx}`}
                            data-testid={`admin-heatmap-${dayIdx}-${hourIdx}`}
                            style={{
                              aspectRatio: '1', borderRadius: 2, minWidth: 6,
                              background: val === 0
                                ? th.bgHover
                                : `rgba(${th.gold === '#d4a847' ? '212,168,71' : '184,137,42'}, ${0.15 + intensity * 0.85})`
                            }}
                            title={`${dayLabels[dayIdx]} ${hourIdx}:00 – ${val} Sessions`}
                          />
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(summary.byDay || []).length > 0 && (
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.lg }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.sm }}>Tägliche Aktivität</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80 }}>
                {summary.byDay.map((d: any) => {
                  const maxS = Math.max(...summary.byDay.map((x: any) => x.sessions), 1)
                  const pct = (d.sessions / maxS) * 100
                  return (
                    <div
                      key={d.date}
                      data-testid={`admin-daily-bar-${d.date}`}
                      style={{
                        flex: 1, borderRadius: '3px 3px 0 0', minWidth: 3,
                        height: `${Math.max(pct, 4)}%`,
                        background: th.gold,
                        opacity: 0.7 + (pct / 100) * 0.3
                      }}
                      title={`${d.date}: ${d.sessions} Sessions, ${d.uniqueUsers} Nutzer`}
                    />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 9, color: th.faint }}>{summary.byDay[0]?.date}</span>
                <span style={{ fontSize: 9, color: th.faint }}>{summary.byDay[summary.byDay.length - 1]?.date}</span>
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
              <Icon.TabWorld color={th.muted} size={14} />
              <span style={{ fontSize: 12, fontWeight: 600, color: th.muted }}>Nutzer ({filteredUsers.length})</span>
            </div>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Nutzer suchen…"
              data-testid="admin-sessions-user-search"
              style={{
                width: '100%', minHeight: 40, borderRadius: 12, border: `1px solid ${th.border}`,
                background: th.inputBg, color: th.text, fontSize: 14, padding: '8px 12px',
                outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm
              }} />
            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 14, color: th.faint }}>Keine Nutzer gefunden.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredUsers.map((u: any) => (
                  <button key={u.id} data-testid={`admin-sessions-user-${u.id}`}
                    onClick={() => setSelectedUser(u.id)}
                    style={{
                      background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12,
                      padding: `${SP.sm}px ${SP.md}px`, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                      fontFamily: 'DM Sans, sans-serif', color: th.text
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                      {u.email && <div style={{ fontSize: 11, color: th.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: th.gold }}>{u.sessions} Sessions</div>
                      <div style={{ fontSize: 11, color: th.faint }}>{formatDuration(u.totalMinutes)} gesamt</div>
                      <div style={{ fontSize: 10, color: th.faint }}>{formatRelative(u.lastActive)}</div>
                    </div>
                    <Icon.ChevronRight color={th.faint} size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AnalyticsTab({ th, participantId }: { th: ThemeTokens; participantId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/analytics?requesterId=${participantId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setData(null); setLoading(false) })
  }, [participantId])

  const cardStyle_: React.CSSProperties = {
    background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center'
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '48px 0' }}><Icon.Spinner color={th.gold} size={24} /></div>
  if (!data) return <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: th.faint }}>Keine Analytics-Daten verfügbar.</div>

  return (
    <div data-testid="admin-analytics-tab">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { label: 'Bewertungen', value: data.totalRatings || 0, color: th.gold },
          { label: 'Whiskies', value: data.totalWhiskies || 0, color: th.phases.nose.accent },
          { label: 'Tastings', value: data.totalTastings || 0, color: th.phases.palate.accent },
          { label: 'Teilnehmer', value: data.totalParticipants || 0, color: th.green },
        ].map(s => (
          <div key={s.label} data-testid={`admin-analytics-${s.label.toLowerCase()}`} style={cardStyle_}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: th.faint, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {data.topWhiskies?.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: SP.sm }}>Top Whiskies</div>
          {data.topWhiskies.slice(0, 10).map((w: any, i: number) => (
            <div key={w.id || i} data-testid={`admin-analytics-whisky-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {w.name || '—'}</span>
                {w.distillery && <span style={{ fontSize: 11, color: th.faint, marginLeft: 6 }}>{w.distillery}</span>}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: th.gold, fontFamily: 'Playfair Display, serif' }}>{Number(w.avgScore).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
