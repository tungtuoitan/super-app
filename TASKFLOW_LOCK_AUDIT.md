# TaskFlow Locked Nodes Lock-Bypass Audit

**Date:** 2026-04-01  
**Auditor:** Security Review  
**Feature:** Task Flow lockOldNodes (completed/cancelled task protection)  
**Scope:** All code paths that can modify locked nodes (position, edges, properties)

---

## Executive Summary

**CRITICAL GAPS FOUND: 5 HIGH-SEVERITY BYPASSES**

The current lock implementation has **5 major gaps** that allow locked nodes to be modified despite `lockOldNodes=true`. Most are **single-line fixes** but require careful sequencing.

---

## File-by-File Audit

### 1. useMultiProjectTaskFlow.helper.ts

#### ✅ handleConnect (Lines 297–353)
**Status:** SAFE - Cannot create edges FROM or TO locked nodes

#### ✅ handleReconnect (Lines 435–476)
**Status:** SAFE - Cannot reconnect TO/FROM locked nodes

#### ✅ handleEdgeNoteConfirm (Lines 357–396)
**Status:** SAFE - Cannot edit notes on edges connected to locked nodes

#### ✅ handleEdgeDelete (Lines 398–428)
**Status:** SAFE - Cannot delete edges connected to locked nodes

#### 🔴 GAP #1: handleNodesChange (Lines 81–101)
**Status:** CRITICAL - NO LOCK GUARD  
**Problem:** Accepts ALL node changes without filtering locked nodes
- Locked nodes can be repositioned if position changes arrive
- Shift+drag positions still applied without validation
- Multi-select drag with locked nodes: visual moves still applied

**Fix:** Filter position changes for locked nodes before applyNodeChanges

#### 🔴 GAP #2: handleNodeDrag (Lines 146–213)
**Status:** CRITICAL - VISUAL DRAG ALLOWED  
**Problem:** Locked nodes move visually during drag
- Even though persistence is blocked in handleNodeDragStop
- Visual state mismatch on reload
- Multi-select drag includes locked nodes

**Fix:** Filter locked nodes from draggedNodes at function start

#### 🔴 GAP #3: handleEdgesChange (Lines 105–117)
**Status:** CRITICAL - SELECT/RECONNECT ALLOWED  
**Problem:** Locked edges can be selected and made reconnectable
- User can click edge connected to locked node → selects it
- Edge becomes reconnectable=true
- Visual reconnect possible (persistence blocked but UI is wrong)

**Fix:** Filter select changes for locked edges before applyEdgeChanges

#### ⚠️ GAP #4: handleAutoLayout (Lines 480–503)
**Status:** SAFE with verification - Correctly filters locked nodes
- Uses same lock check as isNodeLocked
- Only passes movable nodes to smartWand
- Frozen nodes never repositioned
- Verify: Add debug log

#### ❓ handleNodeDragStart (Lines 121–139)
**Status:** Safe if Gap #2 is fixed - Captures positions for all selected including locked
- Only an issue if handleNodeDrag processes locked nodes

### 2. useMultiProjectTaskFlowNode.helper.ts

#### ✅ handleRenameConfirm (Lines 34–147)
**Status:** SAFE - Has lock guard for existing nodes

#### ✅ handleChangeProject (Lines 202–245)
**Status:** SAFE - Has lock guard

#### ✅ handleChangeStatus (Lines 249–292)
**Status:** SAFE - Has lock guard

#### ✅ handleAddTaskAtPosition (Lines 152–198)
**Status:** SAFE - Creates temp nodes with no lock status

### 3. TaskFlowNode.tsx

#### ✅ Delete key → handleChangeStatus (Lines 183–194)
**Status:** SAFE - Blocked if nodeLocked=true

#### ✅ Double-click rename (Lines 196–200)
**Status:** SAFE - Blocked if nodeLocked=true

#### ✅ Status buttons (Lines 439–459)
**Status:** SAFE - Calls handleChangeStatus with lock guard

#### ✅ Project picker (Lines 490–519)
**Status:** SAFE - Calls handleChangeProject with lock guard

#### 🟠 GAP #5: handleToggleProcess (Lines 100–163)
**Status:** SAFE (working) but lacks explicit guard
- canToggleProcess check works (prevents UI toggle)
- But explicit guard recommended for defense-in-depth
- Once completed, auto-lock is correct behavior

### 4. FlowEdgeWithNote.tsx

#### ✅ Delete key (Lines 89–96)
**Status:** SAFE - Blocked if edgeLocked=true

#### ✅ Note edit (Lines 106–112)
**Status:** SAFE - Blocked if edgeLocked=true

#### ✅ Arrow toggle (Lines 123–129)
**Status:** SAFE - Blocked if edgeLocked=true

### 5. useMultiProjectTaskFlow.headless.ts

#### ✅ draggable property (Lines 75–81, 110–116)
**Status:** SAFE - Set correctly to false for locked nodes
- Note: draggable property only affects single-node drag
- Multi-select drag may still fire (handled by handleNodeDrag fix)

---

## Summary of Gaps

| # | Location | Handler | Gap Type | Severity |
|---|----------|---------|----------|----------|
| 1 | helper.ts | handleNodesChange | No lock filter on position changes | CRITICAL |
| 2 | helper.ts | handleNodeDrag | Locked nodes move visually | CRITICAL |
| 3 | helper.ts | handleEdgesChange | Locked edges selectable/reconnectable | CRITICAL |
| 4 | helper.ts | handleAutoLayout | Verify locked nodes excluded | LOW |
| 5 | TaskFlowNode.tsx | handleToggleProcess | Add explicit lock check | LOW |

---

## Attack Scenarios

### Scenario 1: Drag locked + unlocked nodes together
1. User selects Task A (completed/locked) + Task B (open)
2. Drags to move both
3. Current: Both move visually (Gap #2)
4. API: Only Task B saved (correct)
5. After reload: Task A back at original position (confusing)

### Scenario 2: Reconnect edge from locked node
1. Edge: Task B → Task A (completed, locked)
2. User clicks edge (Gap #3) → selects
3. Edge becomes reconnectable=true
4. User drags endpoint to Task C
5. handleReconnect blocks (safe) but visual glitch occurs

### Scenario 3: Position change on locked node
1. React Flow sends position change for locked node (Gap #1)
2. handleNodesChange accepts without filter
3. Locked node position updated in state
4. Position saved to store (incorrect)

---

## Fixes Required

### Fix 1: handleNodesChange
Filter position changes for locked nodes before applyNodeChanges
- Add parameter: isNodeLocked to dependency array
- Add 3 lines: filter callback

### Fix 2: handleNodeDrag  
Filter locked nodes from draggedNodes at start
- Add parameter: isNodeLocked to dependency array
- Add 2 lines: filter at start

### Fix 3: handleEdgesChange
Filter select changes for locked edges before applyEdgeChanges
- Add parameter: isEdgeLocked to dependency array
- Add 3 lines: filter callback

### Fix 4: handleToggleProcess (Optional)
Add explicit guard at start of function
- Add 3 lines: lock check + debug log

### Fix 5: handleAutoLayout (Verification)
Add debug log to verify locked node count
- Add 1 line: debug log

---

## Implementation Notes

1. All fixes are **single-line filtering** additions (3-5 lines per fix)
2. Dependency arrays need updates to include lock check functions
3. No API changes, no breaking changes
4. All fixes are additive (don't remove existing logic)
5. Lock checks use **exact same logic** as existing guards

---

## Testing After Fixes

- Drag single locked node → no movement
- Drag locked + unlocked together → only unlocked moves
- Select edge with locked endpoint → blocked
- Delete key on locked node → no status change
- Process toggle on completed task → disabled
- Smart wand with locked nodes → respects lock

