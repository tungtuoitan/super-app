# Task Flow — Context & Architecture

## Overview
`TASK FLOW` is the 5th tab in `MultiProjectDetailContent`. It uses **React Flow (`@xyflow/react` v12)** to visualise task parent-child relationships as a directed graph, with auto tree-layout, drag-to-reposition (persisted), inline rename, and user-drawn connections with optional notes.

---

## File Map

| Role | Path |
|------|------|
| UI (main view) | `src/Components/MultiProject/MultiProjectTaskFlowView.tsx` |
| UI (custom node) | `src/Components/MultiProject/small/TaskFlowNode.tsx` |
| UI (custom edge) | `src/Components/MultiProject/small/FlowEdgeWithNote.tsx` |
| Store | `src/store/task/useMultiTaskFlow.store.tsx` |
| Selector | `src/Selectors/multipleProject/useMultiProjectTaskFlow.selector.ts` |
| Helper | `src/hooks/multiProject/useMultiProjectTaskFlow.helper.ts` |
| Headless | `src/HeadlessComponents/multiProject/useMultiProjectTaskFlow.headless.ts` |
| Utils | `src/utils/project/multiProjectTaskFlow.utils.ts` |
| Types | `src/types/multiProject/multiProjectTaskFlow.type.ts` |
| Frontend Service | `src/services/flow.service.ts` |
| DB table (edges) | `database-objects/SuperApp-dev/pro/Tables/flow_edge.sql` |
| DB table (positions) | `database-objects/SuperApp-dev/pro/Tables/flow_node_position.sql` |
| Backend model | `SuperAppModels/Models/FlowEdge.cs` |
| Backend model | `SuperAppModels/Models/FlowNodePosition.cs` |
| Backend DTOs | `SuperAppModels/DTOs/Requests/UpsertFlowEdgeRequest.cs` |
| Backend DTOs | `SuperAppModels/DTOs/Requests/UpsertFlowNodePositionRequest.cs` |
| Backend repo interface | `SuperAppDataRepositories/Ins/IFlowRepository.cs` |
| Backend repo impl | `SuperAppDataRepositories/Repositories/FlowRepository.cs` |
| Backend service | `SuperAppServices/Services/FlowService.cs` |
| Backend controller | `SuperAppApi/Controllers/FlowController.cs` |

---

## Data Flow

```
Tasks (useTaskGridStore)
  ↓  filtered by filteredProjectIds (useMultiProjectDetailSelector)
useMultiProjectTaskFlowSelector → filteredTasks, projectNameMap, taskIdKey
  ↓
useMultiProjectTaskFlowHeadless
  ├── Effect 1 (mount): loads saved positions + custom edges from API
  │     → buildTaskFlowLayout() with saved positions merged in
  └── Effect 2 (taskIdKey): rebuilds layout preserving existing node positions
                             custom edges (flowEdgeWithNote) are preserved
  ↓
useMultiTaskFlowStore: { flowNodes, flowEdges, editingNodeId, editingEdgeId, savedEdges, positionsLoaded }
  ↓
MultiProjectTaskFlowView (ReactFlow canvas)
  ├── TaskFlowNode (custom node — see below)
  └── FlowEdgeWithNote (custom edge — dashed, with note badge)
```

---

## Store: `useMultiTaskFlow.store.tsx`

Context-based, scoped to `MultiProjectTaskFlowView` lifecycle (unmounts with tab — positions **are** persisted to backend).

| State | Type | Purpose |
|-------|------|---------|
| `flowNodes` | `Node<TaskFlowNodeData>[]` | Current React Flow node list (includes positions) |
| `flowEdges` | `Edge[]` | All edges: auto parent→child + custom user-drawn |
| `editingNodeId` | `string \| null` | Which node is currently being renamed |
| `editingEdgeId` | `string \| null` | Which edge note popover is open |
| `savedEdges` | `Edge<FlowEdgeData>[]` | Custom edges from backend (for update/delete by ID) |
| `positionsLoaded` | `boolean` | Prevents re-fetching positions on taskIdKey changes |

---

## Layout Algorithm (`multiProjectTaskFlow.utils.ts`)

Custom tree layout — no external dagre dependency.

1. Build `childrenMap` (parentId → childIds[]) and `rootsByProject` (projectId → rootIds[])
2. Compute `getSubtreeWidth(id)` recursively
3. `assignPositions(id, x, y)` DFS — children are centered under their parent
4. Groups are separated by `PROJECT_GROUP_GAP = 120px`
5. Constants: `NODE_WIDTH=200`, `NODE_HEIGHT=80`, `H_GAP=60`, `V_GAP=100`

`getStatusNodeBackground(status)` returns very muted RGBA background per status:
- `open` → green/5%, `in_progress` → amber/10%, `completed` → purple/8%, `cancelled` → red/6%

---

## Headless: two-effect rebuild strategy

**Effect 1** — fires once per mount (`positionsLoaded` flag prevents repeats on taskIdKey changes):
```
Promise.all([getEdges, getPositions])
  → build savedPositions map
  → convert edge DTOs to RF edges (type: "flowEdgeWithNote")
  → setSavedEdges(customEdges)
  → buildTaskFlowLayout() then merge savedPositions into node positions
  → setFlowNodes(mergedNodes), setFlowEdges([autoEdges, ...customEdges])
```

**Effect 2** — fires when `taskIdKey` changes (sorted task IDs joined):
```
buildTaskFlowLayout(filteredTasks, projectNameMap)
  → setFlowNodes(prev => autoNodes.map(n => ({ ...n, position: prevPositions[n.id] ?? n.position })))
  → setFlowEdges(prev => [...autoEdges, ...prev.filter(e => e.type === "flowEdgeWithNote")])
```

---

## Helper: key callbacks

| Function | What it does |
|----------|-------------|
| `handleNodesChange` | Wraps `applyNodeChanges` — propagates all RF changes (drag, select) to store |
| `handleNodeDragStop` | Calls `flowService._upsertPositions` with node's new X/Y (best-effort, silent catch) |
| `handleRenameStart(nodeId)` | Sets `editingNodeId` |
| `handleRenameConfirm(nodeId, title)` | Optimistic update → `taskService._upsertTaskBatch` → revert on failure |
| `handleRenameCancel()` | Clears `editingNodeId` |
| `handleConnect(connection)` | Creates temp edge → `flowService._upsertEdges` → swap temp ID with real ID; reverts on failure |
| `handleEdgeNoteConfirm(edgeId, note)` | Updates note in store + `flowService._upsertEdges` |
| `handleEdgeDelete(edgeId)` | Removes from store + soft-deletes via `flowService._upsertEdges` with `deletedAt` |
| `handleAutoLayout()` | Resets all positions to auto tree layout + saves to backend |

---

## Edge types: two categories

| Type | `edge.type` | How created | Persisted? |
|------|-------------|-------------|------------|
| Auto parent→child | `"default"` (RF built-in) | `buildTaskFlowLayout()` | No — rebuilt each time |
| User-drawn custom | `"flowEdgeWithNote"` | `onConnect` handler | Yes — `flow_edge` table |

**Custom edge differentiation** — `e.type === "flowEdgeWithNote"` is the filter used throughout to preserve/separate custom edges from auto-layout edges.

---

## Custom Node: `TaskFlowNode`

| Element | Detail |
|---------|--------|
| Size | `w-[200px]`, `rounded-xl` |
| Left border | `3px solid` — `getStatusBorderColor(task.status)` |
| Background | `getStatusNodeBackground(status)` — very muted RGBA |
| Title | `text-sm font-semibold text-center`, `line-clamp-3` |
| Priority indicator | Red dot (`w-2 h-2 bg-red-500`) only for `high`/`urgent`, absolute top-right |
| Handles | 4 handles (top/bottom/left/right), hidden by default, revealed on `group-hover` |
| Inline rename | Double-click → `<input>` · Enter/blur = confirm · Escape = cancel |

**Handle CSS** (injected via `<style>` in the canvas wrapper):
```css
.react-flow__handle { transition: opacity 0.15s; }
.react-flow__connection-line { stroke: hsl(var(--primary)); stroke-width: 1.5; }
```

Handle Tailwind class: `!opacity-0 group-hover:!opacity-100 transition-opacity duration-150`

---

## Custom Edge: `FlowEdgeWithNote`

- **Path**: `getSmoothStepPath`
- **Stroke**: `strokeDasharray: "6 3"`, gray default, primary color when selected
- **Label** (center of edge, via `EdgeLabelRenderer`):
  - **Has note**: solid pill with truncated note text
  - **No note**: dashed pill with `MessageSquarePlus` icon — hidden by default, shown on hover (`opacity-0 hover:opacity-100`)
- **Click label** → opens inline textarea popover
  - Enter = confirm · Escape = cancel · Blur = confirm
  - Delete button → `handleEdgeDelete`

---

## React Flow Config

```tsx
<ReactFlow
  nodes={flowNodes}
  edges={flowEdges}
  onNodesChange={handleNodesChange}
  onNodeDragStop={handleNodeDragStop}
  onConnect={handleConnect}
  nodeTypes={{ taskFlowNode: TaskFlowNode }}
  edgeTypes={{ flowEdgeWithNote: FlowEdgeWithNote }}
  fitView
  fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
  minZoom={0.05}
  maxZoom={2}
  deleteKeyCode={null}
  connectionRadius={30}
  proOptions={{ hideAttribution: true }}
>
```

---

## Backend API (`/api/flow`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/flow/edges` | All non-deleted custom edges for the authenticated user |
| POST | `/api/flow/edges/batch` | Upsert edges (create or update; `deletedAt` = soft delete) |
| GET | `/api/flow/positions?nodeType=task` | Saved node positions for the user |
| POST | `/api/flow/positions/batch` | Upsert positions (UNIQUE per user+node+type) |

**Key models:**
- `flow_edge` — `(user_id, source_id, source_type, source_handle, target_id, target_type, target_handle, note, deleted_at)`
- `flow_node_position` — `(user_id, node_id, node_type, x, y)` — UNIQUE on `(user_id, node_id, node_type)`

---

## TabType update

`src/types/multiProject/multiProjectDetail.type.ts`:
```ts
export type TabType = "taskList" | "kanban" | "proTimeline" | "timeline" | "taskFlow";
```

`MultiProjectDetailContent.tsx` additions:
- Import: `GitBranch` from lucide-react + `MultiProjectTaskFlowView`
- TABS array entry: `{ id: "taskFlow", label: "TASK FLOW", icon: <GitBranch /> }`
- `renderTabContent` case: `"taskFlow" → <MultiProjectTaskFlowView />`

---

## How to extend

### Add edge styling by relationship type
In `buildTaskFlowLayout`, vary `edge.style` or `edge.markerEnd` based on relationship data.

### Add status change on node
Import `useMultiProjectTaskListHelper` in helper and call `handleInlineUpdate(task, "status", newStatus)`.

### Support project→project connections
`flow_edge` table already has `source_type`/`target_type` columns. Extend `FlowEdgeDTO` + frontend edge creation to allow `nodeType: "project"`.

### Add collapsed subtree toggle
Add `collapsed: boolean` to `TaskFlowNodeData`, filter children from edges in selector when collapsed.

---

## Known constraints

- `positionsLoaded` is reset when the tab unmounts (store is scoped to tab). Positions are reloaded from backend on next mount.
- Very large task sets (500+) may cause React Flow performance issues — consider grouping by project or virtualisation.
- `deleteKeyCode={null}` prevents RF's built-in node deletion. Dedicated delete flow would need to be implemented separately.
- Auto-layout edges (parent→child from `buildTaskFlowLayout`) are NOT persisted — they are always recomputed. Only user-drawn `flowEdgeWithNote` edges are saved to the DB.
