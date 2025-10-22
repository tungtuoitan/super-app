# 🎯 Drag & Drop Implementation Guide

## ✅ Completed Implementation

Tính năng drag & drop cho Tag Tree đã được triển khai đầy đủ với các thành phần sau:

### 1. **Type Definitions** (`tag.types.ts`)
```typescript
// Move tag request
export interface MoveTagDTO {
    tagId: number;
    newParentId?: number; // null or undefined for root level
    newIndex?: number; // Position in the new parent's children array
}
```

### 2. **Service Layer** (`tagService.ts`)
```typescript
/**
 * Move tag to a new parent or position
 * This updates the tag's parentId and potentially reorders siblings
 */
async moveTag(tagId: number, newParentId?: number, newIndex?: number): Promise<Tag>
```

**Features:**
- Gọi endpoint `/api/tags/{tagId}/move` với `parentId` và `index`
- Fallback về `updateTag` nếu endpoint move chưa có
- Error handling đầy đủ
- Console logging để debug

### 3. **React Query Hook** (`useTags.ts`)
```typescript
/**
 * Hook to move tag to new parent or position
 */
export function useMoveTag() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ tagId, newParentId, newIndex }) => 
            tagService.moveTag(tagId, newParentId, newIndex),
        onSuccess: () => {
            // Invalidate all tag tree queries
            queryClient.invalidateQueries({ queryKey: tagKeys.tree() });
            queryClient.invalidateQueries({ queryKey: tagKeys.all });
        },
    });
}
```

**Features:**
- Tự động invalidate cache sau khi move thành công
- Refetch data mới từ server
- Type-safe với TypeScript

### 4. **TagTree Component** (`TagTree.tsx`)

#### **Drag & Drop Handler:**
```typescript
const handleMove = async (args: { dragIds: string[]; parentId: string | null; index: number }) => {
    try {
        setIsDragging(true);
        
        const tagId = parseInt(args.dragIds[0]);
        const newParentId = args.parentId ? parseInt(args.parentId) : undefined;
        
        // Validation
        if (tagId < 0) return; // Workspace root
        if (newParentId && newParentId < 0) return; // Can't move to workspace root
        if (tagId === newParentId) return; // Can't move to itself
        
        // Call API
        await moveTagMutation.mutateAsync({
            tagId,
            newParentId,
            newIndex: args.index,
        });
        
        console.log('✅ Tag moved successfully');
    } catch (error) {
        console.error('❌ Failed to move tag:', error);
    } finally {
        setIsDragging(false);
    }
};
```

#### **Visual Feedback:**
- Loading overlay khi đang drag
- Spinner animation
- "Moving tag..." message
- Semi-transparent backdrop

#### **Validation Rules:**
1. ❌ Không cho phép move workspace root node (tagId < 0)
2. ❌ Không cho phép move vào workspace root
3. ❌ Không cho phép move tag vào chính nó
4. ✅ Cho phép move giữa các tag thường
5. ✅ Cho phép move lên root level (parentId = undefined)

---

## 🎨 User Experience

### **Drag & Drop Flow:**
1. User kéo tag item
2. Tree hiển thị drop zones (react-arborist xử lý)
3. User thả tag vào vị trí mới
4. Loading overlay xuất hiện
5. API call được gửi đi
6. Thành công → Tree tự động refetch và cập nhật
7. Thất bại → Tree giữ nguyên trạng thái cũ, hiển thị error

### **Visual States:**
- **Normal**: Tag có thể kéo được (cursor: pointer)
- **Dragging**: Loading overlay với spinner
- **Success**: Tree cập nhật với cấu trúc mới
- **Error**: Console log error, tree không thay đổi

---

## 🔧 Backend Requirements

Backend cần implement endpoint sau:

```typescript
PUT /api/tags/{tagId}/move
Body: {
    parentId?: number,  // null hoặc không có = root level
    index?: number      // vị trí trong danh sách children
}
Response: TagDTO
```

**Logic Backend cần xử lý:**
1. Validate tagId tồn tại
2. Validate parentId (nếu có) tồn tại
3. Không cho phép circular reference (tag là parent của chính nó)
4. Cập nhật `parentId` của tag
5. Cập nhật `depth` của tag và tất cả children
6. Reorder siblings nếu có `index`
7. Return updated tag

**Nếu endpoint chưa có:**
- Service sẽ fallback về `PUT /api/tags/{tagId}` với `{ parentId }`
- Sẽ không có reordering, chỉ update parent

---

## 🧪 Testing

### **Manual Testing Checklist:**

**Basic Drag & Drop:**
- [ ] Kéo tag con vào tag khác → trở thành child
- [ ] Kéo tag ra root level → trở thành root tag
- [ ] Kéo tag giữa các siblings → reorder

**Validation:**
- [ ] Không thể kéo workspace root node
- [ ] Không thể kéo vào workspace root
- [ ] Không thể kéo tag vào chính nó

**Visual Feedback:**
- [ ] Loading overlay hiện khi drag
- [ ] Spinner animation mượt mà
- [ ] Tree cập nhật sau khi move thành công

**Error Handling:**
- [ ] Network error → tree không thay đổi
- [ ] API error → tree không thay đổi
- [ ] Console log errors rõ ràng

### **Integration Testing:**
```typescript
describe('Tag Drag & Drop', () => {
    it('should move tag to new parent', async () => {
        // Arrange
        const tagId = 5;
        const newParentId = 3;
        
        // Act
        await tagService.moveTag(tagId, newParentId, 0);
        
        // Assert
        const tag = await tagService.getTagById(tagId);
        expect(tag.parentId).toBe(newParentId);
    });
    
    it('should move tag to root level', async () => {
        const tagId = 5;
        await tagService.moveTag(tagId, undefined, 0);
        
        const tag = await tagService.getTagById(tagId);
        expect(tag.parentId).toBeUndefined();
    });
});
```

---

## 📝 Usage Examples

### **Move tag programmatically:**
```typescript
import { useMoveTag } from '@/features/tags/hooks/useTags';

function MyComponent() {
    const moveTag = useMoveTag();
    
    const handleMoveToRoot = async (tagId: number) => {
        try {
            await moveTag.mutateAsync({
                tagId,
                newParentId: undefined, // Move to root
                newIndex: 0, // First position
            });
            toast.success('Tag moved to root!');
        } catch (error) {
            toast.error('Failed to move tag');
        }
    };
    
    return <Button onClick={() => handleMoveToRoot(5)}>Move to Root</Button>;
}
```

### **Move with context menu:**
```typescript
// In context menu handler
const handleMoveHere = async (targetTag: Tag, sourceTag: Tag) => {
    await moveTag.mutateAsync({
        tagId: sourceTag.tagId,
        newParentId: targetTag.tagId,
        newIndex: 0,
    });
};
```

---

## 🚀 Future Enhancements

### **Potential Improvements:**
1. **Optimistic Updates**: Cập nhật UI ngay lập tức trước khi API trả về
2. **Undo/Redo**: Cho phép hoàn tác move
3. **Batch Move**: Move nhiều tags cùng lúc
4. **Keyboard Shortcuts**: Ctrl+X, Ctrl+V để cut/paste tags
5. **Drag Preview**: Hiển thị preview của tag khi đang drag
6. **Drop Zone Highlighting**: Highlight rõ ràng drop zones

### **Performance Optimizations:**
1. Debounce move operations
2. Use virtual scrolling cho trees lớn
3. Lazy load children when expanded
4. Cache expanded states

---

## 🐛 Troubleshooting

### **Common Issues:**

**Problem**: Tree không cập nhật sau khi move
- **Solution**: Kiểm tra query invalidation trong `useMoveTag`
- **Check**: Console log để xem API response

**Problem**: Cannot move tags
- **Solution**: Kiểm tra validation logic trong `handleMove`
- **Check**: Console warnings về validation

**Problem**: Loading overlay không biến mất
- **Solution**: Đảm bảo `setIsDragging(false)` trong `finally` block
- **Check**: React Query mutation states

**Problem**: API returns 404
- **Solution**: Backend chưa implement `/move` endpoint
- **Check**: Fallback về update parentId đang hoạt động

---

## 📚 Related Documentation

- [React Arborist Docs](https://github.com/brimdata/react-arborist)
- [React DnD Docs](https://react-dnd.github.io/react-dnd/)
- [React Query Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)

---

**Last Updated**: January 2025  
**Status**: ✅ Fully Implemented & Ready for Testing
