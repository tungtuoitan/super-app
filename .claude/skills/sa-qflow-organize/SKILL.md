---
name: sa-qflow-organize
description: Context and implementation details for KQFlow organize, snap-to-grid, and drag-snap features in the K module.
---

You are working on the **KQFlow canvas** inside the SuperApp K (Knowledge) module. This skill gives you full context on the organize, grid layout, and drag-snap features so you can extend or fix them confidently.

## Key Files

| Role | Path |
|---|---|
| Canvas component | `src/features/K/Components/QFlowView/KQFlowCanvas.tsx` |
| Canvas + organize helper | `src/features/K/hooks/qFlow/useKQFlowCanvas.helper.ts` |
| Drag + snap helper | `src/features/K/hooks/qFlow/useKQFlowDrag.helper.ts` |
| Keyboard shortcuts | `src/features/K/hooks/qFlow/useKQFlowShortcuts.helper.ts` |
| Node component (inline ctx menu) | `src/features/K/Components/QFlowView/small/KQFlowNode.tsx` |
| Edge component | `src/features/K/Components/QFlowView/small/KQFlowEdge.tsx` |
| Pane context menu (shared) | `src/features/K/contexts/menu/KQFlowMenu.tsx` |
| Menu data types | `src/shared/menuContexts/menuContext.types.ts` → `KQFlowMenuData` |

## Node Geometry

- **Width**: always 280px (`NODE_W = 280`)
- **Height**: varies per node — read from `n.measured?.height ?? 120`
- **Center**: `{ cx: x + NODE_W/2, cy: y + h/2 }`

---

## Feature 1 — Drag Snap (`useKQFlowDrag.helper.ts`)

Mirrors the TaskFlow implementation in `useMultiProjectTaskFlowDrag.helper.ts`.

### How it works
- `handleNodeDragStart` — clears `lastSnappedRef`, records start positions of all selected nodes
- `handleNodeDrag` — for each dragged node, computes centers of all **other** nodes, finds the nearest within `SNAP_THRESHOLD = 20px`, snaps X or Y (whichever axis has the smaller delta; X wins on tie)
- `handleNodesChange` — when `c.dragging === false`, patches `position` from `lastSnappedRef` before `applyNodeChanges`
- `handleNodeDragStop` — snapshots `lastSnappedRef` before `requestAnimationFrame`, uses that to persist final positions via `flowService._upsertPositions`

### Shared ref pattern
`selectionLockRef` lives in `useKQFlowCanvas.helper.ts` and is **passed as a parameter** into `useKQFlowDragHelper(selectionLockRef, lockSelection)`. This is the only coupling between the two helpers.

### Wired in canvas
```tsx
onNodeDragStart={handleNodeDragStart}
onNodeDrag={handleNodeDrag}
onNodeDragStop={handleNodeDragStop}
```

---

## Feature 2 — Organize (`handleOrganize` in `useKQFlowCanvas.helper.ts`)

### Trigger points
1. **Ctrl+O** — keyboard shortcut (via `useKQFlowShortcuts.helper.ts`), enabled when `selectedStringIds.length >= 2`
2. **Pane right-click menu** (`KQFlowMenu.tsx`) — shows when `selectedIds.length >= 2`
3. **Node right-click menu** (`KQFlowNode.tsx`) — shows when `selectedStringIds.length >= 2`

`selectedStringIds` is computed at the **component level** in `KQFlowCanvas.tsx` (not inside any handler) and passed to both the shortcuts hook and the pane context menu.

### Layout algorithm

**Always uses reading order grid layout** for consistent, predictable positioning:

1. **Sort by reading order**:
   - Primary: Y position (with 50px tolerance)
   - Secondary: X position (left to right)
   - Result: first node at **top-left**, nodes flow **left→right, top→bottom**

2. **Create near-square grid**:
   - `cols = ceil(sqrt(n))` — number of columns
   - `rows = ceil(n / cols)` — number of rows

3. **Calculate row heights**:
   - `rowHeights[r]` = max measured height in that row
   - `rowOffset[r]` = cumulative offset from top (accounting for gaps)

4. **Assign positions**:
   - `x = minX + col * (NODE_W + GAP_X)` — left-to-right columns
   - `y = minY + rowOffset[r] + (rowH[r] - nodeH) / 2` — vertically centered within row

5. Constants: `GAP_X = 64`, `GAP_Y = 48`

Result: **predictable reading-order layout** that works the same way whether edges exist or not.

---

### Edge handle reoptimization after organize

After node positions are set, finds all edges where both endpoints are in the selection and recomputes handles using `resolveFromNew`:

```ts
const dx = (tgt.x + NODE_W/2) - (src.x + NODE_W/2);
const dy = (tgt.y + tgt.h/2) - (src.y + src.h/2);
// |dx| >= |dy|  → right/left handles (horizontal)
// |dx| <  |dy|  → bottom/top handles (vertical)
```

### Anti-overlap for opposing / duplicate edges

After computing primary handles, detects node pairs with **2+ edges** to prevent overlapping:

1. **Derive grid column rank** from `x` position: `rank = round((x - minX) / (NODE_W + GAP_X))`
2. **Classify each edge** in the pair based on arrow direction and column positions:
   - **forward** = logical source column ≤ logical target column (flows left-to-right)
   - **backward** = logical source column > logical target column (flows right-to-left)
3. **Reroute the backward edge** (or duplicate if all same direction):
   - If both edges are **horizontal** (left/right handles): backward edge → `bottom→bottom` (curves below both nodes)
   - If both edges are **vertical** (top/bottom handles): backward edge → `right→right` (curves to the right)

This ensures opposing/duplicate edges are visually separated and never overlap, regardless of graph structure.

---

## Feature 3 — Edge Double-Click Reoptimize (`handleEdgeReoptimize`)

In `useKQFlowCanvas.helper.ts`. Wired via:
```tsx
onEdgeDoubleClick={(_: React.MouseEvent, edge: Edge) => handleEdgeReoptimize(edge.id)}
```
Reads current node positions from `flowNodesRef`, recomputes best handles using the same `dx/dy` logic, updates local state + backend if changed.

---

## Keyboard shortcuts (`useKQFlowShortcuts.helper.ts`)

| Shortcut | Action | Enabled when |
|---|---|---|
| `Delete` | Delete selected edges (priority 65) | edges selected |
| `Delete` | Delete selected nodes (priority 60) | nodes selected, no edges |
| `Ctrl+X` | Cut nodes to clipboard | nodes selected |
| `Ctrl+V` | Paste clipboard at cursor | clipboard non-null |
| `Escape` | Cancel clipboard | clipboard non-null |
| `Ctrl+O` | Organize selected nodes | `selectedStringIds.length >= 2` |

The shortcuts hook accepts: `selectedEdgeIds`, `selectedNodeIds`, `selectedStringIds`, `handleEdgeDelete`, `handleDeleteQuestion`, `handleOrganize`, `lockSelection`, `targetNodeId`, `handlePasteQuestions`.

---

## Adding the Organize option to a new menu

1. Add `onOrganize?: () => void` to the relevant menu data type in `menuContext.types.ts`
2. Pass `onOrganize: selectedStringIds.length >= 2 ? () => handleOrganize(selectedStringIds) : undefined`
3. Render the menu item only when `onOrganize` is defined or `selectedStringIds.length >= 2`

## Task

{{USER_TASK}}

Use the architecture above to implement, extend, or fix the requested feature.
