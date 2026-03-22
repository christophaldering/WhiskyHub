// CaskSense Apple — HostWizard (Phase 4)
import React, { useState, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { TastingConfig, WhiskyEntry, TastingData } from '../../types/host'
import * as Icon from '../../icons/Icons'

const inputStyle = (th: ThemeTokens) => ({ width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const })
const labelStyle = (th: ThemeTokens) => ({ fontSize: 11, color: th.muted, marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.08em' })

// ── Step 1: Setup ─────────────────────────────────────────────────────────
const HostStep1: React.FC<{ th: ThemeTokens; t: Translations; onNext: (cfg: TastingConfig) => void; onBack: () => void }> = ({ th, t, onNext, onBack }) => {
  const [form, setForm] = useState<TastingConfig>({ name: '', date: '', time: '', location: '', format: 'blind', scale: '100', revealOrder: 'classic' })
  const set = (k: keyof TastingConfig) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ padding: SP.md, paddingBottom: 120, background: th.bg, minHeight: '100%', color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xl}px` }}>{t.hostStep1}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <div><label style={labelStyle(th)}>{t.hostName} *</label><input value={form.name} onChange={e => set('name')(e.target.value)} placeholder={t.hostNamePH} style={{ ...inputStyle(th), fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
          <div><label style={labelStyle(th)}>{t.hostDate}</label><input type="date" value={form.date} onChange={e => set('date')(e.target.value)} style={inputStyle(th)} /></div>
          <div><label style={labelStyle(th)}>{t.hostTime}</label><input type="time" value={form.time} onChange={e => set('time')(e.target.value)} style={inputStyle(th)} /></div>
        </div>
        <div><label style={labelStyle(th)}>{t.hostLoc}</label><input value={form.location} onChange={e => set('location')(e.target.value)} placeholder={t.hostLocPH} style={inputStyle(th)} /></div>

        <div><label style={labelStyle(th)}>{t.hostFormat}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
            {(['blind', 'open'] as const).map(f => {
              const active = form.format === f
              const pt = th.phases[f === 'blind' ? 'palate' : 'overall']
              return (
                <button key={f} onClick={() => set('format')(f)} style={{ minHeight: 80, borderRadius: 14, border: `1px solid ${active ? pt.accent : th.border}`, background: active ? pt.dim : th.bgCard, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 150ms' }}>
                  {f === 'blind' ? <Icon.EyeOff color={active ? pt.accent : th.muted} size={22} /> : <Icon.Eye color={active ? pt.accent : th.muted} size={22} />}
                  <span style={{ fontSize: 14, fontWeight: 700, color: active ? pt.accent : th.text }}>{f === 'blind' ? t.hostBlind : t.hostOpen}</span>
                  <span style={{ fontSize: 11, color: th.faint, textAlign: 'center', padding: '0 8px' }}>{f === 'blind' ? t.hostBlindDesc : t.hostOpenDesc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {form.format === 'blind' && (
          <div><label style={labelStyle(th)}>{t.hostRevealOrder}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SP.xs }}>
              {(['classic', 'photo-first', 'details-first', 'one-by-one'] as const).map(r => {
                const labelMap = { 'classic': t.hostRevealClassic, 'photo-first': t.hostRevealPhoto, 'details-first': t.hostRevealDetails, 'one-by-one': t.hostRevealOne }
                const active = form.revealOrder === r
                return <button key={r} onClick={() => set('revealOrder')(r)} style={{ minHeight: 44, borderRadius: 12, border: `1px solid ${active ? th.gold : th.border}`, background: active ? `${th.gold}12` : th.bgCard, color: active ? th.gold : th.muted, cursor: 'pointer', fontSize: 14, textAlign: 'left', padding: '0 16px', transition: 'all 150ms' }}>{labelMap[r]}</button>
              })}
            </div>
          </div>
        )}

        <div><label style={labelStyle(th)}>{t.hostScale}</label>
          <div style={{ display: 'flex', gap: SP.sm }}>
            {(['100', '20', '10'] as const).map(s => {
              const active = form.scale === s
              const labels = { '100': t.hostScale100, '20': t.hostScale20, '10': t.hostScale10 }
              return <button key={s} onClick={() => set('scale')(s)} style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${active ? th.gold : th.border}`, background: active ? `${th.gold}12` : th.bgCard, color: active ? th.gold : th.muted, cursor: 'pointer', fontSize: 13, transition: 'all 150ms' }}>{labels[s]}</button>
            })}
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button disabled={!form.name.trim() || !form.date || !form.time} onClick={() => onNext(form)} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', opacity: form.name.trim() && form.date && form.time ? 1 : 0.4 }}>{t.hostNext}</button>
      </div>
    </div>
  )
}

// ── Step 2: Whiskies ────────────────────────────────────────────────────────
const HostStep2: React.FC<{ th: ThemeTokens; t: Translations; tastingId: string; format: string; whiskies: WhiskyEntry[]; onChange: (w: WhiskyEntry[]) => void; onNext: () => void; onBack: () => void }> = ({ th, t, tastingId, format, whiskies, onChange, onNext, onBack }) => {
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<WhiskyEntry[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const addWhisky = () => onChange([...whiskies, { name: '' }])
  const removeWhisky = (i: number) => onChange(whiskies.filter((_, idx) => idx !== i))
  const updateWhisky = (i: number, field: keyof WhiskyEntry, value: string) => {
    const updated = [...whiskies]; (updated[i] as any)[field] = value; onChange(updated)
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/tastings/ai-import', { method: 'POST', body: fd, headers: { 'x-participant-id': 'host' } })
      if (!res.ok) throw new Error()
      setImportPreview(await res.json())
    } catch { /* show error */ }
    finally { setImporting(false) }
  }

  const confirmImport = () => {
    if (importPreview) { onChange([...whiskies, ...importPreview]); setImportPreview(null) }
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 120, background: th.bg, minHeight: '100%', color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.hostStep2}</h1>

      {/* AI Import */}
      <input ref={fileRef} type="file" accept=".xlsx,.csv,.pdf,image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
      <button onClick={() => fileRef.current?.click()} style={{ width: '100%', minHeight: 60, borderRadius: 16, border: `1px dashed ${th.gold}66`, background: `${th.gold}08`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SP.sm, marginBottom: SP.md }}>
        {importing ? <Icon.Spinner color={th.gold} size={20} /> : <Icon.Upload color={th.gold} size={20} />}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: th.gold }}>{importing ? t.hostAiImporting : t.hostAiImport}</div>
          <div style={{ fontSize: 12, color: th.faint }}>{t.hostAiImportDesc}</div>
        </div>
      </button>

      {importPreview && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.gold}44`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
          <div style={{ fontSize: 13, color: th.gold, marginBottom: SP.sm }}>{t.hostAiPreview} ({importPreview.length})</div>
          {importPreview.map((w, i) => <div key={i} style={{ fontSize: 13, color: th.text, padding: '4px 0' }}>· {w.name}</div>)}
          <button onClick={confirmImport} style={{ marginTop: SP.sm, height: 44, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '0 20px' }}>{t.hostAiConfirm}</button>
        </div>
      )}

      {/* Whisky list */}
      {whiskies.map((w, i) => (
        <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.sm }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: th.gold }}>{format === 'blind' ? `Sample #${i + 1}` : `Whisky ${i + 1}`}</span>
            <button onClick={() => removeWhisky(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Trash color={th.faint} size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.xs }}>
            <input value={w.name} onChange={e => updateWhisky(i, 'name', e.target.value)} placeholder={t.hostWhiskyNamePH} style={{ ...inputStyle(th), gridColumn: '1 / -1', fontSize: 14 }} />
            <input value={w.region || ''} onChange={e => updateWhisky(i, 'region', e.target.value)} placeholder={t.hostWhiskyRegionPH} style={{ ...inputStyle(th), fontSize: 13 }} />
            <input value={w.cask || ''} onChange={e => updateWhisky(i, 'cask', e.target.value)} placeholder={t.hostWhiskyCaskPH} style={{ ...inputStyle(th), fontSize: 13 }} />
          </div>
        </div>
      ))}

      <button onClick={addWhisky} style={{ width: '100%', height: 52, borderRadius: 16, border: `1px dashed ${th.border}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: th.gold, fontSize: 14, marginTop: SP.sm }}>
        <Icon.Add color={th.gold} size={20} />{t.hostAddManual}
      </button>

      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button onClick={onNext} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{t.hostNext}</button>
      </div>
    </div>
  )
}

// ── Step 3: Invitations ─────────────────────────────────────────────────────
const HostStep3: React.FC<{ th: ThemeTokens; t: Translations; tastingId: string; tastingCode: string; onNext: () => void; onBack: () => void }> = ({ th, t, tastingId, tastingCode, onNext, onBack }) => {
  const [copied, setCopied] = useState(false)
  const [email, setEmail]   = useState('')
  const [note, setNote]     = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(`${window.location.origin}/labs-apple?code=${tastingCode}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const sendInvite = async () => {
    try {
      await fetch(`/api/tastings/${tastingId}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': 'host' }, body: JSON.stringify({ emails: email.split('\n').filter(Boolean), note }) })
      setEmailSent(true)
    } catch { /* show error */ }
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 120, background: th.bg, minHeight: '100%', color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>{t.hostStep3}</h1>

      {/* Code card */}
      <div style={{ background: `${th.gold}10`, border: `1px solid ${th.gold}44`, borderRadius: 20, padding: SP.lg, marginBottom: SP.lg, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.sm }}>{t.hostCode}</div>
        <div style={{ fontSize: 38, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.18em', color: th.text, marginBottom: SP.md }}>{tastingCode}</div>
        <button onClick={copyCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 12, border: `1px solid ${th.gold}44`, background: 'none', color: th.gold, cursor: 'pointer', fontSize: 14 }}>
          {copied ? <Icon.Check color={th.green} size={16} /> : <Icon.Copy color={th.gold} size={16} />}
          {copied ? t.hostLinkCopied : t.hostLinkCopy}
        </button>
      </div>

      {/* Email section */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, marginBottom: SP.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
          <Icon.Mail color={th.gold} size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t.hostEmailLabel}</span>
        </div>
        {emailSent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: th.green }}><Icon.Check color={th.green} size={16} />{t.hostEmailSent}</div>
        ) : (
          <>
            <textarea value={email} onChange={e => setEmail(e.target.value)} placeholder={t.hostEmailPH} rows={3} style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '10px 14px', resize: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.hostEmailNotePH} rows={2} style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '10px 14px', resize: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
            <button onClick={sendInvite} style={{ height: 44, padding: '0 20px', borderRadius: 12, border: `1px solid ${th.gold}44`, background: 'none', color: th.gold, cursor: 'pointer', fontSize: 14 }}>{t.hostEmailSend}</button>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button onClick={onNext} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{t.hostStart}</button>
      </div>
    </div>
  )
}

// ── Step 4: Live ────────────────────────────────────────────────────────────
const HostStep4: React.FC<{ th: ThemeTokens; t: Translations; tastingId: string; tastingCode: string; onEnd: () => void }> = ({ th, t, tastingId, tastingCode, onEnd }) => {
  const [tasting, setTasting] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [confirmEnd, setConfirmEnd] = useState(false)

  React.useEffect(() => {
    const load = async () => {
      const [tRes, pRes] = await Promise.all([fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': 'host' } }), fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': 'host' } })])
      if (tRes.ok) setTasting(await tRes.json())
      if (pRes.ok) setParticipants(await pRes.json())
    }
    load(); const id = setInterval(load, 5000); return () => clearInterval(id)
  }, [tastingId])

  const advance = () => fetch(`/api/tastings/${tastingId}/guided-advance`, { method: 'POST', headers: { 'x-participant-id': 'host' } }).then(() => {})
  const endTasting = async () => { await fetch(`/api/tastings/${tastingId}/close`, { method: 'POST', headers: { 'x-participant-id': 'host' } }); onEnd() }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80, background: th.bg, minHeight: '100%', color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.md }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: th.green, animation: 'ping 1.5s infinite' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t.hostLiveTitle}</span>
        <span style={{ fontSize: 13, color: th.gold, marginLeft: 'auto' }}>{tastingCode}</span>
      </div>

      {tasting && (
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{tasting.name}</h1>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.lg }}>
        <button onClick={advance} style={{ flex: 1, height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon.Play color="#1a0f00" size={18} />{t.hostNextDram}
        </button>
        <button onClick={() => setConfirmEnd(true)} style={{ height: 52, padding: '0 20px', borderRadius: 14, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Stop color={th.muted} size={16} />{t.hostClose}
        </button>
      </div>

      {/* Participants */}
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
        <div style={{ fontSize: 12, color: th.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm }}>{t.hostParticipants}</div>
        {participants.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: p.ratingStatus === 'all' ? th.green : p.ratingStatus === 'partial' ? th.gold : th.faint }} />
            <span style={{ fontSize: 14, flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 11, color: th.faint }}>{p.ratingStatus === 'all' ? t.hostRatedAll : p.ratingStatus === 'partial' ? t.hostInProgress : t.hostNotStarted}</span>
          </div>
        ))}
      </div>

      {/* Confirm end dialog */}
      {confirmEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: th.bg, border: `1px solid ${th.border}`, borderRadius: 24, padding: SP.xl, margin: SP.md, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: SP.md }}>{t.hostEndConfirm}</div>
            <div style={{ display: 'flex', gap: SP.sm }}>
              <button onClick={() => setConfirmEnd(false)} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.text, cursor: 'pointer', fontSize: 15 }}>{t.hostEndNo}</button>
              <button onClick={endTasting} style={{ flex: 1, height: 48, borderRadius: 12, border: 'none', background: '#c03030', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>{t.hostEndYes}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── HostWizard orchestrator ──────────────────────────────────────────────────
interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void; onDone: () => void }

export const HostWizard: React.FC<Props> = ({ th, t, participantId, onBack, onDone }) => {
  const [step, setStep]           = useState(1)
  const [config, setConfig]       = useState<TastingConfig | null>(null)
  const [tastingId, setTastingId] = useState<string | null>(null)
  const [tastingCode, setCode]    = useState<string | null>(null)
  const [whiskies, setWhiskies]   = useState<WhiskyEntry[]>([])

  const stepLabels = [t.hostStep1, t.hostStep2, t.hostStep3, t.hostStep4]

  return (
    <div style={{ minHeight: '100%', background: th.bg }}>
      {/* Step indicator */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px` }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: SP.xs }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s < step ? th.green : s === step ? th.gold : th.border }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: SP.md }}>
          {stepLabels.map((lbl, i) => (
            <span key={i} style={{ flex: 1, fontSize: 10, textAlign: 'center', color: i + 1 < step ? th.green : i + 1 === step ? th.gold : th.faint, fontWeight: i + 1 === step ? 700 : 400 }}>{i + 1 < step ? '✓' : ''} {lbl}</span>
          ))}
        </div>
      </div>

      {step === 1 && <HostStep1 th={th} t={t} onBack={onBack} onNext={async (cfg) => {
        setConfig(cfg)
        try {
          const res = await fetch('/api/tastings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ name: cfg.name, date: cfg.date, time: cfg.time, location: cfg.location, format: cfg.format, ratingScale: parseInt(cfg.scale), revealOrder: cfg.revealOrder }) })
          const data = await res.json(); setTastingId(data.id); setCode(data.code); setStep(2)
        } catch { /* handle */ }
      }} />}
      {step === 2 && tastingId && <HostStep2 th={th} t={t} tastingId={tastingId} format={config?.format || 'blind'} whiskies={whiskies} onChange={setWhiskies} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && tastingId && tastingCode && <HostStep3 th={th} t={t} tastingId={tastingId} tastingCode={tastingCode} onBack={() => setStep(2)} onNext={async () => { await fetch(`/api/tastings/${tastingId}/start`, { method: 'POST', headers: { 'x-participant-id': participantId } }); setStep(4) }} />}
      {step === 4 && tastingId && tastingCode && <HostStep4 th={th} t={t} tastingId={tastingId} tastingCode={tastingCode} onEnd={onDone} />}
    </div>
  )
}
