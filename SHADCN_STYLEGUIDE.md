# shadcn/ui + Tailwind CSS Style Guide

> **Official Style Guide** for SuperApp Frontend
> **Based on**: [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
> **Theme**: Zinc (Default)
> **Last Updated**: January 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Theming](#theming)
4. [Components](#components)
5. [Tailwind Patterns](#tailwind-patterns)
6. [Dark Mode](#dark-mode)
7. [Best Practices](#best-practices)
8. [CLI Usage](#cli-usage)
9. [Migration from MUI](#migration-from-mui)

---

## Introduction

This project uses **shadcn/ui** for component primitives and **Tailwind CSS** for styling. shadcn/ui is not a component library - it's a collection of re-usable components that you can copy and paste into your apps.

### Key Principles

- **Copy, don't install**: Components live in your codebase (`src/Components/ui/`)
- **Full control**: Modify components to fit your needs
- **Composable**: Built on Radix UI primitives
- **Accessible**: ARIA compliant by default
- **Customizable**: Use CSS variables for theming

---

## Installation

### Prerequisites

```bash
# Already installed in this project:
- React 18.3+
- Tailwind CSS 3.4+
- TypeScript 4.9+
```

### Project Setup

This project is already configured with:

```json
{
  "dependencies": {
    "@radix-ui/react-*": "Latest", // Primitives
    "class-variance-authority": "^0.7.1", // CVA for variants
    "clsx": "^2.1.1", // Conditional classes
    "tailwind-merge": "^3.3.1", // Merge Tailwind classes
    "lucide-react": "^0.548.0" // Icons
  }
}
```

### File Structure

```
src/
├── Components/
│   └── ui/              # shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
├── lib/
│   └── utils.ts         # cn() utility
├── index.css            # Tailwind + CSS variables
└── ...
```

---

## Theming

### Color System

This project uses the **Zinc** theme (shadcn default). All colors are defined as **CSS variables** in HSL format for easy customization.

#### Semantic Colors

```tsx
// Use semantic color names, not arbitrary values
<Button className="bg-primary text-primary-foreground">Primary</Button>
<Card className="bg-card text-card-foreground">Card</Card>
<div className="bg-secondary text-secondary-foreground">Secondary</div>
<div className="bg-muted text-muted-foreground">Muted</div>
<div className="bg-accent text-accent-foreground">Accent</div>
<Button variant="destructive">Delete</Button>
```

#### Available Colors

| Color | Usage | Class |
|-------|-------|-------|
| **primary** | Main actions, links | `bg-primary` |
| **secondary** | Secondary actions | `bg-secondary` |
| **muted** | Disabled states, subtle backgrounds | `bg-muted` |
| **accent** | Highlights, hover states | `bg-accent` |
| **destructive** | Errors, delete actions | `bg-destructive` |
| **card** | Card backgrounds | `bg-card` |
| **popover** | Popovers, dropdowns | `bg-popover` |
| **border** | Borders, dividers | `border-border` |
| **input** | Input borders | `border-input` |
| **ring** | Focus rings | `ring-ring` |

#### Foreground Colors

Every background color has a matching foreground color for optimal contrast:

```tsx
// ✅ GOOD: Semantic pairing
<div className="bg-primary text-primary-foreground">Text</div>
<div className="bg-card text-card-foreground">Card</div>

// ❌ BAD: Manual color mixing
<div className="bg-primary text-white">Text</div>
```

### CSS Variables

All colors are defined in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  /* ... */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  /* ... */
}
```

### Border Radius

Use CSS variable-based border radius:

```tsx
// Predefined sizes
<div className="rounded-sm">Small (4px)</div>
<div className="rounded-md">Medium (6px)</div>
<div className="rounded-lg">Large (8px)</div>

// Custom with CSS variable
<div className="rounded-[var(--radius)]">Default radius</div>
```

---

## Components

### Using shadcn Components

shadcn components are located in `src/Components/ui/`. Import and use them directly:

```tsx
import { Button } from "@/Components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card"
import { Dialog, DialogTrigger, DialogContent } from "@/Components/ui/dialog"

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

### Component Variants

Use CVA (Class Variance Authority) for component variants:

```tsx
// Button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Button sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>
```

### Composition Pattern

shadcn components are composable - build complex UIs from primitives:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/Components/ui/card"
import { Button } from "@/Components/ui/button"
import { Badge } from "@/Components/ui/badge"

function ProductCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Product Name</CardTitle>
          <Badge>New</Badge>
        </div>
        <CardDescription>Product description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Additional content...
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Buy Now</Button>
      </CardFooter>
    </Card>
  )
}
```

### Common Components

#### Button

```tsx
import { Button } from "@/Components/ui/button"

<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
<Button size="icon"><Icon /></Button>
```

#### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

#### Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <p>Content</p>
  </DialogContent>
</Dialog>
```

#### Input

```tsx
import { Input } from "@/Components/ui/input"
import { Label } from "@/Components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter email" />
</div>
```

#### Badge

```tsx
import { Badge } from "@/Components/ui/badge"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

#### Alert

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/Components/ui/alert"
import { AlertCircle } from "lucide-react"

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>You have new notifications</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>
```

---

## Tailwind Patterns

### Layout

#### Flexbox

```tsx
// Horizontal layout
<div className="flex items-center gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Vertical layout
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Space between
<div className="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>

// Center content
<div className="flex items-center justify-center min-h-screen">
  <div>Centered</div>
</div>
```

#### Grid

```tsx
// Equal columns
<div className="grid grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

### Spacing

Use Tailwind's spacing scale (4px base unit):

```tsx
// Padding
<div className="p-4">16px padding</div>
<div className="px-4 py-2">Horizontal 16px, Vertical 8px</div>
<div className="p-6">24px padding</div>

// Margin
<div className="m-4">16px margin</div>
<div className="mx-auto">Horizontal auto (centering)</div>
<div className="mt-4 mb-8">Top 16px, Bottom 32px</div>

// Gap (for flex/grid)
<div className="flex gap-4">16px gap</div>
<div className="grid gap-6">24px gap</div>
<div className="space-y-4">Vertical 16px spacing</div>
```

### Typography

```tsx
// Headings (use semantic HTML + Tailwind)
<h1 className="text-4xl font-bold">Heading 1</h1>
<h2 className="text-3xl font-semibold">Heading 2</h2>
<h3 className="text-2xl font-semibold">Heading 3</h3>
<h4 className="text-xl font-medium">Heading 4</h4>

// Body text
<p className="text-base">Normal text (16px)</p>
<p className="text-sm text-muted-foreground">Small muted text (14px)</p>
<p className="text-xs text-muted-foreground">Extra small (12px)</p>

// Text colors (use semantic)
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Muted text</p>
<p className="text-primary">Primary color text</p>
<p className="text-destructive">Error text</p>
```

### Responsive Design

```tsx
// Mobile-first approach
<div className="
  w-full           // Mobile: 100% width
  md:w-1/2         // Tablet: 50% width
  lg:w-1/3         // Desktop: 33% width
  p-4              // Mobile: 16px padding
  md:p-6           // Tablet: 24px padding
  lg:p-8           // Desktop: 32px padding
">
  Responsive content
</div>

// Breakpoints:
// sm: 640px
// md: 768px
// lg: 1024px
// xl: 1280px
// 2xl: 1536px
```

---

## Dark Mode

### Enabling Dark Mode

Dark mode is enabled via the `dark` class on the root element:

```tsx
// Toggle dark mode
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark')
}
```

### Dark Mode Colors

All colors automatically adapt to dark mode via CSS variables:

```tsx
// Same code works in both modes
<Card className="bg-card text-card-foreground border-border">
  <p className="text-foreground">Primary text</p>
  <p className="text-muted-foreground">Muted text</p>
</Card>
```

### Dark Mode Best Practices

```tsx
// ✅ GOOD: Use semantic colors
<div className="bg-background text-foreground">
  <Card className="bg-card">Content</Card>
</div>

// ❌ BAD: Hardcoded colors
<div className="bg-white text-black">
  <div className="bg-gray-100">Content</div>
</div>

// ✅ GOOD: Dark mode override
<div className="bg-background dark:bg-slate-900">
  Custom dark background
</div>
```

---

## Best Practices

### 1. Use Semantic Colors

```tsx
// ✅ GOOD
<Button className="bg-primary text-primary-foreground">Submit</Button>
<div className="text-muted-foreground">Helper text</div>

// ❌ BAD
<Button className="bg-blue-500 text-white">Submit</Button>
<div className="text-gray-500">Helper text</div>
```

### 2. Component Composition

```tsx
// ✅ GOOD: Compose from primitives
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card"

function InfoCard({ title, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ❌ BAD: Recreating from scratch
function InfoCard({ title, children }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold">{title}</h3>
      <div>{children}</div>
    </div>
  )
}
```

### 3. Use cn() Utility

```tsx
import { cn } from "@/lib/utils"

// ✅ GOOD: Merge classes safely
<Button className={cn(
  "w-full",
  isLoading && "opacity-50 cursor-not-allowed",
  variant === "large" && "h-14 text-lg"
)}>
  Submit
</Button>

// ❌ BAD: String concatenation
<Button className={`w-full ${isLoading ? 'opacity-50' : ''}`}>
  Submit
</Button>
```

### 4. Accessibility

```tsx
// ✅ GOOD: Use semantic HTML
<Button asChild>
  <a href="/login">Login</a>
</Button>

// ✅ GOOD: Provide labels
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>

// ✅ GOOD: Dialog accessibility
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### 5. File Organization

```
src/Components/ui/          # shadcn primitives (don't modify heavily)
src/Components/common/      # Your custom reusable components
src/features/[feature]/components/  # Feature-specific components
```

---

## CLI Usage

### Adding Components

```bash
# Add a new component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add card dialog alert

# List available components
npx shadcn@latest add
```

### Component Location

Components are installed to `src/Components/ui/` as specified in `components.json`.

### Updating Components

Since components are copied (not installed), you update them by:
1. Manually editing `src/Components/ui/[component].tsx`
2. Or re-running `npx shadcn@latest add [component]` (will overwrite)

---

## Migration from MUI

### Component Mapping

| MUI Component | shadcn Equivalent | Notes |
|--------------|-------------------|-------|
| `<Button>` | `<Button>` | Similar API, use `variant` prop |
| `<TextField>` | `<Input>` + `<Label>` | Separate label component |
| `<Dialog>` | `<Dialog>` + subcomponents | More composable |
| `<Paper>` | `<Card>` | Use Card + CardContent |
| `<Box>` | `<div>` | Use Tailwind classes |
| `<Stack>` | `<div className="flex flex-col gap-4">` | Flexbox utilities |
| `<Grid>` | `<div className="grid gap-4">` | Grid utilities |
| `<Typography>` | Semantic HTML + classes | `<h1 className="text-2xl">` |
| `<Alert>` | `<Alert>` | Similar structure |
| `<IconButton>` | `<Button size="icon">` | Use size variant |
| `<Chip>` | `<Badge>` | Similar purpose |

### Migration Example

```tsx
// Before (MUI)
import { Box, Button, TextField, Typography } from '@mui/material'

function LoginForm() {
  return (
    <Box sx={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5">Login</Typography>
      <TextField label="Email" variant="outlined" fullWidth />
      <TextField label="Password" type="password" variant="outlined" fullWidth />
      <Button variant="contained" fullWidth>Login</Button>
    </Box>
  )
}

// After (shadcn + Tailwind)
import { Button } from "@/Components/ui/button"
import { Input } from "@/Components/ui/input"
import { Label } from "@/Components/ui/label"

function LoginForm() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-2xl font-semibold">Login</h2>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" />
      </div>
      <Button className="w-full">Login</Button>
    </div>
  )
}
```

### Color Migration

```tsx
// Before (MUI)
<Box sx={{ backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
  Content
</Box>

// After (shadcn)
<div className="bg-primary text-primary-foreground">
  Content
</div>
```

### Styling Migration

```tsx
// Before (MUI sx prop)
<Box sx={{
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: 3,
  backgroundColor: 'background.paper',
  borderRadius: 2,
  boxShadow: 1,
}}>
  Content
</Box>

// After (Tailwind classes)
<div className="flex flex-col gap-4 p-6 bg-card rounded-lg shadow-sm">
  Content
</div>
```

---

## Resources

- **shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS Docs**: https://tailwindcss.com
- **Radix UI Primitives**: https://www.radix-ui.com
- **Lucide Icons**: https://lucide.dev
- **Class Variance Authority**: https://cva.style

---

## Quick Reference

### Color Classes

```tsx
// Backgrounds
bg-background, bg-foreground, bg-card, bg-popover
bg-primary, bg-secondary, bg-muted, bg-accent, bg-destructive

// Text
text-foreground, text-muted-foreground
text-primary, text-secondary, text-accent, text-destructive
text-card-foreground, text-popover-foreground

// Borders
border-border, border-input, ring-ring
```

### Spacing

```tsx
// Padding: p-{n} (n * 4px)
p-0, p-1, p-2, p-3, p-4, p-5, p-6, p-8, p-10, p-12

// Margin: m-{n}
m-0, m-1, m-2, m-3, m-4, m-5, m-6, m-8, m-10, m-12

// Gap: gap-{n}
gap-1, gap-2, gap-3, gap-4, gap-5, gap-6, gap-8
```

### Typography

```tsx
// Font sizes
text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl

// Font weights
font-normal, font-medium, font-semibold, font-bold
```

---

**Happy coding!** 🚀
