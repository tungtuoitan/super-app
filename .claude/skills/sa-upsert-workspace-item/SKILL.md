---
name: sa-upsert-workspace-item
description: List all locations that build UpsertWorkspaceItemRequest objects or handle WorkspaceItemAction, so adding a new action or field hits every call site.
---

# All Places: Workspace Item Upsert

When invoked, **search the codebase** and return every location that needs updating when a new action is added to `WorkspaceItemAction`, a new field is added to `UpsertWorkspaceItemRequest`, or the batch endpoint shape changes.

---

## Grep patterns

```bash
# All direct API calls (workspace feature)
workspaceService\._upsertWorkspaceItems

# All direct API calls (K feature — uses its own KService wrapper)
KService\._upsertWorkspaceItems

# All uses of the WorkspaceItemAction enum
WorkspaceItemAction\.

# All uses of the KItemAction enum (K feature mirror)
KItemAction\.

# Helper wrappers that abstract the direct call
upsertWorkspaceItem\(
```

---

## Known call sites (as of 2026-05-04)

### Workspace feature — `workspaceService._upsertWorkspaceItems`

| File | Lines | Action(s) used |
|------|-------|---------------|
| `src/features/workspace/hooks/useWorkspaceItemHelper.ts` | 88 | Create (via `upsertWorkspaceItem()` wrapper) |
| `src/features/workspace/hooks/useWorkspaceFolderDeleteMenu.helper.ts` | 229 | Delete, Restore |
| `src/features/workspace/hooks/useWorkspaceChildMenu.helper.ts` | 112 | Delete, Restore |
| `src/features/workspace/hooks/useTreeHelper.ts` | 291 | Move |
| `src/features/workspace/hooks/useFolderDialog.helper.ts` | 112, 130 | UpdateFolder, Create |
| `src/features/taskDetail/hooks/useTaskFolderHelper.ts` | 53, 172 | Create, Add |

### Workspace feature — `upsertWorkspaceItem()` helper (wraps the above)

| File | Lines | Notes |
|------|-------|-------|
| `src/features/workspace/hooks/useWorkspaceItemHelper.ts` | 22 | Helper definition |
| `src/features/workspace/hooks/useWorkspaceHelper.tsx` | 39 | Create action on note save |
| `src/features/note/hooks/useNoteSaveActions.ts` | 41 | Create action after note saved |

### MoveCross — dedicated endpoint (NOT batch)

| File | Lines | Notes |
|------|-------|-------|
| `src/features/workspace/hooks/useMovingTree.helper.ts` | ~302 | Calls `workspaceService._moveCrossItems` |

### K feature — `KService._upsertWorkspaceItems` (K's own batch endpoint `/api/k/{id}/nodes/batch`)

| File | Lines | Action(s) used |
|------|-------|---------------|
| `src/features/K/hooks/useKNodeEditor.loader.ts` | 133, 156, 168, 192, 230, 265 | Create, Update, Move, MoveCross, Delete, Restore |
| `src/features/K/hooks/useKNodeDialog.helper.ts` | 114, 133, 266 | Create, Update |
| `src/features/K/hooks/kTree/useKItem.helper.ts` | 83 | via `upsertWorkspaceItem()` wrapper |
| `src/features/K/hooks/kTree/useKMovingTree.helper.ts` | 303 | MoveCross |
| `src/features/K/hooks/kTree/useKTree.helper.ts` | 299 | Move |
| `src/features/K/contexts/helpers/useKMenuDelete.helper.ts` | 180 | Delete, Restore |

---

## Type definitions to update

### FE — Workspace
| File | What |
|------|------|
| `src/features/workspace/types/workspace.types.ts` | `WorkspaceItemAction` enum, `UpsertWorkspaceItemRequest` interface |
| `src/features/workspace/service/workspace.service.ts` | `_upsertWorkspaceItems`, `_moveCrossItems` |

### FE — K (separate enum, mirrors workspace concept)
| File | What |
|------|------|
| `src/features/K/types/k.type.ts` | `KItemAction` enum, `KUpsertNodeRequest` interface |
| `src/features/K/service/k.service.ts` | `_upsertWorkspaceItems` (K version) |

### Backend — Workspace
| File | What |
|------|------|
| `SuperAppModels/DTOs/Requests/WorkspaceItemAction.cs` | Enum — add new value here |
| `SuperAppModels/DTOs/Requests/UpsertWorkspaceItemRequest.cs` | DTO — add new fields here |
| `SuperAppModels/DTOs/Requests/MoveCrossRequest.cs` | Separate DTO for cross-workspace move |
| `SuperAppServices/Interfaces/Workspaces/IWorkspaceItemHelperService.cs` | Add new `Process*ActionAsync` method |
| `SuperAppServices/Services/Workspaces/WorkspaceItemHelperService.cs` | Implement new action: ValidateRequest case + Process method |
| `SuperAppServices/Services/Workspaces/WorkspaceItemService.cs` | Wire new action into PRELOAD + PROCESS switch in `UpsertWorkspaceItemsAsync` |
| `SuperAppAPI/Controllers/Workspaces/WorkspaceController.cs` | No change needed unless it's a new top-level endpoint |

---

## Checklist when adding a new action

1. **BE enum** — add `[EnumMember(Value = "...")]` to `WorkspaceItemAction.cs`
2. **BE DTO** — add any required fields to `UpsertWorkspaceItemRequest.cs`
3. **BE helper interface** — declare `Process<NewAction>Async` in `IWorkspaceItemHelperService.cs`
4. **BE helper impl** — implement the method + add a `case` in `ValidateRequest` in `WorkspaceItemHelperService.cs`
5. **BE service** — add the new action to the PRELOAD filter (if it needs existing items) and add a `case` in the PROCESS switch in `WorkspaceItemService.UpsertWorkspaceItemsAsync`
6. **FE enum** — add value to `WorkspaceItemAction` in `workspace.types.ts`
7. **FE call sites** — update any relevant helpers from the table above

## Checklist when adding a new field to `UpsertWorkspaceItemRequest`

1. Add field to `UpsertWorkspaceItemRequest.cs` (BE)
2. Add field to `UpsertWorkspaceItemRequest` interface in `workspace.types.ts` (FE)
3. Re-run the grep patterns above to find all places that build the request object
4. Update every call site that needs to pass the new field

---

## Task

{ARGS}

If args are provided, re-run the grep patterns above against the current codebase, compare against the known list, and flag any new call sites or missing updates.
