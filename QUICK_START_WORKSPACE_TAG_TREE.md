# Quick Start Guide - Workspace Tag Tree

## 🚀 How to Test

### 1. Start the Development Server
```bash
cd C:\Users\Admin\source\super-app\SuperApp-frontend
npm start
```

### 2. Navigate to Test Page
Open your browser and go to:
```
http://localhost:3000/workspace-tag-tree-test
```

### 3. What You Should See
- **Page Title**: "Workspace Tag Tree Test"
- **Workspace Selector**: Dropdown to switch between workspaces (1, 2, 3)
- **Tag Tree**: Hierarchical tree view of tags from workspace 1
- **API Info**: Details about the backend endpoint being called

---

## 📡 API Call Being Made

When you load the page, the frontend will make this API call:

```
GET http://localhost:5000/api/tags/workspace/1/tree?userId=1
```

**Backend Flow**:
1. `TagsController.GetWorkspaceTagTree(workspaceId: 1)`
2. `TagRepository.GetWorkspaceTagTreeAsync(workspaceId: 1, userId: 1)`
3. SQL: `EXEC spSelectWorkspaceTagTree @workspace_id = 1, @user_id = 1`

---

## 🎯 Test Scenarios

### Scenario 1: Basic Load
1. Navigate to `/workspace-tag-tree-test`
2. ✅ Tree should load with tags from workspace 1
3. ✅ Should see folder icons for tags with children
4. ✅ Should see tag icons for leaf tags

### Scenario 2: Multi-Selection
1. Click on a tag → Should select it (blue highlight)
2. Ctrl+Click another tag → Both should be selected
3. Shift+Click a tag → Range selection
4. Ctrl+A → Select all tags

### Scenario 3: Keyboard Navigation
1. Click any tag to focus the tree
2. Arrow Up/Down → Navigate through tags
3. Shift+Arrow → Extend selection
4. Escape → Clear selection

### Scenario 4: Tree Operations
1. Click expand/collapse icons → Should toggle children
2. Drag a tag → Should show drag indicator
3. Right-click a tag → Should show context menu

### Scenario 5: Workspace Switching
1. Change workspace dropdown to "Workspace 2"
2. ✅ Tree should reload with workspace 2 data
3. Check browser Network tab → New API call to workspace/2/tree

---

## 🐛 Expected API Response Format

The backend should return an array of `TagTreeResponseDTO`:

```json
[
  {
    "tagId": 1,
    "userId": 1,
    "name": "Work",
    "parentId": null,
    "path": "Work",
    "slug": "work",
    "color": "#FF5733",
    "icon": "work",
    "accessType": "owner",
    "level": 0,
    "usageCount": 10,
    "childrenCount": 2,
    "children": [
      {
        "tagId": 2,
        "userId": 1,
        "name": "Projects",
        "parentId": 1,
        "path": "Work/Projects",
        "slug": "projects",
        "color": "#33FF57",
        "icon": "folder",
        "accessType": "owner",
        "level": 1,
        "usageCount": 5,
        "childrenCount": 0,
        "children": [],
        "isExpanded": false,
        "isSelected": false
      }
    ],
    "isExpanded": true,
    "isSelected": false
  }
]
```

---

## 🔍 Debugging Tips

### Check Browser Console
Open DevTools (F12) → Console tab

**Look for**:
- ✅ `📦 Fetching workspace tag tree for workspaceId: 1, userId: 1`
- ✅ `✅ Workspace tag tree response: [...]`
- ❌ API errors or network failures

### Check Network Tab
Open DevTools (F12) → Network tab

**Look for**:
- Request: `GET /api/tags/workspace/1/tree`
- Status: `200 OK`
- Response: JSON array of tags

**Common Issues**:
- ❌ 404 Not Found → Backend endpoint not implemented
- ❌ 500 Server Error → Database or stored procedure error
- ❌ Empty array `[]` → No tags in workspace 1

### Check React Query DevTools
In development, you'll see a floating React Query icon in the bottom corner.

**Click it to see**:
- Query status: `success`, `loading`, `error`
- Query key: `['tags', 'workspace', 1, 'tree', 1]`
- Cached data
- Last fetch time

---

## 📊 What's Different from Regular Tag Tree?

### Regular Tag Tree (`/tags`)
```typescript
<TagTree includeShared={true} />
```
- Uses: `GET /api/tags/tree?includeShared=true`
- Shows: All tags for the user
- Hook: `useTagTree(includeShared)`

### Workspace Tag Tree (`/workspace-tag-tree-test`)
```typescript
<TagTree workspaceId={1} userId={1} />
```
- Uses: `GET /api/tags/workspace/1/tree`
- Shows: Only tags in workspace 1
- Hook: `useWorkspaceTagTree(workspaceId, userId)`

---

## ✅ Success Criteria

You'll know it's working when:
1. ✅ Page loads without errors
2. ✅ Tree displays with tags
3. ✅ Console shows API call logs
4. ✅ Network tab shows 200 response
5. ✅ Changing workspace reloads tree
6. ✅ All tree interactions work (selection, navigation, expand/collapse)

---

## 🛠️ Troubleshooting

### Problem: "Cannot find module '../../pages/WorkspaceTagTreeTestPage'"
**Solution**: TypeScript server needs restart
```bash
# In VS Code
Press Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### Problem: Empty tree / No data
**Solutions**:
1. Check if workspace 1 exists in database
2. Verify user 1 has access to workspace 1
3. Check if there are tags in workspace 1
4. Test backend endpoint directly:
   ```bash
   curl http://localhost:5000/api/tags/workspace/1/tree
   ```

### Problem: API 404 Error
**Solutions**:
1. Verify backend is running on port 5000
2. Check `TagsController.cs` has `GetWorkspaceTagTree` method
3. Verify route: `[HttpGet("workspace/{workspaceId:int}/tree")]`

### Problem: API 500 Error
**Solutions**:
1. Check backend logs for SQL errors
2. Verify `spSelectWorkspaceTagTree` stored procedure exists
3. Test stored procedure directly in SQL Server Management Studio:
   ```sql
   EXEC spSelectWorkspaceTagTree @workspace_id = 1, @user_id = 1
   ```

---

## 📚 Code References

### Frontend Files Created/Modified:
- ✅ `src/features/tags/services/tagService.ts` - Added `getWorkspaceTagTree()`
- ✅ `src/features/tags/hooks/useTags.ts` - Added `useWorkspaceTagTree()`
- ✅ `src/features/tags/components/TagTree.tsx` - Added workspace props
- ✅ `src/features/tags/components/WorkspaceTagTree.tsx` - New component
- ✅ `src/pages/WorkspaceTagTreeTestPage.tsx` - New test page
- ✅ `src/Components/MainNav/MainNav.tsx` - Added route

### Backend Files (Already Exist):
- ✅ `Controllers/TagsController.cs` - `GetWorkspaceTagTree()` method
- ✅ `Repositories/TagRepository.cs` - `GetWorkspaceTagTreeAsync()` method
- ✅ SQL Stored Procedure: `spSelectWorkspaceTagTree`

---

Generated: January 2025
For questions, check the full implementation guide: `WORKSPACE_TAG_TREE_IMPLEMENTATION.md`
