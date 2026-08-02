---
name: Merge marker checker false positives
description: continueMergeResolution flags any "=======" substring, even in decorative comment banners.
---
The rebase resolver's marker check matches the substring `=======` anywhere in a conflicted file — including decorative comment banners like `// ============`.
**Why:** During a task merge, server/routes.ts kept failing the check despite zero real conflict markers; 27 banner comments were the cause.
**How to apply:** If continueMergeResolution says markers remain but grep finds no `<<<<<<<`/`>>>>>>>`, look for 7+ consecutive `=` in comments and replace them with dashes.
