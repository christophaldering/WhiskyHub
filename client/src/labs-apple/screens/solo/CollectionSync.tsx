// CaskSense Apple — CollectionSync (Phase D)
// Whiskybase CSV-Import + Sync
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const CollectionSync: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'syncing' | 'done'>('upload')
  const [preview, setPreview] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ added: number; updated: number; total: number } | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const rows = lines.slice(1, 6).map(line => {
        const vals = line.split(',')
        return headers.reduce((obj: any, h: string, i: number) => { obj[h] = (vals[i] || '').replace(/"/g, '').trim(); return obj }, {})
      })
      setPreview(rows)
      setStep('preview')
    } catch { setError('CSV konnte nicht gelesen werden') }
  }

  const doSync = async (fullFile: File) => {
    setStep('syncing')
    try {
      const fd = new FormData(); fd.append('file', fullFile)
      const res = await fetch('/api/collection/sync', { method: 'POST', headers: { 'x-participant-id': participantId }, body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Sync fehlgeschlagen') }
      const data = await res.json()
      setResult({ added: data.added || 0, updated: data.updated || 0, total: data.total || 0 })
      setStep('done')
    } catch (e: any) { setError(e.message); setStep('preview') }
  }

  const fileRef = React.useRef<HTMLInputElement>(null)
  const fileRef2 = React.useRef<File | null>(null)

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Collection Sync</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Importiere deine Whiskybase-Sammlung als CSV-Datei.</p>

      {step === 'upload' && (
        <div>
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.lg }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: SP.xs }}>So geht's:</div>
            {['Gehe zu whiskybase.com → Meine Sammlung', 'Klicke "Exportieren" → CSV herunterladen', 'Lade die CSV-Datei hier hoch'].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: SP.xs }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: th.phases.palate.dim, color: th.phases.palate.accent, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                <span style={{ fontSize: 13, color: th.muted }}>{s}</span>
              </div>
            ))}
          </div>
          {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md, fontSize: 14, color: '#e06060' }}>{error}</div>}
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { fileRef2.current = f; handleFile(f) } }} />
          <button onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 140, borderRadius: 20, border: `2px dashed ${th.gold}44`, background: `${th.gold}08`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: th.gold }}>
            <Icon.Upload color={th.gold} size={40} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>CSV auswählen</span>
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vorschau (erste 5 Einträge)</div>
          {preview.map((row, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: SP.sm, marginBottom: SP.xs }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{row.name || row['bottle name'] || Object.values(row)[0]}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{[row.distillery, row.region, row.vintage || row.age].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
          {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', margin: `${SP.md}px 0`, fontSize: 14, color: '#e06060' }}>{error}</div>}
          <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.lg }}>
            <button onClick={() => { setStep('upload'); setPreview([]) }} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}>Abbrechen</button>
            <button onClick={() => fileRef2.current && doSync(fileRef2.current)} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: '#1a0f00', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              Sammlung synchronisieren
            </button>
          </div>
        </div>
      )}

      {step === 'syncing' && (
        <div style={{ textAlign: 'center', padding: `${SP.xxxl}px 0` }}>
          <Icon.Spinner color={th.gold} size={48} />
          <div style={{ marginTop: SP.lg, fontFamily: 'Playfair Display, serif', fontSize: 20 }}>Sammlung wird importiert…</div>
        </div>
      )}

      {step === 'done' && result && (
        <div style={{ textAlign: 'center', padding: `${SP.xl}px 0` }}>
          <Icon.Check color={th.green} size={56} />
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, margin: `${SP.lg}px 0 ${SP.sm}px` }}>Sync abgeschlossen!</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SP.sm, margin: `${SP.lg}px 0` }}>
            {[['Gesamt', result.total, th.gold], ['Neu', result.added, th.green], ['Aktualisiert', result.updated, th.phases.nose.accent]].map(([l, v, c]) => (
              <div key={l as string} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: SP.sm, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: c as string }}>{v as number}</div>
                <div style={{ fontSize: 11, color: th.faint }}>{l as string}</div>
              </div>
            ))}
          </div>
          <button onClick={onBack} style={{ height: 52, padding: '0 32px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: '#1a0f00', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
            Zurück
          </button>
        </div>
      )}
    </div>
  )
}
