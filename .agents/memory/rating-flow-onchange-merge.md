---
name: RatingFlowV2 onChange merge contract
description: Why rating subviews must not emit full empty tags/notes objects, and how the free-branch auto-save can silently wipe aromas/notes.
---

# RatingFlowV2 onChange / auto-save data-loss contract

`RatingFlowV2.handleChange` keeps a merged `liveDataRef` and merges each incoming
partial **per category by shallow spread**:
`tags: { ...prev.tags, ...data.tags }` (same for `notes`). After the Eindruck-Default
rework, `onChange` forwards the *merged* snapshot (`liveDataRef.current ?? data`), and
the free branch (LabsLive) **auto-saves on every onChange** by rebuilding the DB
record from that snapshot.

**The trap:** if a subview emits a *complete* object with empty fields
(e.g. `tags: {nose:[],palate:[],finish:[],overall:[]}` or
`notes: {nose:"",palate:"",finish:"",overall:"..."}`), the spread **overwrites** the
previously merged aromas/per-phase notes with empties, and the auto-save then persists
the empties → existing `[FLAVOURS]` chips and notes are wiped on re-rating.

**Rule:** a rating subview must only emit the fields it actually owns, or it must seed
empties from `initialData` (like `TischRating.buildData` now does for `tags`). Emitting
full empty objects = data loss.

**Why:** the originally reported Tisch re-rating wipe was fixed two ways — (1)
`handleChange` emitting the merged snapshot, (2) `TischRating.buildData` passing
`initialData.tags` through instead of empty arrays.

**How to apply:** every rating subview is now non-destructive — Tisch/Compact pass
`initialData` through, and `QuickRating` builds its payload via `buildQuickData`, which
keeps `initialData` scores/tags/detail-notes and only updates overall score + overall
note. All four modes (Quick/Eindruck/Kompakt/Geführt) preserve data on re-rating. If a
new rating subview is added, it MUST seed unowned fields from `initialData` rather than
emitting empties, or the per-category merge + auto-save will wipe saved data.
