---
name: Cooper de-pressure invariant
description: Cooper (tasting companion) prompts must never push the taster to cover aspects; ledger is silent-only.
---
# Cooper must stay still at the glass, warm human-to-human

**Rule:** Cooper's prompts (both the 4 voice personas AND the text `turnSystem` in `server/routes.ts`) must NEVER contain language that pushes the taster to cover a specific perception "corner" before closing. The `update_ledger` tool + its stand are a SILENT orientation note only — they may quietly inform a later summary but must never drive conversation or be spoken. Banned phrasings to keep out: "schwächste Ecke fragen", "Ecke ... MUSS/soll vor (Ab)Schluss berührt sein", and claiming enough was said ("genug Kontur"/"ausreiche"). `canClose`/`proposeClose` code and the `update_ledger` function tool stay unchanged — this is purely a prompt-wording constraint.

**Why:** Binding product principle (Christoph): "Still bei der Arbeit am Glas. Warm bei der Begegnung von Mensch zu Mensch." Push language made Cooper nag and drop beruhigende Floskeln.

**How to apply:** Any future edit to Cooper prompts — re-scan all 4 personas + turnSystem for re-introduced push/coverage language before shipping.

# Impression chip-loss guard
Tapped chips live in the `adoptedTerms` Set + the `reply` textarea, but only reach the transcript on send. `withAdoptedChips(turns)` (in `ImpressionCapture.tsx`) appends any adopted term missing (case-insensitive) from taster turns as one synthetic taster turn, wired into BOTH `handleFinish` and `handleVoiceFinish` before `finalizeImpression`. Use `Array.from(set)` not `[...set]` — client tsconfig lacks `downlevelIteration` (spread trips TS2802).
