// CaskSense — useHaptics
// Capacitor Haptics mit navigator.vibrate() Fallback
// Ablage: client/src/labs/hooks/useHaptics.ts

import { useCallback } from 'react'

let HapticsImpact: any = null
let HapticsNotification: any = null
let ImpactStyle: any = null
let NotificationType: any = null

try {
  const cap = require('@capacitor/haptics')
  HapticsImpact      = cap.Haptics
  ImpactStyle        = cap.ImpactStyle
  HapticsNotification = cap.Haptics
  NotificationType   = cap.NotificationType
} catch {
  // Capacitor nicht verfügbar — Fallback auf navigator.vibrate
}

export function useHaptics() {
  // Leichter Tap — Navigation, Auswahl, Tag antippen
  const tap = useCallback(async () => {
    try {
      if (HapticsImpact && ImpactStyle) {
        await HapticsImpact.impact({ style: ImpactStyle.Light })
        return
      }
    } catch { }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8)
    }
  }, [])

  // Mittlerer Impact — Button-Aktionen, Slider loslassen
  const medium = useCallback(async () => {
    try {
      if (HapticsImpact && ImpactStyle) {
        await HapticsImpact.impact({ style: ImpactStyle.Medium })
        return
      }
    } catch { }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18)
    }
  }, [])

  // Erfolg — Phase gespeichert, Dram abgeschlossen
  const success = useCallback(async () => {
    try {
      if (HapticsNotification && NotificationType) {
        await HapticsNotification.notification({ type: NotificationType.Success })
        return
      }
    } catch { }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([12, 60, 20])
    }
  }, [])

  // Warnung — Fehler beim Speichern
  const warning = useCallback(async () => {
    try {
      if (HapticsNotification && NotificationType) {
        await HapticsNotification.notification({ type: NotificationType.Warning })
        return
      }
    } catch { }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 40, 20])
    }
  }, [])

  return { tap, medium, success, warning }
}
