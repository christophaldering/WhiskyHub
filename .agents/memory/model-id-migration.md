---
name: OpenAI model-id migration boundaries
description: Safe rules for swapping gpt-4o / gpt-4o-mini chat model identifiers to the gpt-5 family.
---

# Swapping OpenAI chat model identifiers

When upgrading model identifiers in this repo (e.g. gpt-4o -> gpt-5, gpt-4o-mini -> gpt-5-mini):

- Match on the **exact quoted string** (`"gpt-4o"`, `"gpt-4o-mini"`), e.g. `sed 's/"gpt-4o-mini"/"gpt-5-mini"/g'`. The closing quote means it does NOT touch longer ids that share the prefix.
- **Protected siblings — never swap these as part of a chat-model upgrade:**
  - `"gpt-4o-mini-transcribe"` — audio STT (Whisper), in `server/replit_integrations/audio/`. A no-suffix `"gpt-4o-mini"` swap leaves it untouched by design.
  - `gpt-image-1` — image generation.
- Code call-sites live in `server/routes.ts` (the bulk), plus `server/tastingStoryRegen.ts`, `server/funnel-ai.ts`, `server/auto-handout/condense.ts`, `server/seed-whisky-db.ts`, and `scripts/*-lexicon.ts`. Some use an env fallback `process.env.AI_INTEGRATIONS_OPENAI_MODEL || "<model>"` — swap the literal default too.
- Skip `docs/` and `attached_assets/` (non-code).

**Why:** a model-id swap is the whole task scope; touching the transcribe/image siblings or the env-var name would be a silent regression.

**How to apply:** after the swap, grep that 0 exact old ids remain in `server/`+`scripts/`, the new id count matches, and the transcribe id is still present. Boot to confirm compile.

**Runtime incompatibility (now handled centrally):** the gpt-5 family chat API rejects `max_tokens` (wants `max_completion_tokens`) and non-default `temperature` (only 1). This DID 400 in production on `/api/impression/parse` after the swap. Fix lives in `server/openai-compat.ts`: a one-time shim on `OpenAI.Chat.Completions.prototype.create` that, for `model` ids starting `gpt-5`, renames `max_tokens`→`max_completion_tokens` and drops `temperature !== 1`; other models untouched. It is imported FIRST in `server/index.ts`.

**Why central, not per-call-site:** ~46 scattered `.create({max_tokens, temperature})` calls; one SDK-prototype shim covers them all + future calls.

**Coverage gap:** the shim only runs for code that boots through `server/index.ts`. Standalone scripts (`scripts/*`, `server/seed-whisky-db.ts`) do NOT import it — if run with a gpt-5 model they will still 400. Move the shim into a shared bootstrap if scripts need it. Also only patches Chat Completions, not `responses.create`.

**Reasoning token budget (separate from the 400s):** gpt-5 reasoning models spend `max_completion_tokens` on INTERNAL reasoning first, so a small budget that worked for gpt-4o (e.g. 500) yields EMPTY output (200 OK, blank fields), not an error. For short JSON-output calls set `reasoning_effort: "minimal"` and a generous `max_completion_tokens` (e.g. 2000). The compat shim does NOT fix this — it only renames params; the budget is per-call intent and must be raised at the call-site.
