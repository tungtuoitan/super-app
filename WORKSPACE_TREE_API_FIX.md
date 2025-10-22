# Workspace Tree API Fix

## 🎯 Problem

Frontend không thể load workspace tree data vì:
1. **Sai endpoint**: Frontend gọi `/api/tags/workspace/{workspaceId}/tree` nhưng backend endpoint là `/api/workspace/{workspaceId}/tree`
2. **Sai data structure**: Backend đã migrate từ `WorkspaceWithTagTreeResponse` sang `WorkspaceWithTreeResponse` với structure mới (polymorphic items)

## 🔧 Changes Made

### 1. Fixed API Endpoint

**File**: `src/features/tags/services/tagService.ts`

```typescript
// ❌ Before (Wrong endpoint)
const response = await apiClient.get<WorkspaceWithTagTreeDTO>(
    `${this.basePath}/workspace/${workspaceId}/tree`  // /api/tags/workspace/{id}/tree
);

// ✅ After (Correct endpoint)
const response = await apiClient.get<WorkspaceWithTreeDTO>(
    `/api/workspace/${workspaceId}/tree`  // /api/workspace/{id}/tree
);
```

### 2. Updated Type Definitions

**File**: `src/features/tags/types/tag.types.ts`

Added new types to match backend `WorkspaceWithTreeResponse`:

```typescript
// NEW: Workspace Tree Item (Polymorphic)
export interface WorkspaceTreeItemDTO {
    id: number;                           // ItemId from WorkspaceItems table
    itemType: 'Tag' | 'Note' | 'File';   // Type discriminator
    childId: number;                      // Actual ID of tag/note/file
    name: string;
    parentId?: number;
    label?: string;
    notes?: string;
    color?: string;
    icon?: string;
    sortOrder?: number;
    relationshipType?: string;
    children: WorkspaceTreeItemDTO[];     // Hierarchical children
}

// NEW: Workspace with Tree Response
export interface WorkspaceWithTreeDTO {
    workspaceId: number;
    userId: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: string;
    maxDepth?: number;
    isDefault: boolean;
    isPublic: boolean;
    isTemplate: boolean;
    isArchived: boolean;
    tagCount: number;
    noteCount: number;           // NEW
    fileCount: number;           // NEW
    memberCount: number;
    settings?: string;
    createdAt: string;
    updatedAt?: string;
    items: WorkspaceTreeItemDTO[];  // NEW: Polymorphic items (was "tags")
}
```

### 3. Updated Service Transform Logic

**File**: `src/features/tags/services/tagService.ts`

```typescript
async getWorkspaceTagTree(workspaceId: number): Promise<WorkspaceWithTagTree> {
    const response = await apiClient.get<WorkspaceWithTreeDTO>(
        `/api/workspace/${workspaceId}/tree`
    );
    
    // Filter only tags from polymorphic items
    const tagItems = response.items.filter(item => item.itemType === 'Tag');
    
    // Transform workspace tree items to tags
    const tags = tagItems.map((item: WorkspaceTreeItemDTO) => 
        this.transformWorkspaceTreeItemToTag(item)
    );
    
    return {
        // ... workspace properties
        tags: tags  // Filtered and transformed tags only
    };
}

// NEW: Transform helper
private transformWorkspaceTreeItemToTag(item: WorkspaceTreeItemDTO): Tag {
    return {
        tagId: item.childId,
        id: item.childId,
        name: item.name,
        description: item.notes,
        color: item.color,
        createdAt: new Date(),
        isActive: true,
        depth: 0,
        children: item.children
            .filter(child => child.itemType === 'Tag')
            .map(child => this.transformWorkspaceTreeItemToTag(child)),
        isExpanded: false,
        isArchived: false
    };
}
```

## 📊 Backend API Structure

### Endpoint
```
GET /api/workspace/{workspaceId}/tree
```

### Response Structure
```json
{
  "workspaceId": 1,
  "userId": 1,
  "name": "My Workspace",
  "tagCount": 10,
  "noteCount": 5,
  "fileCount": 3,
  "items": [
    {
      "id": 1,
      "itemType": "Tag",
      "childId": 5,
      "name": "Work",
      "parentId": null,
      "color": "#FF5733",
      "children": [
        {
          "id": 2,
          "itemType": "Tag",
          "childId": 6,
          "name": "Projects",
          "parentId": 1,
          "children": []
        },
        {
          "id": 3,
          "itemType": "Note",
          "childId": 10,
          "name": "Meeting Notes",
          "parentId": 1,
          "children": []
        }
      ]
    }
  ]
}
```

## ✅ Testing

### Expected Behavior
1. Open app at `http://localhost:3000` (or 3001 if 3000 is busy)
2. Navigate to Tags page or open WorkspaceTree component
3. Check browser console for:
   ```
   📦 Fetching workspace tree for workspaceId: 1
   ✅ Workspace tree response: { workspaceId: 1, items: [...] }
   ```
4. Workspace tree should render with hierarchical tags

### Components Using This API
- `src/features/tags/components/WorkspaceTree.tsx`
- `src/features/tags/components/CreateFolderDialog.tsx`
- `src/features/tags/components/AddTagDialog.tsx`

## 🔄 Migration Notes

### Backward Compatibility
- Old `WorkspaceWithTagTreeDTO` interface is kept as deprecated for reference
- Frontend components still work with `Tag[]` structure
- Service layer handles transformation from polymorphic items to tags

### Future Improvements
1. **Support Notes and Files**: Currently filtering only tags, but backend supports notes/files
2. **Preserve workspace item metadata**: Label, notes, relationshipType from WorkspaceItems table
3. **Update components**: Use polymorphic tree structure directly instead of filtering to tags only

## 📝 Files Changed

1. ✅ `src/features/tags/types/tag.types.ts` - Added new types
2. ✅ `src/features/tags/services/tagService.ts` - Updated endpoint and transform logic

## 🚀 Status

**COMPLETED** - Frontend now correctly calls `/api/workspace/{workspaceId}/tree` and transforms the polymorphic response to tags.

---

**Last Updated**: 2025-01-22  
**Author**: GitHub Copilot  
**Related Backend Files**: 
- `SuperApp-backend/SuperAppAPI/Controllers/WorkspaceController.cs`
- `SuperApp-backend/SuperAppModels/DTOs/Responses/WorkspaceWithTreeResponse.cs`
