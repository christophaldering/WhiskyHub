import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

type CockpitTab = 'live' | 'lineup' | 'guests' | 'rating'
type DimKey = 'nose' | 'taste' | 'finish'
type RevealPresetKey = 'classic' | 'nameFirst' | 'photoFirst' | 'custom'
type RestartDialog = false | 'choose' | 'confirmClear'

type PresetDef = { labelKey: keyof Translations; order: string[][] }
const REVEAL_PRESETS: Record<RevealPresetKey, PresetDef> = {
  classic: {
    labelKey: 'cockpitPresetClassic',
    order: [["name"], ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "hostNotes", "hostSummary"], ["image"]],
  },
  nameFirst: {
    labelKey: 'cockpitPresetNameFirst',
    order: [["name", "distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "hostNotes", "hostSummary"], ["image"]],
  },
  photoFirst: {
    labelKey: 'cockpitPresetPhotoFirst',
    order: [["image"], ["name"], ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "hostNotes", "hostSummary"]],
  },
  custom: {
    labelKey: 'cockpitPresetCustom',
    order: [["name"], ["distillery"], ["age", "abv"], ["region", "country", "category"], ["caskInfluence", "peatLevel", "ppm"], ["bottler", "price"], ["image"]],
  },
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name', distillery: 'Destillerie', age: 'Alter', abv: 'ABV',
  region: 'Region', country: 'Land', category: 'Kategorie',
  caskInfluence: 'Fass', peatLevel: 'Torf', image: 'Foto',
  bottler: 'Abfüller', distilledYear: 'Dest.', bottledYear: 'Abgef.',
  hostNotes: 'Notizen', hostSummary: 'Zusammenfassung', price: 'Preis', ppm: 'PPM',
}

const AROMA_CHIPS: Record<DimKey, string[]> = {
  nose: ['Vanille', 'Honig', 'Karamell', 'Rauch', 'Torf', 'Zitrus', 'Apfel', 'Trockenfrüchte', 'Blumen', 'Malz', 'Eiche', 'Gewürze', 'Sherry', 'Schokolade', 'Toffee', 'Leder'],
  taste: ['Süß', 'Würzig', 'Fruchtig', 'Rauchig', 'Ölig', 'Cremig', 'Trocken', 'Salzig', 'Bitter', 'Wärmend', 'Reich', 'Weich'],
  finish: ['Lang', 'Mittel', 'Kurz', 'Wärmend', 'Trocken', 'Süß', 'Würzig', 'Rauchig', 'Pfeffrig', 'Eichig', 'Tanninig'],
}

function parseRevealOrder(tasting: any): string[][] {
  try {
    if (tasting?.revealOrder) {
      const parsed = JSON.parse(tasting.revealOrder)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { }
  return REVEAL_PRESETS.classic.order
}

function getRevealState(tasting: any, whiskyCount: number, t: Translations) {
  const stepGroups = parseRevealOrder(tasting)
  const maxSteps = stepGroups.length
  const guidedIdx = tasting?.guidedWhiskyIndex ?? -1
  const revealStep = tasting?.guidedRevealStep ?? 0
  const allComplete = whiskyCount > 0 && guidedIdx >= whiskyCount - 1 && revealStep >= maxSteps

  const stepLabels = stepGroups.map((group: string[]) => {
    const labels = group.map(f => FIELD_LABELS[f] || f)
    if (labels.length <= 2) return labels.join(' & ')
    return labels.slice(0, 2).join(' & ') + ' +'
  })

  let nextLabel = t.cockpitNextStep
  if (allComplete) {
    nextLabel = t.cockpitAllRevealed
  } else if (guidedIdx < 0) {
    nextLabel = t.cockpitFirstDram
  } else if (revealStep < maxSteps) {
    nextLabel = stepLabels[revealStep] ? `${t.cockpitRevealPrefix}: ${stepLabels[revealStep]}` : t.cockpitNextStep
  } else {
    nextLabel = t.cockpitNextDram
  }

  return { guidedIdx, revealStep, maxSteps, allComplete, stepLabels, nextLabel, stepGroups }
}

function getActivePreset(tasting: any): RevealPresetKey {
  if (!tasting?.revealOrder) return 'classic'
  try {
    const parsed = JSON.parse(tasting.revealOrder)
    for (const [key, preset] of Object.entries(REVEAL_PRESETS)) {
      if (JSON.stringify(preset.order) === JSON.stringify(parsed)) return key as RevealPresetKey
    }
    return 'custom'
  } catch { return 'classic' }
}

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string; onClose: () => void
}

export const HostCockpit: React.FC<Props> = ({ th, t, tastingId, participantId, onClose }) => {
  const [tasting, setTasting] = useState<any>(null)
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [ratings, setRatings] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<CockpitTab>('live')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [confirmAdvance, setConfirmAdvance] = useState(false)
  const [restartDialog, setRestartDialog] = useState<RestartDialog>(false)
  const [showPresetPicker, setShowPresetPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  const [localGuidedIdx, setLocalGuidedIdx] = useState<number | null>(null)
  const [localRevealStep, setLocalRevealStep] = useState<number | null>(null)

  const [hostRatingIdx, setHostRatingIdx] = useState(0)
  const [hostScores, setHostScores] = useState<Record<string, Record<DimKey, number>>>({})
  const [hostOverall, setHostOverall] = useState<Record<string, number>>({})
  const [hostOverride, setHostOverride] = useState<Record<string, boolean>>({})
  const [hostChips, setHostChips] = useState<Record<string, Record<DimKey, string[]>>>({})
  const [hostNotes, setHostNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ratingsLoadedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const headers = { 'x-participant-id': participantId }
      const [tr, wr, pr, rr] = await Promise.all([
        fetch(`/api/tastings/${tastingId}`, { headers }).then(r => r.json()),
        fetch(`/api/tastings/${tastingId}/whiskies`, { headers }).then(r => r.json()),
        fetch(`/api/tastings/${tastingId}/participants`, { headers }).then(r => r.json()),
        fetch(`/api/tastings/${tastingId}/ratings`, { headers }).then(r => r.json()),
      ])
      setTasting(tr)
      setWhiskies(wr || [])
      setParts(pr || [])
      setRatings(rr || [])
      setLocalGuidedIdx(null)
      setLocalRevealStep(null)
    } catch { }
  }, [tastingId, participantId])

  useEffect(() => { load(); const id = setInterval(load, 3000); return () => clearInterval(id) }, [load])

  useEffect(() => {
    if (!whiskies.length || !participantId || ratingsLoadedRef.current) return
    ratingsLoadedRef.current = true
    const loadRatings = async () => {
      for (const w of whiskies) {
        try {
          const res = await fetch(`/api/ratings/${participantId}/${w.id}`)
          if (res.ok) {
            const existing = await res.json()
            if (existing) {
              const def = 75
              const clamp = (v: number) => Math.max(60, Math.min(100, v))
              setHostScores(prev => ({ ...prev, [w.id]: { nose: clamp(existing.nose ?? def), taste: clamp(existing.taste ?? def), finish: clamp(existing.finish ?? def) } }))
              setHostOverall(prev => ({ ...prev, [w.id]: clamp(existing.overall ?? def) }))
              if (existing.notes) setHostNotes(prev => ({ ...prev, [w.id]: existing.notes }))
            }
          }
        } catch { }
      }
    }
    loadRatings()
  }, [whiskies.length, participantId, tasting?.ratingScale])

  const flash = (msg: string, dur = 2000) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), dur)
  }

  const isBlind = tasting?.blindMode ?? (tasting?.format === 'blind')
  const isGuided = tasting?.guidedMode ?? true
  const status = tasting?.status ?? 'draft'
  const isLive = status === 'open' || status === 'reveal'
  const isDraft = status === 'draft'
  const ratingScale = tasting?.ratingScale ?? 100
  const scaleDefault = 75

  const rv = useMemo(() => isBlind && tasting ? getRevealState(tasting, whiskies.length, t) : null, [tasting, whiskies.length, isBlind, t])

  const guidedIdx = localGuidedIdx ?? (tasting?.guidedWhiskyIndex ?? -1)
  const guidedRevealStep = localRevealStep ?? (tasting?.guidedRevealStep ?? 0)
  const currentDramIdx = isGuided ? Math.max(0, guidedIdx) : 0
  const activeWhisky = whiskies[currentDramIdx] || null

  const activePreset = useMemo(() => tasting ? getActivePreset(tasting) : 'classic', [tasting?.revealOrder])

  const ratingCountForWhisky = (wid: string) => {
    const pids = new Set(ratings.filter(r => r.whiskyId === wid || r.whiskeyId === wid).map(r => r.participantId))
    return pids.size
  }

  const partRatingStatus = (pid: string) => {
    const pr = ratings.filter(r => r.participantId === pid)
    if (!pr.length) return 'none' as const
    const ratedWhiskies = new Set(pr.map(r => r.whiskyId || r.whiskeyId))
    if (ratedWhiskies.size >= whiskies.length) return 'all' as const
    return 'partial' as const
  }

  const incompleteParticipants = useMemo(() => {
    if (!isGuided || guidedIdx < 0 || !whiskies[guidedIdx]) return []
    const wid = whiskies[guidedIdx].id
    const ratedPids = new Set(ratings.filter(r => (r.whiskyId || r.whiskeyId) === wid).map(r => r.participantId))
    return parts.filter(p => !ratedPids.has(p.id || p.participantId)).map(p => p.name || t.cockpitAnonymous)
  }, [isGuided, guidedIdx, whiskies, ratings, parts])

  const apiAction = async (url: string, method: string, body?: any) => {
    setLoading(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: t.cockpitError }))
        flash(d.error || d.message || t.cockpitError, 3000)
        return false
      }
      await load()
      return true
    } catch {
      flash(t.cockpitNetworkError, 3000)
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    await apiAction(`/api/tastings/${tastingId}/status`, 'PATCH', { status: 'open', hostId: participantId })
    if (whiskies.length > 0) {
      await apiAction(`/api/tastings/${tastingId}/guided-mode`, 'PATCH', { hostId: participantId, guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 })
    }
    flash(t.cockpitTastingStarted)
  }

  const handleAdvance = async () => {
    const isMovingToNextDram = guidedIdx >= 0 && (!isBlind || !rv || guidedRevealStep >= (rv?.maxSteps ?? 0))
    if (!confirmAdvance && isMovingToNextDram) {
      setConfirmAdvance(true)
      return
    }
    setConfirmAdvance(false)

    if (guidedIdx === -1) {
      setLocalGuidedIdx(0)
      setLocalRevealStep(0)
    } else if (isBlind && rv && guidedRevealStep < rv.maxSteps) {
      setLocalRevealStep(guidedRevealStep + 1)
    } else {
      setLocalGuidedIdx(guidedIdx + 1)
      setLocalRevealStep(0)
    }

    const ok = await apiAction(`/api/tastings/${tastingId}/guided-advance`, 'PATCH', { hostId: participantId })
    if (ok) flash(t.cockpitAdvanced)
  }

  const handleGoTo = async (whiskyIndex: number) => {
    await apiAction(`/api/tastings/${tastingId}/guided-goto`, 'POST', { hostId: participantId, whiskyIndex, revealStep: 0 })
  }

  const handleClose = async () => {
    await apiAction(`/api/tastings/${tastingId}/status`, 'PATCH', { status: 'closed', hostId: participantId })
    flash(t.cockpitTastingEnded)
    setConfirmEnd(false)
  }

  const handleRestart = async (clearRatings: boolean) => {
    await apiAction(`/api/tastings/${tastingId}/status`, 'PATCH', { status: 'open', hostId: participantId, clearRatings })
    flash(clearRatings ? t.cockpitTastingRestarted : t.cockpitTastingResumed)
    setRestartDialog(false)
  }

  const handlePresetChange = async (key: RevealPresetKey) => {
    const newOrder = JSON.stringify(REVEAL_PRESETS[key].order)
    await apiAction(`/api/tastings/${tastingId}/details`, 'PATCH', { hostId: participantId, revealOrder: newOrder })
    setShowPresetPicker(false)
    flash(`${t.cockpitPreset}: ${t[REVEAL_PRESETS[key].labelKey]}`)
  }

  const getScores = (wId: string): Record<DimKey, number> => hostScores[wId] || { nose: scaleDefault, taste: scaleDefault, finish: scaleDefault }
  const getOverall = (wId: string) => hostOverall[wId] ?? scaleDefault

  const saveRating = useCallback((wId: string, scores: Record<DimKey, number>, overall: number, notes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
          body: JSON.stringify({ participantId, whiskyId: wId, tastingId, nose: scores.nose, taste: scores.taste, finish: scores.finish, overall, notes }),
        })
      } catch { }
      setSaving(false)
    }, 800)
  }, [participantId, tastingId])

  const handleScoreChange = (wId: string, dim: DimKey, val: number) => {
    const current = getScores(wId)
    const updated = { ...current, [dim]: val }
    setHostScores(prev => ({ ...prev, [wId]: updated }))
    let overall: number
    if (!hostOverride[wId]) {
      overall = Math.round((updated.nose + updated.taste + updated.finish) / 3)
      setHostOverall(prev => ({ ...prev, [wId]: overall }))
    } else {
      overall = getOverall(wId)
    }
    saveRating(wId, updated, overall, hostNotes[wId] || '')
  }

  const handleOverallChange = (wId: string, val: number) => {
    setHostOverall(prev => ({ ...prev, [wId]: val }))
    setHostOverride(prev => ({ ...prev, [wId]: true }))
    saveRating(wId, getScores(wId), val, hostNotes[wId] || '')
  }

  const handleChipToggle = (wId: string, dim: DimKey, chip: string) => {
    setHostChips(prev => {
      const current = prev[wId] || { nose: [], taste: [], finish: [] }
      const dimChips = current[dim]
      const next = dimChips.includes(chip) ? dimChips.filter(c => c !== chip) : [...dimChips, chip]
      return { ...prev, [wId]: { ...current, [dim]: next } }
    })
  }

  const handleNotesChange = (wId: string, text: string) => {
    setHostNotes(prev => ({ ...prev, [wId]: text }))
    saveRating(wId, getScores(wId), getOverall(wId), text)
  }

  useEffect(() => {
    if (!whiskies.length) return
    const wId = whiskies[hostRatingIdx]?.id
    if (!wId || !hostScores[wId]) return
    const sc = getScores(wId)
    const ov = getOverall(wId)
    saveRating(wId, sc, ov, hostNotes[wId] || '')
  }, [hostChips])

  const totalParticipants = parts.length
  const totalRatings = ratings.length
  const totalExpected = whiskies.length * totalParticipants
  const overallProgress = totalExpected > 0 ? Math.round((totalRatings / totalExpected) * 100) : 0

  const statusColor = status === 'open' ? th.green : status === 'draft' ? th.gold : th.faint
  const statusLabel = status === 'open' ? t.cockpitTabLive : status === 'draft' ? t.cockpitDraft : status === 'closed' ? t.cockpitEnded : status === 'reveal' ? t.cockpitReveal : status

  const sectionTitle = (label: string) => (
    <div data-testid={`section-${label.toLowerCase().replace(/\s/g, '-')}`} style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm, paddingBottom: SP.xs, borderBottom: `1px solid ${th.border}` }}>{label}</div>
  )

  const actionBtn = (label: string, onClick: () => void, color = th.gold, disabled = false) => (
    <button
      data-testid={`btn-${label.toLowerCase().replace(/\s/g, '-')}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', height: 44, borderRadius: 10, border: `1px solid ${color}33`,
        background: `${color}10`, color, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.xs,
        opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {loading && <Icon.Spinner color={color} size={14} />}
      {label}
    </button>
  )

  const tabBtn = (tab: CockpitTab, label: string, icon: React.ReactNode) => (
    <button
      data-testid={`cockpit-tab-${tab}`}
      onClick={() => setActiveTab(tab)}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 4px', borderRadius: 10, border: `1px solid ${activeTab === tab ? th.gold : 'transparent'}`,
        background: activeTab === tab ? `${th.gold}12` : 'transparent',
        color: activeTab === tab ? th.gold : th.muted, cursor: 'pointer',
        fontSize: 11, fontWeight: activeTab === tab ? 700 : 500, fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {icon}
      {label}
    </button>
  )

  const allDramsDone = rv ? rv.allComplete : (guidedIdx >= whiskies.length - 1)
  const stepGroups = parseRevealOrder(tasting)

  const renderLiveTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.sm }}>
          <span style={{ fontSize: 13, color: th.muted }}>{t.cockpitStatus}</span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 8, background: `${statusColor}15`, color: statusColor }}>{statusLabel}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.xs }}>
          <span style={{ fontSize: 13, color: th.muted }}>{t.cockpitFormat}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{isBlind ? t.cockpitBlind : t.cockpitOpen}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.xs }}>
          <span style={{ fontSize: 13, color: th.muted }}>Dram</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: th.gold }}>{guidedIdx < 0 ? '—' : `${guidedIdx + 1}`} / {whiskies.length || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.xs }}>
          <span style={{ fontSize: 13, color: th.muted }}>{t.hostParticipants}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{totalParticipants}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: th.muted }}>{t.cockpitRatings}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{totalRatings}</span>
        </div>
        {isLive && totalExpected > 0 && (
          <div style={{ marginTop: SP.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: th.faint }}>{t.cockpitProgress}</span>
              <span style={{ fontSize: 11, color: th.gold, fontWeight: 700 }}>{overallProgress}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: th.border, overflow: 'hidden' }}>
              <div style={{ width: `${overallProgress}%`, height: '100%', background: overallProgress === 100 ? th.green : th.gold, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {sectionTitle(t.cockpitControls)}
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
        {isDraft && actionBtn(t.cockpitStartTasting, handleStart, th.green, whiskies.length === 0)}

        {isLive && isGuided && !confirmAdvance && (
          actionBtn(
            rv ? rv.nextLabel : t.cockpitNextDram,
            handleAdvance,
            th.gold,
            allDramsDone
          )
        )}

        {isLive && confirmAdvance && (
          <div style={{ background: `${th.gold}08`, border: `1px solid ${th.gold}44`, borderRadius: 12, padding: SP.md, marginBottom: SP.xs }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: th.text, marginBottom: SP.sm }}>
              {guidedIdx + 1 < whiskies.length ? `${t.cockpitAdvanceTo} ${guidedIdx + 2}?` : t.cockpitLastDramDone}
            </div>
            {incompleteParticipants.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: th.amber, marginBottom: SP.sm }}>
                <Icon.AlertTriangle color={th.amber} size={14} />
                <span>{incompleteParticipants.length} {t.cockpitNotRatedYet}: {incompleteParticipants.slice(0, 3).join(', ')}{incompleteParticipants.length > 3 ? ` +${incompleteParticipants.length - 3}` : ''}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: SP.sm }}>
              <button data-testid="cockpit-advance-cancel" onClick={() => setConfirmAdvance(false)} style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>{t.cockpitCancel}</button>
              <button data-testid="cockpit-advance-proceed" onClick={() => { setConfirmAdvance(false); handleAdvance() }} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{t.cockpitContinue}</button>
            </div>
          </div>
        )}

        {isLive && !confirmEnd && actionBtn(t.cockpitEndTasting, () => setConfirmEnd(true), '#c03030')}

        {isLive && confirmEnd && (
          <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.xs }}>
            <button onClick={() => setConfirmEnd(false)} style={{ flex: 1, height: 40, borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>{t.cockpitCancel}</button>
            <button data-testid="cockpit-confirm-end" onClick={handleClose} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: '#c03030', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{t.cockpitEndConfirmYes}</button>
          </div>
        )}

        {['closed', 'reveal', 'archived'].includes(status) && !restartDialog && (
          actionBtn(t.cockpitRestart, () => setRestartDialog('choose'), th.phases.overall.accent)
        )}

        {restartDialog === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
            <div style={{ fontSize: 12, color: th.muted, textAlign: 'center', fontWeight: 600 }}>{t.cockpitRestartOptions}</div>
            {actionBtn(t.cockpitResumKeepRatings, () => handleRestart(false), th.green)}
            {actionBtn(t.cockpitClearRestart, () => setRestartDialog('confirmClear'), '#c03030')}
            <button onClick={() => setRestartDialog(false)} style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>{t.cockpitCancel}</button>
          </div>
        )}

        {restartDialog === 'confirmClear' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: 12, color: '#c03030', fontWeight: 600 }}>
              <Icon.AlertTriangle color="#c03030" size={14} />
              {t.cockpitClearWarning}
            </div>
            {actionBtn(t.cockpitClearConfirm, () => handleRestart(true), '#c03030')}
            <button onClick={() => setRestartDialog('choose')} style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>{t.back}</button>
          </div>
        )}
      </div>

      {activeWhisky && (
        <>
          {sectionTitle(`${t.cockpitCurrentDram}: ${guidedIdx + 1} ${t.ratingOf} ${whiskies.length}`)}
          <div style={{ background: th.bgCard, border: `1px solid ${th.gold}33`, borderRadius: 16, padding: SP.md, boxShadow: `0 0 20px ${th.gold}08` }}>
            <div style={{ display: 'flex', gap: SP.md, alignItems: 'flex-start' }}>
              {activeWhisky.imageUrl && (
                <div style={{ width: 72, height: 90, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: th.bgCard, border: `1px solid ${th.border}` }}>
                  <img src={activeWhisky.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, marginBottom: SP.xs, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isBlind && guidedRevealStep < 1 ? `Sample ${guidedIdx + 1}` : (activeWhisky.name || `Dram ${guidedIdx + 1}`)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {[activeWhisky.distillery, activeWhisky.region, activeWhisky.caskInfluence || activeWhisky.cask, activeWhisky.age ? `${activeWhisky.age}y` : null, activeWhisky.abv ? `${activeWhisky.abv}%` : null]
                    .filter(Boolean)
                    .map((v: any, i: number) => (
                      <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: th.phases.palate.dim, color: th.phases.palate.accent }}>{v}</span>
                    ))}
                </div>
                <div style={{ fontSize: 12, color: th.faint, marginTop: SP.sm }}>
                  {ratingCountForWhisky(activeWhisky.id)} / {totalParticipants} {t.cockpitRated}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isBlind && isLive && rv && (
        <>
          {sectionTitle(t.cockpitRevealSteps)}
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: th.muted }}>{t.cockpitPreset}</span>
              <div style={{ position: 'relative' }}>
                <button
                  data-testid="cockpit-preset-trigger"
                  onClick={() => setShowPresetPicker(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: `1px solid ${th.border}`, background: 'transparent', color: th.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {t[REVEAL_PRESETS[activePreset]?.labelKey] || 'Custom'}
                  <Icon.ChevronDown color={th.gold} size={12} />
                </button>
                {showPresetPicker && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: th.bg, border: `1px solid ${th.border}`, borderRadius: 10, padding: 4, minWidth: 160, zIndex: 30, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
                    {(Object.keys(REVEAL_PRESETS) as RevealPresetKey[]).map(key => (
                      <button
                        key={key}
                        data-testid={`cockpit-preset-${key}`}
                        onClick={() => handlePresetChange(key)}
                        style={{ width: '100%', padding: '8px 12px', border: 'none', background: key === activePreset ? `${th.gold}12` : 'transparent', borderRadius: 7, fontSize: 12, fontWeight: key === activePreset ? 700 : 500, color: key === activePreset ? th.gold : th.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {key === activePreset && <Icon.Check color={th.gold} size={12} />}
                        {t[REVEAL_PRESETS[key].labelKey]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {stepGroups.map((group: string[], sIdx: number) => {
              const isRevealed = sIdx < guidedRevealStep
              const isCurrent = sIdx === guidedRevealStep
              const fieldLabels = group.map(f => FIELD_LABELS[f] || f).join(', ')
              return (
                <div key={sIdx} data-testid={`cockpit-reveal-step-${sIdx}`} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, marginBottom: 4,
                  background: isRevealed ? `${th.green}10` : isCurrent ? `${th.gold}10` : 'transparent',
                  border: isCurrent ? `1px solid ${th.gold}44` : '1px solid transparent',
                }}>
                  {isRevealed ? <Icon.Eye color={th.green} size={14} /> : <Icon.EyeOff color={isCurrent ? th.gold : th.faint} size={14} />}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: isRevealed ? th.green : isCurrent ? th.gold : th.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fieldLabels}</span>
                  <span style={{ fontSize: 10, color: isRevealed ? th.green : th.faint }}>{isRevealed ? t.cockpitVisible : isCurrent ? t.cockpitNext : t.cockpitHidden}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )

  const renderLineupTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
      {sectionTitle(`${t.cockpitTabLineup} · ${whiskies.length} ${t.hostWhiskies}`)}
      {whiskies.length === 0 ? (
        <div style={{ padding: SP.xl, textAlign: 'center', color: th.muted, fontSize: 13 }}>{t.cockpitNoWhiskies}</div>
      ) : whiskies.map((w: any, idx: number) => {
        const isCurrent = isGuided && idx === guidedIdx
        const isPast = isGuided && idx < guidedIdx
        const count = ratingCountForWhisky(w.id)
        const pct = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0
        const avgRatings = ratings.filter(r => (r.whiskyId || r.whiskeyId) === w.id)
        const avgScore = avgRatings.length > 0
          ? Math.round(avgRatings.reduce((s, r) => s + (r.overall ?? 0), 0) / avgRatings.length)
          : null
        return (
          <div
            key={w.id}
            data-testid={`cockpit-lineup-${idx}`}
            onClick={() => isGuided && isLive && handleGoTo(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
              background: isCurrent ? `${th.gold}08` : th.bgCard,
              border: `1px solid ${isCurrent ? th.gold + '44' : th.border}`,
              cursor: isGuided && isLive ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isCurrent ? th.gold : isPast ? `${th.green}15` : th.bgCard,
              color: isCurrent ? '#1a0f00' : isPast ? th.green : th.faint,
              fontSize: 14, fontWeight: 700, flexShrink: 0,
              border: `1px solid ${isCurrent ? th.gold : isPast ? `${th.green}44` : th.border}`,
            }}>
              {isPast ? <Icon.Check color={th.green} size={16} /> : (isBlind ? String.fromCharCode(65 + idx) : idx + 1)}
            </div>

            {w.imageUrl && (
              <div style={{ width: 40, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: th.bgCard, border: `1px solid ${th.border}` }}>
                <img src={w.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? th.gold : th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {w.name || `Whisky ${idx + 1}`}
              </div>
              <div style={{ fontSize: 11, color: th.faint, marginTop: 2 }}>
                {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(' · ') || '—'}
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 3, borderRadius: 2, background: th.border, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? th.green : th.gold, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              {avgScore !== null && (
                <span style={{ fontSize: 16, fontWeight: 700, color: th.gold }}>{avgScore}</span>
              )}
              <span style={{ fontSize: 10, color: th.faint }}>{count}/{totalParticipants}</span>
              {isGuided && isLive && (
                <span style={{ fontSize: 10, color: th.gold, fontWeight: 600 }}>GoTo →</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderGuestsTab = () => {
    const groups = [
      { key: 'all' as const, label: t.cockpitGuestsAll, color: th.green },
      { key: 'partial' as const, label: t.cockpitGuestsPartial, color: th.gold },
      { key: 'none' as const, label: t.cockpitGuestsNone, color: th.faint },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        {sectionTitle(`${t.hostParticipants} · ${totalParticipants}`)}
        {groups.map(({ key, label, color }) => {
          const group = parts.filter(p => partRatingStatus(p.id || p.participantId) === key)
          if (!group.length) return null
          return (
            <div key={key} style={{ marginBottom: SP.sm }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.sm }}>{label} · {group.length}</div>
              {group.map(p => {
                const pid = p.id || p.participantId
                const source = p.source || (ratings.some(r => r.participantId === pid && r.source === 'paper') ? 'paper' : 'app')
                return (
                  <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: th.phases.nose.dim, fontSize: 13, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0,
                    }}>
                      {(p.name || t.cockpitAnonymous)[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || t.cockpitAnonymous}</div>
                      <div style={{ fontSize: 10, color: th.faint }}>{source === 'paper' ? t.cockpitPaper : t.cockpitApp}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {whiskies.map((w, i) => {
                        const hasRating = ratings.some(r => r.participantId === pid && (r.whiskyId || r.whiskeyId) === w.id)
                        return <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: hasRating ? th.green : th.border }} />
                      })}
                    </div>
                    <span style={{ fontSize: 11, color: th.faint, flexShrink: 0 }}>
                      {ratings.filter(r => r.participantId === pid).length > 0
                        ? `${new Set(ratings.filter(r => r.participantId === pid).map(r => r.whiskyId || r.whiskeyId)).size}/${whiskies.length}`
                        : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  const renderRatingTab = () => {
    const currentWhisky = whiskies[hostRatingIdx] || null
    const wId = currentWhisky?.id

    const dimConfig: { key: DimKey; label: string; icon: React.ReactNode; phaseKey: keyof typeof th.phases }[] = [
      { key: 'nose', label: t.ratingNose, icon: <Icon.Nose color={th.phases.nose.accent} size={16} />, phaseKey: 'nose' },
      { key: 'taste', label: t.ratingPalate, icon: <Icon.Palate color={th.phases.palate.accent} size={16} />, phaseKey: 'palate' },
      { key: 'finish', label: t.ratingFinish, icon: <Icon.Finish color={th.phases.finish.accent} size={16} />, phaseKey: 'finish' },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        {sectionTitle(t.cockpitHostRating)}

        {isDraft ? (
          <div style={{ padding: SP.xl, textAlign: 'center', color: th.muted, fontSize: 13 }}>
            <Icon.Overall color={th.faint} size={28} />
            <div style={{ fontWeight: 600, marginTop: SP.sm }}>{t.cockpitNotStartedYet}</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {whiskies.map((_, idx) => (
                <button
                  key={idx}
                  data-testid={`cockpit-rating-tab-${idx}`}
                  onClick={() => setHostRatingIdx(idx)}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: idx === hostRatingIdx ? `2px solid ${th.gold}` : `1px solid ${th.border}`,
                    background: idx === hostRatingIdx ? `${th.gold}12` : 'transparent',
                    color: idx === hostRatingIdx ? th.gold : th.muted,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {isBlind ? String.fromCharCode(65 + idx) : idx + 1}
                </button>
              ))}
              {saving && <Icon.Spinner color={th.gold} size={14} />}
            </div>

            {currentWhisky && wId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
                <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Playfair Display, serif', color: th.text }}>
                  {isBlind ? `Sample ${String.fromCharCode(65 + hostRatingIdx)}` : (currentWhisky.name || `Whisky ${hostRatingIdx + 1}`)}
                </div>

                {dimConfig.map(({ key, label, icon, phaseKey }) => {
                  const scores = getScores(wId)
                  const val = scores[key]
                  const chips = (hostChips[wId] || { nose: [], taste: [], finish: [] })[key] || []
                  return (
                    <div key={key} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
                        {icon}
                        <span style={{ fontSize: 13, fontWeight: 600, color: th.phases[phaseKey].accent }}>{label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: th.phases[phaseKey].accent }}>{val}</span>
                        <span style={{ fontSize: 11, color: th.faint }}>/ {ratingScale}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={ratingScale}
                        value={val}
                        onChange={e => handleScoreChange(wId, key, parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: th.phases[phaseKey].accent, height: 6 }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: SP.sm }}>
                        {AROMA_CHIPS[key].map(chip => {
                          const active = chips.includes(chip)
                          return (
                            <button
                              key={chip}
                              onClick={() => handleChipToggle(wId, key, chip)}
                              style={{
                                padding: '4px 10px', borderRadius: 20,
                                border: `1px solid ${active ? th.phases[phaseKey].accent : th.border}`,
                                background: active ? th.phases[phaseKey].dim : 'transparent',
                                color: active ? th.phases[phaseKey].accent : th.faint,
                                fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                                transition: 'all 100ms',
                              }}
                            >
                              {chip}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
                    <Icon.Overall color={th.phases.overall.accent} size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: th.phases.overall.accent }}>{t.ratingOverall}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 700, color: th.phases.overall.accent }}>{getOverall(wId)}</span>
                    <span style={{ fontSize: 11, color: th.faint }}>/ {ratingScale}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={ratingScale}
                    value={getOverall(wId)}
                    onChange={e => handleOverallChange(wId, parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: th.phases.overall.accent, height: 6 }}
                  />
                  {!hostOverride[wId] && (
                    <div style={{ fontSize: 10, color: th.faint, marginTop: 4, textAlign: 'center' }}>{t.cockpitAutoCalc}</div>
                  )}
                  {hostOverride[wId] && (
                    <button
                      onClick={() => {
                        setHostOverride(prev => ({ ...prev, [wId]: false }))
                        const sc = getScores(wId)
                        const auto = Math.round((sc.nose + sc.taste + sc.finish) / 3)
                        setHostOverall(prev => ({ ...prev, [wId]: auto }))
                        saveRating(wId, sc, auto, hostNotes[wId] || '')
                      }}
                      style={{ display: 'block', margin: '4px auto 0', fontSize: 10, color: th.gold, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                    >
                      {t.cockpitResetAuto}
                    </button>
                  )}
                </div>

                <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, marginBottom: SP.sm }}>{t.cockpitNotes}</div>
                  <textarea
                    value={hostNotes[wId] || ''}
                    onChange={e => handleNotesChange(wId, e.target.value)}
                    placeholder={t.cockpitNotesPH}
                    rows={3}
                    style={{
                      width: '100%', borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg,
                      color: th.text, fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none',
                      fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: th.bg, zIndex: 100, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', color: th.text }}>
      <div style={{
        height: 52, background: th.headerBg, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center',
        padding: `0 ${SP.md}px`, gap: 12, flexShrink: 0,
      }}>
        <Icon.Host color={th.gold} size={18} />
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600, color: th.gold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tasting?.name || tasting?.title || 'Cockpit'}
        </span>
        {isLive && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 12, background: `${th.green}15`, fontSize: 10, fontWeight: 700, color: th.green, letterSpacing: '0.06em' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: th.green, animation: 'ping 1.5s infinite' }} />
            LIVE
          </span>
        )}
        {actionMsg && <span style={{ fontSize: 12, color: th.phases.nose.accent, marginLeft: SP.sm }}>{actionMsg}</span>}
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: th.bgCard, border: `1px solid ${th.border}`, fontSize: 12, fontWeight: 600, color: th.text }}>
            <Icon.Users color={th.gold} size={13} /> {totalParticipants}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: th.bgCard, border: `1px solid ${th.border}`, fontSize: 12, fontWeight: 600, color: th.text }}>
            <Icon.Whisky color={th.gold} size={13} /> {whiskies.length}
          </div>
        </div>

        <button data-testid="cockpit-close" onClick={onClose} style={{
          height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${th.border}`,
          background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
        }}>
          {t.cockpitClose}
        </button>
      </div>

      <div style={{ display: 'flex', padding: `${SP.sm}px ${SP.md}px`, gap: 4, background: th.headerBg, borderBottom: `1px solid ${th.border}`, flexShrink: 0 }}>
        {tabBtn('live', t.cockpitTabLive, <Icon.Live color={activeTab === 'live' ? th.gold : th.faint} size={16} />)}
        {tabBtn('lineup', t.cockpitTabLineup, <Icon.Whisky color={activeTab === 'lineup' ? th.gold : th.faint} size={16} />)}
        {tabBtn('guests', t.cockpitTabGuests, <Icon.Users color={activeTab === 'guests' ? th.gold : th.faint} size={16} />)}
        {tabBtn('rating', t.cockpitTabRating, <Icon.Overall color={activeTab === 'rating' ? th.gold : th.faint} size={16} />)}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: SP.md }}>
        {activeTab === 'live' && renderLiveTab()}
        {activeTab === 'lineup' && renderLineupTab()}
        {activeTab === 'guests' && renderGuestsTab()}
        {activeTab === 'rating' && renderRatingTab()}
      </div>

      <style>{`
        @keyframes ping { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: ${th.border}; border-radius: 3px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; }
      `}</style>
    </div>
  )
}
