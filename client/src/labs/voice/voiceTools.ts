import { tastingApi, blindModeApi, guidedApi, whiskyApi, ratingApi } from "@/lib/api"
import type { ParsedVoiceCommand } from "./voiceCommands"

export type VoiceLang = "de" | "en"

export interface VoiceToolDeps {
  tastingId:    string
  hostId:       string
  language:     VoiceLang
  isGuided:     boolean
  isBlind:      boolean
  guidedIdx:    number
  revealIndex:  number
  whiskies:     Array<{ id: string; name?: string | null }>
  participants: Array<{ id: string; name: string }>
  ratings:      Array<{ participantId: string; whiskyId: string }>
}

export interface VoiceToolResult {
  ok:           boolean
  speech:       string
  uiMessage?:   string
  needsRefresh?: boolean
}

const T = {
  de: {
    revealedNext:    "Nächste Info ist enthüllt.",
    revealedNone:    "Es gibt nichts mehr zu enthüllen.",
    advancedTo:      (n: string) => `Wir gehen zu ${n}.`,
    advancedFinal:   "Das war der letzte Dram.",
    nobodyMissing:   "Alle haben den aktuellen Whisky bewertet.",
    missingPeople:   (names: string[]) => `Es fehlen noch ${listJoin(names, "de")}.`,
    nudged:          (n: string) => `${n} wurde freundlich angestupst.`,
    nudgeNotFound:   (q: string) => `Ich konnte ${q} nicht in der Teilnehmerliste finden.`,
    paused:          (m: number) => `Pause für ${m} Minute${m === 1 ? "" : "n"} gestartet.`,
    pauseEnded:      "Pause beendet.",
    statusGuided:    (idx: number, total: number, done: number, parts: number) =>
      `Whisky ${idx} von ${total}. ${done} von ${parts} haben bewertet.`,
    statusFree:      (done: number, parts: number, total: number) =>
      `${done} von ${parts} Bewertungen für insgesamt ${total} Whiskys.`,
    notUnderstood:   "Das habe ich nicht verstanden. Probiere zum Beispiel: Reveal, Pause fünf Minuten, oder Wer fehlt.",
    failed:          "Das hat leider nicht geklappt.",
  },
  en: {
    revealedNext:    "Next detail revealed.",
    revealedNone:    "There is nothing left to reveal.",
    advancedTo:      (n: string) => `Moving on to ${n}.`,
    advancedFinal:   "That was the last dram.",
    nobodyMissing:   "Everybody has rated the current whisky.",
    missingPeople:   (names: string[]) => `Still missing: ${listJoin(names, "en")}.`,
    nudged:          (n: string) => `${n} has been gently nudged.`,
    nudgeNotFound:   (q: string) => `I could not find ${q} in the participant list.`,
    paused:          (m: number) => `Pause for ${m} minute${m === 1 ? "" : "s"} started.`,
    pauseEnded:      "Pause ended.",
    statusGuided:    (idx: number, total: number, done: number, parts: number) =>
      `Whisky ${idx} of ${total}. ${done} of ${parts} have rated.`,
    statusFree:      (done: number, parts: number, total: number) =>
      `${done} of ${parts} ratings across ${total} whiskies.`,
    notUnderstood:   "I did not catch that. Try: Reveal, Pause five minutes, or Who is missing.",
    failed:          "Sorry, that did not work.",
  },
} as const

function listJoin(items: string[], lang: VoiceLang): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  const last = items[items.length - 1]
  const head = items.slice(0, -1).join(", ")
  return lang === "de" ? `${head} und ${last}` : `${head} and ${last}`
}

function tokens(s: string): string[] {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9äöüß ]/g, "").split(/\s+/).filter(Boolean)
}

interface LiveSnapshot {
  participants: Array<{ id: string; name: string }>
  whiskies:     Array<{ id: string; name?: string | null }>
  ratings:      Array<{ participantId: string; whiskyId: string }>
}

async function fetchLiveSnapshot(tastingId: string): Promise<LiveSnapshot> {
  try {
    const [pRaw, wRaw, rRaw] = await Promise.all([
      tastingApi.getParticipants(tastingId),
      whiskyApi.getForTasting(tastingId),
      ratingApi.getForTasting(tastingId),
    ])
    const pArr = Array.isArray(pRaw) ? pRaw : []
    const wArr = Array.isArray(wRaw) ? wRaw : []
    const rArr = Array.isArray(rRaw) ? rRaw : []
    const participants = pArr
      .map((row: Record<string, unknown>) => {
        const inner = row.participant as Record<string, unknown> | undefined
        const id = (inner?.id as string | undefined) ?? (row.participantId as string | undefined) ?? (row.id as string | undefined)
        const name = (inner?.name as string | undefined) ?? (row.name as string | undefined) ?? ""
        return id ? { id, name } : null
      })
      .filter((x): x is { id: string; name: string } => x !== null)
    const whiskies = wArr.map((w: Record<string, unknown>) => ({
      id:   String(w.id ?? ""),
      name: (w.name as string | null | undefined) ?? null,
    }))
    const ratings = rArr.map((r: Record<string, unknown>) => ({
      participantId: String(r.participantId ?? ""),
      whiskyId:      String(r.whiskyId ?? ""),
    }))
    return { participants, whiskies, ratings }
  } catch {
    return { participants: [], whiskies: [], ratings: [] }
  }
}

function fuzzyMatchParticipant(
  query: string,
  participants: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  const qTokens = tokens(query)
  if (qTokens.length === 0) return null
  let best: { p: { id: string; name: string }; score: number } | null = null
  for (const p of participants) {
    const nTokens = tokens(p.name)
    if (nTokens.length === 0) continue
    let score = 0
    for (const qt of qTokens) {
      for (const nt of nTokens) {
        if (nt === qt) score += 3
        else if (nt.startsWith(qt) && qt.length >= 3) score += 2
        else if (qt.startsWith(nt) && nt.length >= 3) score += 2
        else if (nt.includes(qt) && qt.length >= 4) score += 1
      }
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { p, score }
    }
  }
  return best ? best.p : null
}

function activeWhiskyIndex(deps: VoiceToolDeps): number {
  if (deps.isGuided) return Math.max(0, deps.guidedIdx)
  if (deps.isBlind)  return Math.max(0, deps.revealIndex)
  return Math.max(0, deps.revealIndex)
}

function ratersForWhisky(whiskyId: string, ratings: VoiceToolDeps["ratings"]): Set<string> {
  const out = new Set<string>()
  for (const r of ratings) {
    if (r.whiskyId === whiskyId) out.add(r.participantId)
  }
  return out
}

export async function executeVoiceCommand(
  cmd: ParsedVoiceCommand,
  deps: VoiceToolDeps,
): Promise<VoiceToolResult> {
  const t = T[deps.language]

  try {
    switch (cmd.kind) {
      case "reveal_next": {
        if (deps.isGuided) {
          await guidedApi.advance(deps.tastingId, deps.hostId)
        } else if (deps.isBlind) {
          await blindModeApi.revealNext(deps.tastingId, deps.hostId)
        } else {
          return { ok: false, speech: t.revealedNone, uiMessage: deps.language === "de" ? "Reveal nicht möglich (kein Blind/Guided Mode)." : "Reveal not available (not blind/guided)." }
        }
        return { ok: true, speech: t.revealedNext, uiMessage: t.revealedNext, needsRefresh: true }
      }

      case "next_dram": {
        const currentIdx = activeWhiskyIndex(deps)
        const targetIdx = currentIdx + 1
        if (targetIdx >= deps.whiskies.length) {
          return { ok: true, speech: t.advancedFinal, uiMessage: t.advancedFinal, needsRefresh: true }
        }
        if (deps.isGuided) {
          await guidedApi.goTo(deps.tastingId, deps.hostId, targetIdx, 0)
        } else if (deps.isBlind) {
          let safety = 0
          while (safety++ < 20) {
            const r = await blindModeApi.revealNext(deps.tastingId, deps.hostId) as { revealIndex?: number; allRevealed?: boolean }
            if (r?.allRevealed) break
            if (typeof r?.revealIndex === "number" && r.revealIndex >= targetIdx) break
          }
        } else {
          return { ok: false, speech: t.failed, uiMessage: deps.language === "de" ? "Nur in Guided/Blind verfügbar." : "Only available in guided or blind mode." }
        }
        const nextWhisky = deps.whiskies[targetIdx]
        const speech = nextWhisky ? t.advancedTo(nextWhisky.name || `#${targetIdx + 1}`) : t.advancedFinal
        return { ok: true, speech, uiMessage: speech, needsRefresh: true }
      }

      case "who_is_missing": {
        const fresh = await fetchLiveSnapshot(deps.tastingId)
        const idx = activeWhiskyIndex(deps)
        const w = fresh.whiskies[idx] ?? deps.whiskies[idx]
        if (!w) {
          return { ok: true, speech: t.nobodyMissing, uiMessage: t.nobodyMissing }
        }
        const haveRated = ratersForWhisky(w.id, fresh.ratings)
        const missing = fresh.participants.filter((p) => !haveRated.has(p.id)).map((p) => p.name)
        if (missing.length === 0) {
          return { ok: true, speech: t.nobodyMissing, uiMessage: t.nobodyMissing }
        }
        const shortList = missing.slice(0, 4)
        const more = missing.length - shortList.length
        const display = more > 0
          ? (deps.language === "de" ? `${listJoin(shortList, "de")} und ${more} weitere` : `${listJoin(shortList, "en")} and ${more} more`)
          : listJoin(shortList, deps.language)
        const speech = t.missingPeople(shortList)
        return { ok: true, speech, uiMessage: deps.language === "de" ? `Fehlt noch: ${display}` : `Still missing: ${display}` }
      }

      case "nudge": {
        if (!cmd.name) {
          return { ok: false, speech: t.notUnderstood, uiMessage: t.notUnderstood }
        }
        const target = fuzzyMatchParticipant(cmd.name, deps.participants)
        if (!target) {
          return { ok: false, speech: t.nudgeNotFound(cmd.name), uiMessage: t.nudgeNotFound(cmd.name) }
        }
        await tastingApi.nudge(deps.tastingId, deps.hostId, target.id)
        return { ok: true, speech: t.nudged(target.name), uiMessage: t.nudged(target.name) }
      }

      case "pause": {
        const minutes = Math.max(0, Math.min(120, Math.round(cmd.minutes ?? 5)))
        await tastingApi.pause(deps.tastingId, deps.hostId, minutes)
        if (minutes === 0) {
          return { ok: true, speech: t.pauseEnded, uiMessage: t.pauseEnded, needsRefresh: true }
        }
        return { ok: true, speech: t.paused(minutes), uiMessage: t.paused(minutes), needsRefresh: true }
      }

      case "resume": {
        await tastingApi.pause(deps.tastingId, deps.hostId, 0)
        return { ok: true, speech: t.pauseEnded, uiMessage: t.pauseEnded, needsRefresh: true }
      }

      case "status": {
        const fresh = await fetchLiveSnapshot(deps.tastingId)
        const totalWhiskies = fresh.whiskies.length || deps.whiskies.length
        const totalParts = fresh.participants.length || deps.participants.length
        if (deps.isGuided) {
          const idx = activeWhiskyIndex(deps)
          const w = fresh.whiskies[idx] ?? deps.whiskies[idx]
          const have = w ? ratersForWhisky(w.id, fresh.ratings).size : 0
          return {
            ok: true,
            speech:    t.statusGuided(idx + 1, totalWhiskies, have, totalParts),
            uiMessage: t.statusGuided(idx + 1, totalWhiskies, have, totalParts),
          }
        }
        const totalRatings = fresh.ratings.length
        return {
          ok: true,
          speech:    t.statusFree(totalRatings, totalParts, totalWhiskies),
          uiMessage: t.statusFree(totalRatings, totalParts, totalWhiskies),
        }
      }

      case "unknown":
      default:
        return { ok: false, speech: t.notUnderstood, uiMessage: t.notUnderstood }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, speech: T[deps.language].failed, uiMessage: `${T[deps.language].failed} (${msg})` }
  }
}
