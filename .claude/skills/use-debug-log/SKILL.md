---
name: use-debug-log
description: Add debug logging to SuperApp FE that's viewable in production BE log file. Use whenever debugging mobile/prod-only bugs, when adding logs to track state across mount/unmount, or whenever the user says "log it", "track this", "debug bằng debugLogger". Gotcha — `.log()` only buffers in-memory; must call `.flush()` to send to BE.
---

# Use Debug Log — SuperApp FE → BE log pipeline

Use this when you need server-side visible logs from the FE to debug a bug — especially mobile bugs where you can't open DevTools, or prod-only bugs that won't repro locally.

## API

Import from `@/shared`:

```ts
import { useDebugLog } from "@/shared";

function MyComponent() {
    const debugLog = useDebugLog();

    // Inside handlers/effects:
    debugLog.log("MyComponent", "event-name", { key: value });
    debugLog.flush();  // ← REQUIRED to actually send to BE
}
```

Outside React (services, utils, helpers without hooks):
```ts
import { debugLog } from "@/shared";  // standalone, no hook

debugLog.log("auth", "google-redirect", { redirectUri });
debugLog.flush();
```

## CRITICAL — `.log()` alone does nothing visible

`debugLog.log()` only pushes into an in-memory ring buffer (max 200 entries). To actually send logs to BE, **you must call `debugLog.flush()`**.

Forgetting `.flush()` is the #1 mistake. If logs aren't showing up in BE, check that flush is called.

**Rule of thumb:**
- After EVERY meaningful `.log()` call in user-driven handlers, call `.flush()` right after.
- Inside `useEffect` that fires on state change you want to track, call `.flush()` after the `.log()`.
- For high-frequency events (render, onLayout, mousemove), only flush periodically or on key transitions — flushing every tick will spam the BE.

```ts
// ✅ GOOD — log + flush
debugLog.log("KEditorPanel", "review-btn-state", { ... });
debugLog.flush();

// ❌ BAD — log only, BE will never see it
debugLog.log("KEditorPanel", "review-btn-state", { ... });
```

## API signature

```ts
debugLog.log(
    category: string,    // PascalCase component/feature name, e.g. "KEditorPanel"
    event: string,       // kebab-case event name, e.g. "fetchNodeQuestions-result"
    data?: Record<string, unknown>,
): void;

debugLog.flush(): Promise<void>;  // fire-and-forget, swallows errors
```

- `category`: Use the component/hook name in PascalCase (e.g. `KEditorPanel`, `VSCodeLayout`, `KNodeSelection`). This becomes `Category=...` in the BE log line so you can grep for it.
- `event`: Short kebab-case description of WHAT is being logged. Use suffixes like `-start`, `-result`, `-error`, `-resize` to indicate phase.
- `data`: Must be `Record<string, unknown>` — plain primitives only. If you pass `null` for an optional field, the TS type might complain — coerce with `?? undefined` instead.

## Where logs land

Production BE log file: `C:\Backup\superapp-{YYYYMMDD}.log`

Each FE log becomes one line like:
```
2026-06-22 09:08:50 [INF] DiagnosticController FE_LOG #1 Category=KEditorPanel Event=review-btn-state Data={"selectedNodeId":-12345,"isRootView":true,...} Origin=... Href=... UA=... ClientTs=... ServerTs=... Ip=...
```

To find your logs:
```bash
# Search by category
grep -n "Category=KEditorPanel" C:\Backup\superapp-20260622.log

# Search by event
grep -n "Event=mobileReviewActive-resize" C:\Backup\superapp-20260622.log

# Combined
grep -n "Category=VSCodeLayout Event=mobileReviewActive-resize" C:\Backup\superapp-20260622.log
```

## When to use what category/event style

| Use case | category | event |
|---|---|---|
| Component lifecycle | `KEditorPanel` | `mount`, `unmount-cleanup` |
| useEffect tracking state | `KEditorPanel` | `review-btn-state` |
| Async fetch | `KEditorPanel` | `fetchNodeQuestions`, `fetchNodeQuestions-result`, `fetchNodeQuestions-error` |
| User action | `KNodeSelection` | `regular-click`, `ctrl-click` |
| Imperative DOM ops | `VSCodeLayout` | `mobileReviewActive-resize` |

## Deploy required

The BE log file only shows logs from the **deployed** FE bundle. If you just added `.log()` calls and need to see them on prod, you must redeploy FE:
```
/sa-deploy FE only
```

Then hard-refresh the mobile browser (Ctrl+Shift+R or clear cache) so it loads the new bundle.

## Common pitfalls

1. **Forgot `.flush()`** — logs sit in memory and disappear on page reload.
2. **Imported `useLogger` instead of `useDebugLog`** — `useLogger` (from `DebugLogger.store.tsx`) is the *local-only* debug console store; it does NOT send anything to BE. Always use `useDebugLog` for prod debugging.
3. **Passed `null` in data** — TS type is `Record<string, unknown>`, but some keys may complain. Use `?? undefined` for nullable fields:
   ```ts
   debugLog.log("X", "y", { id: maybeNull ?? undefined });
   ```
4. **Flushing in render** — never call `.flush()` directly in component body. Put it inside an effect or handler.
5. **Browser cached old bundle** — after deploy, hard refresh required.

## Task: $ARGUMENTS

Add debug logging according to the user's request. Follow the rules above — especially: pick clear category/event names, call `.flush()` after every meaningful log, and remind the user to redeploy + hard-refresh after changes are pushed.
