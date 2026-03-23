// CaskSense Apple — LabsErrorBoundary (Phase A)
import React from 'react'
import { ThemeTokens, SP } from './theme/tokens'

interface Props { th?: ThemeTokens; children: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class LabsErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CaskSense Apple] Render error:', error, info)
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          url: window.location.href,
          ts: new Date().toISOString()
        })
      }).catch(() => {})
    } catch {}
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const th = this.props.th
    const bg     = th?.bg     || '#0e0b05'
    const text   = th?.text   || '#f5ede0'
    const muted  = th?.muted  || 'rgba(245,237,224,0.55)'
    const faint  = th?.faint  || 'rgba(245,237,224,0.25)'
    const gold   = th?.gold   || '#d4a847'
    const border = th?.border || 'rgba(255,255,255,0.08)'
    const bgCard = th?.bgCard || 'rgba(255,255,255,0.045)'

    return (
      <div style={{ minHeight: '100dvh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${gold}22`, border: `1px solid ${gold}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, color: text, margin: '0 0 8px' }}>
            Etwas ist schiefgelaufen
          </h2>
          <p style={{ fontSize: 14, color: muted, margin: '0 0 32px', lineHeight: 1.6, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            Ein unerwarteter Fehler ist aufgetreten. Deine Daten sind sicher — starte die App einfach neu.
          </p>

          {/* Error detail (collapsible) */}
          {this.state.error && (
            <details style={{ textAlign: 'left', background: bgCard, border: `1px solid ${border}`, borderRadius: 12, padding: 12, marginBottom: 24 }}>
              <summary style={{ fontSize: 12, color: faint, cursor: 'pointer', userSelect: 'none' }}>Fehlerdetails</summary>
              <pre style={{ marginTop: 8, fontSize: 11, color: faint, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}

          <button
            onClick={() => { this.setState({ hasError: false, error: undefined }); window.location.reload() }}
            style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${gold}, #c47a3a)`, color: '#1a0f00', fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}
          >
            App neu starten
          </button>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ width: '100%', height: 44, borderRadius: 14, border: `1px solid ${border}`, background: 'none', cursor: 'pointer', color: muted, fontSize: 14, fontFamily: 'DM Sans, sans-serif', marginTop: 8 }}
          >
            Nochmals versuchen
          </button>
        </div>
      </div>
    )
  }
}
