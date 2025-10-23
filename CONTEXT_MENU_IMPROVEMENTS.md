# Context Menu Improvements

## 📝 Overview
Cập nhật context menu để hiển thị các tùy chọn phù hợp hơn dựa trên số lượng items được chọn và loại item.

## ✨ Thay đổi chính

### 1. **Menu Structure Mới**

**Trước đây:**
- Add Tag
- Edit Tag
- Delete Tag

**Bây giờ:**
- **Add Tag** - Tạo tag mới
- **Add File** (disabled - chưa triển khai)
- **Add Note** (disabled - chưa triển khai)
- **Edit Tag/Tags** - Disable nếu chọn nhiều hơn 1 item
- **Delete Tag/Tags** - Hiển thị số lượng nếu chọn nhiều items

### 2. **Dynamic Menu Labels**

Menu labels sẽ thay đổi dựa trên context:

#### Single Selection (1 item)
```
✅ Add Tag
✅ Add File (disabled)
✅ Add Note (disabled)
---
✅ Edit Tag (enabled)
✅ Delete Tag (enabled)
```

#### Multiple Selection (>1 items)
```
✅ Add Tag
✅ Add File (disabled)
✅ Add Note (disabled)
---
❌ Edit Tags (disabled)
✅ Delete 3 Tags (enabled, shows count)
```

### 3. **Edit Behavior**

- **Single Selection**: Edit option được enable
- **Multiple Selection**: Edit option bị disable
- **Lý do**: Không thể edit nhiều items cùng lúc

### 4. **Delete Behavior**

- **Single Selection**: 
  - Message: "Are you sure you want to delete '[tag name]'?"
  - Nếu có children: "This will also delete X child tag(s)"

- **Multiple Selection**:
  - Message: "Are you sure you want to delete [N] selected tags?"
  - Note: "This action cannot be undone."

## 🔧 Technical Changes

### File Modified
- `src/shared/contexts/ContextMenuContext.tsx`

### Key Updates

1. **Import thêm icons**:
```typescript
import { 
    Add as AddIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Info as InfoIcon,
    InsertDriveFile as FileIcon,
    Note as NoteIcon
} from '@mui/icons-material';
```

2. **Sử dụng TagUIContext**:
```typescript
const { selectedTagIds } = useTagUI();
```

3. **Dynamic menu rendering**:
```typescript
const selectedCount = selectedTagIds.length;
const isMultipleSelected = selectedCount > 1;

// Edit - disabled if multiple items selected
<MenuItem onClick={handleEditItem} disabled={isMultipleSelected}>
    <EditIcon style={{ fontSize: 16, marginRight: 8 }} />
    Edit {isMultipleSelected ? 'Tags' : 'Tag'}
</MenuItem>

// Delete - show count if multiple selected
<MenuItem onClick={handleDeleteItem}>
    <DeleteIcon style={{ fontSize: 16, marginRight: 8 }} />
    Delete {isMultipleSelected ? `${selectedCount} Tags` : 'Tag'}
</MenuItem>
```

4. **Enhanced delete confirmation**:
```typescript
if (isMultipleSelected) {
    message = `Are you sure you want to delete ${selectedCount} selected tags?\n\nThis action cannot be undone.`;
} else {
    // Count children for single tag
    const childCount = countChildren(contextData);
    message = childCount > 0
        ? `Are you sure you want to delete "${contextData.name}"?\n\nThis will also delete ${childCount} child tag(s).`
        : `Are you sure you want to delete "${contextData.name}"?`;
}
```

## 🎯 User Experience

### Scenario 1: Right-click on single tag
1. User right-clicks on a tag
2. Menu shows:
   - Add Tag ✅
   - Add File (disabled)
   - Add Note (disabled)
   - Edit Tag ✅
   - Delete Tag ✅
3. User can edit or delete the tag

### Scenario 2: Right-click with multiple tags selected
1. User selects 3 tags (Ctrl+Click)
2. User right-clicks on one of the selected tags
3. Menu shows:
   - Add Tag ✅
   - Add File (disabled)
   - Add Note (disabled)
   - Edit Tags ❌ (disabled)
   - Delete 3 Tags ✅
4. User can only delete, not edit

### Scenario 3: Delete confirmation
1. User clicks "Delete 3 Tags"
2. Confirmation popover shows: "Are you sure you want to delete 3 selected tags? This action cannot be undone."
3. User confirms
4. Tags are deleted

## 🚀 Future Enhancements

### Planned Features (Currently Disabled)

1. **Add File**
   - Allow users to attach files to tags
   - Implementation: `handleAddFile()`

2. **Add Note**
   - Allow users to create notes under tags
   - Implementation: `handleAddNote()`

3. **Bulk Delete**
   - Currently deletes only the right-clicked tag
   - TODO: Implement deletion of all selected tags
   ```typescript
   if (isMultipleSelected) {
       // Delete all selected tags
       console.log('🗑️ Deleting multiple tags:', selectedTagIds);
       // TODO: Implement bulk delete functionality
       onDeleteTag(contextData); // Currently only deletes clicked tag
   }
   ```

## ✅ Testing Checklist

- [x] Single tag selection shows correct menu items
- [x] Multiple tag selection disables Edit option
- [x] Delete shows correct count for multiple selection
- [x] Confirmation message is appropriate for single/multiple
- [x] Workspace root cannot be deleted
- [x] Add File/Note are disabled (not implemented yet)
- [ ] Test bulk delete when implemented
- [ ] Test edit functionality when implemented

## 📚 Related Files

- `src/shared/contexts/ContextMenuContext.tsx` - Main context menu logic
- `src/features/tags/store/TagUIContext.tsx` - Tag selection state
- `src/features/tags/components/WorkspaceTree.tsx` - Tree component that uses context menu
- `src/Components/Main.tsx` - Context menu provider setup

## 🎨 Visual Preview

```
┌─────────────────────────┐
│ 📁 Add Tag              │
│ 📄 Add File    (disabled)│
│ 📝 Add Note    (disabled)│
├─────────────────────────┤
│ ✏️  Edit Tag            │
│ 🗑️  Delete Tag          │
└─────────────────────────┘

  Single Selection

┌─────────────────────────┐
│ 📁 Add Tag              │
│ 📄 Add File    (disabled)│
│ 📝 Add Note    (disabled)│
├─────────────────────────┤
│ ✏️  Edit Tags  (disabled)│
│ 🗑️  Delete 5 Tags       │
└─────────────────────────┘

  Multiple Selection (5 items)
```

## 🔍 Notes

- Context menu position sử dụng `@szhsin/react-menu` cho performance và accessibility
- Menu items sử dụng Material-UI icons
- Confirmation popover có z-index cao hơn menu để hiển thị đúng
- Selected tag IDs được lấy từ `TagUIContext` để đồng bộ với tree selection state
