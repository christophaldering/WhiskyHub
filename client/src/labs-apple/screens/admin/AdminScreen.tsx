// CaskSense Apple — AdminScreen (Phase F)
import React, { useState, useEffect, useCallback } from 'react'
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

type AppleAdminTab = 'overview' | 'participants' | 'tastings' | 'cleanup'

const TAB_LABELS: Record<AppleAdminTab, string> = {
  overview: 'Übersicht',
  participants: 'Nutzer',
  tastings: 'Tastings',
  cleanup: 'Cleanup',
}

const dangerColor = '#e04040'
const infoColor = '#5a9fd4'

const selectBase = (th: ThemeTokens): React.CSSProperties => ({
  padding: '6px 10px', borderRadius: 10, border: `1px solid ${th.border}`,
  background: th.inputBg, color: th.text, fontSize: 13, fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
})

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
        <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg, overflowX: 'auto' }} data-testid="admin-tabs">
          {(Object.keys(TAB_LABELS) as AppleAdminTab[]).map(id => (
            <button key={id} onClick={() => setTab(id)} data-testid={`admin-tab-${id}`} style={{
              flex: 1, minWidth: 70, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer',
              background: tab === id ? th.gold : th.bgCard,
              color: tab === id ? '#1a0f00' : th.muted,
              fontSize: 13, fontWeight: tab === id ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0,
            }}>{TAB_LABELS[id]}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: SP.xxl }}>
            <Icon.Spinner color={th.gold} size={28} />
          </div>
        )}

        {!loading && error && (
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
