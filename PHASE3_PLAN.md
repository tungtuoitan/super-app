# 🎯 Phase 3: Layout & Navigation Components

> **Status**: Ready to Start  
> **Timeline**: Estimated 3-4 sessions  
> **Components**: 6 major files  
> **Complexity**: Medium (mosaic layout decision required)

---

## 📊 Overview

**Phase 2 Recap** ✅:
- Migrated 9 VSCodeLayout components (100% Tailwind)
- Installed shadcn components: button, tabs, separator, scroll-area, tooltip
- Total code reduction: ~25% average
- Zero compilation errors

**Phase 3 Goals**:
- Complete all **Layout/** components
- Complete all **MainNav/** navigation components
- Decide on mosaic layout strategy
- Prepare for Phase 4 (features migration)

---

## 🎯 Migration Priority (Top → Bottom)

### 🔥 Priority 1: Simple Layout Components (Quick Wins)

#### 1. Main.tsx ✅ EASIEST (5 min)
**File**: `src/Components/Main.tsx`  
**Current**: `<Box>` wrapper  
**Target**: `<div className="...">`  
**Lines**: ~30 total  
**Complexity**: ⭐ Very Easy  
**Dependencies**: None

**Migration**:
```tsx
// Before
<Box sx={{ width: '100%', height: '100%' }}>
  {children}
</Box>

// After
<div className="w-full h-full">
  {children}
</div>
```

---

#### 2. TagsPanelReal.tsx ✅ EASY (15 min)
**File**: `src/Components/Layout/TagsPanelReal.tsx`  
**Current**: MUI Paper, Box, Typography, List, Chip  
**Lines**: 132 total  
**Complexity**: ⭐⭐ Easy  
**Dependencies**: 
- shadcn card (for Paper)
- shadcn badge (for Chip)
- shadcn alert (for error state)

**Migration Plan**:
1. Install shadcn components:
   ```bash
   npx shadcn@latest add card badge alert
   ```
2. Replace MUI imports:
   - `Paper` → `Card`
   - `Chip` → `Badge`
   - `CircularProgress` → `lucide-react Loader2` icon
   - `Alert` → shadcn `Alert`
3. Tailwind layout classes for Box/Typography

**Example**:
```tsx
// Before
<Paper sx={{ height: '100%', p: 2 }}>
  <Typography variant="h6">Tags</Typography>
  <Chip label={tag.name} />
</Paper>

// After
<Card className="h-full p-6">
  <h2 className="text-lg font-semibold mb-4">Tags</h2>
  <Badge>{tag.name}</Badge>
</Card>
```

---

### 🔶 Priority 2: Navigation Components (Medium)

#### 3. TopNav.tsx (Breadcrumbs) - MEDIUM (20 min)
**File**: `src/Components/TopNav.tsx`  
**Current**: MUI AppBar, Breadcrumbs, Toolbar  
**Lines**: ~50 total  
**Complexity**: ⭐⭐⭐ Medium  
**Dependencies**:
- shadcn breadcrumb (install required)

**Migration Plan**:
1. Install shadcn breadcrumb:
   ```bash
   npx shadcn@latest add breadcrumb
   ```
2. Replace AppBar with Tailwind nav
3. Use shadcn Breadcrumb component
4. Replace ExpandMoreIcon with lucide-react ChevronDown

**Example**:
```tsx
// Before
<AppBar position="static">
  <Toolbar>
    <Breadcrumbs separator={<ExpandMoreIcon />}>
      <Link>Home</Link>
      <Link>Notes</Link>
    </Breadcrumbs>
  </Toolbar>
</AppBar>

// After
<nav className="bg-[rgb(30,30,30)] border-b border-white/10">
  <Breadcrumb>
    <BreadcrumbItem>Home</BreadcrumbItem>
    <BreadcrumbSeparator><ChevronDown /></BreadcrumbSeparator>
    <BreadcrumbItem>Notes</BreadcrumbItem>
  </Breadcrumb>
</nav>
```

---

#### 4. MainNav Sidebar (SideMenu + SideMenuItem) - MEDIUM (30 min)
**Files**: 
- `src/Components/MainNav/MainNav.tsx`
- `src/Components/MainNav/SideMenu.tsx`
- `src/Components/MainNav/SideMenuItem.tsx`
- `src/Components/MainNav/AllIcon.tsx`

**Current**: MUI Box, Tooltip, IconButton, 60+ MUI icons  
**Lines**: ~400 total across 4 files  
**Complexity**: ⭐⭐⭐ Medium (many icons)  
**Dependencies**:
- shadcn tooltip (already installed ✅)
- lucide-react icons (already installed ✅)

**Migration Plan**:
1. Replace AllIcon.tsx MUI icons with lucide-react equivalents:
   - `HomeIcon` → `<Home />` (lucide)
   - `FolderIcon` → `<Folder />` (lucide)
   - `EditNoteIcon` → `<FileEdit />` (lucide)
   - etc. (see icon mapping table below)

2. Migrate SideMenuItem.tsx:
   - Remove `<Tooltip>` from MUI
   - Use shadcn Tooltip (already installed)
   - Tailwind classes for hover/active states

3. Migrate SideMenu.tsx:
   - Replace toggle icons with lucide-react:
     - `KeyboardDoubleArrowLeftOutlinedIcon` → `<ChevronsLeft />`
     - `KeyboardDoubleArrowRightOutlinedIcon` → `<ChevronsRight />`
   - Tailwind for collapsible animation

4. Migrate MainNav.tsx:
   - Replace `<Box>` container with Tailwind div
   - Keep routing logic unchanged

**Icon Mapping (MUI → lucide-react)**:
| MUI Icon | lucide-react Equivalent |
|----------|-------------------------|
| `HomeIcon` | `Home` |
| `FolderIcon` | `Folder` |
| `EditNoteIcon` | `FileEdit` |
| `CalendarMonthIcon` | `Calendar` |
| `CodeIcon` | `Code` |
| `LibraryBooksIcon` | `Library` |
| `LinkIcon` | `Link` |
| `HelpIcon` | `HelpCircle` |
| `BlockIcon` | `Ban` |
| `ArrowForwardIcon` | `ArrowRight` |

---

### 🔴 Priority 3: Complex Layout (Decision Required)

#### 5. FlexibleLayout.tsx (Mosaic) - COMPLEX (Decision Required)
**File**: `src/Components/Layout/FlexibleLayout.tsx`  
**Current**: react-mosaic-component (drag-drop resizable panels)  
**Lines**: 220 total  
**Complexity**: ⭐⭐⭐⭐⭐ Very Complex  
**Decision Required**: Keep mosaic or migrate to shadcn resizable?

**Option A: Keep react-mosaic-component (RECOMMENDED)**
- ✅ Pros:
  - Already working, mature library
  - Complex drag-drop logic already implemented
  - ~200 lines of code, tested and stable
  - No need to rebuild from scratch
- ❌ Cons:
  - Not shadcn/Tailwind native
  - Requires custom CSS (`FlexibleLayout.css`)

**Migration if keeping mosaic**:
- Replace `<Box>` wrappers with Tailwind divs
- Keep Mosaic components unchanged
- Style MosaicWindow with Tailwind classes
- Minimal changes (~30 min)

**Option B: Migrate to @radix-ui/react-resizable (shadcn)**
- ✅ Pros:
  - Fully Tailwind/shadcn native
  - Consistent with rest of app
- ❌ Cons:
  - Need to rebuild drag-drop logic (200+ lines)
  - Testing required (complex interactions)
  - Higher risk of bugs
  - Time: 2-3 hours

**🎯 RECOMMENDATION**: **Keep react-mosaic-component** (Option A)
- Migration cost/benefit ratio not favorable
- Focus effort on higher-value components (features/)
- Can revisit in future if shadcn adds native mosaic support

---

## 📦 shadcn Components to Install (Phase 3)

```bash
# For TagsPanelReal.tsx
npx shadcn@latest add card       # Replace Paper
npx shadcn@latest add badge      # Replace Chip
npx shadcn@latest add alert      # Error states

# For TopNav.tsx
npx shadcn@latest add breadcrumb # Navigation breadcrumbs

# Already installed (Phase 2):
# ✅ tooltip (for MainNav)
# ✅ button
# ✅ tabs
# ✅ separator
# ✅ scroll-area
```

---

## 🗂️ Migration Order (Recommended)

### Session 1: Quick Wins (1 hour)
1. ✅ Main.tsx (5 min)
2. ✅ Install shadcn components: card, badge, alert (5 min)
3. ✅ TagsPanelReal.tsx (15 min)
4. ✅ Install breadcrumb component (5 min)
5. ✅ TopNav.tsx (20 min)
6. ⚠️ Test compilation + visual verification (10 min)

### Session 2: Navigation (1 hour)
1. ✅ Map all MUI icons to lucide-react (10 min)
2. ✅ AllIcon.tsx - replace icon imports (15 min)
3. ✅ SideMenuItem.tsx - shadcn tooltip + Tailwind (10 min)
4. ✅ SideMenu.tsx - collapse icons + Tailwind (10 min)
5. ✅ MainNav.tsx - container migration (5 min)
6. ⚠️ Test navigation + tooltips (10 min)

### Session 3: Mosaic Decision (30 min)
1. 🤔 User decision: Keep mosaic or migrate?
2. ✅ If keep: Simple wrapper migration (30 min)
3. ⏳ If migrate: Complex rebuild (2-3 hours, separate session)

---

## ✅ Phase 3 Completion Criteria

- [ ] All Layout/ components 100% Tailwind (except mosaic if kept)
- [ ] All MainNav/ components 100% Tailwind
- [ ] Zero MUI imports in migrated files
- [ ] All icons from lucide-react
- [ ] No TypeScript errors
- [ ] No compilation errors
- [ ] Visual regression test passed
- [ ] Navigation tooltips work correctly
- [ ] Breadcrumbs render correctly
- [ ] TagsPanel displays tags correctly

---

## 🚀 Ready to Start?

**Recommended First Step**: Session 1 (Quick Wins)

Would you like to start with:
1. **Main.tsx** (5 min warm-up)
2. **TagsPanelReal.tsx** (15 min)
3. **TopNav.tsx** (20 min)

Or do you want to proceed with a different order?

---

## 📝 Notes

**Why Not features/ in Phase 3?**
- features/ has 40+ components (notes + tags)
- Requires separate phased approach:
  - Phase 4A: Toolbars (search, filter, actions)
  - Phase 4B: Dialogs (create, edit, delete)
  - Phase 4C: Forms (inputs, validation)
  - Phase 4D: Misc (panels, grids, etc.)
- Each sub-phase = 1-2 sessions

**After Phase 3**: 
- All **layout infrastructure** will be Tailwind ✅
- Ready to tackle **feature components** systematically
- Estimated 60-70% total migration complete

---

**Questions Before Starting Phase 3?**
