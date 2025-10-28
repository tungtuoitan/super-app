# ClickUp Component Patterns & Style Guide

> **Last Updated**: January 2025
> **Purpose**: Reusable patterns for migrating components to ClickUp theme + shadcn/ui

---

## 📋 Table of Contents

1. [Card-Based Layouts](#card-based-layouts)
2. [Form Fields with MUI Components](#form-fields-with-mui-components)
3. [Header Patterns](#header-patterns)
4. [Color Usage Guidelines](#color-usage-guidelines)
5. [Component Checklist](#component-checklist)

---

## 🎴 Card-Based Layouts

### Pattern: Two-Column Card Layout with Accent Borders

**Use Case**: Detail views, form sections, settings pages

**Example**: `NoteDetailDialogContent.tsx`

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Left Card - Blue Accent */}
    <Card className="border-clickup-blue/20 hover:border-clickup-blue/40 transition-colors">
        <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-clickup-blue" />
                Section Title
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Content here */}
        </CardContent>
    </Card>

    {/* Right Card - Pink Accent */}
    <Card className="border-clickup-pink/20 hover:border-clickup-pink/40 transition-colors">
        <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-clickup-pink" />
                Metadata
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Content here */}
        </CardContent>
    </Card>
</div>
```

**Key Features:**
- ✅ Responsive: 2 columns on large screens, 1 column on mobile
- ✅ Accent borders with opacity (20% default, 40% on hover)
- ✅ Colored icons matching border accent
- ✅ Consistent padding with `pb-3` on header
- ✅ `space-y-4` for consistent vertical spacing

---

### Pattern: Full-Width Content Card

**Use Case**: Text areas, rich content sections

```tsx
<Card className="border-primary/20 hover:border-primary/40 transition-colors">
    <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Description
        </CardTitle>
    </CardHeader>
    <CardContent>
        <Textarea
            value={value}
            onChange={handleChange}
            placeholder="Enter description..."
            className="min-h-[200px] resize-none font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
            {value?.length || 0} characters
        </p>
    </CardContent>
</Card>
```

**Key Features:**
- ✅ Primary purple accent for main content
- ✅ Monospace font for code/technical content
- ✅ Character counter for feedback
- ✅ Fixed minimum height prevents jumping

---

## 📝 Form Fields with MUI Components

### Problem: MUI Components in Dark Theme

When using legacy MUI components (GenericTextField, GenericAutoComplete) within ClickUp theme, text colors may be hard to read.

### Solution: sx Prop Overrides

**Pattern 1: Editable Fields**

```tsx
<GenericTextField
    label="Field Label"
    value={value}
    onChange={handleChange}
    size="small"
    sx={{
        '& .MuiInputBase-root': {
            color: 'hsl(var(--foreground))',
            backgroundColor: 'hsl(var(--input))',
        },
        '& .MuiInputLabel-root': {
            color: 'hsl(var(--muted-foreground))',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'hsl(var(--border))',
        },
    }}
/>
```

**Pattern 2: Disabled/Read-Only Fields**

```tsx
<GenericTextField
    label="Created"
    value={createdDate}
    disabled
    size="small"
    sx={{
        '& .MuiInputBase-root': {
            color: 'hsl(var(--muted-foreground))',
            backgroundColor: 'hsl(var(--muted))',
        },
        '& .MuiInputLabel-root': {
            color: 'hsl(var(--muted-foreground))',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'hsl(var(--border))',
        },
    }}
/>
```

**Pattern 3: Autocomplete with Tags**

```tsx
<GenericTagAutoComplete
    options={options}
    value={selectedTags}
    onChange={handleChange}
    label="Tags"
    size="small"
    sx={{
        '& .MuiInputBase-root': {
            color: 'hsl(var(--foreground))',
            backgroundColor: 'hsl(var(--input))',
        },
        '& .MuiInputLabel-root': {
            color: 'hsl(var(--muted-foreground))',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'hsl(var(--border))',
        },
        '& .MuiChip-root': {
            color: 'hsl(var(--foreground))',
            backgroundColor: 'hsl(var(--primary))',
        },
    }}
/>
```

**Why These Colors?**
- `--foreground`: Main text color (readable on dark backgrounds)
- `--input`: Input field background (distinct from card background)
- `--muted-foreground`: Secondary text (labels, disabled text)
- `--muted`: Muted background (for disabled fields)
- `--border`: Consistent border color across all inputs
- `--primary`: Brand purple for chips/tags

---

## 🎯 Header Patterns

### Pattern: Icon + Title Header with Badge

**Use Case**: Detail pages, dialog headers

```tsx
<div className="border-b border-editor-border pb-4">
    <div className="flex items-start gap-3">
        {/* Icon Container */}
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-foreground mb-2">
                {title || 'Untitled'}
            </h2>
            <div className="flex items-center gap-2">
                <Badge variant={isArchived ? "secondary" : "default"} className="text-xs">
                    {isArchived ? 'Archived' : 'Active'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                    ID: {id || '0'}
                </span>
            </div>
        </div>
    </div>
</div>
```

**Key Features:**
- ✅ `items-start`: Proper vertical alignment for multi-line titles
- ✅ `flex-shrink-0`: Icon container never shrinks
- ✅ `min-w-0`: Prevents text overflow issues
- ✅ `mb-2`: Consistent spacing between title and metadata
- ✅ Border bottom with theme color

**Common Mistakes to Avoid:**
- ❌ `items-center` - Causes misalignment with long titles
- ❌ Missing `flex-shrink-0` - Icon container collapses
- ❌ Missing `min-w-0` - Text doesn't truncate properly

---

## 🎨 Color Usage Guidelines

### ClickUp Accent Colors

| Color | Tailwind Class | Use Case | Example |
|-------|---------------|----------|---------|
| **Purple** | `primary` | Primary actions, main content | Primary buttons, main icons |
| **Blue** | `clickup-blue` | Information, details | Info cards, detail sections |
| **Pink** | `clickup-pink` | Metadata, secondary info | Metadata cards, timestamps |
| **Yellow** | `clickup-yellow` | Warnings, highlights | Warning alerts, important notes |

### Opacity Patterns

```tsx
// Borders
className="border-clickup-blue/20"           // Default state (subtle)
className="hover:border-clickup-blue/40"     // Hover state (more visible)

// Backgrounds
className="bg-primary/10"                    // Icon containers (very subtle)
className="bg-clickup-pink/10"               // Alert backgrounds (very subtle)

// Text
className="text-clickup-blue"                // Full opacity for icons/text
```

### Semantic Color Usage

```tsx
// Cards grouped by function
<Card className="border-clickup-blue/20">    // Details/Information
<Card className="border-clickup-pink/20">    // Metadata/Timestamps
<Card className="border-primary/20">         // Main Content/Description
<Card className="border-clickup-yellow/20">  // Warnings/Important Notes
```

---

## ✅ Component Checklist

### Before Submitting a Migrated Component

#### Structure
- [ ] Removed all MUI imports (Box, Typography, Grid, etc.)
- [ ] Using shadcn components (Card, Button, Badge, etc.)
- [ ] Tailwind classes for all layouts
- [ ] Proper ScrollArea usage for scrollable content

#### Colors
- [ ] Applied ClickUp accent colors (blue, pink, yellow, purple)
- [ ] Used theme variables instead of hardcoded colors
- [ ] MUI components have sx prop overrides
- [ ] Text is readable in dark mode

#### Layout
- [ ] Responsive grid (grid-cols-1 lg:grid-cols-2)
- [ ] Consistent spacing (gap-6, space-y-4)
- [ ] Proper vertical alignment (items-start for headers)
- [ ] Cards have hover effects (border opacity transitions)

#### Icons
- [ ] Using lucide-react icons
- [ ] Icons match their card's accent color
- [ ] Icon containers have `flex-shrink-0`
- [ ] Consistent icon sizing (w-5 h-5 for headers, w-6 h-6 for main)

#### Typography
- [ ] Headers use proper hierarchy (text-2xl, text-lg)
- [ ] Consistent text colors (text-foreground, text-muted-foreground)
- [ ] Proper font weights (font-bold for headers)

#### Accessibility
- [ ] Labels are properly associated with inputs
- [ ] Disabled states are visually distinct
- [ ] Focus states are visible
- [ ] Semantic HTML (h2 for titles, p for descriptions)

---

## 📚 Component Examples

### Example 1: NoteDetailDialogContent ✅

**Location**: `src/features/notes/components/dialogs/NoteDetailDialogContent.tsx`

**Features**:
- Modern card-based layout
- Three-section design (header, two-column, full-width)
- ClickUp accent colors (blue, pink, purple)
- MUI components with theme overrides
- Responsive grid layout

**View this file** as a reference implementation of all patterns.

---

## 🔄 Future Migration Tasks

### Components to Migrate Next

**High Priority** (MUI-heavy, frequently used):
1. Tag detail dialogs
2. Note creation forms
3. Settings panels
4. User profile pages

**Medium Priority** (MUI components, less frequent):
1. Filter dialogs
2. Search results
3. Bulk actions panels

**Low Priority** (minor MUI usage):
1. Tooltips
2. Small modals
3. Inline editors

---

## 💡 Tips & Best Practices

### 1. Start with Layout
- Convert Box → div with Tailwind first
- Establish card structure
- Set up responsive grid

### 2. Then Handle Forms
- Apply sx overrides to MUI components
- Test text readability in dark mode
- Verify disabled states

### 3. Finally Polish
- Add hover effects
- Adjust icon colors
- Test responsive breakpoints

### 4. Test Checklist
- [ ] Dark mode (primary use case)
- [ ] Light mode (if supported)
- [ ] Mobile view (< 768px)
- [ ] Tablet view (768px - 1024px)
- [ ] Desktop view (> 1024px)

---

## 🆘 Troubleshooting

### Issue: Text is hard to read

**Cause**: MUI components using old theme
**Solution**: Add sx prop with theme variable overrides (see Form Fields section)

### Issue: Header alignment is off

**Cause**: Using `items-center` instead of `items-start`
**Solution**: Use `items-start` + `mb-2` on title

### Issue: Cards look flat

**Cause**: Missing accent borders or hover effects
**Solution**: Add `border-{color}/20 hover:border-{color}/40 transition-colors`

### Issue: Layout breaks on mobile

**Cause**: Fixed grid columns
**Solution**: Use `grid-cols-1 lg:grid-cols-2` for responsive layout

---

## 📞 Questions?

For questions or clarifications about these patterns:
1. Check `CLICKUP_MIGRATION_CONTEXT.md` for migration history
2. Review `NoteDetailDialogContent.tsx` as reference implementation
3. Check `CLICKUP_THEME_COMPLETE.md` for color system details

---

**Last Updated**: January 2025
**Maintained by**: Development Team
**Next Review**: As needed during migration
