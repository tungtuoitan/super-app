# 🎯 Quick Reference Card - MUI to shadcn

## Installation Commands

```bash
# Core Setup
npm install tailwindcss @tailwindcss/vite @types/node -D
npx shadcn@latest init

# Essential Components (one command)
npx shadcn@latest add button input label card dialog dropdown-menu table tabs select popover tooltip badge separator avatar checkbox switch
```

---

## Component Mapping (Quick Lookup)

| MUI | shadcn | Notes |
|-----|--------|-------|
| `Button` | `Button` | variant: contained→default, outlined→outline, text→ghost |
| `TextField` | `Input + Label` | Need separate Label component |
| `Dialog` | `Dialog` | onClose → onOpenChange |
| `Menu` | `DropdownMenu` | No anchor state needed |
| `Select` | `Select` | onChange → onValueChange |
| `Tabs` | `Tabs` | Built-in content management |
| `Table` | `Table` | Use data-table for advanced |
| `Chip` | `Badge` | Different variants |
| `Divider` | `Separator` | Direct replacement |
| `Tooltip` | `Tooltip` | Similar API |

---

## ClickUp Colors (Copy-Paste)

```tsx
// Primary Purple
className="bg-[#7B68EE] hover:bg-[#6C5CE7]"

// Accents
className="bg-[#FD71AF]"  // Pink
className="bg-[#49CCF9]"  // Blue  
className="bg-[#FFC800]"  // Yellow

// Dark
className="bg-[#292D34] text-white"
```

---

## Common Patterns

### Button with Icon
```tsx
import { Save } from 'lucide-react';
<Button><Save className="mr-2 h-4 w-4" />Save</Button>
```

### Form Field with Error
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" className={error ? 'border-destructive' : ''} />
  {error && <p className="text-sm text-destructive">{error}</p>}
</div>
```

### Loading Button
```tsx
import { Loader2 } from 'lucide-react';
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

### Conditional Styling
```tsx
import { cn } from '@/lib/utils';
<Button className={cn("w-full", isActive && "bg-[#7B68EE]")} />
```

---

## File Structure After Setup

```
src/
├── components/
│   └── ui/              # shadcn components (auto-generated)
│       ├── button.tsx
│       ├── input.tsx
│       └── ...
├── lib/
│   └── utils.ts         # cn() utility
├── styles/
│   └── globals.css      # or index.css
└── ...
```

---

## Troubleshooting One-Liners

```bash
# Path alias not working
# → Restart TS Server in VS Code

# Tailwind not working  
rm -rf node_modules/.vite && npm run dev

# Find remaining MUI
grep -r "@mui/material" src/ | wc -l

# Component looks broken
npx shadcn@latest add <component> --overwrite
```

---

## Imports Cheat Sheet

```tsx
// Button
import { Button } from '@/components/ui/button';

// Input
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dialog
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// DropdownMenu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import { Save, Trash, Edit, X } from 'lucide-react';

// Utils
import { cn } from '@/lib/utils';
```

---

## Size Variants

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><X /></Button>
```

---

## Button Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

---

## Migration Phases (Summary)

1. **Setup** (1-2h): Install deps, config files
2. **Theme** (30m): ClickUp colors
3. **Migrate** (1-3w): One module at a time
4. **Test** (3-5d): Full QA
5. **Cleanup**: Remove MUI

---

## Success Checklist

- [ ] `npm run dev` works
- [ ] No MUI imports in src/
- [ ] Bundle size reduced
- [ ] All features working
- [ ] UI matches ClickUp

---

**Print this page and keep it next to your keyboard! 📌**
