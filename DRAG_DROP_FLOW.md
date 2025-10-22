# 🎬 Drag & Drop - Visual Flow Demo

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                         │
│  User grabs tag → Drags to new position → Drops             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  REACT-ARBORIST (DnD Library)               │
│  onMove({ dragIds, parentId, index })                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              TAGREE COMPONENT (handleMove)                   │
│  ┌───────────────────────────────────────────────┐          │
│  │ 1. Validation                                 │          │
│  │    ✓ Not workspace root (tagId < 0)?         │          │
│  │    ✓ Not moving to workspace root?           │          │
│  │    ✓ Not moving to itself?                   │          │
│  ├───────────────────────────────────────────────┤          │
│  │ 2. Set Loading State                          │          │
│  │    setIsDragging(true)                        │          │
│  ├───────────────────────────────────────────────┤          │
│  │ 3. Call Mutation                              │          │
│  │    moveTagMutation.mutateAsync({              │          │
│  │      tagId, newParentId, newIndex             │          │
│  │    })                                          │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            REACT QUERY HOOK (useMoveTag)                     │
│  mutationFn: tagService.moveTag(...)                         │
│  onSuccess: invalidate queries                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              TAG SERVICE (tagService.ts)                     │
│  ┌───────────────────────────────────────────────┐          │
│  │ async moveTag(tagId, newParentId, newIndex)  │          │
│  │   try:                                        │          │
│  │     PUT /api/tags/{tagId}/move                │          │
│  │   catch:                                      │          │
│  │     Fallback: PUT /api/tags/{tagId}           │          │
│  │              { parentId: newParentId }        │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                               │
│  PUT /api/tags/{tagId}/move                                  │
│  {                                                           │
│    parentId: 3,      // New parent ID (or null for root)    │
│    index: 0          // Position in children array          │
│  }                                                           │
│                                                              │
│  Backend Logic:                                              │
│  1. Update tag.parentId                                      │
│  2. Update tag.depth recursively                             │
│  3. Reorder siblings if needed                               │
│  4. Return updated TagDTO                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               REACT QUERY (Cache Update)                     │
│  onSuccess:                                                  │
│    - invalidateQueries(['tags', 'tree'])                     │
│    - invalidateQueries(['tags'])                             │
│    → Triggers automatic refetch                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    UI UPDATE                                 │
│  1. Tree refetches from backend                              │
│  2. New hierarchy is calculated                              │
│  3. Tree re-renders with updated structure                   │
│  4. setIsDragging(false) → Remove loading overlay            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual States

### **State 1: Normal (Ready to Drag)**
```
┌─────────────────────────────────┐
│ 📁 Workspace Root               │
│   ├─ 📋 Work                    │  ← Can drag
│   │  ├─ 📋 Projects             │  ← Can drag
│   │  └─ 📋 Meetings             │  ← Can drag
│   └─ 📋 Personal                │  ← Can drag
│      └─ 📋 Shopping             │  ← Can drag
└─────────────────────────────────┘
```

### **State 2: Dragging (User grabbed "Projects")**
```
┌─────────────────────────────────┐
│ 📁 Workspace Root               │
│   ├─ 📋 Work                    │
│   │  ├─ 📋 Projects  👆         │  ← Being dragged
│   │  └─ 📋 Meetings             │
│   └─ 📋 Personal   [DROP HERE] │  ← Drop zone
│      └─ 📋 Shopping             │
└─────────────────────────────────┘

[Loading Overlay]
┌────────────────────────┐
│  ⏳ Moving tag...      │
└────────────────────────┘
```

### **State 3: Success (Moved to Personal)**
```
┌─────────────────────────────────┐
│ 📁 Workspace Root               │
│   ├─ 📋 Work                    │
│   │  └─ 📋 Meetings             │
│   └─ 📋 Personal                │
│      ├─ 📋 Projects ✅          │  ← Moved here!
│      └─ 📋 Shopping             │
└─────────────────────────────────┘
```

---

## 🎭 Example Scenarios

### **Scenario 1: Move to Root Level**
```
Before:
  Work
    └─ Projects  ← Want to move this

After:
  Work
  Projects  ← Now at root level
```

**Code:**
```typescript
await moveTag.mutateAsync({
    tagId: 5,           // Projects
    newParentId: undefined,  // Root level
    newIndex: 1         // Second position
});
```

---

### **Scenario 2: Move Between Parents**
```
Before:
  Work
    └─ Projects  ← Move this
  Personal
    └─ Shopping

After:
  Work
  Personal
    ├─ Projects  ← Now here
    └─ Shopping
```

**Code:**
```typescript
await moveTag.mutateAsync({
    tagId: 5,           // Projects
    newParentId: 3,     // Personal
    newIndex: 0         // First child
});
```

---

### **Scenario 3: Reorder Siblings**
```
Before:
  Work
    ├─ Projects
    └─ Meetings  ← Move this up

After:
  Work
    ├─ Meetings  ← Now first
    └─ Projects
```

**Code:**
```typescript
await moveTag.mutateAsync({
    tagId: 7,           // Meetings
    newParentId: 2,     // Work (same parent)
    newIndex: 0         // First position
});
```

---

## 🚫 Validation Examples

### **❌ Cannot Move Workspace Root**
```typescript
handleMove({
    dragIds: ['-1'],  // Negative ID = workspace root
    parentId: '2',
    index: 0
});
// → Returns early with warning
// → No API call
```

### **❌ Cannot Move to Workspace Root**
```typescript
handleMove({
    dragIds: ['5'],
    parentId: '-1',  // Trying to move INTO workspace root
    index: 0
});
// → Returns early with warning
```

### **❌ Cannot Move to Self**
```typescript
handleMove({
    dragIds: ['5'],
    parentId: '5',  // Same as dragId
    index: 0
});
// → Returns early with warning
```

---

## 📝 Console Output Example

```
🔄 Tree Node Move Event: {
  draggedTagIds: ["5"],
  newParentId: "3",
  newIndex: 0
}

📦 Moving "Projects" to "Personal" at position 0

📤 Calling API to move tag: {
  tagId: 5,
  newParentId: 3,
  newIndex: 0
}

✅ Tag moved successfully
```

---

## 🎨 Loading Overlay Design

```
┌──────────────────────────────────────────┐
│                                          │
│      [Semi-transparent backdrop]         │
│                                          │
│         ┌──────────────────┐             │
│         │  ⏳  Moving...   │             │
│         │  [Spinner]       │             │
│         └──────────────────┘             │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

**CSS:**
- Backdrop: `rgba(0, 0, 0, 0.05)`
- Card: White background, shadow, rounded corners
- Spinner: Rotating border animation
- Z-index: 1000 (above tree)
- Pointer events: none (click-through)

---

## 🔍 Debug Tips

1. **Check Console Logs:**
   - "🔄 Tree Node Move Event" → Event triggered
   - "📦 Moving..." → Validation passed
   - "📤 Calling API..." → API call starting
   - "✅ Tag moved successfully" → All done

2. **Network Tab:**
   - Look for `PUT /api/tags/{id}/move`
   - Check request payload
   - Verify response status

3. **React DevTools:**
   - Check `isDragging` state
   - Check `moveTagMutation.isPending`
   - Inspect tree data changes

---

**Remember**: Drag & drop chỉ thay đổi **cấu trúc phân cấp**, không thay đổi nội dung của tags!
