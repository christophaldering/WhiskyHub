import { useEffect, useRef } from 'react'

type EventPayload = Record<string, unknown>

interface TastingEventCallbacks {
  onReveal?:        (data: EventPayload) => void
  onStatus?:        (data: EventPayload) => void
  onPresentation?:  (data: EventPayload) => void
  onDramAdvanced?:  (data: EventPayload) => void
  onPauseChanged?:  (data: EventPayload) => void
  onNudge?:         (data: EventPayload) => void
}

interface TastingEventOptions extends TastingEventCallbacks {
  tastingId: string | null | undefined
  enabled?:  boolean
}

function isOptions(value: unknown): value is TastingEventOptions {
  return typeof value === 'object' && value !== null && 'tastingId' in (value as Record<string, unknown>)
}

export function useTastingEvents(
  arg1: string | null | undefined | TastingEventOptions,
  callbacks?: TastingEventCallbacks,
) {
  const opts: TastingEventOptions = isOptions(arg1)
    ? arg1
    : { tastingId: arg1, enabled: true, ...(callbacks ?? {}) }

  const cbRef = useRef<TastingEventCallbacks>(opts)
  cbRef.current = opts

  const tastingId = opts.tastingId
  const enabled   = opts.enabled !== false

  useEffect(() => {
    if (!tastingId || !enabled) return

    let es: EventSource | null = null
    let closed = false

    const safeParse = (raw: string | null | undefined): EventPayload => {
      if (!raw) return {}
      try {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as EventPayload
        }
        return {}
      } catch {
        return {}
      }
    }

    const dispatch = (handler: ((data: EventPayload) => void) | undefined, ev: MessageEvent) => {
      if (!handler) return
      handler(safeParse(ev.data))
    }

    const connect = () => {
      if (closed) return
      try {
        es = new EventSource(`/api/tastings/${tastingId}/events`)

        es.addEventListener('reveal_triggered', (ev) => {
          dispatch(cbRef.current.onReveal, ev as MessageEvent)
        })

        es.addEventListener('status_changed', (ev) => {
          dispatch(cbRef.current.onStatus, ev as MessageEvent)
        })

        es.addEventListener('presentation_changed', (ev) => {
          dispatch(cbRef.current.onPresentation, ev as MessageEvent)
        })

        es.addEventListener('dram_advanced', (ev) => {
          dispatch(cbRef.current.onDramAdvanced, ev as MessageEvent)
        })

        es.addEventListener('pause_changed', (ev) => {
          dispatch(cbRef.current.onPauseChanged, ev as MessageEvent)
        })

        es.addEventListener('nudge_sent', (ev) => {
          dispatch(cbRef.current.onNudge, ev as MessageEvent)
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
  }, [tastingId, enabled])
}
