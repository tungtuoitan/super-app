# Multi-Tag Selection Fix

## 🐛 Issue

When selecting multiple tags and dragging them, only one tag was being moved instead of all selected tags.

---

## 🔍 Root Cause

The problem was in the react-arborist Tree component configuration in `WorkspaceTree.tsx`.

### **Problem Code (Line 1028):**

```typescript
<Tree<TreeTag>
    // ... other props
    selection=""  // ❌ WRONG: Empty string doesn't track selected IDs
    disableMultiSelection={false}
    onMove={handleMove}
/>
```

**What was happening:**
1. User selected multiple tags using TagUIContext (Ctrl+Click, Shift+Click)
2. TagUIContext stored selected IDs: `[1, 2, 3]`
3. But react-arborist had `selection=""` (empty)
4. When dragging, react-arborist only passed the single dragged node ID to `handleMove`
5. Result: `args.dragIds = ['1']` instead of `['1', '2', '3']`

---

## ✅ Solution

### **Fix 1: Pass Selection State to Tree Component**

```typescript
<Tree<TreeTag>
    // ... other props
    selection={selectedTagIds.map(String)}  // ✅ Sync with TagUIContext
    disableMultiSelection={false}
    onMove={handleMove}
/>
```

**File:** `WorkspaceTree.tsx` line 1039
**Change:** `selection=""` → `selection={selectedTagIds.map(String)}`

### **Fix 2: Add onSelect Handler to Sync State**

Added bidirectional sync between react-arborist and TagUIContext:

```typescript
// Handle selection changes from react-arborist
const handleSelectionChange = (selectedIds: string[]) => {
    console.log('🎯 Tree selection changed:', selectedIds);
    const tagIds = selectedIds.map(id => parseInt(id)).filter(id => id > 0); // Filter out workspace nodes
    setSelectedTagIds(tagIds);
    if (tagIds.length > 0) {
        setLastSelectedTagId(tagIds[tagIds.length - 1]);
    }
};
```

**File:** `WorkspaceTree.tsx` lines 804-812
**Added:** New `handleSelectionChange` function

```typescript
<Tree<TreeTag>
    // ... other props
    onSelect={handleSelectionChange}  // ✅ Sync arborist → context
    selection={selectedTagIds.map(String)}  // ✅ Sync context → arborist
/>
```

**File:** `WorkspaceTree.tsx` line 1036
**Added:** `onSelect={handleSelectionChange}` prop

---

## 🎯 How It Works Now

### **Selection Flow:**

1. **User selects tags via Ctrl+Click:**
   - TagNode component calls `setSelectedTagIds([1, 2, 3])`
   - React re-renders with `selection={['1', '2', '3']}`
   - react-arborist highlights all selected nodes

2. **User drags selected tags:**
   - react-arborist sees `selection={['1', '2', '3']}`
   - Calls `onMove({ dragIds: ['1', '2', '3'], ... })`
   - All selected tags move together

3. **User selects via react-arborist native click:**
   - react-arborist updates internal selection
   - Calls `onSelect(['1', '2', '3'])`
   - We sync to TagUIContext: `setSelectedTagIds([1, 2, 3])`

---

## 📊 Before vs After

### **Before (Broken):**

```typescript
// User selects tags 1, 2, 3
TagUIContext: [1, 2, 3]  // ✅ Stored
Tree selection: ""       // ❌ Not synced

// User drags
args.dragIds: ['1']      // ❌ Only one tag
API call: { tagIds: [1] }
Result: Only tag 1 moves
```

### **After (Fixed):**

```typescript
// User selects tags 1, 2, 3
TagUIContext: [1, 2, 3]          // ✅ Stored
Tree selection: ['1', '2', '3']  // ✅ Synced

// User drags
args.dragIds: ['1', '2', '3']    // ✅ All selected tags
API call: { tagIds: [1, 2, 3] }
Result: All 3 tags move together
```

---

## 🧪 Testing

### **Test Case 1: Multi-Select + Drag**

**Steps:**
1. Click tag A
2. Ctrl+Click tag B
3. Ctrl+Click tag C
4. Drag to new parent

**Expected Console Logs:**
```
🎯 Tree selection changed: ['137']
🎯 Tree selection changed: ['137', '136']
🎯 Tree selection changed: ['137', '136', '127']
🔄 Tree Node Move Event (Multi-Drag): {
    draggedTagIds: ['137', '136', '127'],
    dragCount: 3,
    newParentId: '5',
    newIndex: 0
}
📤 Batch moving 3 tag(s) to parent 5 at index 0
✅ Successfully batch moved 3 tag(s)
```

**Expected API Call:**
```json
POST /api/tags/batch-move
{
  "tagIds": [137, 136, 127],
  "newParentId": 5,
  "startIndex": 0
}
```

**Expected Database Changes:**
```sql
-- All 3 tags updated
UPDATE workspace_items
SET parent_tag_id = 5,
    sort_order = 0
WHERE child_id = 137;

UPDATE workspace_items
SET parent_tag_id = 5,
    sort_order = 1
WHERE child_id = 136;

UPDATE workspace_items
SET parent_tag_id = 5,
    sort_order = 2
WHERE child_id = 127;
```

### **Test Case 2: Shift+Click Range Select**

**Setup:**
```
- Tag A (id: 1)
- Tag B (id: 2)
- Tag C (id: 3)
- Tag D (id: 4)
```

**Steps:**
1. Click Tag A
2. Shift+Click Tag C

**Expected:**
- Tags A, B, C all selected
- Console: `🎯 Tree selection changed: ['1', '2', '3']`
- Drag moves all 3 tags

### **Test Case 3: Ctrl+A Select All**

**Steps:**
1. Focus tree (click anywhere in tree)
2. Press Ctrl+A

**Expected:**
- All visible tags selected
- Console shows all tag IDs
- Drag moves all tags

---

## 🔄 Related Changes

### **Backend Validation (Already Applied):**

Added check in `TagRepository.cs` to ensure ALL tags have workspace_items:

```csharp
// CRITICAL: Ensure ALL tags have workspace_items entries
if (workspaceItems.Count != tagIds.Length)
{
    var foundTagIds = workspaceItems.Select(wi => wi.ChildId).ToList();
    var missingTagIds = tagIds.Except(foundTagIds).ToList();
    throw new InvalidOperationException(
        $"Some tags don't have workspace_items entries. Missing tag IDs: {string.Join(", ", missingTagIds)}");
}
```

**File:** `TagRepository.cs` lines 413-420

This prevents silent failures where only some tags move due to missing database entries.

---

## 📝 Files Modified

### **Frontend:**

**File:** `WorkspaceTree.tsx`
**Changes:**
1. Line 804-812: Added `handleSelectionChange` function
2. Line 1036: Added `onSelect={handleSelectionChange}` prop
3. Line 1039: Changed `selection=""` → `selection={selectedTagIds.map(String)}`

### **Backend:**

**File:** `TagRepository.cs`
**Changes:**
1. Lines 413-420: Added validation to ensure all tags have workspace_items

---

## ✅ Status

- [x] Fix `selection` prop in Tree component
- [x] Add `onSelect` handler for bidirectional sync
- [x] Add backend validation for missing workspace_items
- [ ] Test multi-select + drag with 2+ tags
- [ ] Test Shift+Click range selection
- [ ] Test Ctrl+A select all
- [ ] Verify all selected tags move together
- [ ] Check database updates for all tags

---

## 🎉 Ready to Test

**Next Steps:**
1. Save all files
2. Frontend should auto-reload
3. Rebuild backend if testing validation
4. Open Tags page
5. Select multiple tags (Ctrl+Click)
6. Drag them to new location
7. Verify ALL selected tags move (not just one)

**Expected Result:**
```
✅ Before:
- Active
  - Projects
  - Important
- Archive

✅ Action: Select Projects + Important, drag to Archive

✅ After:
- Active
- Archive
  - Projects  ← Moved
  - Important ← Moved
```
