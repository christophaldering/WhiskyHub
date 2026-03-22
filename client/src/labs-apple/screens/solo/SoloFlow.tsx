import React, { useState, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { WhiskyData, RatingData } from '../../types/rating'
import { RatingFlow } from '../rating/RatingFlow'
import * as Icon from '../../icons/Icons'
import { collectionApi } from '../../../lib/api'

type CaptureOverlay = 'none' | 'barcode' | 'describe' | 'importAnalyzing' | 'collection'

interface CollectionItem {
  id: string
  name?: string
  brand?: string
  distillery?: string
  statedAge?: string
  abv?: string
  caskType?: string
  status?: string
  vintage?: string
  whiskybaseId?: string
  pricePaid?: number | null
}

const SoloCaptureScreen: React.FC<{
  th: ThemeTokens; t: Translations; participantId: string
  onCapture: (w: WhiskyData) => void; onBack: () => void
}> = ({ th, t, participantId, onCapture, onBack }) => {
  const [identifying, setIdentifying] = useState(false)
  const [identifyError, setIdentifyError] = useState(false)
  const [overlay, setOverlay] = useState<CaptureOverlay>('none')
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [barcodeValue, setBarcodeValue] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')

  const [describeValue, setDescribeValue] = useState('')
  const [describeLoading, setDescribeLoading] = useState(false)
  const [describeError, setDescribeError] = useState('')

  const [importError, setImportError] = useState('')

  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([])
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [collectionError, setCollectionError] = useState(false)
  const [collectionSearch, setCollectionSearch] = useState('')
  const [collectionStatusFilter, setCollectionStatusFilter] = useState<'all' | 'open' | 'closed'>('all')

  const handleFile = async (file: File) => {
    setIdentifying(true); setIdentifyError(false)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/identify-bottle', { method: 'POST', body: fd, headers: { 'x-participant-id': participantId } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onCapture({ name: data.name, distillery: data.distillery, region: data.region, cask: data.cask, age: data.age, abv: data.abv, blind: false })
    } catch { setIdentifyError(true) }
    finally { setIdentifying(false) }
  }

  const handleBarcodeSubmit = async () => {
    if (!barcodeValue.trim()) return
    setBarcodeLoading(true); setBarcodeError('')
    try {
      const res = await fetch('/api/whisky/identify-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ query: barcodeValue.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const c = data.candidates?.[0]
      if (c) {
        onCapture({ name: c.name || '', distillery: c.distillery || '', region: c.region || '', cask: c.caskType || '', age: c.age ? Number(c.age) : undefined, abv: c.abv ? Number(c.abv) : undefined, blind: false })
      } else {
        onCapture({ blind: false })
      }
      setOverlay('none')
    } catch {
      setBarcodeError(t.soloIdentifyFail)
    } finally { setBarcodeLoading(false) }
  }

  const handleDescribeSubmit = async () => {
    if (!describeValue.trim()) return
    setDescribeLoading(true); setDescribeError('')
    try {
      const res = await fetch('/api/whisky/identify-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ query: describeValue.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const c = data.candidates?.[0]
      if (c) {
        onCapture({ name: c.name || '', distillery: c.distillery || '', region: c.region || '', cask: c.caskType || '', age: c.age ? Number(c.age) : undefined, abv: c.abv ? Number(c.abv) : undefined, blind: false })
      } else {
        onCapture({ blind: false })
      }
      setOverlay('none')
    } catch {
      setDescribeError(t.soloIdentifyFail)
    } finally { setDescribeLoading(false) }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (importRef.current) importRef.current.value = ''
    setOverlay('importAnalyzing'); setImportError('')
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const res = await fetch('/api/tastings/ai-import', {
        method: 'POST',
        headers: participantId ? { 'x-participant-id': participantId } : {},
        body: formData,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.whiskies && data.whiskies.length > 0) {
        const first = data.whiskies[0]
        onCapture({
          name: first.name || '', distillery: first.distillery || '',
          region: first.region || '', cask: first.caskType || '',
          age: first.age ? Number(first.age) : undefined,
          abv: first.abv ? Number(first.abv) : undefined,
          blind: false,
        })
      } else {
        setImportError(t.soloImportFail)
      }
    } catch {
      setImportError(t.soloImportFail)
    }
    setOverlay('none')
  }

  const openCollection = async () => {
    setOverlay('collection')
    setCollectionSearch(''); setCollectionStatusFilter('all'); setCollectionError(false)
    setCollectionLoading(true)
    try {
      const items = await collectionApi.getAll(participantId)
      setCollectionItems(items)
    } catch {
      setCollectionItems([]); setCollectionError(true)
    } finally { setCollectionLoading(false) }
  }

  const handleSelectCollectionItem = (item: CollectionItem) => {
    const fullName = item.brand && item.brand !== item.name ? `${item.brand} ${item.name}` : (item.name || '')
    onCapture({
      name: fullName, distillery: item.distillery || '',
      cask: item.caskType || '',
      age: item.statedAge ? Number(item.statedAge) : undefined,
      abv: item.abv ? Number(item.abv) : undefined,
      blind: false,
    })
    setOverlay('none')
  }

  const filteredCollectionItems = collectionItems.filter(item => {
    if (collectionStatusFilter !== 'all' && item.status !== collectionStatusFilter) return false
    if (collectionSearch) {
      const q = collectionSearch.toLowerCase()
      return (item.name?.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q) || item.distillery?.toLowerCase().includes(q))
    }
    return true
  })

  const inputStyle: React.CSSProperties = { width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 16, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const sheetStyle: React.CSSProperties = { position: 'fixed', bottom: 0, left: 0, right: 0, background: th.bg, borderTop: `1px solid ${th.border}`, borderRadius: '20px 20px 0 0', padding: `20px ${SP.md}px 100px`, zIndex: 50, maxHeight: '85dvh', overflowY: 'auto' }
  const sheetHandle: React.CSSProperties = { width: 40, height: 4, background: th.border, borderRadius: 2, margin: '0 auto 16px' }

  const gridItems = [
    { icon: <Icon.Gallery color={th.phases.palate.accent} size={24} />, label: t.soloGallery, desc: t.soloGalleryDesc, testId: 'button-capture-gallery', action: () => galleryRef.current?.click() },
    { icon: <Icon.Barcode color={th.phases.finish.accent} size={24} />, label: t.soloBarcode, desc: t.soloBarcodeDesc, testId: 'button-capture-barcode', action: () => { setBarcodeValue(''); setBarcodeError(''); setOverlay('barcode') } },
    { icon: <Icon.MessageSquare color={th.phases.overall.accent} size={24} />, label: t.soloDescribe, desc: t.soloDescribeDesc, testId: 'button-capture-describe', action: () => { setDescribeValue(''); setDescribeError(''); setOverlay('describe') } },
    { icon: <Icon.Upload color={th.gold} size={24} />, label: t.soloImport, desc: t.soloImportDesc, testId: 'button-capture-import', action: () => importRef.current?.click() },
    { icon: <Icon.Library color={th.green} size={24} />, label: t.soloCollection, desc: t.soloCollectionDesc, testId: 'button-capture-collection', action: openCollection },
  ]

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', padding: SP.md, paddingBottom: 100 }}>
      <button data-testid="button-solo-back" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 12px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.soloTitle}</h1>
      <p style={{ fontSize: 15, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{t.soloCaptureSub}</p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: 'none' }} onChange={handleImportFile} />

      <button data-testid="button-capture-camera" onClick={() => cameraRef.current?.click()} style={{
        width: '100%', height: 120, borderRadius: 20, border: `1px solid ${th.phases.nose.accent}55`,
        background: th.phases.nose.dim, cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: SP.sm, marginBottom: SP.md,
      }}>
        {identifying ? <Icon.Spinner color={th.phases.nose.accent} size={40} /> : <Icon.Camera color={th.phases.nose.accent} size={40} />}
        <span style={{ fontSize: 17, fontWeight: 700, color: th.text }}>{identifying ? t.soloIdentifying : t.soloPhoto}</span>
        <span style={{ fontSize: 13, color: th.faint }}>{t.soloPhotoDesc}</span>
      </button>

      {identifyError && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.25)', marginBottom: SP.md }}>
          <Icon.AlertTriangle color="#e06060" size={14} />
          <span style={{ fontSize: 14, color: '#e06060', flex: 1 }}>{t.soloIdentifyFail}</span>
          <button onClick={() => cameraRef.current?.click()} style={{ background: 'none', border: 'none', color: th.gold, fontSize: 13, cursor: 'pointer' }}>{t.soloIdentifyRetry}</button>
        </div>
      )}

      {importError && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.25)', marginBottom: SP.md }}>
          <Icon.AlertTriangle color="#e06060" size={14} />
          <span style={{ fontSize: 14, color: '#e06060', flex: 1 }}>{importError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {gridItems.map((item, i) => (
          <button key={i} data-testid={item.testId} onClick={item.action} style={{
            height: 88, borderRadius: 16, border: `1px solid ${th.border}`, background: th.bgCard,
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 6px',
          }}>
            {item.icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{item.label}</span>
            <span style={{ fontSize: 11, color: th.faint, textAlign: 'center', lineHeight: 1.3 }}>{item.desc}</span>
          </button>
        ))}
        <button data-testid="button-capture-manual" onClick={() => onCapture({ blind: false })} style={{
          height: 88, borderRadius: 16, border: `1px solid ${th.border}`, background: th.bgCard,
          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 6px',
        }}>
          <Icon.Edit color={th.phases.palate.accent} size={24} />
          <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{t.soloManual}</span>
          <span style={{ fontSize: 11, color: th.faint, textAlign: 'center', lineHeight: 1.3 }}>{t.soloManualDesc}</span>
        </button>
      </div>

      {overlay !== 'none' && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 49 }} onClick={() => setOverlay('none')} />}

      {overlay === 'barcode' && (
        <div style={sheetStyle}>
          <div style={sheetHandle} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: th.text, margin: '0 0 4px' }}>{t.soloBarcodeInput}</h3>
          <p style={{ fontSize: 13, color: th.muted, margin: '0 0 16px' }}>{t.soloBarcodeDesc}</p>
          <input data-testid="input-barcode" type="text" inputMode="numeric" value={barcodeValue} onChange={e => setBarcodeValue(e.target.value)}
            placeholder={t.soloBarcodeInputPH} style={inputStyle} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleBarcodeSubmit()} />
          {barcodeError && <p style={{ fontSize: 13, color: '#e06060', margin: '8px 0 0' }}>{barcodeError}</p>}
          <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.md }}>
            <button data-testid="button-barcode-back" onClick={() => setOverlay('none')} style={{ flex: 1, height: 48, borderRadius: 14, border: `1px solid ${th.border}`, background: 'none', color: th.muted, fontSize: 15, cursor: 'pointer' }}>{t.back}</button>
            <button data-testid="button-barcode-submit" onClick={handleBarcodeSubmit} disabled={!barcodeValue.trim() || barcodeLoading}
              style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', background: barcodeValue.trim() ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.bgCard, color: barcodeValue.trim() ? '#1a0f00' : th.faint, fontSize: 16, fontWeight: 700, cursor: barcodeValue.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {barcodeLoading ? <Icon.Spinner color={th.faint} size={18} /> : t.soloBarcodeSubmit}
            </button>
          </div>
        </div>
      )}

      {overlay === 'describe' && (
        <div style={sheetStyle}>
          <div style={sheetHandle} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: th.text, margin: '0 0 4px' }}>{t.soloDescribe}</h3>
          <p style={{ fontSize: 13, color: th.muted, margin: '0 0 16px' }}>{t.soloDescribeDesc}</p>
          <textarea data-testid="input-describe" value={describeValue} onChange={e => setDescribeValue(e.target.value)}
            placeholder={t.soloDescribePH} rows={4} autoFocus
            style={{ ...inputStyle, resize: 'none', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, minHeight: 100 }} />
          {describeError && <p style={{ fontSize: 13, color: '#e06060', margin: '8px 0 0' }}>{describeError}</p>}
          <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.md }}>
            <button data-testid="button-describe-back" onClick={() => setOverlay('none')} style={{ flex: 1, height: 48, borderRadius: 14, border: `1px solid ${th.border}`, background: 'none', color: th.muted, fontSize: 15, cursor: 'pointer' }}>{t.back}</button>
            <button data-testid="button-describe-submit" onClick={handleDescribeSubmit} disabled={!describeValue.trim() || describeLoading}
              style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', background: describeValue.trim() ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.bgCard, color: describeValue.trim() ? '#1a0f00' : th.faint, fontSize: 16, fontWeight: 700, cursor: describeValue.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {describeLoading ? <><Icon.Spinner color={th.faint} size={18} />{t.soloDescribeSearching}</> : t.soloDescribeSubmit}
            </button>
          </div>
        </div>
      )}

      {overlay === 'importAnalyzing' && (
        <div style={sheetStyle}>
          <div style={sheetHandle} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 12 }}>
            <Icon.Spinner color={th.gold} size={32} />
            <span style={{ fontSize: 15, color: th.muted }}>{t.soloImportAnalyzing}</span>
          </div>
        </div>
      )}

      {overlay === 'collection' && (
        <div style={sheetStyle}>
          <div style={sheetHandle} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: th.text, margin: '0 0 4px' }} data-testid="text-collection-picker-title">{t.soloCollection}</h3>
          <p style={{ fontSize: 13, color: th.muted, margin: '0 0 12px' }}>{t.soloCollectionDesc}</p>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Icon.Search color={th.muted} size={16} />
            <input data-testid="input-collection-picker-search" type="text" value={collectionSearch} onChange={e => setCollectionSearch(e.target.value)}
              placeholder={t.soloCollectionSearch}
              style={{ ...inputStyle, paddingLeft: 12 }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['all', 'open', 'closed'] as const).map(sf => (
              <button key={sf} data-testid={`button-collection-filter-${sf}`} onClick={() => setCollectionStatusFilter(sf)}
                style={{
                  padding: '4px 12px', fontSize: 11, fontWeight: collectionStatusFilter === sf ? 600 : 400,
                  color: collectionStatusFilter === sf ? th.gold : th.muted,
                  background: collectionStatusFilter === sf ? `${th.gold}20` : 'transparent',
                  border: `1px solid ${collectionStatusFilter === sf ? th.gold : th.border}`,
                  borderRadius: 16, cursor: 'pointer',
                }}>
                {sf === 'all' ? t.soloCollectionAll : sf === 'open' ? t.soloCollectionOpen : t.soloCollectionClosed}
              </button>
            ))}
          </div>

          {collectionLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 8 }}>
              <Icon.Spinner color={th.gold} size={24} />
              <span style={{ fontSize: 13, color: th.muted }}>{t.soloCollectionLoading}</span>
            </div>
          ) : collectionError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 10 }} data-testid="collection-picker-error">
              <Icon.AlertTriangle color="#e06060" size={32} />
              <p style={{ fontSize: 14, fontWeight: 600, color: th.text, margin: 0 }}>{t.soloCollectionError}</p>
              <button onClick={openCollection} style={{ marginTop: 4, fontSize: 13, padding: '6px 16px', borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer' }} data-testid="button-collection-picker-retry">{t.soloIdentifyRetry}</button>
            </div>
          ) : collectionItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 10 }} data-testid="collection-picker-empty">
              <Icon.Library color={th.muted} size={32} />
              <p style={{ fontSize: 14, fontWeight: 600, color: th.text, margin: 0 }}>{t.soloCollectionEmpty}</p>
            </div>
          ) : filteredCollectionItems.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: th.muted }}>{t.soloCollectionNoResults}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: th.muted, marginBottom: 4 }}>
                {filteredCollectionItems.length} {t.soloCollectionBottles}
              </div>
              {filteredCollectionItems.map(item => (
                <button key={item.id} data-testid={`button-collection-item-${item.id}`} onClick={() => handleSelectCollectionItem(item)}
                  style={{
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    width: '100%', cursor: 'pointer', background: th.bgCard, border: `1px solid ${th.border}`,
                    borderRadius: 12, color: th.text, fontFamily: 'DM Sans, sans-serif',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.brand && item.brand !== item.name ? `${item.brand} ${item.name}` : item.name}
                    </div>
                    <div style={{ fontSize: 12, color: th.muted, marginTop: 2 }}>
                      {[item.distillery, item.statedAge && `${item.statedAge}y`, item.abv && `${item.abv}%`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {item.status && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: item.status === 'open' ? `${th.green}20` : `${th.muted}20`, color: item.status === 'open' ? th.green : th.muted }}>
                      {item.status}
                    </span>
                  )}
                  <Icon.ChevronRight color={th.muted} size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SoloWhiskyForm: React.FC<{ th: ThemeTokens; t: Translations; initial: WhiskyData; onSubmit: (w: WhiskyData) => void; onBack: () => void }> = ({ th, t, initial, onSubmit, onBack }) => {
  const [form, setForm] = useState({
    name: initial.name || '',
    distillery: initial.distillery || '',
    region: initial.region || '',
    cask: initial.cask || '',
    age: initial.age ? String(initial.age) : '',
    abv: initial.abv ? String(initial.abv) : '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle = { width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 16, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 12, color: th.muted, marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', padding: SP.md, paddingBottom: 120 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 12px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      {initial.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: th.phases.overall.dim, border: `1px solid ${th.phases.overall.accent}44`, marginBottom: SP.md }}>
          <Icon.Check color={th.green} size={16} />
          <span style={{ fontSize: 13 }}>Erkannt — bitte prüfen</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <div><label style={labelStyle}>{t.soloName} *</label><input data-testid="input-whisky-name" value={form.name} onChange={set('name')} placeholder={t.soloNamePH} style={{ ...inputStyle, fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }} /></div>
        <div><label style={labelStyle}>{t.soloDistillery}</label><input data-testid="input-whisky-distillery" value={form.distillery} onChange={set('distillery')} placeholder={t.soloDistilleryPH} style={inputStyle} /></div>
        <div><label style={labelStyle}>{t.soloRegion}</label><input data-testid="input-whisky-region" value={form.region} onChange={set('region')} placeholder={t.soloRegionPH} style={inputStyle} /></div>
        <div><label style={labelStyle}>{t.soloCask}</label><input data-testid="input-whisky-cask" value={form.cask} onChange={set('cask')} placeholder={t.soloCaskPH} style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
          <div><label style={labelStyle}>{t.soloAge}</label><input data-testid="input-whisky-age" type="number" value={form.age} onChange={set('age')} placeholder={t.soloAgePH} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.soloAbv}</label><input data-testid="input-whisky-abv" type="number" value={form.abv} onChange={set('abv')} placeholder={t.soloAbvPH} style={inputStyle} /></div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button
          data-testid="button-to-rating"
          disabled={!form.name.trim()}
          onClick={() => onSubmit({ ...initial, name: form.name, distillery: form.distillery, region: form.region, cask: form.cask, age: form.age ? parseFloat(form.age) : undefined, abv: form.abv ? parseFloat(form.abv) : undefined, blind: false })}
          style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', background: form.name.trim() ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.bgCard, color: form.name.trim() ? '#1a0f00' : th.faint, fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}
        >
          {t.soloToRating}
        </button>
      </div>
    </div>
  )
}

const QuickRateScreen: React.FC<{
  th: ThemeTokens; t: Translations
  whisky: WhiskyData; participantId: string
  onSave: (score: number, note: string, tags: string[]) => void
  onFull: () => void; onBack: () => void
}> = ({ th, t, whisky, participantId, onSave, onFull, onBack }) => {
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote]   = useState('')
  const [tags, setTags]   = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const QUICK_SCORES = [70, 75, 80, 85, 88, 90, 92, 95]
  const QUICK_TAGS   = ['Fruchtig', 'Rauchig', 'Süß', 'Würzig', 'Holzig', 'Blumig', 'Malzig', 'Cremig', 'Meerig', 'Erdig']

  const handleSave = async () => {
    if (!score) return
    setSaving(true)
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({
          whiskeyName: whisky.name, distillery: whisky.distillery, region: whisky.region,
          overallScore: score,
          notes: { overall: note },
          flavorTags: { quick: tags },
          source: 'quick',
        }),
      })
      onSave(score, note, tags)
    } catch { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${th.border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted }}>
          {whisky.name || 'Quick Rate'}
        </div>
        <button onClick={onFull} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 13, minHeight: 44 }}>
          Vollständig
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, paddingBottom: 120, overflowY: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {QUICK_SCORES.map(s => (
            <button key={s} onClick={() => setScore(s)} style={{ height: 44, padding: '0 20px', borderRadius: 22, border: `1px solid ${score === s ? th.gold : th.border}`, background: score === s ? `${th.gold}20` : th.bgCard, color: score === s ? th.gold : th.muted, fontSize: 16, fontWeight: score === s ? 700 : 400, cursor: 'pointer', transition: 'all 150ms' }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aromen</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {QUICK_TAGS.map(tag => {
            const active = tags.includes(tag)
            return (
              <button key={tag} onClick={() => setTags(ts => active ? ts.filter(x => x !== tag) : [...ts, tag])} style={{ height: 40, padding: '0 16px', borderRadius: 20, border: `1px solid ${active ? th.phases.palate.accent : th.border}`, background: active ? th.phases.palate.dim : th.bgCard, color: active ? th.phases.palate.accent : th.muted, fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 150ms' }}>
                {tag}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notiz</div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Kurzer Eindruck…" rows={3}
          style={{ width: '100%', borderRadius: 14, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 16, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '12px 16px 24px', background: th.bg }}>
        <button onClick={handleSave} disabled={!score || saving} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: !score ? 'default' : 'pointer', background: !score ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: !score ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <Icon.Spinner color={th.faint} size={20} /> : `Quick speichern${score ? ` · ${score} Pkt` : ''}`}
        </button>
      </div>
    </div>
  )
}

const SoloDoneScreen: React.FC<{
  th: ThemeTokens; t: Translations
  whisky: WhiskyData; score: number
  onAnother: () => void; onBack: () => void
}> = ({ th, t, whisky, score, onAnother, onBack }) => (
  <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: SP.lg, paddingBottom: 100 }}>
    <div style={{ width: 80, height: 80, borderRadius: 40, background: `${th.green}20`, border: `2px solid ${th.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
      <Icon.Check color={th.green} size={36} />
    </div>
    <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, textAlign: 'center', margin: `0 0 ${SP.xs}px` }}>{whisky.name || 'Dram'}</h1>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#d4a847', marginBottom: 4 }}>{score}</div>
    <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.xl }}>{t.soloSaved}</div>
    <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px`, display: 'flex', flexDirection: 'column', gap: SP.sm }}>
      <button data-testid="button-another-dram" onClick={onAnother} style={{ height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{t.soloAnother}</button>
      <button data-testid="button-back-to-hub" onClick={onBack} style={{ height: 44, borderRadius: 14, background: 'none', border: `1px solid ${th.border}`, color: th.muted, fontSize: 15, cursor: 'pointer' }}>{t.soloToHub}</button>
    </div>
  </div>
)

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const SoloFlow: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [step, setStep]             = useState<'capture' | 'quickRate' | 'form' | 'rating' | 'done'>('capture')
  const [whisky, setWhisky]         = useState<WhiskyData>({ blind: false })
  const [ratingData, setRatingData] = useState<RatingData | null>(null)

  const handleRatingDone = async (data: RatingData) => {
    setRatingData(data)
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({
          whiskeyName: whisky.name, distillery: whisky.distillery, region: whisky.region,
          cask: whisky.cask, age: whisky.age, abv: whisky.abv,
          scores: data.scores, notes: data.notes, flavorTags: data.tags, source: 'app',
        }),
      })
    } catch { }
    setStep('done')
  }

  const avgScore = ratingData
    ? Math.round(Object.values(ratingData.scores).reduce((a, b) => a + b, 0) / 4)
    : 0

  if (step === 'capture')   return <SoloCaptureScreen th={th} t={t} participantId={participantId} onCapture={w => { setWhisky(w); setStep('quickRate') }} onBack={onBack} />
  if (step === 'quickRate') return <QuickRateScreen th={th} t={t} whisky={whisky} participantId={participantId}
    onSave={(score, note, tags) => {
      setRatingData({
        scores:  { nose: score, palate: score, finish: score, overall: score },
        tags:    { nose: [], palate: [], finish: [], overall: [] },
        notes:   { nose: '', palate: '', finish: '', overall: note },
      })
      setStep('done')
    }}
    onFull={() => setStep('form')}
    onBack={() => setStep('capture')}
  />
  if (step === 'form')    return <SoloWhiskyForm th={th} t={t} initial={whisky} onSubmit={w => { setWhisky(w); setStep('rating') }} onBack={() => setStep('capture')} />
  if (step === 'rating')  return <RatingFlow th={th} t={t} whisky={whisky} tastingId="solo" dramIdx={1} total={1} tastingStatus="open" participantId={participantId} onDone={handleRatingDone} onBack={() => setStep(whisky.name ? 'form' : 'capture')} />
  if (step === 'done')    return <SoloDoneScreen th={th} t={t} whisky={whisky} score={avgScore} onAnother={() => { setWhisky({ blind: false }); setRatingData(null); setStep('capture') }} onBack={onBack} />
  return null
}
