# VS Code Move Behavior - Parent/Child Selection

## 🎯 VS Code Behavior

Khi di chuyển nhiều items trong VS Code Explorer, nếu selection bao gồm cả parent và children của nó, **chỉ move parent thôi** (children sẽ tự động theo parent).

### **Example:**

```
Workspace S:
├── A
├── P
│   ├── t1
│   └── t2
```

**Scenario 1: Chọn P và t1 (t1 là child của P)**
```
Selection: [P, t1]
Action: Move vào A
Result: CHỈ move P → A (t1 tự động theo P vì nó là child)

Sau khi move:
├── A
│   └── P      ← Moved
│       ├── t1 ← Tự động theo P
│       └── t2
```

**Scenario 2: Chọn A và P (không phải parent-child)**
```
Selection: [A, P]
Action: Move vào workspace root
Result: Move CẢ A và P

Sau khi move:
├── A      ← Moved
├── P      ← Moved
│   ├── t1
│   └── t2
```

---

## ✅ Implementation

### **Filter Logic:**

```typescript
// VS CODE BEHAVIOR: Filter out descendants of selected nodes
tagIds = tagIds.filter(tagId => {
    // Check if this tag is a descendant of any other selected tag
    const isDescendantOfOtherSelected = tagIds.some(otherTagId => {
        if (otherTagId === tagId) return false; // Don't compare with itself
        return isDescendant(tagId, otherTagId, treeData);
    });
    return !isDescendantOfOtherSelected; // Keep only if NOT a descendant
});
```

**File:** `WorkspaceTree.tsx` lines 840-849

### **How it works:**

1. User selects: `[P, t1, t2]` (P is parent, t1 and t2 are children)
2. Filter loop:
   - Check `P`: Not a descendant of `t1` or `t2` → **KEEP**
   - Check `t1`: Is descendant of `P` → **REMOVE**
   - Check `t2`: Is descendant of `P` → **REMOVE**
3. Final tagIds: `[P]` ✅
4. API call: `{ tagIds: [P], newParentId: A }`
5. Backend updates: `P.parentId = A`
6. Children t1, t2 automatically follow P (because their parentId is still P)

---

## 🧪 Test Cases

### **Test Case 1: Parent + Child Selection**

**Setup:**
```
- P (id: 100)
  - t1 (id: 101)
  - t2 (id: 102)
- A (id: 200)
```

**Action:**
1. Select P, t1, t2 (Ctrl+Click all 3)
2. Drag to A

**Expected Console Logs:**
```javascript
🔄 Tree Node Move Event (Multi-Drag): {
    draggedTagIds: ['100', '101', '102'],
    dragCount: 3
}
📊 Filtered tag IDs (excluding descendants): {
    original: ['100', '101', '102'],
    filtered: [100],              // ← Only P remains
    removedCount: 2               // ← t1, t2 removed
}
📤 Batch moving 1 tag(s) to parent 200
```

**Expected API Call:**
```json
POST /api/tags/batch-move
{
  "tagIds": [100],    // ← Only P
  "newParentId": 200,
  "startIndex": 0
}
```

**Expected Database:**
```sql
-- Only 1 UPDATE (for P)
UPDATE workspace_items
SET parent_tag_id = 200, sort_order = 0
WHERE child_id = 100;

-- t1 and t2 are NOT updated (they still have parent_tag_id = 100)
-- They will appear under P automatically in the tree
```

**Result:**
```
- A
  - P        ← Moved
    - t1     ← Automatically follows P
    - t2     ← Automatically follows P
```

### **Test Case 2: Multiple Independent Tags**

**Setup:**
```
- P (id: 100)
  - t1 (id: 101)
- Q (id: 200)
- R (id: 300)
```

**Action:**
1. Select P, Q, R (Ctrl+Click, none are descendants of each other)
2. Drag to A

**Expected Console Logs:**
```javascript
🔄 Tree Node Move Event (Multi-Drag): {
    draggedTagIds: ['100', '200', '300'],
    dragCount: 3
}
📊 Filtered tag IDs (excluding descendants): {
    original: ['100', '200', '300'],
    filtered: [100, 200, 300],  // ← All remain (no parent-child relationship)
    removedCount: 0
}
📤 Batch moving 3 tag(s) to parent A
```

**Expected API Call:**
```json
{
  "tagIds": [100, 200, 300],  // ← All 3 tags
  "newParentId": A,
  "startIndex": 0
}
```

**Result:**
```
- A
  - P      ← Moved
    - t1
  - Q      ← Moved
  - R      ← Moved
```

### **Test Case 3: Nested Children Selection**

**Setup:**
```
- P (id: 100)
  - t1 (id: 101)
    - t1a (id: 102)
    - t1b (id: 103)
  - t2 (id: 104)
```

**Action:**
1. Select P, t1, t1a, t1b, t2 (all descendants of P)
2. Drag to A

**Expected:**
```javascript
📊 Filtered tag IDs (excluding descendants): {
    original: ['100', '101', '102', '103', '104'],
    filtered: [100],              // ← Only P
    removedCount: 4               // ← All children filtered out
}
```

**API Call:**
```json
{ "tagIds": [100] }  // ← Only P moves, all children follow
```

### **Test Case 4: All Children Selection (No Parent)**

**Setup:**
```
- P (id: 100)
  - t1 (id: 101)
  - t2 (id: 102)
```

**Action:**
1. Select ONLY t1, t2 (NOT P)
2. Drag to A

**Expected:**
```javascript
📊 Filtered tag IDs (excluding descendants): {
    original: ['101', '102'],
    filtered: [101, 102],  // ← Both remain (not descendants of each other)
    removedCount: 0
}
```

**API Call:**
```json
{ "tagIds": [101, 102] }  // ← Both t1 and t2 move
```

**Result:**
```
- P        (P stays in place)
- A
  - t1     ← Moved
  - t2     ← Moved
```

---

## 🔍 Edge Cases

### **Edge Case 1: Only Descendants Selected**

**Scenario:** User selects only children, and all are descendants of one parent (but parent not selected).

**Example:**
```
- P
  - t1 (selected)
    - t1a (selected)
```

**Result:**
```javascript
filtered: [101]  // ← t1 remains, t1a filtered out (descendant of t1)
```

**Action:** Only t1 moves (t1a follows t1)

### **Edge Case 2: Empty After Filter**

**Scenario:** All selected items are descendants of other selected items.

**Example:** This shouldn't happen in practice, but if it does:
```javascript
if (tagIds.length === 0) {
    console.log('⚠️ All selected tags are descendants - nothing to move');
    return; // Abort move
}
```

---

## 📊 isDescendant Function

The filtering relies on the `isDescendant` helper function:

```typescript
/**
 * Check if targetId is a descendant of potentialParentId in tree
 */
function isDescendant(
    targetId: number,           // The node we're checking
    potentialParentId: number,  // Potential parent node
    treeData: TreeTag[]         // Full tree structure
): boolean {
    const parentNode = getAllTagsFlattened(treeData)
        .find(t => t.data.tagId === potentialParentId);

    if (!parentNode) return false;

    function checkSubtree(node: TreeTag): boolean {
        if (node.data.tagId === targetId) return true;
        if (node.children && node.children.length > 0) {
            return node.children.some(child => checkSubtree(child));
        }
        return false;
    }

    return checkSubtree(parentNode);
}
```

**File:** `WorkspaceTree.tsx` lines 72-93

**Example:**
```
P (id: 100)
├── t1 (id: 101)
│   └── t1a (id: 102)
└── t2 (id: 103)

isDescendant(101, 100, tree) → true  (t1 is child of P)
isDescendant(102, 100, tree) → true  (t1a is grandchild of P)
isDescendant(103, 101, tree) → false (t2 is NOT child of t1)
isDescendant(100, 101, tree) → false (P is NOT child of t1)
```

---

## ✅ Benefits

### **1. Consistency with VS Code**
Users familiar with VS Code expect this behavior.

### **2. Prevents Redundant API Calls**
Before:
```json
// Moving P, t1, t2 to A
POST /api/tags/batch-move
{ "tagIds": [100, 101, 102], "newParentId": 200 }

// Backend processes 3 updates:
UPDATE workspace_items SET parent_tag_id = 200 WHERE child_id = 100;
UPDATE workspace_items SET parent_tag_id = 200 WHERE child_id = 101;  // ❌ Wrong! Creates orphan
UPDATE workspace_items SET parent_tag_id = 200 WHERE child_id = 102;  // ❌ Wrong!
```

After:
```json
POST /api/tags/batch-move
{ "tagIds": [100], "newParentId": 200 }

// Backend processes 1 update:
UPDATE workspace_items SET parent_tag_id = 200 WHERE child_id = 100;  // ✅ Correct!
// t1 and t2 automatically follow because their parent_tag_id = 100 (unchanged)
```

### **3. Prevents Orphaned Children**
Without filtering, moving both P and t1 to A would make t1 a direct child of A, breaking its relationship with P.

---

## 📝 Summary

| Scenario | Selection | Filtered IDs | Result |
|----------|-----------|--------------|--------|
| Parent + children | `[P, t1, t2]` | `[P]` | Only P moves, t1/t2 follow |
| Independent tags | `[P, Q, R]` | `[P, Q, R]` | All 3 move |
| Only children | `[t1, t2]` | `[t1, t2]` | Both move (become children of new parent) |
| Nested children | `[P, t1, t1a]` | `[P]` | Only P moves, all descendants follow |
| Child + grandchild | `[t1, t1a]` | `[t1]` | Only t1 moves, t1a follows |

---

## 🎉 Status

- [x] Implemented descendant filtering logic
- [x] Added console logs for debugging
- [x] Added validation for empty filtered list
- [ ] **Ready for testing**

**Test now:**
1. Create structure: P → t1, t2
2. Select P, t1, t2
3. Drag to A
4. Check console: Should show `filtered: [P]` (only 1 tag)
5. Verify: Only P moves, t1/t2 follow automatically
