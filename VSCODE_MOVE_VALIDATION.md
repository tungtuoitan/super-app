# VS Code Move Validation - Prevent Invalid Drops

## 🎯 VS Code Behavior

VS Code Explorer prevents moving items into invalid locations. Khi drag & drop, các trường hợp sau sẽ bị block:

### **Các trường hợp KHÔNG cho phép:**

1. ❌ Move workspace node (virtual root container)
2. ❌ Move vào chính items đang được move
3. ❌ Move vào children/descendants của items đang move
4. ❌ Drop giữa các items trong cùng selection

---

## ✅ Implementation

### **Validation 1: Workspace Root Node**

```typescript
// 1. Check for workspace root nodes (negative IDs) - cannot move workspace itself
const hasWorkspaceRoot = tagIds.some(id => id < 0);
if (hasWorkspaceRoot) {
    console.warn('⚠️ Cannot move workspace root node');
    return;
}
```

**File:** `WorkspaceTree.tsx` lines 881-886

**Explanation:**
- Workspace nodes có ID âm (ví dụ: -1)
- Đây là virtual containers, không phải tags thật
- Không được phép di chuyển

**Example:**
```
❌ Không cho phép:
Chọn: Workspace "System Administration" (id: -1)
Action: Drag somewhere
Result: Blocked
```

---

### **Validation 2: Move Into Selected Items**

```typescript
// 2. VS CODE: Don't allow moving into one of the items being moved
if (newParentId !== undefined && tagIds.includes(newParentId)) {
    console.warn('⚠️ Cannot move items into one of the selected items');
    return;
}
```

**File:** `WorkspaceTree.tsx` lines 888-894

**Explanation:**
- Nếu target parent là một trong các items đang move → block
- Giống như không thể move folder A vào chính nó

**Example:**
```
Structure:
- A (id: 1)
- B (id: 2)
- C (id: 3)

❌ Không cho phép:
Chọn: A, B, C
Action: Drop vào A
Result: Blocked (A là một trong các items đang move)

✅ Cho phép:
Chọn: A, B
Action: Drop vào C
Result: OK (C không phải item đang move)
```

---

### **Validation 3: Move Into Descendants**

```typescript
// 3. VS CODE: Don't allow moving into a child of any selected item
if (newParentId !== undefined) {
    const isTargetDescendantOfSelected = tagIds.some(draggedId => {
        return isDescendant(newParentId!, draggedId, treeData);
    });

    if (isTargetDescendantOfSelected) {
        console.warn('⚠️ Cannot move items into a descendant of selected items');
        return;
    }
}
```

**File:** `WorkspaceTree.tsx` lines 896-908

**Explanation:**
- Nếu target parent là child/grandchild của bất kỳ item nào đang move → block
- Ngăn circular dependency (A chứa B, nhưng B lại chứa A)

**Example:**
```
Structure:
- P (id: 100)
  - t1 (id: 101)
    - t1a (id: 102)

❌ Không cho phép:
Chọn: P
Action: Drop vào t1 (child của P)
Result: Blocked (t1 là descendant của P)

❌ Không cho phép:
Chọn: P
Action: Drop vào t1a (grandchild của P)
Result: Blocked (t1a là descendant của P)

✅ Cho phép:
Chọn: t1
Action: Drop vào P
Result: OK (P là parent, không phải descendant)
```

---

### **Validation 4: Drop Between Selected Items**

```typescript
// 4. VS CODE: Don't allow dropping between items in the same selection
const targetParentNode = newParentId !== undefined
    ? getAllTagsFlattened(treeData).find(t => t.data.tagId === newParentId)
    : null;

const targetSiblings = targetParentNode
    ? (targetParentNode.children || [])
    : treeData.filter(t => parseInt(t.id) > 0);

if (args.index >= 0 && args.index <= targetSiblings.length) {
    const itemBefore = args.index > 0 ? targetSiblings[args.index - 1] : null;
    const itemAfter = args.index < targetSiblings.length ? targetSiblings[args.index] : null;

    const itemBeforeId = itemBefore ? parseInt(itemBefore.id) : null;
    const itemAfterId = itemAfter ? parseInt(itemAfter.id) : null;

    // Check if both surrounding items are in selection
    const bothInSelection =
        (itemBeforeId && tagIds.includes(itemBeforeId)) &&
        (itemAfterId && tagIds.includes(itemAfterId));

    // Check if either surrounding item is in selection and same parent
    const allOriginalIds = args.dragIds.map(id => parseInt(id));
    const isSameParent = targetSiblings.some(sibling =>
        allOriginalIds.includes(parseInt(sibling.id))
    );

    if (bothInSelection || (isSameParent && (
        (itemBeforeId && tagIds.includes(itemBeforeId)) ||
        (itemAfterId && tagIds.includes(itemAfterId))
    ))) {
        console.warn('⚠️ Cannot drop between items in the same selection');
        return;
    }
}
```

**File:** `WorkspaceTree.tsx` lines 910-949

**Explanation:**
- Nếu drop position nằm giữa 2 items đều thuộc selection → block
- Ngăn việc reorder vô nghĩa trong cùng một selection

**Example:**
```
Structure (under parent X):
- A (id: 1)
- B (id: 2)
- C (id: 3)
- D (id: 4)

❌ Không cho phép:
Chọn: A, B, C
Action: Drop giữa A và B (index = 1)
Result: Blocked (cả A và B đều trong selection)

❌ Không cho phép:
Chọn: A, B, C
Action: Drop giữa B và C (index = 2)
Result: Blocked (cả B và C đều trong selection)

✅ Cho phép:
Chọn: A, B
Action: Drop giữa C và D (index = 3)
Result: OK (C và D không cùng trong selection)

✅ Cho phép:
Chọn: A, B
Action: Drop vào parent Y (khác parent X)
Result: OK (khác parent, không phải same selection reorder)
```

---

## 🧪 Test Cases

### **Test 1: Move Into Selected Item**

**Setup:**
```
- A (id: 1)
- B (id: 2)
- C (id: 3)
```

**Action:** Select A, B, C → Drag vào A

**Expected:**
```
Console: ⚠️ Cannot move items into one of the selected items
Result: No move happens
```

### **Test 2: Move Into Child**

**Setup:**
```
- P (id: 100)
  - t1 (id: 101)
  - t2 (id: 102)
```

**Action:** Select P → Drag vào t1

**Expected:**
```
Console: ⚠️ Cannot move items into a descendant of selected items
Result: No move happens
```

### **Test 3: Drop Between Selected Siblings**

**Setup:**
```
Parent X:
├── A (id: 1)
├── B (id: 2)
├── C (id: 3)
└── D (id: 4)
```

**Action:** Select A, B, C → Drag giữa A-B

**Expected:**
```
Console: ⚠️ Cannot drop between items in the same selection
Result: No move happens
```

### **Test 4: Valid Move - Different Parent**

**Setup:**
```
- P (id: 100)
  - t1 (id: 101)
- Q (id: 200)
```

**Action:** Select P → Drag vào Q

**Expected:**
```
Console: 📤 Batch moving 1 tag(s) to parent 200
Result: P moves under Q
```

### **Test 5: Valid Move - Drop After Selection**

**Setup:**
```
- A (id: 1)
- B (id: 2)
- C (id: 3)
- D (id: 4)
```

**Action:** Select A, B → Drag giữa C-D (index = 3)

**Expected:**
```
Console: 📤 Batch moving 2 tag(s) to parent root at index 3
Result: Order becomes C, D, A, B
```

---

## 📊 Validation Flow

```
User drags selection [A, B, C] to target position
    ↓
1. Filter descendants (VS Code parent-child logic)
   tagIds: [A, B, C] → filtered: [A] (if B, C are children of A)
    ↓
2. Check if empty after filtering
   if (tagIds.length === 0) → ABORT
    ↓
3. Check workspace root nodes
   if (tagIds has negative ID) → ABORT
    ↓
4. Check if target is in selection
   if (target is A, B, or C) → ABORT
    ↓
5. Check if target is descendant of selection
   if (target is child of A, B, or C) → ABORT
    ↓
6. Check if dropping between selected items
   Get items before/after drop position
   if (both in selection) → ABORT
    ↓
7. All validations passed → Proceed with move
   Call API: batch-move(tagIds, newParentId, index)
```

---

## 🎨 Visual Feedback

Khi validation fails, VS Code thường:
1. **Không hiển thị drop indicator** (blue line)
2. **Cursor thay đổi** thành "not-allowed" icon
3. **Không trigger move event**

Trong implementation của chúng ta:
1. ✅ Console warning rõ ràng
2. ✅ Không call API (return early)
3. ✅ Reset isDragging state
4. 🔄 TODO: Có thể thêm visual feedback (cursor change, toast message)

---

## 📝 Summary Table

| Validation | Check | Example | Result |
|------------|-------|---------|--------|
| **Workspace root** | `id < 0` | Drag workspace node | ❌ Block |
| **Into selected** | `target in tagIds` | A,B,C → drop into A | ❌ Block |
| **Into descendant** | `target is child of tagIds` | P → drop into t1 (child of P) | ❌ Block |
| **Between selected** | `before & after in selection` | A,B,C → drop between A-B | ❌ Block |
| **Different parent** | Valid target | A,B → drop into Q | ✅ Allow |
| **After selection** | Valid position | A,B → drop after C | ✅ Allow |

---

## ✅ Status

- [x] Validation 1: Workspace root nodes
- [x] Validation 2: Move into selected items
- [x] Validation 3: Move into descendants
- [x] Validation 4: Drop between selected items
- [ ] **Ready for testing**

---

## 🚀 Testing

**Test now:**
1. Create structure: P → t1, t2
2. Select P, t1
3. Try dragging into t1 → Should block with console warning
4. Select A, B, C (siblings)
5. Try dragging between A-B → Should block with console warning
6. Try dragging to different parent → Should work ✅

**Expected console logs:**
```
// Valid move
📤 Batch moving 2 tag(s) to parent 200 at index 0

// Blocked moves
⚠️ Cannot move items into one of the selected items
⚠️ Cannot move items into a descendant of selected items
⚠️ Cannot drop between items in the same selection
```
