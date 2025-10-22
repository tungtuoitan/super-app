# Multi-Tag Move Debug Guide

## 🐛 Issue

When moving multiple tags (e.g., select tags A, B, C and drag them), only one tag is moving instead of all selected tags.

---

## 🔍 Diagnostic Steps

### 1. Check Frontend Selection State

**Open Browser Console** and perform these steps:

1. Select multiple tags (Ctrl+Click or Shift+Click)
2. Before dragging, check console logs:
   ```
   ✅ Should see: "Selected tags: [1, 2, 3]" (or similar)
   ❌ If you see: "Selected tags: [1]" → Selection is not working
   ```

### 2. Check Drag Event Payload

3. Drag the selected tags to a new location
4. Check console logs for:
   ```javascript
   🔄 Tree Node Move Event (Multi-Drag): {
       draggedTagIds: ['1', '2', '3'],  // ✅ Should show ALL selected tag IDs
       dragCount: 3,                     // ✅ Should match selection count
       newParentId: '5',
       newIndex: 2
   }
   ```

   **Problem indicators:**
   - `draggedTagIds: ['1']` → Only one ID despite multiple selection
   - `dragCount: 1` → Count doesn't match selected items

### 3. Check API Request Payload

5. Open **Network tab** in DevTools
6. Filter for `/api/tags/batch-move`
7. Check the request payload:
   ```json
   {
     "tagIds": [1, 2, 3],  // ✅ Should contain ALL selected tag IDs
     "newParentId": 5,
     "startIndex": 2
   }
   ```

   **Problem indicators:**
   - `tagIds: [1]` → Only sending one ID to backend
   - Missing tagIds array → API not called correctly

### 4. Check Backend Response

8. Check API response:

   **Success:**
   ```json
   {
     "message": "Successfully moved 3 tag(s)",
     "count": 3,
     "parentId": 5,
     "startIndex": 2
   }
   ```

   **Error (missing workspace_items):**
   ```json
   {
     "error": "Some tags don't have workspace_items entries. Missing tag IDs: 2, 3"
   }
   ```

### 5. Check Database State

9. Query workspace_items table:
   ```sql
   SELECT * FROM workspace_items
   WHERE child_type = 'tag'
   AND child_id IN (1, 2, 3)
   AND deleted_at IS NULL;
   ```

   **Expected:** Should return 3 rows (one for each tag)

   **Problem indicators:**
   - Returns only 1 row → Missing workspace_items entries for tags 2, 3
   - Returns 0 rows → Tags not in workspace at all

---

## 🎯 Possible Root Causes

### **Cause 1: Selection Not Working**

**Symptoms:**
- Console shows only one tag ID in selection
- `dragCount: 1` despite Ctrl+Click on multiple tags

**Fix:** Check TagUIContext selection state management

**Location:** `src/features/notes/store/NoteUIContext.tsx`

---

### **Cause 2: react-arborist Not Sending Multiple dragIds**

**Symptoms:**
- Selection shows multiple tags
- But `args.dragIds` in handleMove only contains one ID

**Fix:** Check react-arborist `selection` prop configuration

**Location:** `WorkspaceTree.tsx` line ~650

```typescript
<Tree
    selection={selectedTagIds.map(String)}  // ✅ Must be set
    onMove={handleMove}
    // ...
/>
```

---

### **Cause 3: Missing workspace_items Entries**

**Symptoms:**
- API receives all tag IDs correctly
- Backend throws error: "Some tags don't have workspace_items entries"
- Only tags with workspace_items entries get moved

**Fix:** Ensure all tags have corresponding workspace_items entries

**SQL to check:**
```sql
-- Find tags without workspace_items
SELECT t.tag_id, t.name
FROM tags t
LEFT JOIN workspace_items wi ON wi.child_id = t.tag_id AND wi.child_type = 'tag'
WHERE wi.item_id IS NULL
AND t.deleted_at IS NULL;
```

**SQL to create missing entries:**
```sql
-- Create workspace_item for tag that's missing one
INSERT INTO workspace_items (workspace_id, parent_tag_id, child_type, child_id, sort_order, created_at, updated_at)
VALUES (
    1,           -- Your workspace ID
    NULL,        -- Parent tag (NULL = root level)
    'tag',       -- Type
    2,           -- Tag ID that's missing
    0,           -- Sort order
    NOW(),       -- Created
    NOW()        -- Updated
);
```

---

### **Cause 4: Backend Not Processing All Tags**

**Symptoms:**
- API receives all tag IDs
- No error thrown
- But only one tag moves in database

**Fix:** Check loop in `TagRepository.cs` lines 442-455

**Current code:**
```csharp
foreach (var tagId in tagIds)
{
    var item = workspaceItems.FirstOrDefault(wi => wi.ChildId == tagId);
    if (item != null)
    {
        item.ParentTagId = newParentId;
        item.SortOrder = currentSortOrder++;
        item.UpdatedAt = DateTime.UtcNow;
    }
}
```

**Problem:** Silent failure if `item` is null (tag has no workspace_item)

**Solution:** Validation added at lines 413-420 to throw error if any tags missing

---

## ✅ Fix Applied

**File:** `TagRepository.cs`
**Lines:** 413-420

Added validation to ensure ALL tags have workspace_items entries:

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

**What this does:**
- Forces explicit error if any tags lack workspace_items
- Prevents silent failure (only some tags moving)
- Provides clear error message with missing tag IDs

---

## 🧪 Testing Steps

### **Test Case 1: Multi-Drag with Valid Tags**

1. Select tags 1, 2, 3 (Ctrl+Click)
2. Drag to new parent tag 5
3. **Expected:**
   - Console: `dragCount: 3`
   - API call: `tagIds: [1, 2, 3]`
   - Response: `"Successfully moved 3 tag(s)"`
   - Database: All 3 tags now have `parent_tag_id = 5`

### **Test Case 2: Multi-Drag with Missing workspace_items**

1. Select tags 1, 2, 3
2. Drag to new parent
3. **Expected (if tags 2, 3 missing workspace_items):**
   - API returns error: `"Some tags don't have workspace_items entries. Missing tag IDs: 2, 3"`
   - Frontend shows error toast
   - No tags moved (transaction rolled back)
   - User can then fix database or investigate why tags lack entries

---

## 🔧 How to Fix Missing workspace_items

If you get the error about missing workspace_items, you have two options:

### **Option A: Create Missing Entries (Quick Fix)**

```sql
-- Replace these values with your actual data
INSERT INTO workspace_items (workspace_id, parent_tag_id, child_type, child_id, sort_order, created_at, updated_at)
VALUES
    (1, NULL, 'tag', 2, 0, NOW(), NOW()),  -- Tag 2
    (1, NULL, 'tag', 3, 1, NOW(), NOW());  -- Tag 3
```

### **Option B: Investigate Why Tags Missing (Root Cause)**

Possible reasons tags don't have workspace_items:
1. **Tags created before workspace_items system was implemented**
2. **Orphaned tags** (deleted from workspace but tag still exists)
3. **Migration not run** (if you recently added workspace_items table)
4. **Bug in tag creation code** (not creating workspace_item when creating tag)

**Check tag creation code:**
```typescript
// When creating a new tag, ensure workspace_item is also created
POST /api/tags
{
    "name": "New Tag",
    "workspaceId": 1,  // ← Must include workspace
    "parentId": null
}
```

Backend should create both:
1. Tag entry in `tags` table
2. workspace_item entry in `workspace_items` table

---

## 📊 Database Schema Reference

```sql
-- workspace_items table structure
CREATE TABLE workspace_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL,
    parent_tag_id INT NULL,        -- NULL = root level
    child_type VARCHAR(50),        -- 'tag', 'note', etc.
    child_id INT NOT NULL,         -- tag_id or note_id
    sort_order INT DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME,
    deleted_at DATETIME NULL,

    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id),
    FOREIGN KEY (parent_tag_id) REFERENCES tags(tag_id)
);
```

**Key Points:**
- Each tag in workspace MUST have a workspace_items entry
- `parent_tag_id = NULL` means root level
- `sort_order` determines visual order within parent
- `deleted_at != NULL` means soft-deleted (excluded from queries)

---

## 🎉 Next Steps

1. **Rebuild backend** to apply validation fix
2. **Test multi-drag** with browser console open
3. **If error occurs**, note the missing tag IDs
4. **Query database** to confirm which tags lack workspace_items
5. **Fix data** or investigate why entries missing
6. **Re-test** until all tags move successfully

---

## 📝 Status

- [x] Added validation to detect missing workspace_items
- [x] Backend will now throw explicit error instead of silent failure
- [ ] Rebuild backend
- [ ] Test multi-drag
- [ ] Verify all tags move or get clear error message
- [ ] Fix any missing workspace_items entries if needed
