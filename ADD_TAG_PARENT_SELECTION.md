# 🎯 Add Tag Parent Selection - VS Code-like UX

## 📋 Overview

This document describes the VS Code-like parent selection behavior when adding tags to workspace. The system automatically determines the parent tag based on user selection, similar to how VS Code creates files/folders.

## ✨ Key Features

### 1. **Smart Parent Detection**
- When user clicks "Add Tag" button, system uses **currently selected tag** as parent
- If no tag is selected → creates tag at **root level**
- Matches VS Code behavior for creating files/folders

### 2. **Context Menu Integration**
- Right-click on any tag → "Add Tag" creates child tag
- Parent tag is automatically set to the right-clicked tag
- Clear visual feedback showing parent relationship

### 3. **Visual Parent Indicator**
- Dialog title shows parent tag name: `"Add Tag to 'Parent Name'"`
- Info alert displays parent tag with color chip
- Root level clearly indicated: `"Will be added at the root level (no parent)"`

## 🏗️ Architecture

### State Flow

```
User Action
    ↓
Context Menu / Toolbar Button
    ↓
TagUIContext.openCreateDialog(parentTag?)
    ↓
AddTagDialog receives parentTagId
    ↓
Finds parent tag info from workspace tree
    ↓
Displays parent tag chip & name
    ↓
API call with correct parentTagId
```

### Components Involved

1. **TagTree.tsx**
   - Handles toolbar "Add Tag" button
   - Detects selected tag and passes to `openCreateDialog()`
   - Renders `AddTagDialog` with context state

2. **TagUIContext.tsx**
   - Manages create dialog state
   - Stores `parentTagForCreate` (Tag object)
   - Provides `openCreateDialog()` and `closeCreateDialog()`

3. **AddTagDialog.tsx**
   - Receives `parentTagId` prop
   - Finds parent tag object from workspace tree
   - Displays parent info with chip
   - Sends correct `parentTagId` to API

4. **ContextMenuContext.tsx**
   - Handles right-click menu
   - Passes clicked tag as parent to `onCreateTag` callback
   - Wired to `TagUIContext.openCreateDialog()`

## 🎨 User Experience

### Scenario 1: Add Tag with Selection

```
1. User selects tag "Work Projects" in tree
2. User clicks "Add Tag" toolbar button
3. Dialog opens: "Add Tag to 'Work Projects'"
4. Info shows: "Will be added under: [Work Projects]"
5. User creates tag "Q1 2024"
6. New tag appears as child of "Work Projects"
```

### Scenario 2: Add Tag without Selection

```
1. User clicks "Add Tag" with nothing selected
2. Dialog opens: "Add Tag to Workspace"
3. Info shows: "Will be added at the root level (no parent)"
4. User creates tag "Personal"
5. New tag appears at root level
```

### Scenario 3: Context Menu

```
1. User right-clicks on tag "Design"
2. Selects "Add Tag" from context menu
3. Dialog opens: "Add Tag to 'Design'"
4. Parent automatically set to "Design"
5. Creates child tag under "Design"
```

## 💻 Code Examples

### Opening Create Dialog

```typescript
// From toolbar button - uses selected tag
const handleNewFolder = () => {
    const parentId = selectedTagIds.length > 0 
        ? selectedTagIds[0] 
        : undefined;
        
    const parentTag = parentId 
        ? findTagById(tags || [], parentId)
        : undefined;
        
    openCreateDialog(parentTag); // Pass Tag object
};

// From context menu - uses right-clicked tag
const handleContextMenuCreate = (tag: Tag) => {
    openCreateDialog(tag); // Pass Tag object directly
};
```

### Dialog Parent Display

```typescript
// Find parent tag info
const parentTag = React.useMemo(() => {
    if (!parentTagId || !workspaceTree?.tags) return null;
    
    function findTag(tags: Tag[], targetId: number): Tag | null {
        for (const tag of tags) {
            if (tag.tagId === targetId) return tag;
            if (tag.children && tag.children.length > 0) {
                const found = findTag(tag.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }
    
    return findTag(workspaceTree.tags, parentTagId);
}, [parentTagId, workspaceTree]);

// Display parent info
{parentTag ? (
    <Alert severity="info">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">Will be added under:</Typography>
            <Chip 
                size="small"
                label={parentTag.name}
                sx={{ 
                    backgroundColor: parentTag.color,
                    color: 'white',
                }}
            />
        </Box>
    </Alert>
) : (
    <Alert severity="info">
        <Typography variant="body2">
            Will be added at the root level (no parent)
        </Typography>
    </Alert>
)}
```

## 🔧 Implementation Details

### TagUIContext State

```typescript
interface TagUIContextValue {
    // Create dialog state
    isCreateDialogOpen: boolean;
    openCreateDialog: (parentTag?: Tag) => void;
    closeCreateDialog: () => void;
    parentTagForCreate: Tag | null; // Stores parent Tag object
}
```

### Dialog Props

```typescript
interface AddTagDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    parentTagId?: number | null; // Parent tag ID from context
}
```

## ✅ Benefits

1. **Intuitive UX**: Matches familiar VS Code behavior
2. **Less Clicks**: No need to manually select parent dropdown
3. **Visual Feedback**: Clear indication of parent relationship
4. **Flexible**: Works with both toolbar and context menu
5. **Smart Defaults**: Root level when nothing selected

## 🚀 Future Enhancements

1. **Keyboard Shortcut**: `Ctrl+Shift+N` to create tag under selected
2. **Drag & Drop**: Drag to reparent tags
3. **Breadcrumb Display**: Show full parent path in dialog
4. **Quick Create**: Inline tag creation in tree
5. **Template Tags**: Create from predefined templates

## 📖 Related Documentation

- [TAG_TREE_IMPLEMENTATION.md](./docs/tag_tree_feature.md) - Tag tree architecture
- [STATE_MANAGEMENT.md](./docs/STATE_MANAGEMENT.md) - Context patterns
- [COMPONENT_PATTERNS.md](./docs/COMPONENT_PATTERNS.md) - Dialog patterns

## 🎓 VS Code Inspiration

This feature is inspired by VS Code's folder/file creation:
- Selected item becomes parent for new items
- Right-click menu for quick creation
- Clear visual feedback
- Smart defaults (root when nothing selected)

---

**Last Updated**: 2024-01-21  
**Status**: ✅ Implemented  
**Pattern**: Centralized Context + Smart Defaults
