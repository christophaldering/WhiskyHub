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

type AppleAdminTab = 'overview' | 'participants' | 'tastings' | 'cleanup' | 'online' | 'activity' | 'sessions' | 'analytics' | 'ai' | 'newsletter' | 'changelog' | 'settings' | 'communities' | 'aromas' | 'feedback' | 'historical' | 'makingof'

const TAB_CONFIG: { id: AppleAdminTab; label: string }[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'participants', label: 'Nutzer' },
  { id: 'tastings', label: 'Tastings' },
  { id: 'cleanup', label: 'Cleanup' },
  { id: 'online', label: 'Online' },
  { id: 'activity', label: 'Aktivität' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ai', label: 'AI' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'settings', label: 'Settings' },
  { id: 'communities', label: 'Communities' },
  { id: 'aromas', label: 'Aromas' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'historical', label: 'Historical' },
  { id: 'makingof', label: 'Making-Of' },
]

interface Participant {
  id: string; name: string; email: string | null; role: string;
  isAdmin?: boolean; emailVerified?: boolean; newsletterOptIn?: boolean;
  makingOfAccess?: boolean;
}

const cardStyle = (th: ThemeTokens): React.CSSProperties => ({
  background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm,
})

const inputStyle = (th: ThemeTokens): React.CSSProperties => ({
  width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`,
  background: th.inputBg, color: th.text, fontSize: 14, padding: '10px 14px',
  outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const,
})

const btnPrimary = (th: ThemeTokens, disabled?: boolean): React.CSSProperties => ({
  height: 40, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? th.faint : th.gold, color: '#1a0f00',
  fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', padding: '0 16px',
  opacity: disabled ? 0.5 : 1,
})

const btnSecondary = (th: ThemeTokens): React.CSSProperties => ({
  height: 36, borderRadius: 10, border: `1px solid ${th.border}`, cursor: 'pointer',
  background: th.bgCard, color: th.muted,
  fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans, sans-serif', padding: '0 12px',
})

const sectionLabel = (th: ThemeTokens): React.CSSProperties => ({
  fontSize: 12, color: th.faint, marginBottom: SP.sm, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
})

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

const ToggleSwitch: React.FC<{ on: boolean; onToggle: () => void; th: ThemeTokens; disabled?: boolean; testId?: string }> = ({ on, onToggle, th, disabled, testId }) => (
  <button onClick={onToggle} disabled={disabled} data-testid={testId} style={{
    width: 44, height: 24, borderRadius: 12, border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    background: on ? th.green : th.faint, position: 'relative', transition: 'background 0.2s',
    opacity: disabled ? 0.5 : 1, flexShrink: 0,
  }}>
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: '#fff',
      position: 'absolute', top: 3,
      left: on ? 23 : 3, transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }} />
  </button>
)

const LoadingSpinner: React.FC<{ th: ThemeTokens }> = ({ th }) => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
    <Icon.Spinner color={th.gold} size={24} />
  </div>
)

const safeFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text().catch(() => 'Request failed')
    throw new Error(text)
  }
  return res.json()
}

export const AdminScreen: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [tab, setTab] = useState<AppleAdminTab>('overview')
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [parts, setParts] = useState<Participant[]>([])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(false)
    adminApi.getOverview(participantId)
      .then((d: AdminOverview) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [participantId])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fetch(`/api/admin/participants?participantId=${participantId}`).then(r => r.ok ? r.json() : []).then(setParts).catch(() => {})
  }, [participantId])

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} data-testid="admin-back" style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Admin</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${th.gold}20`, color: th.gold, marginLeft: 4 }}>INTERN</span>
      </div>

      <div style={{ padding: `0 ${SP.md}px`, marginTop: SP.sm }}>
        <div data-testid="admin-tab-bar" style={{ display: 'flex', gap: SP.xs, overflowX: 'auto', paddingBottom: SP.sm, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' as any }}>
          {TAB_CONFIG.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} data-testid={`admin-tab-${id}`} style={{
              height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
              background: tab === id ? th.gold : th.bgCard,
              color: tab === id ? '#1a0f00' : th.muted,
              fontSize: 12, fontWeight: tab === id ? 700 : 400, padding: '0 14px', flexShrink: 0,
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: SP.md }}>
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
        {tab === 'ai' && <AITab th={th} pid={participantId} />}
        {tab === 'newsletter' && <NewsletterTab th={th} pid={participantId} participants={parts} />}
        {tab === 'changelog' && <ChangelogTab th={th} pid={participantId} />}
        {tab === 'settings' && <SettingsTab th={th} pid={participantId} />}
        {tab === 'communities' && <CommunitiesTab th={th} pid={participantId} participants={parts} />}
        {tab === 'aromas' && <AromasTab th={th} pid={participantId} />}
        {tab === 'feedback' && <FeedbackTab th={th} pid={participantId} />}
        {tab === 'historical' && <HistoricalTab th={th} pid={participantId} />}
        {tab === 'makingof' && <MakingOfTab th={th} pid={participantId} participants={parts} />}
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

function AITab({ th, pid }: { th: ThemeTokens; pid: string }) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<any>(null)
  const [features, setFeatures] = useState<any[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [masterDisabled, setMasterDisabled] = useState(false)
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([])
  const [usageData, setUsageData] = useState<any>(null)
  const [quotaInput, setQuotaInput] = useState('20')
  const [saving, setSaving] = useState(false)
  const [savingQuota, setSavingQuota] = useState(false)
  const [msg, setMsg] = useState('')

  const loadData = async () => {
    try {
      const [settingsRes, usageRes] = await Promise.all([
        fetch(`/api/admin/ai-settings?participantId=${pid}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/admin/ai-usage?participantId=${pid}`).then(r => r.ok ? r.json() : null),
      ])
      if (settingsRes) {
        setSettings(settingsRes.settings)
        setFeatures(settingsRes.features || [])
        setAuditLog(settingsRes.auditLog || [])
        setMasterDisabled(settingsRes.settings.ai_master_disabled)
        setDisabledFeatures(settingsRes.settings.ai_features_disabled || [])
      }
      if (usageRes) {
        setUsageData(usageRes)
        setQuotaInput(String(usageRes.quota ?? 20))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [pid])

  const saveSettings = async (md: boolean, df: string[]) => {
    setSaving(true)
    try {
      await safeFetch('/api/admin/ai-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid, ai_master_disabled: md, ai_features_disabled: df }),
      })
      setMsg('Gespeichert')
      setTimeout(() => setMsg(''), 2000)
    } catch { setMsg('Fehler beim Speichern') }
    setSaving(false)
  }

  const toggleMaster = () => {
    const v = !masterDisabled
    setMasterDisabled(v)
    saveSettings(v, disabledFeatures)
  }

  const toggleFeature = (fid: string) => {
    const newDf = disabledFeatures.includes(fid) ? disabledFeatures.filter(f => f !== fid) : [...disabledFeatures, fid]
    setDisabledFeatures(newDf)
    saveSettings(masterDisabled, newDf)
  }

  const saveQuota = async () => {
    const val = parseInt(quotaInput, 10)
    if (isNaN(val) || val < 0) { setMsg('Ungültiger Wert'); return }
    setSavingQuota(true)
    try {
      await safeFetch('/api/admin/ai-quota', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid, quota: val }),
      })
      setMsg(`Quota: ${val === 0 ? 'Unbegrenzt' : val}`)
      loadData()
      setTimeout(() => setMsg(''), 2000)
    } catch { setMsg('Fehler') }
    setSavingQuota(false)
  }

  if (loading) return <LoadingSpinner th={th} />

  const usageList = usageData?.usage || []
  const quota = usageData?.quota ?? 20

  return (
    <div data-testid="admin-ai-tab">
      <div style={cardStyle(th)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
          <Icon.Shield color={th.gold} size={18} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>AI Kill Switch</span>
        </div>
        <div style={{ padding: SP.sm, borderRadius: 10, marginBottom: SP.md, fontSize: 11, background: th.bgHover, border: `1px solid ${th.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon.Shield color={th.gold} size={12} />
            <span style={{ fontWeight: 600, color: th.gold }}>Admin Bypass</span>
          </div>
          <span style={{ color: th.muted }}>Als Admin behältst du immer Zugriff auf alle AI-Features, auch wenn Features deaktiviert oder Limits erreicht sind.</span>
        </div>

        <div data-testid="admin-ai-master-toggle" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 14, borderRadius: 14, marginBottom: SP.md,
          border: `2px solid ${masterDisabled ? '#e53935' : th.green}`,
          background: masterDisabled ? 'rgba(229,57,53,0.08)' : `${th.green}10`,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Master Kill Switch</div>
            <div style={{ fontSize: 11, color: th.muted }}>{masterDisabled ? 'All AI features disabled (Admin bypass active)' : 'AI features active'}</div>
          </div>
          <ToggleSwitch on={!masterDisabled} onToggle={toggleMaster} th={th} testId="switch-ai-master" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
          {features.map((f: any) => {
            const disabled = disabledFeatures.includes(f.id)
            const effective = masterDisabled || disabled
            return (
              <div key={f.id} data-testid={`admin-ai-feature-${f.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 10, borderRadius: 10,
                border: `1px solid ${effective ? 'rgba(229,57,53,0.3)' : `${th.green}30`}`,
                background: effective ? 'rgba(229,57,53,0.05)' : `${th.green}08`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {effective
                    ? <span style={{ color: '#e53935', fontSize: 14 }}>✕</span>
                    : <Icon.CheckCircle color={th.green} size={14} />}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: th.faint, fontFamily: 'monospace' }}>{f.route}</div>
                  </div>
                </div>
                <ToggleSwitch on={!disabled} onToggle={() => toggleFeature(f.id)} th={th} disabled={masterDisabled} testId={`switch-ai-${f.id}`} />
              </div>
            )
          })}
        </div>
        {(saving || msg) && <div style={{ fontSize: 11, color: th.muted, marginTop: SP.sm }}>{saving ? 'Saving...' : msg}</div>}
      </div>

      <div style={cardStyle(th)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
          <Icon.Analytics color={th.gold} size={16} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Freikontingent (Plattform-Key)</span>
        </div>
        <p style={{ fontSize: 11, color: th.muted, marginBottom: SP.sm }}>
          Anzahl kostenloser AI-Anfragen pro User über den Plattform-Key. 0 = unbegrenzt.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="number" min="0" value={quotaInput} onChange={e => setQuotaInput(e.target.value)}
            data-testid="input-ai-quota" style={{ ...inputStyle(th), width: 100, flex: 'none' }} />
          <button onClick={saveQuota} disabled={savingQuota} data-testid="button-save-ai-quota" style={btnPrimary(th, savingQuota)}>
            {savingQuota ? '...' : 'Speichern'}
          </button>
          <span style={{ fontSize: 11, color: th.muted }}>
            Aktuell: {quota === 0 ? 'Unbegrenzt' : `${quota} Anfragen`}
          </span>
        </div>
      </div>

      <div style={cardStyle(th)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
          <Icon.Analytics color={th.gold} size={16} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>AI-Nutzung pro User</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: th.bgHover, color: th.muted }}>{usageList.length}</span>
        </div>
        {usageList.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: 24, fontSize: 12, color: th.faint }}>Noch keine AI-Nutzung über den Plattform-Key.</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: 'auto' as const }}>
            {usageList.map((u: any) => {
              const pct = quota > 0 ? Math.min(100, Math.round((u.requestCount / quota) * 100)) : 0
              const overLimit = quota > 0 && u.requestCount >= quota
              return (
                <div key={u.participantId} data-testid={`admin-ai-usage-${u.participantId}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
                  border: `1px solid ${th.border}`, marginBottom: 6,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</span>
                      {u.hasOwnKey && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: `${th.green}15`, color: th.green }}>Own Key</span>}
                      {overLimit && !u.hasOwnKey && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(229,57,53,0.1)', color: '#e53935' }}>Limit</span>}
                    </div>
                    {u.email && <div style={{ fontSize: 10, color: th.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {quota > 0 && (
                      <div style={{ width: 64, height: 6, borderRadius: 3, overflow: 'hidden', background: th.bgHover }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: overLimit ? '#e53935' : th.gold }} />
                      </div>
                    )}
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: overLimit ? '#e53935' : th.text, minWidth: 40, textAlign: 'right' as const }}>
                      {u.requestCount}{quota > 0 ? `/${quota}` : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {auditLog.length > 0 && (
        <div style={cardStyle(th)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
            <Icon.Report color={th.muted} size={16} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Audit Log</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' as const }}>
            {auditLog.map((entry: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, borderBottom: `1px solid ${th.border}` }}>
                <span style={{ fontSize: 10, whiteSpace: 'nowrap' as const, color: th.faint }}>{new Date(entry.createdAt).toLocaleString()}</span>
                <span style={{ fontWeight: 500 }}>{entry.actorName}</span>
                <span style={{ color: th.muted }}>{entry.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NewsletterTab({ th, pid, participants }: { th: ThemeTokens; pid: string; participants: Participant[] }) {
  const allWithEmail = participants.filter(p => p.email)
  const subscribers = participants.filter(p => p.newsletterOptIn && p.email)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/admin/newsletters?requesterId=${pid}`).then(r => r.ok ? r.json() : []).then(setNewsletters).catch(() => {})
  }, [pid])

  const toggleRecipient = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n
  })

  const handleGenerate = async (type: string) => {
    setGenerating(true)
    try {
      const result = await safeFetch('/api/admin/newsletters/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: pid, type }),
      })
      setSubject(result.subject || ''); setContentHtml(result.body || '')
      setMsg('Newsletter generiert')
    } catch { setMsg('Fehler bei Generierung') }
    setGenerating(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleSend = async () => {
    if (!subject.trim() || !contentHtml.trim() || selectedIds.size === 0) return
    setSending(true)
    try {
      const result = await safeFetch('/api/admin/newsletters/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: pid, subject, contentHtml, recipientIds: Array.from(selectedIds) }),
      })
      setMsg(`Newsletter an ${result.sent} Empfänger gesendet`)
      setSubject(''); setContentHtml(''); setSelectedIds(new Set())
      const nlRes = await fetch(`/api/admin/newsletters?requesterId=${pid}`).then(r => r.ok ? r.json() : [])
      setNewsletters(nlRes)
    } catch { setMsg('Fehler beim Senden') }
    setSending(false)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div data-testid="admin-newsletter-tab">
      <div style={cardStyle(th)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
          <Icon.Mail color={th.gold} size={16} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Compose Newsletter</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: SP.sm }}>
          {['welcome', 'update'].map(type => (
            <button key={type} onClick={() => handleGenerate(type)} disabled={generating} data-testid={`button-generate-${type}`}
              style={{ ...btnSecondary(th), flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {generating ? <Icon.Spinner color={th.muted} size={12} /> : <Icon.Sparkle color={th.muted} size={12} />}
              {type === 'welcome' ? 'Welcome' : 'Update'}
            </button>
          ))}
        </div>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Betreff..."
          data-testid="input-newsletter-subject" style={{ ...inputStyle(th), marginBottom: 8 }} />
        <textarea value={contentHtml} onChange={e => setContentHtml(e.target.value)} placeholder="Inhalt (HTML)..." rows={5}
          data-testid="input-newsletter-content" style={{ ...inputStyle(th), resize: 'vertical' as const, marginBottom: SP.sm }} />
        <div style={sectionLabel(th)}>Empfänger ({selectedIds.size} ausgewählt)</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: SP.sm }}>
          <button onClick={() => setSelectedIds(new Set(allWithEmail.map(p => p.id)))} data-testid="button-select-all-recipients" style={{ ...btnSecondary(th), fontSize: 11 }}>Alle ({allWithEmail.length})</button>
          <button onClick={() => setSelectedIds(new Set(subscribers.map(p => p.id)))} data-testid="button-select-subscribers" style={{ ...btnSecondary(th), fontSize: 11 }}>Abonnenten ({subscribers.length})</button>
          <button onClick={() => setSelectedIds(new Set())} data-testid="button-clear-recipients" style={{ ...btnSecondary(th), fontSize: 11 }}>Keine</button>
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' as const, marginBottom: SP.sm }}>
          {allWithEmail.map(p => (
            <label key={p.id} data-testid={`recipient-${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, cursor: 'pointer', borderBottom: `1px solid ${th.border}` }}>
              <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleRecipient(p.id)} />
              <span>{p.name}</span>
              <span style={{ color: th.faint, fontSize: 11, flex: 1 }}>{p.email}</span>
              {p.newsletterOptIn && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: `${th.green}15`, color: th.green }}>Sub</span>}
            </label>
          ))}
        </div>
        <button onClick={handleSend} disabled={!subject.trim() || !contentHtml.trim() || selectedIds.size === 0 || sending} data-testid="button-send-newsletter"
          style={{ ...btnPrimary(th, !subject.trim() || !contentHtml.trim() || selectedIds.size === 0 || sending), width: '100%', marginTop: SP.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {sending ? <Icon.Spinner color="#1a0f00" size={14} /> : <Icon.Mail color="#1a0f00" size={14} />}
          {sending ? 'Senden...' : 'Newsletter senden'}
        </button>
        {msg && <div style={{ fontSize: 11, color: th.gold, marginTop: 8 }}>{msg}</div>}
      </div>

      {newsletters.length > 0 && (
        <div style={cardStyle(th)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
            <Icon.History color={th.muted} size={16} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Archiv</span>
          </div>
          {newsletters.map((nl: any) => (
            <div key={nl.id} data-testid={`newsletter-archive-${nl.id}`} style={{ padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{nl.subject}</div>
              <div style={{ fontSize: 11, color: th.faint, marginTop: 2 }}>
                Gesendet: {nl.sentAt ? new Date(nl.sentAt).toLocaleDateString() : '-'} · Empfänger: {nl.recipientCount || 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChangelogTab({ th, pid }: { th: ThemeTokens; pid: string }) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('feature')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [visible, setVisible] = useState(true)
  const [msg, setMsg] = useState('')

  const CATEGORIES = [
    { value: 'feature', label: 'Feature', emoji: '🚀' },
    { value: 'improvement', label: 'Improvement', emoji: '🔧' },
    { value: 'bugfix', label: 'Bugfix', emoji: '🐛' },
    { value: 'security', label: 'Security', emoji: '🛡️' },
    { value: 'design', label: 'Design/UX', emoji: '🎨' },
  ]

  const loadEntries = async () => {
    try {
      const res = await fetch(`/api/admin/changelog?participantId=${pid}`)
      if (res.ok) setEntries(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [pid])

  const resetForm = () => { setShowForm(false); setEditingId(null); setTitle(''); setDescription(''); setCategory('feature'); setDate(new Date().toISOString().split('T')[0]); setVisible(true) }

  const startEdit = (entry: any) => {
    setEditingId(entry.id); setTitle(entry.title); setDescription(entry.description)
    setCategory(entry.category); setDate(entry.date); setVisible(entry.visible); setShowForm(true)
  }

  const handleSave = async () => {
    try {
      if (editingId) {
        await safeFetch(`/api/admin/changelog/${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: pid, title, description, category, date, visible }),
        })
      } else {
        await safeFetch('/api/admin/changelog', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: pid, title, description, category, date, visible }),
        })
      }
      resetForm(); loadEntries()
      setMsg(editingId ? 'Aktualisiert' : 'Erstellt')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return
    try {
      await safeFetch(`/api/admin/changelog/${id}?participantId=${pid}`, { method: 'DELETE' })
      loadEntries(); setMsg('Gelöscht')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleToggleVisibility = async (entry: any) => {
    try {
      await safeFetch(`/api/admin/changelog/${entry.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid, visible: !entry.visible }),
      })
      loadEntries()
    } catch {}
  }

  if (loading) return <LoadingSpinner th={th} />

  return (
    <div data-testid="admin-changelog-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
        <span style={{ fontSize: 12, color: th.faint }}>{entries.length} Einträge</span>
        <button onClick={() => { resetForm(); setShowForm(true) }} data-testid="button-changelog-add" style={btnPrimary(th)}>
          + Neuer Eintrag
        </button>
      </div>
      {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}

      {showForm && (
        <div style={{ ...cardStyle(th), marginBottom: SP.md }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel..."
            data-testid="input-changelog-title" style={{ ...inputStyle(th), marginBottom: 8 }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beschreibung..." rows={3}
            data-testid="input-changelog-description" style={{ ...inputStyle(th), resize: 'vertical' as const, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: SP.sm }}>
            <select value={category} onChange={e => setCategory(e.target.value)} data-testid="select-changelog-category"
              style={{ ...inputStyle(th), width: 'auto', flex: '1 1 120px', fontSize: 12 }}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-changelog-date"
              style={{ ...inputStyle(th), width: 'auto', flex: '1 1 120px', fontSize: 12 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} data-testid="checkbox-changelog-visible" /> Sichtbar
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={!title || !description} data-testid="button-changelog-save" style={btnPrimary(th, !title || !description)}>
              {editingId ? 'Aktualisieren' : 'Erstellen'}
            </button>
            <button onClick={resetForm} data-testid="button-changelog-cancel" style={btnSecondary(th)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
        {entries.map((entry: any) => {
          const cat = CATEGORIES.find(c => c.value === entry.category)
          return (
            <div key={entry.id} data-testid={`changelog-entry-${entry.id}`} style={{ ...cardStyle(th), opacity: entry.visible ? 1 : 0.5, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>{cat?.emoji || '📝'}</span>
                    <span style={{ fontSize: 11, color: th.faint }}>{new Date(entry.date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{entry.title}</div>
                  <div style={{ fontSize: 11, color: th.muted, marginTop: 2 }}>{entry.description}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  <button onClick={() => handleToggleVisibility(entry)} data-testid={`button-changelog-visibility-${entry.id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    {entry.visible ? <Icon.Eye color={th.muted} size={14} /> : <Icon.EyeOff color={th.faint} size={14} />}
                  </button>
                  <button onClick={() => startEdit(entry)} data-testid={`button-changelog-edit-${entry.id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Icon.Edit color={th.muted} size={14} />
                  </button>
                  <button onClick={() => handleDelete(entry.id)} data-testid={`button-changelog-delete-${entry.id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Icon.Trash color="#e53935" size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SettingsTab({ th, pid }: { th: ThemeTokens; pid: string }) {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [bannerText, setBannerText] = useState('')
  const [msg, setMsg] = useState('')

  const loadSettings = async () => {
    try {
      const res = await fetch(`/api/admin/app-settings?requesterId=${pid}`)
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setBannerText(data.whats_new_text || '')
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadSettings() }, [pid])

  const updateSetting = async (updates: Record<string, string>) => {
    try {
      await safeFetch('/api/admin/app-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: pid, settings: updates }),
      })
      loadSettings()
      setMsg('Gespeichert')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  if (loading || !settings) return <LoadingSpinner th={th} />

  const items = [
    { key: 'whats_new_enabled', label: "What's New Banner", desc: 'Show announcement banner' },
    { key: 'guest_mode_enabled', label: 'Guest Mode', desc: 'Allow guest access' },
    { key: 'registration_open', label: 'Registration', desc: 'Allow new registrations' },
    { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Show maintenance page' },
    { key: 'friend_online_notifications', label: 'Friend Online Notifications', desc: 'Allow friend notifications' },
  ]

  return (
    <div data-testid="admin-settings-tab">
      <div style={cardStyle(th)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
          <Icon.Settings color={th.gold} size={16} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>App Settings</span>
        </div>
        {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {items.map(item => (
            <div key={item.key} data-testid={`setting-${item.key}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 12, borderRadius: 12, border: `1px solid ${th.border}`,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: th.faint }}>{item.desc}</div>
              </div>
              <ToggleSwitch on={settings[item.key] === 'true'} onToggle={() => updateSetting({ [item.key]: String(settings[item.key] !== 'true') })} th={th} testId={`switch-${item.key}`} />
            </div>
          ))}
        </div>
        {settings.whats_new_enabled === 'true' && (
          <div style={{ marginTop: SP.sm }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Banner Text</label>
            <input type="text" value={bannerText} onChange={e => setBannerText(e.target.value)}
              onBlur={() => updateSetting({ whats_new_text: bannerText })} placeholder="What's new message..."
              data-testid="input-whats-new-text" style={inputStyle(th)} />
          </div>
        )}
      </div>
    </div>
  )
}

function CommunitiesTab({ th, pid, participants }: { th: ThemeTokens; pid: string; participants: Participant[] }) {
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSelectedId, setMemberSelectedId] = useState<string | null>(null)
  const [memberRole, setMemberRole] = useState('member')
  const [showDropdown, setShowDropdown] = useState(false)
  const [msg, setMsg] = useState('')

  const loadCommunities = async () => {
    try {
      const res = await fetch('/api/admin/communities', { headers: { 'x-participant-id': pid } })
      if (res.ok) setCommunities(await res.json())
    } catch {}
    setLoading(false)
  }

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/communities/${id}`, { headers: { 'x-participant-id': pid } })
      if (res.ok) setDetail(await res.json())
    } catch {}
  }

  useEffect(() => { loadCommunities() }, [pid])
  useEffect(() => { if (selectedId) loadDetail(selectedId) }, [selectedId])

  const handleSeed = async () => {
    if (!confirm('Community seeden?')) return
    try {
      await safeFetch('/api/admin/communities/seed', { method: 'POST', headers: { 'x-participant-id': pid, 'Content-Type': 'application/json' } })
      loadCommunities()
      setMsg('Seed erfolgreich')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleAddMember = async () => {
    if (!memberSelectedId || !selectedId || !detail) return
    try {
      await safeFetch(`/api/admin/communities/${detail.id}/members`, {
        method: 'POST', headers: { 'x-participant-id': pid, 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: memberSelectedId, role: memberRole }),
      })
      setMemberSearch(''); setMemberSelectedId(null)
      loadDetail(selectedId); loadCommunities()
      setMsg('Mitglied hinzugefügt')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Mitglied entfernen?') || !detail) return
    try {
      await safeFetch(`/api/admin/communities/${detail.id}/members/${memberId}`, { method: 'DELETE', headers: { 'x-participant-id': pid } })
      loadDetail(selectedId!); loadCommunities()
      setMsg('Mitglied entfernt')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  if (loading) return <LoadingSpinner th={th} />

  if (selectedId && detail) {
    const members = detail.members || []
    return (
      <div data-testid="admin-community-detail">
        <button onClick={() => { setSelectedId(null); setDetail(null) }} data-testid="button-back-communities"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: th.gold, fontSize: 12, fontWeight: 500, marginBottom: SP.md, padding: 0 }}>
          <Icon.Back color={th.gold} size={14} /> Zurück
        </button>
        <div style={cardStyle(th)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
            <Icon.Globe color={th.gold} size={18} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{detail.name}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{detail.slug}</div>
            </div>
          </div>
          {detail.description && <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.sm }}>{detail.description}</div>}
        </div>

        <div style={cardStyle(th)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: SP.sm }}>
            <Icon.Users color={th.gold} size={16} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Mitglieder</span>
            <span style={{ fontSize: 11, color: th.faint }}>({members.length})</span>
          </div>
          {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}

          <div style={{ display: 'flex', gap: 6, marginBottom: SP.sm }}>
            <div style={{ flex: 1, position: 'relative' as const }}>
              <input type="text" value={memberSearch} placeholder="Suche nach Name/Email..."
                data-testid="input-add-member-search"
                onChange={e => { setMemberSearch(e.target.value); setMemberSelectedId(null); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                style={{ ...inputStyle(th), fontSize: 12 }} />
              {showDropdown && memberSearch.trim().length > 0 && !memberSelectedId && (() => {
                const existingIds = new Set(members.map((m: any) => m.participantId))
                const filtered = participants.filter(p => !existingIds.has(p.id) && (p.name.toLowerCase().includes(memberSearch.toLowerCase()) || (p.email && p.email.toLowerCase().includes(memberSearch.toLowerCase())))).slice(0, 8)
                if (filtered.length === 0) return null
                return (
                  <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, borderRadius: 10, maxHeight: 200, overflowY: 'auto' as const, background: th.bgCard, border: `1px solid ${th.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    {filtered.map(p => (
                      <button key={p.id} data-testid={`member-option-${p.id}`} onClick={() => { setMemberSelectedId(p.id); setMemberSearch(p.name + (p.email ? ` (${p.email})` : '')); setShowDropdown(false) }}
                        style={{ display: 'flex', flexDirection: 'column' as const, gap: 2, width: '100%', padding: '8px 12px', textAlign: 'left' as const, background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', color: th.text }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</span>
                        {p.email && <span style={{ fontSize: 11, color: th.faint }}>{p.email}</span>}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
            <select value={memberRole} onChange={e => setMemberRole(e.target.value)} data-testid="select-member-role"
              style={{ ...inputStyle(th), width: 'auto', fontSize: 11 }}>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleAddMember} disabled={!memberSelectedId} data-testid="button-add-member"
              style={btnPrimary(th, !memberSelectedId)}>
              Hinzufügen
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {members.map((m: any) => (
              <div key={m.id} data-testid={`community-member-${m.participantId}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 8, borderRadius: 10, background: th.bgHover, border: `1px solid ${th.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon.TabWorld color={th.muted} size={14} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{m.participantName || m.participantEmail || m.participantId}</div>
                    <span style={{ fontSize: 10, color: th.faint, textTransform: 'uppercase' as const }}>{m.role} · {m.status}</span>
                  </div>
                </div>
                <button onClick={() => handleRemoveMember(m.participantId)} data-testid={`button-remove-member-${m.participantId}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <Icon.Trash color="#e53935" size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="admin-communities-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Globe color={th.gold} size={16} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Communities</span>
          <span style={{ fontSize: 12, color: th.faint }}>({communities.length})</span>
        </div>
        <button onClick={handleSeed} data-testid="button-seed-communities" style={btnSecondary(th)}>Seed</button>
      </div>
      {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}

      {communities.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 48, color: th.faint }}>
          <Icon.Globe color={th.faint} size={32} />
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: SP.sm }}>Keine Communities</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Nutze den Seed-Button.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {communities.map((c: any) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} data-testid={`community-${c.id}`}
              style={{ ...cardStyle(th), display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' as const, marginBottom: 0, width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon.Globe color={th.gold} size={14} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', gap: SP.sm, fontSize: 11, color: th.faint }}>
                  <span>{c.memberCount ?? 0} Mitglieder</span>
                  <span>{c.tastingCount ?? 0} Tastings</span>
                </div>
              </div>
              <Icon.ChevronRight color={th.faint} size={16} />
            </button>
          ))}
        </div>
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

interface FlavourCatAPI {
  id: string; en: string; de: string; color: string; sortOrder: number;
  descriptors: { id: string; categoryId: string; en: string; de: string; keywords: string[]; sortOrder: number }[];
}

function AromasTab({ th, pid }: { th: ThemeTokens; pid: string }) {
  const [categories, setCategories] = useState<FlavourCatAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [editCat, setEditCat] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState<string | null>(null)
  const [addingCat, setAddingCat] = useState(false)
  const [addingDescTo, setAddingDescTo] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/flavour-categories')
      if (res.ok) setCategories(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [])

  const handleSeed = async () => {
    try {
      await safeFetch('/api/admin/flavour-seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: pid }) })
      loadCategories(); setMsg('Seeded')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const createCategory = async () => {
    try {
      await safeFetch('/api/admin/flavour-categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid, ...form, sortOrder: categories.length }),
      })
      setAddingCat(false); setForm({}); loadCategories(); setMsg('Kategorie erstellt')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const updateCategory = async (catId: string) => {
    try {
      await safeFetch(`/api/admin/flavour-categories/${catId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: pid, ...form }),
      })
      setEditCat(null); setForm({}); loadCategories(); setMsg('Aktualisiert')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`"${name}" und alle Deskriptoren löschen?`)) return
    try {
      await safeFetch(`/api/admin/flavour-categories/${id}?participantId=${pid}`, { method: 'DELETE' })
      loadCategories(); setMsg('Gelöscht')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const createDescriptor = async (catId: string) => {
    try {
      await safeFetch('/api/admin/flavour-descriptors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: pid, id: `${catId}-${form.descId}`, categoryId: catId,
          en: form.descEn, de: form.descDe,
          keywords: (form.descKw || '').split(',').map(k => k.trim()).filter(Boolean),
          sortOrder: (categories.find(c => c.id === catId)?.descriptors.length || 0),
        }),
      })
      setAddingDescTo(null); setForm({}); loadCategories(); setMsg('Deskriptor erstellt')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const updateDescriptor = async (descId: string) => {
    try {
      await safeFetch(`/api/admin/flavour-descriptors/${descId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: pid, en: form.en, de: form.de,
          keywords: (form.keywords || '').split(',').map(k => k.trim()).filter(Boolean),
        }),
      })
      setEditDesc(null); setForm({}); loadCategories(); setMsg('Aktualisiert')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  const deleteDescriptor = async (id: string, name: string) => {
    if (!confirm(`"${name}" löschen?`)) return
    try {
      await safeFetch(`/api/admin/flavour-descriptors/${id}?participantId=${pid}`, { method: 'DELETE' })
      loadCategories(); setMsg('Gelöscht')
    } catch { setMsg('Fehler') }
    setTimeout(() => setMsg(''), 2000)
  }

  if (loading) return <LoadingSpinner th={th} />

  return (
    <div data-testid="admin-aromas-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌸</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Aroma Categories</span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: th.bgHover, color: th.muted }}>{categories.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {categories.length === 0 && (
            <button onClick={handleSeed} data-testid="button-aromas-seed" style={btnSecondary(th)}>Seed</button>
          )}
          <button onClick={() => { setAddingCat(true); setForm({ id: '', en: '', de: '', color: '#888888' }) }} data-testid="button-aromas-add-category" style={btnPrimary(th)}>
            + Kategorie
          </button>
        </div>
      </div>
      {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}

      {addingCat && (
        <div style={{ ...cardStyle(th), marginBottom: SP.md }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input placeholder="ID (slug)" value={form.id || ''} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} data-testid="input-cat-id" style={inputStyle(th)} />
            <input type="color" value={form.color || '#888888'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} data-testid="input-cat-color" style={{ ...inputStyle(th), padding: 2, height: 44 }} />
            <input placeholder="English name" value={form.en || ''} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} data-testid="input-cat-en" style={inputStyle(th)} />
            <input placeholder="German name" value={form.de || ''} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} data-testid="input-cat-de" style={inputStyle(th)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createCategory} disabled={!form.id || !form.en || !form.de} data-testid="button-save-cat" style={btnPrimary(th, !form.id || !form.en || !form.de)}>Speichern</button>
            <button onClick={() => { setAddingCat(false); setForm({}) }} data-testid="button-cancel-cat" style={btnSecondary(th)}>Abbrechen</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: SP.sm }}>
        {categories.map(cat => (
          <div key={cat.id} data-testid={`aromas-cat-${cat.id}`} style={cardStyle(th)}>
            {editCat === cat.id ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input value={form.en || ''} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} data-testid="input-edit-cat-en" style={inputStyle(th)} />
                  <input value={form.de || ''} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} data-testid="input-edit-cat-de" style={inputStyle(th)} />
                  <input type="color" value={form.color || '#888888'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} data-testid="input-edit-cat-color" style={{ ...inputStyle(th), padding: 2, height: 44 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateCategory(cat.id)} data-testid="button-update-cat" style={btnPrimary(th)}>Speichern</button>
                  <button onClick={() => { setEditCat(null); setForm({}) }} data-testid="button-cancel-edit-cat" style={btnSecondary(th)}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 6, background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.en}</span>
                  <span style={{ fontSize: 12, color: th.faint }}>/ {cat.de}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: th.bgHover, color: th.faint }}>{cat.descriptors.length} desc.</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditCat(cat.id); setForm({ en: cat.en, de: cat.de, color: cat.color }) }} data-testid={`button-edit-cat-${cat.id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Icon.Edit color={th.muted} size={14} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id, cat.en)} data-testid={`button-delete-cat-${cat.id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Icon.Trash color="#e53935" size={14} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 }}>
              {cat.descriptors.map(desc => (
                <div key={desc.id} data-testid={`aromas-desc-${desc.id}`}>
                  {editDesc === desc.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' as const, background: th.bgHover, borderRadius: 8, padding: '4px 8px' }}>
                      <input value={form.en || ''} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} placeholder="EN" data-testid="input-edit-desc-en" style={{ ...inputStyle(th), width: 80, padding: '4px 8px', fontSize: 11 }} />
                      <input value={form.de || ''} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} placeholder="DE" data-testid="input-edit-desc-de" style={{ ...inputStyle(th), width: 80, padding: '4px 8px', fontSize: 11 }} />
                      <input value={form.keywords || ''} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="Keywords (komma-sep.)" data-testid="input-edit-desc-keywords" style={{ ...inputStyle(th), width: 120, padding: '4px 8px', fontSize: 11 }} />
                      <button onClick={() => updateDescriptor(desc.id)} data-testid="button-update-desc"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <Icon.CheckCircle color={th.green} size={14} />
                      </button>
                      <button onClick={() => { setEditDesc(null); setForm({}) }} data-testid="button-cancel-edit-desc"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <span style={{ color: th.faint, fontSize: 14 }}>✕</span>
                      </button>
                    </div>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 10px', borderRadius: 20, border: `1px solid ${th.border}`, color: th.muted }}>
                      {desc.en}
                      <button onClick={() => { setEditDesc(desc.id); setForm({ en: desc.en, de: desc.de, keywords: (desc.keywords || []).join(', ') }) }} data-testid={`button-edit-desc-${desc.id}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                        <Icon.Edit color={th.faint} size={10} />
                      </button>
                      <button onClick={() => deleteDescriptor(desc.id, desc.en)} data-testid={`button-delete-desc-${desc.id}`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                        <span style={{ color: '#e53935', fontSize: 10 }}>✕</span>
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {addingDescTo === cat.id ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' as const, background: th.bgHover, borderRadius: 8, padding: '4px 8px' }}>
                <input placeholder="ID (slug)" value={form.descId || ''} onChange={e => setForm(f => ({ ...f, descId: e.target.value }))} data-testid="input-new-desc-id" style={{ ...inputStyle(th), width: 70, padding: '4px 8px', fontSize: 11 }} />
                <input placeholder="EN" value={form.descEn || ''} onChange={e => setForm(f => ({ ...f, descEn: e.target.value }))} data-testid="input-new-desc-en" style={{ ...inputStyle(th), width: 70, padding: '4px 8px', fontSize: 11 }} />
                <input placeholder="DE" value={form.descDe || ''} onChange={e => setForm(f => ({ ...f, descDe: e.target.value }))} data-testid="input-new-desc-de" style={{ ...inputStyle(th), width: 70, padding: '4px 8px', fontSize: 11 }} />
                <input placeholder="Keywords" value={form.descKw || ''} onChange={e => setForm(f => ({ ...f, descKw: e.target.value }))} data-testid="input-new-desc-keywords" style={{ ...inputStyle(th), width: 100, padding: '4px 8px', fontSize: 11 }} />
                <button onClick={() => createDescriptor(cat.id)} disabled={!form.descId || !form.descEn || !form.descDe} data-testid="button-save-desc"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: !form.descId || !form.descEn || !form.descDe ? 0.4 : 1 }}>
                  <Icon.CheckCircle color={th.green} size={14} />
                </button>
                <button onClick={() => { setAddingDescTo(null); setForm({}) }} data-testid="button-cancel-desc"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <span style={{ color: th.faint, fontSize: 14 }}>✕</span>
                </button>
              </div>
            ) : (
              <button onClick={() => { setAddingDescTo(cat.id); setForm({}) }} data-testid={`button-add-desc-${cat.id}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.faint, fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon.Add color={th.faint} size={12} /> Deskriptor hinzufügen
              </button>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && !addingCat && (
        <div style={{ textAlign: 'center' as const, padding: 48 }} data-testid="admin-aromas-empty">
          <span style={{ fontSize: 40 }}>🌸</span>
          <div style={{ fontSize: 14, fontWeight: 500, marginTop: SP.sm }}>Keine Aroma-Kategorien</div>
          <div style={{ fontSize: 12, color: th.faint, marginTop: 4 }}>Seed aus den Standardwerten oder erstelle eigene.</div>
        </div>
      )}
    </div>
  )
}

function FeedbackTab({ th, pid }: { th: ThemeTokens; pid: string }) {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/feedback?participantId=${pid}`).then(r => r.ok ? r.json() : []).then(setFeedback).catch(() => {})
    .finally(() => setLoading(false))
  }, [pid])

  const icons: Record<string, string> = { bug: '🐛', feature: '💡', improvement: '🔧', other: '📝' }

  if (loading) return <LoadingSpinner th={th} />

  return (
    <div data-testid="admin-feedback-tab">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>User Feedback</span>
        <span style={{ fontSize: 12, color: th.faint }}>({feedback.length})</span>
      </div>
      {feedback.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 48, color: th.faint, fontSize: 14 }}>Noch kein Feedback.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {feedback.map((fb: any) => (
            <div key={fb.id} data-testid={`feedback-${fb.id}`} style={cardStyle(th)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{icons[fb.category] || '📝'}</span>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: th.gold }}>{fb.category}</span>
                {fb.participantName && <span style={{ fontSize: 10, color: th.faint }}>· {fb.participantName}</span>}
                {fb.createdAt && <span style={{ fontSize: 10, color: th.faint }}>· {new Date(fb.createdAt).toLocaleDateString()}</span>}
              </div>
              <div style={{ fontSize: 12, color: th.text, lineHeight: 1.5 }}>{fb.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoricalTab({ th, pid }: { th: ThemeTokens; pid: string }) {
  const [importRuns, setImportRuns] = useState<any[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [dryRunResult, setDryRunResult] = useState<any>(null)
  const [dryRunning, setDryRunning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/historical/import-runs', { headers: { 'x-participant-id': pid } })
      .then(r => r.ok ? r.json() : []).then(setImportRuns).catch(() => {})
      .finally(() => setRunsLoading(false))
  }, [pid])

  const handleDryRun = async () => {
    setDryRunning(true)
    try {
      const res = await fetch('/api/admin/historical/import?dryRun=true', { method: 'POST', headers: { 'x-participant-id': pid, 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error(await res.text())
      setDryRunResult(await res.json()); setMsg('Dry-run fertig')
    } catch (e: any) { setMsg(e.message || 'Fehler') }
    setDryRunning(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleImport = async () => {
    if (!confirm('Vollen Import starten?')) return
    setImporting(true)
    try {
      const res = await fetch('/api/admin/historical/import', { method: 'POST', headers: { 'x-participant-id': pid, 'Content-Type': 'application/json' } })
      if (!res.ok) throw new Error(await res.text())
      setDryRunResult(null); setMsg('Import abgeschlossen')
    } catch (e: any) { setMsg(e.message || 'Fehler') }
    setImporting(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const latestRun = importRuns?.[0] || null
  const statusColor = (s: string) => s === 'completed' ? th.green : s === 'failed' ? '#e53935' : s === 'running' ? th.gold : th.faint

  return (
    <div data-testid="admin-historical-tab">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
        <Icon.Report color={th.gold} size={16} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Historical Import</span>
      </div>
      {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}

      <div style={cardStyle(th)}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Latest Import Run</div>
        {runsLoading ? <LoadingSpinner th={th} /> : latestRun ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase' as const, background: `${statusColor(latestRun.status)}20`, color: statusColor(latestRun.status) }}>{latestRun.status}</span>
              {latestRun.createdAt && <span style={{ fontSize: 11, color: th.faint }}>{new Date(latestRun.createdAt).toLocaleString()}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[{ label: 'Rows Read', value: latestRun.rowsRead ?? 0 }, { label: 'Imported', value: latestRun.rowsImported ?? 0 }, { label: 'Skipped', value: latestRun.rowsSkipped ?? 0 }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' as const, padding: 8, borderRadius: 10, background: th.bgHover }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: th.faint }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <div style={{ textAlign: 'center' as const, padding: 16, fontSize: 12, color: th.faint }}>Keine Import-Runs bisher.</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: SP.sm }}>
        <button onClick={handleDryRun} disabled={dryRunning} data-testid="button-dry-run"
          style={{ ...btnSecondary(th), flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {dryRunning ? <Icon.Spinner color={th.muted} size={14} /> : <Icon.Play color={th.muted} size={14} />} Dry-Run
        </button>
        <button onClick={handleImport} disabled={importing} data-testid="button-full-import"
          style={{ ...btnPrimary(th, importing), flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {importing ? <Icon.Spinner color="#1a0f00" size={14} /> : <Icon.Report color="#1a0f00" size={14} />} Full Import
        </button>
      </div>

      {dryRunResult && (
        <div style={{ ...cardStyle(th), borderColor: th.gold }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon.Play color={th.gold} size={14} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Dry-Run Results</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 600, background: `${th.gold}15`, color: th.gold }}>DRY RUN</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ l: 'Rows Read', v: dryRunResult.rowsRead }, { l: 'Would Import', v: dryRunResult.rowsImported }, { l: 'Tastings', v: dryRunResult.tastingsCreated }, { l: 'Entries', v: dryRunResult.entriesCreated }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' as const, padding: 8, borderRadius: 10, background: th.bgHover }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{s.v}</div>
                <div style={{ fontSize: 10, color: th.faint }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MakingOfTab({ th, pid, participants: initialParticipants }: { th: ThemeTokens; pid: string; participants: Participant[] }) {
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [localParticipants, setLocalParticipants] = useState(initialParticipants)

  useEffect(() => { setLocalParticipants(initialParticipants) }, [initialParticipants])

  const toggleAccess = async (p: Participant) => {
    const newAccess = !p.makingOfAccess
    setLocalParticipants(prev => prev.map(pp => pp.id === p.id ? { ...pp, makingOfAccess: newAccess } : pp))
    try {
      await safeFetch(`/api/admin/participants/${p.id}/making-of-access`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access: newAccess, requesterId: pid }),
      })
      setMsg('Zugang aktualisiert')
    } catch {
      setLocalParticipants(prev => prev.map(pp => pp.id === p.id ? { ...pp, makingOfAccess: p.makingOfAccess } : pp))
      setMsg('Fehler')
    }
    setTimeout(() => setMsg(''), 2000)
  }

  const filtered = localParticipants.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const accessCount = localParticipants.filter(p => p.makingOfAccess || p.role === 'admin').length

  return (
    <div data-testid="admin-makingof-tab">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
        <Icon.BookOpen color={th.gold} size={16} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>The Making of CaskSense</span>
      </div>

      <div style={cardStyle(th)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Zugangs-Verwaltung</div>
            <div style={{ fontSize: 11, color: th.faint, marginTop: 2 }}>{accessCount} Teilnehmer haben Zugang</div>
          </div>
        </div>
        {msg && <div style={{ fontSize: 11, color: th.gold, marginBottom: 8 }}>{msg}</div>}

        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Teilnehmer suchen..."
          data-testid="input-search-makingof-access" style={{ ...inputStyle(th), marginBottom: SP.sm }} />

        <div style={{ maxHeight: 400, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 32, fontSize: 14, color: th.faint }}>Keine Ergebnisse</div>
          ) : filtered.map(p => {
            const hasAccess = p.makingOfAccess || p.role === 'admin'
            const isAdmin = p.role === 'admin'
            return (
              <div key={p.id} data-testid={`makingof-access-${p.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 10, borderRadius: 12,
                background: hasAccess ? `${th.gold}08` : 'transparent',
                border: `1px solid ${hasAccess ? `${th.gold}40` : th.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  {isAdmin ? <Icon.Shield color={th.gold} size={14} /> : <Icon.TabWorld color={th.faint} size={14} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: th.faint }}>
                      {p.email || 'Gast'}
                      {isAdmin && ' · Admin (immer Zugang)'}
                    </div>
                  </div>
                </div>
                <ToggleSwitch on={hasAccess} onToggle={() => toggleAccess(p)} th={th} disabled={isAdmin} testId={`switch-makingof-${p.id}`} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

