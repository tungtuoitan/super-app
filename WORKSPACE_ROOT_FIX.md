# Workspace Root Validation Fix

## 🐛 **Issue**

When dragging a tag to workspace root level (to make it a sibling of other root tags), the move was blocked with warning:
```
⚠️ Cannot move to workspace root
```

**Example:**
```
Before:
- Active (root)
  - Projects (child of Active)
  - Important (child of Active)

Wanted:
- Active (root)
- Projects (root) ← Should be allowed
- Important (child of Active)
```

---

## 🔍 **Root Cause**

### **Data Structure:**

In this architecture, workspace tree uses special nodes:

```javascript
{
    id: '-1',           // Workspace node (virtual, negative ID)
    name: 'System Administration',
    children: [
        { id: 137, name: 'Active', parentId: null },  // ← Root level tag
        { id: 136, name: 'Projects', parentId: 137 }  // ← Child tag
    ]
}
```

### **Problem:**

Old validation logic treated negative IDs as "workspace root" and blocked moves:

```typescript
// ❌ INCORRECT - Blocked moving to root level
if (newParentId && newParentId < 0) {
    console.warn('⚠️ Cannot move to workspace root');
    return;
}
```

**What happened:**
1. User drags "Projects" to workspace node (id: '-1')
2. Code checks: `newParentId = -1` → negative → blocked
3. But `-1` represents workspace container, not actual parent
4. Moving to workspace container means `parentId = null` (root level) ✅

---

## ✅ **Solution**

### **Updated Logic:**

```typescript
// Parse newParentId: null means workspace root level (valid)
// Negative ID means workspace node itself (convert to null)
let newParentId: number | undefined = undefined;
if (args.parentId) {
    const parsedParentId = parseInt(args.parentId);
    // Negative IDs are workspace nodes - convert to null for root level
    if (parsedParentId < 0) {
        newParentId = undefined; // Root level in workspace
    } else {
        newParentId = parsedParentId;
    }
}

// Only prevent moving workspace itself (dragged item is negative)
const hasWorkspaceRoot = tagIds.some(id => id < 0);
if (hasWorkspaceRoot) {
    console.warn('⚠️ Cannot move workspace root node');
    return;
}
```

### **Key Changes:**

1. **Removed workspace root target validation**
   - Old: Block when `newParentId < 0`
   - New: Convert `newParentId < 0` to `undefined` (null parent)

2. **Keep workspace node validation**
   - Still prevent moving workspace node itself (dragIds < 0)
   - This is correct - workspace container cannot be moved

---

## 🎯 **Behavior After Fix**

### **Valid Moves:**

✅ **Move tag to workspace root (parentId = null)**
```javascript
// Drag "Projects" to workspace container
args.parentId = '-1'  →  newParentId = undefined
// API call: { tagIds: [136], newParentId: null }
// Result: Projects becomes root level tag
```

✅ **Move tag under another tag**
```javascript
// Drag "Projects" to "Active"
args.parentId = '137'  →  newParentId = 137
// API call: { tagIds: [136], newParentId: 137 }
// Result: Projects becomes child of Active
```

### **Invalid Moves (Still Blocked):**

❌ **Cannot move workspace node itself**
```javascript
// Drag workspace container
tagIds = [-1]  →  blocked
// Warning: "Cannot move workspace root node"
```

❌ **Cannot move tag to itself**
```javascript
// Drag "Projects" to "Projects"
tagIds = [136], newParentId = 136  →  blocked
// Warning: "Cannot move tag to itself"
```

❌ **Cannot move parent into child (circular)**
```javascript
// Drag "Active" into "Projects" (child of Active)
tagIds = [137], newParentId = 136  →  blocked
// Warning: "Cannot move parent into its own children"
```

---

## 🧪 **Testing**

### **Test Case 1: Move to Root Level**

**Setup:**
```
- Active (id: 137, parentId: null)
  - Projects (id: 136, parentId: 137)
  - Important (id: 127, parentId: 137)
```

**Action:** Drag "Projects" to workspace container

**Expected:**
```javascript
// API Request
POST /api/tags/batch-move
{
    "tagIds": [136],
    "newParentId": null,      // ← null = root level
    "startIndex": 0
}

// Database Update
UPDATE workspace_items
SET parent_tag_id = NULL,     // ← Root level
    sort_order = 0
WHERE child_id = 136
```

**Result:**
```
- Active (id: 137)
  - Important (id: 127)
- Projects (id: 136) ← Now root level
```

### **Test Case 2: Multi-Drag to Root**

**Action:** Select "Projects" + "Important", drag to workspace container

**Expected:**
```javascript
POST /api/tags/batch-move
{
    "tagIds": [136, 127],
    "newParentId": null,
    "startIndex": 0
}
```

**Result:**
```
- Active (id: 137)
- Projects (id: 136) ← Root
- Important (id: 127) ← Root
```

---

## 📊 **Database Mapping**

### **Frontend → Backend:**

| Frontend State | args.parentId | newParentId | Backend API | DB parent_tag_id |
|----------------|---------------|-------------|-------------|------------------|
| Drop on workspace | `'-1'` | `undefined` | `null` | `NULL` (root) |
| Drop on tag | `'137'` | `137` | `137` | `137` |
| Drop on nothing | `null` | `undefined` | `null` | `NULL` (root) |

### **Key Insight:**

- **Frontend workspace node** (id: -1) = **Virtual container**
- **Backend workspace_items** (parent_tag_id: NULL) = **Actual root level**
- **Conversion happens** in frontend before API call

---

## 📝 **Files Modified**

**File:** `WorkspaceTree.tsx`
**Lines:** 806-830

**Changes:**
1. Improved parentId parsing logic
2. Convert negative IDs to undefined (null parent)
3. Removed blocking validation for workspace root target
4. Added clear comments explaining behavior

---

## ✅ **Status**

- [x] Fix applied
- [x] TypeScript clean
- [ ] Test moving tag to root level
- [ ] Test multi-drag to root level
- [ ] Verify database updates
- [ ] QA approval

---

**Next:** Test dragging "Projects" to workspace root and verify it becomes a sibling of "Active"!
