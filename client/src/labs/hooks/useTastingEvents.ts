// CaskSense — useTastingEvents
// Ablage: client/src/labs/hooks/useTastingEvents.ts

import { useEffect, useRef } from 'react'

interface TastingEventCallbacks {
  onReveal?:       () => void
  onStatus?:       () => void
  onPresentation?: () => void
}

export function useTastingEvents(
  tastingId: string | null | undefined,
  callbacks: TastingEventCallbacks,
) {
  const cbRef = useRef(callbacks)
  cbRef.current = callbacks

  useEffect(() => {
    if (!tastingId) return

    let es: EventSource | null = null
    let closed = false

    const connect = () => {
      if (closed) return
      try {
        es = new EventSource(`/api/tastings/${tastingId}/events`)

        es.addEventListener('reveal_triggered', () => {
          cbRef.current.onReveal?.()
        })

        es.addEventListener('status_changed', () => {
          cbRef.current.onStatus?.()
        })

        es.addEventListener('presentation_changed', () => {
          cbRef.current.onPresentation?.()
        })

        es.onerror = () => {
          es?.close()
          es = null
          if (!closed) setTimeout(connect, 3000)
        }
      } catch {
        // EventSource nicht verfügbar — ignorieren
      }
    }

    connect()

    return () => {
      closed = true
      es?.close()
      es = null
    }
  }, [tastingId])
}
