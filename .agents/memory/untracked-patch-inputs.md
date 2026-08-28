---
name: Untracked patch inputs
description: Prevent local patch input files from being included in automatic commits
---

Automatic workspace commits may include an untracked patch file that was used as input, even when the intended code changes are otherwise correct.

**Why:** A patch file is an input artifact, not part of the application, and committing it can expose redundant or sensitive project context.

**How to apply:** Before pushing after applying a patch, inspect the commit file list. If the patch was included, remove it from the index while keeping the local file, then amend the commit before pushing.