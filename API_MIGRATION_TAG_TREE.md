# 🔄 Tag Tree API Migration - Old `/tree` to New `workspace/{id}/tree`

## 📋 Overview

Migration từ endpoint cũ `/api/tags/tree?includeShared=true` sang endpoint mới `/api/tags/workspace/{workspaceId}/tree`.

**Date**: October 21, 2025  
**Status**: ✅ COMPLETED

---

## 🎯 Changes Summary

### Backend (No Changes Required)
- ✅ Controller đã có endpoint mới: `[HttpGet("workspace/{workspaceId:int}/tree")]`
- ✅ Old endpoint `/tree` không còn được sử dụng
- ✅ Repository đã có method `GetWorkspaceTagTreeAsync()`

### Frontend Changes

#### 1. **Service Layer** (`tagService.ts`)
**Removed:**
```typescript
async getTagTree(includeShared: boolean = true): Promise<Tag[]>
```

**Kept:**
```typescript
async getWorkspaceTagTree(workspaceId: number): Promise<WorkspaceWithTagTree>
```

**Impact**: Old method đã bị comment out với note về deprecation.

---

#### 2. **Hooks Layer** (`useTags.ts`)
**Removed:**
```typescript
export function useTagTree(includeShared: boolean = true)
```

**Kept:**
```typescript
export function useWorkspaceTagTree(workspaceId: number)
```

**Impact**: Old hook đã bị comment out với deprecation note.

---

#### 3. **Component Layer** (`TagTree.tsx`)

**Before:**
```typescript
interface TagTreeProps {
    onTagClick?: (tag: Tag) => void;
    includeShared?: boolean;
    workspaceId?: number; // Optional
}

// Conditionally use workspace tree or regular tree
const shouldUseWorkspaceTree = workspaceId !== undefined;
const regularTreeQuery = useTagTree(includeShared);
const workspaceTreeQuery = useWorkspaceTagTree(workspaceId || 0);
const queryResult = shouldUseWorkspaceTree ? workspaceTreeQuery : regularTreeQuery;
```

**After:**
```typescript
interface TagTreeProps {
    onTagClick?: (tag: Tag) => void;
    includeShared?: boolean; // DEPRECATED: kept for backward compatibility
    workspaceId: number; // REQUIRED
}

// Only use workspace tree API
if (!workspaceId) {
    throw new Error('workspaceId is required. The old /tree endpoint is no longer supported.');
}

const workspaceTreeQuery = useWorkspaceTagTree(workspaceId);
const { data, isLoading, error } = workspaceTreeQuery;
```

**Key Changes:**
- ✅ `workspaceId` prop is now **required** (changed from optional)
- ✅ Removed conditional logic between old and new API
- ✅ Always use `useWorkspaceTagTree()`
- ✅ Simplified data extraction logic
- ✅ Fixed refresh handler to use single query

---

## 📖 Usage Examples

### ❌ OLD Way (No Longer Works)
```typescript
// This will throw an error now
<TagTree includeShared={true} />
```

### ✅ NEW Way (Required)
```typescript
// Must provide workspaceId
<TagTree workspaceId={1} />

// With optional callback
<TagTree 
    workspaceId={1} 
    onTagClick={(tag) => console.log('Clicked:', tag)} 
/>
```

---

## 🔧 Migration Guide for Developers

### If you use `<TagTree>` component:

**Step 1**: Ensure you have a `workspaceId`
```typescript
// Get from URL params, context, or props
const { workspaceId } = useParams<{ workspaceId: string }>();
const id = parseInt(workspaceId);
```

**Step 2**: Pass `workspaceId` as required prop
```typescript
<TagTree workspaceId={id} />
```

**Step 3**: Remove `includeShared` prop (no longer used)
```typescript
// Before
<TagTree includeShared={true} workspaceId={id} />

// After
<TagTree workspaceId={id} />
```

---

## 🧪 Testing Checklist

- [ ] Tag tree loads with valid `workspaceId`
- [ ] Error thrown if `workspaceId` is not provided
- [ ] Workspace name appears as root node
- [ ] Tags hierarchy is correctly displayed
- [ ] Search/filter works correctly
- [ ] Refresh button refetches data
- [ ] Drag & drop still functional (if implemented)
- [ ] Add tag dialog works
- [ ] Keyboard navigation works

---

## 🚨 Breaking Changes

1. **`workspaceId` prop is now required**
   - Components using `<TagTree>` without `workspaceId` will throw error
   - Update all usages to include `workspaceId`

2. **`includeShared` prop is deprecated**
   - No longer has any effect
   - Can be removed from component usage
   - Kept in interface for backward compatibility only

3. **Old `/api/tags/tree` endpoint is no longer called**
   - All tree data now comes from `/api/tags/workspace/{id}/tree`
   - Backend can safely remove old endpoint if no other clients use it

---

## 📊 API Comparison

| Feature | Old `/tree` | New `workspace/{id}/tree` |
|---------|------------|---------------------------|
| **Endpoint** | `GET /api/tags/tree?includeShared=true` | `GET /api/tags/workspace/{id}/tree` |
| **Response** | `Tag[]` (flat or tree) | `WorkspaceWithTagTree` (workspace + tags) |
| **Authentication** | Required | Required |
| **Workspace Context** | ❌ No workspace info | ✅ Full workspace metadata |
| **Tag Hierarchy** | ✅ Yes | ✅ Yes |
| **Shared Tags** | Via `includeShared` param | Determined by workspace access |

---

## 🎉 Benefits of New API

1. **✅ Better Context**: Workspace info included (name, color, description)
2. **✅ Consistent Data Model**: All tags belong to workspace
3. **✅ Clearer Permissions**: Access based on workspace membership
4. **✅ Simpler Frontend Logic**: No conditional API switching
5. **✅ Future-Proof**: Aligns with workspace-centric architecture

---

## 🔍 Files Modified

```
Frontend:
- src/features/tags/services/tagService.ts
- src/features/tags/hooks/useTags.ts
- src/features/tags/components/TagTree.tsx

Backend:
- No changes required (new endpoint already existed)
```

---

## 📝 Notes

- Old code is commented out with deprecation notes for reference
- Can be safely removed in future cleanup
- `includeShared` prop kept in interface to avoid breaking changes in calling code
- All existing functionality preserved, just simplified

---

**Questions?** Check documentation or ask team lead.
