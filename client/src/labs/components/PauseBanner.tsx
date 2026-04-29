import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Coffee } from "lucide-react"

export interface PauseBannerProps {
  pauseUntil: string | Date | null | undefined
  hostName?: string
}

function formatRemaining(ms: number, language: string): string {
  if (ms <= 0) return ""
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    return `${h}:${pad(mm)}:${pad(s)}`
  }
  if (m > 0) return `${m}:${pad(s)}`
  return language.startsWith("de") ? `${s}s` : `${s}s`
}

export default function PauseBanner({ pauseUntil, hostName }: PauseBannerProps) {
  const { t, i18n } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!pauseUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [pauseUntil])

  if (!pauseUntil) return null
  const targetMs = typeof pauseUntil === "string"
    ? Date.parse(pauseUntil)
    : (pauseUntil as Date).getTime()
  if (!Number.isFinite(targetMs)) return null
  const remaining = targetMs - now
  if (remaining <= 0) return null

  const remainingLabel = formatRemaining(remaining, i18n.language || "en")
  const title = t("pauseBanner.title", "Pause")
  const subtitle = hostName
    ? t("pauseBanner.byHost", "{{host}} hat eine Pause angesetzt", { host: hostName })
    : t("pauseBanner.generic", "Kurze Pause für alle")

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pause-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        marginBottom: 12,
        borderRadius: "var(--labs-radius, 12px)",
        background: "color-mix(in srgb, var(--labs-accent, #C9A961) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--labs-accent, #C9A961) 35%, transparent)",
        color: "var(--labs-text, inherit)",
      }}
    >
      <Coffee style={{ width: 18, height: 18, color: "var(--labs-accent, #C9A961)", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }} data-testid="pause-banner-title">
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--labs-text-muted, inherit)" }} data-testid="pause-banner-subtitle">
          {subtitle}
        </div>
      </div>
      <div
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: 16,
          color: "var(--labs-accent, #C9A961)",
          minWidth: 56,
          textAlign: "right",
        }}
        data-testid="pause-banner-countdown"
      >
        {remainingLabel}
      </div>
    </div>
  )
}
