---
name: sa-all-places-upsert-task
description: List all locations where Task upsert requests are built or Task DTO→domain transforms happen, to ensure new fields are added everywhere.
---

# All Places: Task Upsert & Transform

When invoked, **search the codebase** and return a complete list of every location that needs updating when a new field is added to the `pro.task` table.

## What to search for

### 1. Upsert request objects (sent to API)
Search for all places that build request objects passed to `_upsertTaskBatch()`.
Pattern: `checklistJson: task.checklistJson` or `checklistJson:` near `_upsertTaskBatch`.

```bash
# grep pattern
checklistJson:.*\.checklistJson
```

### 2. DTO → Domain transforms (API response → frontend Task)
Search for all `transformTaskData` functions or inline DTO mapping.
Pattern: `checklistJson: dto.checklistJson` or mapping from `TaskDTO` to `Task`.

```bash
# grep pattern
checklistJson.*dto\.checklistJson
```

### 3. Service request type
The request DTO type that must include the new field:
- `src/services/task.service.ts` → `UpsertTaskRequest` interface

### 4. Domain type
- `src/types/task/task.types.ts` → `Task` and `TaskDTO` interfaces

## Known locations (as of 2026-03-21)

### Upsert requests (21 places):
| File | Count | Variable |
|------|-------|----------|
| `src/hooks/task/useTaskDetail.helper.ts` | 2 | `taskToSave`, `savedTask` |
| `src/hooks/task/useTaskDetailChecklist.helper.ts` | 1 | `task` |
| `src/hooks/task/useTaskDetailProcess.helper.ts` | 1 | `task` |
| `src/hooks/task/useTaskGrid.helper.ts` | 2 | `task` |
| `src/hooks/task/useTaskGrid2.helper.ts` | 4 | `task` ×3, `dragTask` |
| `src/hooks/task/useTaskKanban.helper.ts` | 2 | `task`, `subtask` |
| `src/hooks/task/useTaskTimeline.helper.ts` | 1 | `task` |
| `src/hooks/vsCode/useEditorToolbar.helper.ts` | 1 | `savedTask` |
| `src/hooks/multiProject/useMultiTimeline.helper.ts` | 1 | `task` |
| `src/hooks/multiProject/useMultiProjectTaskList.helper.ts` | 4 | `task` ×3, `dragTask` |
| `src/hooks/multiProject/useMultiProjectTaskGrid.helper.ts` | 1 | `task` |
| `src/hooks/multiProject/useMultiProjectKanban.helper.ts` | 2 | `task`, `subtask` |

### DTO → Domain transforms (6 places):
| File | Notes |
|------|-------|
| `src/hooks/task/useTaskGrid.helper.ts` | local `transformTaskData` |
| `src/hooks/multiProject/useMultiProjectTaskGrid.helper.ts` | local `transformTaskData` |
| `src/hooks/keyword/useKeywordNavigation.helper.ts` | inline mapping |
| `src/hooks/vsCode/useNavigationHistory.helper.ts` | local `transformTaskData` |
| `src/HeadlessComponents/vsCode/OpenTabsSync.tsx` | local `transformTaskData` |
| `src/utils/task/TaskDetail.utils.ts` | shared `transformTaskData` |

### Type definitions (2 files):
| File | Types |
|------|-------|
| `src/types/task/task.types.ts` | `Task`, `TaskDTO` |
| `src/services/task.service.ts` | `UpsertTaskRequest` |

### Backend (C#):
| File | What |
|------|------|
| `SuperAppModels/DTOs/Requests/UpsertTaskRequest.cs` | Request DTO |
| `SuperAppModels/Entities/ProTask.cs` | Entity |
| `SuperAppModels/EntityConfigurations/ProTaskConfiguration.cs` | EF mapping |
| `SuperAppServices/TaskService.cs` | Upsert mapping |
| `SuperAppServices/TaskRepository.cs` | SELECT + UPDATE |

## How to use

When adding a new field to `pro.task`:

1. Run `/all-places-upsertTask` to get this list
2. Re-run the grep patterns above to catch any NEW locations added since this list was created
3. Update ALL locations — missing even one will cause data loss (field gets overwritten to null on save)

## Task

{ARGS}

If args provided, search the codebase using the patterns above and return the current complete list. Flag any new locations not in the known list.
