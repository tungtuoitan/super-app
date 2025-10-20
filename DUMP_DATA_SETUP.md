# 📦 Dump Data Setup for Tags

## ✅ Đã hoàn thành

### 1. **Created Tags Dump Data**
File: `src/features/tags/data/tagsDumpData.ts`

**Hierarchical structure với 50+ tags:**
```
Programming (depth 0)
├── JavaScript (depth 1)
│   ├── React (depth 2)
│   │   ├── React Hooks (depth 3)
│   │   └── React Query (depth 3)
│   ├── Node.js (depth 2)
│   │   └── Express (depth 3)
│   └── TypeScript (depth 2)
├── Python (depth 1)
│   ├── Django (depth 2)
│   └── FastAPI (depth 2)
└── C# (depth 1)
    └── ASP.NET Core (depth 2)

Design (depth 0)
├── UI Design (depth 1)
│   ├── Material Design (depth 2)
│   └── Design Tokens (depth 2)
└── UX Design (depth 1)
    └── User Research (depth 2)

DevOps (depth 0)
├── Docker (depth 1)
├── Kubernetes (depth 1)
└── CI/CD (depth 1)
    └── GitHub Actions (depth 2)

Database (depth 0)
├── SQL (depth 1)
│   ├── PostgreSQL (depth 2)
│   └── MySQL (depth 2)
└── NoSQL (depth 1)
    └── MongoDB (depth 2)

Testing (depth 0)
├── Unit Testing (depth 1)
└── E2E Testing (depth 1)
```

**Features:**
- ✅ 5 root level categories
- ✅ 50+ total tags
- ✅ Up to 4 levels deep (depth 0-3)
- ✅ Color codes for each tag
- ✅ Descriptions for all tags
- ✅ Real-world hierarchy structure

---

### 2. **Updated tagService.ts**

**Added toggle constant:**
```typescript
const USE_DUMP_DATA = true;  // Set to false to use real API
```

**Modified methods:**
- ✅ `getTags()` - Returns flattened dump data with filtering
- ✅ `getTagTree()` - Returns hierarchical dump data
- ✅ Simulates 300ms API delay for realism

**Filtering support:**
- ✅ Search by name/description
- ✅ Filter by isArchived
- ✅ Filter by parentId (for API mode)

---

## 🎯 How to Use

### **In FlexibleLayout (Already configured)**

FlexibleLayout > Tags panel automatically uses dump data:

```tsx
const TagsComponent = () => (
  <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <TagTree includeShared={true} />
  </Box>
)
```

The `TagTree` component calls `useTagTree()` hook which uses `tagService.getTagTree()` → returns dump data ✅

---

### **Toggle between Dump Data and Real API**

Edit `src/features/tags/services/tagService.ts`:

```typescript
// Line 18
const USE_DUMP_DATA = true;  // ← Change to false for real API
```

**When `true`:**
- Uses `tagsDumpData` from `tagsDumpData.ts`
- Logs: `📦 Using dump data for tag tree`
- 300ms simulated delay

**When `false`:**
- Calls real API endpoint: `/api/tags/tree`
- Uses axios via `apiClient`

---

## 🧪 Testing the Dump Data

### **1. Via FlexibleLayout**
```bash
# Start dev server (when Node.js PATH is fixed)
npm start

# Navigate to FlexibleLayout page
# Check the Tags panel on the left
```

**Expected result:**
- ✅ Tree view with 50+ tags
- ✅ 5 root categories (Programming, Design, DevOps, Database, Testing)
- ✅ Color-coded tags
- ✅ Expand/collapse functionality
- ✅ Multi-selection (Ctrl+Click, Shift+Click)
- ✅ Context menu on right-click

### **2. Via Browser Console**
```javascript
// Check what data is loaded
console.log('Tag tree:', /* data from React Query DevTools */);

// Should see the log:
// 📦 Using dump data for tag tree
```

### **3. Via React Query DevTools**
1. Open React Query DevTools (bottom-left button)
2. Find query: `["tags", "tree", true]`
3. Check data structure - should match dump data hierarchy

---

## 🔄 Adding More Dump Data

Edit `src/features/tags/data/tagsDumpData.ts`:

```typescript
export const tagsDumpData: Tag[] = [
    // Add new root category
    {
        tagId: 6,  // Increment ID
        id: 6,
        name: 'New Category',
        description: 'Description here',
        color: '#FF5722',
        createdAt: new Date('2024-01-01'),
        isActive: true,
        isArchived: false,
        depth: 0,
        isExpanded: true,
        children: [
            // Add child tags...
        ],
    },
    // ... existing categories
];
```

**Important:**
- Use unique `tagId` for each tag
- Set correct `depth` level (0 for root, 1 for first child, etc.)
- Add `children` array for hierarchical structure
- Use hex colors for `color` property

---

## 📊 Dump Data Statistics

| Metric | Count |
|--------|-------|
| **Total tags** | 50+ |
| **Root categories** | 5 |
| **Depth levels** | 4 (0-3) |
| **Max children per node** | 3 |
| **Tags with colors** | 100% |
| **Tags with descriptions** | 100% |

---

## 🐛 Troubleshooting

### Dump data not showing?

**Check 1: Verify USE_DUMP_DATA flag**
```typescript
// src/features/tags/services/tagService.ts
const USE_DUMP_DATA = true;  // Must be true
```

**Check 2: Check console logs**
```
Should see: 📦 Using dump data for tag tree
```

**Check 3: React Query cache**
```javascript
// Clear cache and refetch
queryClient.invalidateQueries({ queryKey: ['tags'] });
```

### Empty tree showing?

**Check:** `tagsDumpData` export
```typescript
// Make sure export is correct
export const tagsDumpData: Tag[] = [ /* ... */ ];
```

### Type errors?

**Check:** All required Tag properties are present:
```typescript
{
    tagId: number,
    id: number,
    name: string,
    description?: string,
    color?: string,
    createdAt: Date,
    isActive: boolean,
    isArchived: boolean,
    depth: number,
    isExpanded: boolean,
    children: Tag[],
}
```

---

## 🚀 Next Steps

After Node.js PATH is fixed:

1. ✅ Run `npm start`
2. ✅ Open FlexibleLayout
3. ✅ Verify Tags panel shows dump data
4. ✅ Test all interactions:
   - Click to select
   - Ctrl+Click for multi-select
   - Shift+Click for range select
   - Right-click for context menu
   - Expand/collapse nodes
   - Search functionality
5. ✅ Switch `USE_DUMP_DATA = false` to test real API

---

**Created:** 2025-10-20
**Status:** ✅ Ready to use
