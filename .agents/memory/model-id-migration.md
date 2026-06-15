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

**Known runtime risk (flag, don't fix unless in scope):** the gpt-5 family chat API can reject `max_tokens` (wants `max_completion_tokens`) and non-default `temperature`. Many call-sites pass `max_tokens` + `temperature` 0.75/0.8. A pure id swap boots fine but live AI calls may 4xx — check deployment logs for model-related 4xx after release.
