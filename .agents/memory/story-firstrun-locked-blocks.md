---
name: Story first-run AI must skip locked/hidden blocks
description: Why the tasting-story first-run AI fill filters out locked & hidden blocks before regenerating.
---

# Story first-run AI fill must skip locked & hidden blocks

The tasting-story first-run AI regeneration selects targets with
`isRegeneratable(b.type) && !b.locked && !b.hidden` (server/routes.ts).

**Why:** Some story blocks are seeded **data-driven, without AI** and must stay
verbatim — e.g. the "Story-Tempo-Beat" (a group-level duration sentence built
from rating timestamps in `buildTempoBeatBody`, server/tastingStoryAutoFill.ts),
which is pushed with `locked: true`. Without the `!b.locked && !b.hidden` guard
the first AI pass would overwrite these factual/locked blocks with invented prose.

**How to apply:** Any block that must keep exact, fact-checked content should be
pushed with `locked: true` (and the zod `tastingStoryBlocksSchema` already allows
optional `locked`/`hidden`). When adding/altering the regeneration target filter,
preserve the locked/hidden exclusion or these blocks will be clobbered on first fill.
