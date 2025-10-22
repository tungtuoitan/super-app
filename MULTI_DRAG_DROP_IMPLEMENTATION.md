# Multi-Item Drag & Drop Implementation - WorkspaceTree

## ✅ Frontend Implementation Complete

### **Overview**
Implemented VS Code-style multi-item drag and drop for WorkspaceTree component using react-arborist library.

---

## **Features Implemented**

### 1. **Multi-Selection Support** ✅
- **Ctrl+Click**: Toggle individual item selection
- **Shift+Click**: Range selection from last selected item
- **Ctrl+A**: Select all visible items
- **Arrow Keys + Shift**: Extend selection up/down
- **ESC**: Clear selection

### 2. **Multi-Item Drag** ✅
- Drag all selected items simultaneously
- React-arborist automatically populates `dragIds` array
- Sequential API calls for each item (batch API pending)

### 3. **Custom Drag Preview (VS Code Style)** ✅
```tsx
<CustomDragPreview />
```
- Shows preview of first dragged item
- Blue count badge when dragging multiple items
- Positioned near cursor with offset
- Dark theme with semi-transparent background

### 4. **Visual Feedback During Drag** ✅
- Selected items become semi-transparent (opacity: 0.4)
- Blue highlight on dragged items
- Smooth transitions
- Maintains selection state during drag

### 5. **Validation & Safety** ✅
- **Workspace root protection**: Cannot move workspace root node
- **Circular dependency check**: Prevents moving parent into its own children
- **Self-reference check**: Cannot move item to itself
- **Clear selection after move**: VS Code-like behavior

---

## **Implementation Details**

### **File Modified**
`src/features/tags/components/WorkspaceTree.tsx`

### **Key Changes**

#### 1. **Helper Function: Circular Dependency Check**
```typescript
function isDescendant(
    targetId: number,
    potentialParentId: number,
    treeData: TreeTag[]
): boolean {
    // Recursively checks if targetId exists in potentialParentId's subtree
    // Prevents moving a parent folder into its own children
}
```

#### 2. **Enhanced handleMove Handler**
```typescript
const handleMove = async (args: {
    dragIds: string[];      // ✅ Array of ALL selected items
    parentId: string | null;
    index: number;
}) => {
    // 1. Convert IDs to numbers
    const tagIds = args.dragIds.map(id => parseInt(id));
    const newParentId = args.parentId ? parseInt(args.parentId) : undefined;

    // 2. Validation
    - Check workspace root
    - Check circular dependencies
    - Check self-reference

    // 3. Sequential move (batch API later)
    let currentIndex = args.index;
    for (const tagId of tagIds) {
        await moveTagMutation.mutateAsync({
            tagId,
            newParentId,
            newIndex: currentIndex++,
        });
    }

    // 4. Clear selection (VS Code behavior)
    clearSelection();
};
```

#### 3. **Custom Drag Preview Component**
```typescript
function CustomDragPreview({
    offset,   // Drag item position
    mouse,    // Cursor position
    id,       // Primary dragged item ID
    dragIds,  // All selected item IDs
    isDragging
}) {
    // Preview box following drag item
    // Count badge following cursor
}
```

#### 4. **Visual Feedback in TagNode**
```typescript
sx={{
    // Dragging state
    opacity: isDragging ? 0.4 : 1,
    transition: 'opacity 0.2s ease-in-out',

    // Dragging indicator
    ...(isDragging && isSelected && {
        backgroundColor: 'rgba(0, 122, 204, 0.3)',
        border: '1px solid rgba(0, 122, 204, 0.6)',
    }),
}}
```

---

## **How It Works**

### **User Flow:**

1. **User selects multiple tags**
   - Ctrl+Click on Tag A, B, C
   - All 3 tags highlighted with blue border

2. **User starts dragging Tag A**
   - React-arborist detects: `dragIds = ['A', 'B', 'C']`
   - Custom preview shows "Tag A" with badge "3"
   - All selected tags become semi-transparent

3. **User drops on Tag D**
   - `handleMove` called with `dragIds = ['A', 'B', 'C']`
   - Validation checks pass
   - Sequential API calls:
     ```
     POST /api/tags/A/move { parentId: D, index: 0 }
     POST /api/tags/B/move { parentId: D, index: 1 }
     POST /api/tags/C/move { parentId: D, index: 2 }
     ```
   - Tree refetches from server
   - Selection cleared

---

## **Current Limitations**

### **Sequential API Calls** ⚠️
Currently makes N API calls for N selected items.

**Performance:**
- 3 items = 3 API calls (~300ms total)
- 10 items = 10 API calls (~1000ms total)
- UI shows loading overlay during operation

**Solution:** Implement batch move API endpoint (Phase 7)

---

## **Next Steps**

### **Phase 7: Backend Batch Move API**

#### **Endpoint Design:**
```csharp
// POST /api/tags/batch-move
public class BatchMoveRequest
{
    public int[] TagIds { get; set; }
    public int? NewParentId { get; set; }
    public int StartIndex { get; set; }
}

[HttpPost("batch-move")]
public async Task<IActionResult> BatchMoveTag([FromBody] BatchMoveRequest request)
{
    // 1. Validate all tagIds exist
    // 2. Check circular dependencies on backend
    // 3. Move all items in transaction
    // 4. Return updated tag tree
}
```

#### **Frontend Update:**
```typescript
// tagService.ts
async batchMoveTag(
    tagIds: number[],
    newParentId?: number,
    startIndex: number = 0
): Promise<void> {
    await apiClient.post('/api/tags/batch-move', {
        tagIds,
        newParentId,
        startIndex
    });
}

// useTags.ts
export function useBatchMoveTag() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            tagIds,
            newParentId,
            startIndex
        }: {
            tagIds: number[];
            newParentId?: number;
            startIndex: number;
        }) => tagService.batchMoveTag(tagIds, newParentId, startIndex),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tagKeys.all });
        },
    });
}
```

#### **WorkspaceTree Update:**
```typescript
const batchMoveMutation = useBatchMoveTag();

// In handleMove:
await batchMoveMutation.mutateAsync({
    tagIds,
    newParentId,
    startIndex: args.index,
});
```

---

## **Testing Checklist**

### **Basic Functionality** ✅
- [x] Single item drag works
- [x] Multi-select with Ctrl+Click
- [x] Multi-select with Shift+Click
- [x] Multi-select with Ctrl+A
- [x] Drag preview shows count badge
- [x] Visual feedback during drag
- [x] Selection clears after drop

### **Validation** ✅
- [x] Cannot move workspace root
- [x] Cannot move to workspace root
- [x] Cannot move parent into child (circular check)
- [x] Cannot move tag to itself

### **Edge Cases** (Pending backend API)
- [ ] Move 10+ items at once
- [ ] Move parent with nested children
- [ ] Error handling during batch move
- [ ] Rollback on partial failure
- [ ] Network timeout handling

---

## **Performance Notes**

### **Current Performance:**
- UI remains responsive during drag
- Loading overlay shows during API calls
- Tree refetches after successful move
- React Query handles caching efficiently

### **Optimizations Available:**
1. **Batch API endpoint** - Reduce N calls to 1
2. **Optimistic updates** - Update UI before API response
3. **Debounced refetch** - Wait 300ms before refetching tree
4. **WebSocket updates** - Real-time tree updates

---

## **Code References**

### **Key Functions:**
- `WorkspaceTree.tsx:73` - `isDescendant()` circular check
- `WorkspaceTree.tsx:700` - `handleMove()` multi-drag handler
- `WorkspaceTree.tsx:528` - `CustomDragPreview` component
- `WorkspaceTree.tsx:165` - `isDragging` state in TagNode

### **Related Files:**
- `src/features/tags/store/TagUIContext.tsx` - Selection state
- `src/features/tags/hooks/useTags.ts` - `useMoveTag` hook
- `src/features/tags/services/tagService.ts` - `moveTag` API call

---

## **Demo GIF/Video**
_TODO: Record screen capture showing:_
1. Selecting 3 tags with Ctrl+Click
2. Dragging with count badge "3"
3. Dropping into folder
4. Loading overlay
5. Tree update with items moved

---

## **Credits**
- **Library:** [react-arborist](https://github.com/brimdata/react-arborist) v3.4.3
- **Drag & Drop:** react-dnd v16.0.1
- **Design:** VS Code-inspired UI/UX
