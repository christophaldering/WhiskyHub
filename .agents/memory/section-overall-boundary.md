---
name: UI section-type widening vs backend enum
description: Widening a UI dimension/section type to add "overall" can leak an invalid value into a backend zod enum; narrow at every network boundary.
---

When a UI term/section type is widened (e.g. `TermSection` -> `TermSection | "overall"`)
to support an aggregate "overall" view, the new value is safe for internal UI
composition but must NOT cross the network boundary if the backend validates that
field as a fixed enum.

**Why:** In FlavourStudioSheet the widening leaked `section="overall"` into
POST `/api/labs/flavour-assist`, whose schema is `z.enum(["nose","palate","finish"])`
— the request 400s and AI-assist silently degrades. A type-system widening does not
protect a runtime contract on the server.

**How to apply:** At each fetch/request body, narrow back to a valid member
(`section === "overall" ? "nose" : section`) or omit the field. After any such
widening, grep all request bodies for the widened field to catch every boundary.
