---
name: no-push-per-change
description: Don't push after every small change — batch changes and push when the user confirms things work locally
type: feedback
---

Don't commit and push after every small CSS/UI tweak. Instead, make the changes, let the user test locally, and only commit+push when they confirm it works.

**Why:** The user wants to verify changes locally before pushing. Pushing broken or unfinished changes wastes deploy cycles and pollutes git history.

**How to apply:** After making changes, just say "recarga y prueba" instead of immediately running git commit && push. Wait for user confirmation before committing.
