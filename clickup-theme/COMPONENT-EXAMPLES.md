# Component Migration Examples

## 1. Button Component

### Before (MUI)
```tsx
import { Button } from '@mui/material';

<Button 
  variant="contained" 
  color="primary"
  size="large"
  onClick={handleClick}
  disabled={isLoading}
  startIcon={<SaveIcon />}
>
  Save Changes
</Button>
```

### After (shadcn)
```tsx
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

<Button 
  variant="default"  // "contained" → "default"
  size="lg"          // "large" → "lg"
  onClick={handleClick}
  disabled={isLoading}
  className="gap-2"  // for icon spacing
>
  <Save className="h-4 w-4" />
  Save Changes
</Button>
```

**Variant Mapping:**
- `contained` → `default`
- `outlined` → `outline`
- `text` → `ghost`
- Delete button → `destructive`

---

## 2. TextField → Input + Label

### Before (MUI)
```tsx
import { TextField } from '@mui/material';

<TextField
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={!!errors.email}
  helperText={errors.email}
  required
  fullWidth
/>
```

### After (shadcn)
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="w-full space-y-2">
  <Label htmlFor="email">
    Email Address <span className="text-destructive">*</span>
  </Label>
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className={errors.email ? 'border-destructive' : ''}
  />
  {errors.email && (
    <p className="text-sm text-destructive">{errors.email}</p>
  )}
</div>
```

---

## 3. Dialog/Modal

### Before (MUI)
```tsx
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Button 
} from '@mui/material';

<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Confirm Delete</DialogTitle>
  <DialogContent>
    Are you sure you want to delete this item?
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleDelete} color="error" variant="contained">
      Delete
    </Button>
  </DialogActions>
</Dialog>
```

### After (shadcn)
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this item?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Key Differences:**
- `onClose` → `onOpenChange` (receives boolean)
- Actions wrapped in `DialogFooter`
- Add `DialogDescription` for better semantics

---

## 4. Select/Dropdown

### Before (MUI)
```tsx
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

<FormControl fullWidth>
  <InputLabel>Status</InputLabel>
  <Select
    value={status}
    label="Status"
    onChange={(e) => setStatus(e.target.value)}
  >
    <MenuItem value="active">Active</MenuItem>
    <MenuItem value="inactive">Inactive</MenuItem>
    <MenuItem value="pending">Pending</MenuItem>
  </Select>
</FormControl>
```

### After (shadcn)
```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

<div className="w-full space-y-2">
  <Label htmlFor="status">Status</Label>
  <Select value={status} onValueChange={setStatus}>
    <SelectTrigger id="status">
      <SelectValue placeholder="Select status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
      <SelectItem value="pending">Pending</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Key Differences:**
- More verbose structure
- `onChange` → `onValueChange`
- Need `SelectTrigger` and `SelectValue`

---

## 5. Card

### Before (MUI)
```tsx
import { Card, CardHeader, CardContent, CardActions } from '@mui/material';

<Card>
  <CardHeader
    title="Card Title"
    subheader="Card subtitle"
  />
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardActions>
    <Button size="small">Action 1</Button>
    <Button size="small">Action 2</Button>
  </CardActions>
</Card>
```

### After (shadcn)
```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card subtitle</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">Action 1</Button>
    <Button size="sm" variant="outline">Action 2</Button>
  </CardFooter>
</Card>
```

---

## 6. Menu → DropdownMenu

### Before (MUI)
```tsx
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const [anchorEl, setAnchorEl] = useState(null);

<IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
  <MoreVertIcon />
</IconButton>
<Menu
  anchorEl={anchorEl}
  open={Boolean(anchorEl)}
  onClose={() => setAnchorEl(null)}
>
  <MenuItem onClick={handleEdit}>Edit</MenuItem>
  <MenuItem onClick={handleDelete}>Delete</MenuItem>
  <MenuItem onClick={handleShare}>Share</MenuItem>
</Menu>
```

### After (shadcn)
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleDelete}>
      Delete
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleShare}>
      Share
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Key Differences:**
- No anchor state management needed
- Simpler API with trigger/content pattern
- Use `align` prop for positioning

---

## 7. Tabs

### Before (MUI)
```tsx
import { Tabs, Tab, Box } from '@mui/material';

<Box>
  <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
    <Tab label="Overview" value="overview" />
    <Tab label="Details" value="details" />
    <Tab label="Settings" value="settings" />
  </Tabs>
  
  {tab === 'overview' && <div>Overview content</div>}
  {tab === 'details' && <div>Details content</div>}
  {tab === 'settings' && <div>Settings content</div>}
</Box>
```

### After (shadcn)
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    <div>Overview content</div>
  </TabsContent>
  <TabsContent value="details">
    <div>Details content</div>
  </TabsContent>
  <TabsContent value="settings">
    <div>Settings content</div>
  </TabsContent>
</Tabs>
```

**Key Differences:**
- Built-in content management with `TabsContent`
- `onChange` → `onValueChange`
- Cleaner structure with triggers and content

---

## 8. Table (Simple)

### Before (MUI)
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
        <TableCell>Email</TableCell>
        <TableCell>Status</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {users.map((user) => (
        <TableRow key={user.id}>
          <TableCell>{user.name}</TableCell>
          <TableCell>{user.email}</TableCell>
          <TableCell>{user.status}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

### After (shadcn)
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map((user) => (
        <TableRow key={user.id}>
          <TableCell>{user.name}</TableCell>
          <TableCell>{user.email}</TableCell>
          <TableCell>{user.status}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**For Advanced Tables (sorting, filtering, pagination):**
```bash
npx shadcn@latest add data-table
```

---

## 9. Chip → Badge

### Before (MUI)
```tsx
import { Chip } from '@mui/material';

<Chip label="Active" color="success" size="small" />
<Chip label="Pending" color="warning" />
<Chip label="Inactive" color="error" variant="outlined" />
```

### After (shadcn)
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="outline">Inactive</Badge>
```

**Custom Colors (ClickUp style):**
```tsx
<Badge className="bg-[#7B68EE] text-white">Active</Badge>
<Badge className="bg-[#FFC800] text-black">Pending</Badge>
<Badge variant="outline" className="border-[#FD71AF] text-[#FD71AF]">
  Inactive
</Badge>
```

---

## 10. Complete Form Example

### Before (MUI)
```tsx
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

<form onSubmit={handleSubmit}>
  <TextField
    fullWidth
    label="Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    error={!!errors.name}
    helperText={errors.name}
    margin="normal"
  />
  
  <TextField
    fullWidth
    label="Email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    error={!!errors.email}
    helperText={errors.email}
    margin="normal"
  />
  
  <FormControl fullWidth margin="normal">
    <InputLabel>Role</InputLabel>
    <Select
      value={role}
      label="Role"
      onChange={(e) => setRole(e.target.value)}
    >
      <MenuItem value="admin">Admin</MenuItem>
      <MenuItem value="user">User</MenuItem>
    </Select>
  </FormControl>
  
  <FormControlLabel
    control={
      <Checkbox
        checked={subscribe}
        onChange={(e) => setSubscribe(e.target.checked)}
      />
    }
    label="Subscribe to newsletter"
  />
  
  <Button
    type="submit"
    variant="contained"
    fullWidth
    disabled={isSubmitting}
  >
    Submit
  </Button>
</form>
```

### After (shadcn)
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

<form onSubmit={handleSubmit} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input
      id="name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      className={errors.name ? 'border-destructive' : ''}
    />
    {errors.name && (
      <p className="text-sm text-destructive">{errors.name}</p>
    )}
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className={errors.email ? 'border-destructive' : ''}
    />
    {errors.email && (
      <p className="text-sm text-destructive">{errors.email}</p>
    )}
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="role">Role</Label>
    <Select value={role} onValueChange={setRole}>
      <SelectTrigger id="role">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="user">User</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <div className="flex items-center space-x-2">
    <Checkbox
      id="subscribe"
      checked={subscribe}
      onCheckedChange={setSubscribe}
    />
    <Label htmlFor="subscribe" className="cursor-pointer">
      Subscribe to newsletter
    </Label>
  </div>
  
  <Button
    type="submit"
    className="w-full"
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Submitting...' : 'Submit'}
  </Button>
</form>
```

---

## ClickUp Styling Tips

### Primary Purple Button
```tsx
<Button className="bg-[#7B68EE] hover:bg-[#6C5CE7]">
  ClickUp Style
</Button>
```

### Accent Colors
```tsx
// Pink accent
<Badge className="bg-[#FD71AF]">Hot Pink</Badge>

// Blue accent  
<Badge className="bg-[#49CCF9]">Malibu Blue</Badge>

// Yellow accent
<Badge className="bg-[#FFC800] text-black">Supernova</Badge>
```

### Dark Background
```tsx
<Card className="bg-[#292D34] text-white">
  <CardContent>Dark theme card</CardContent>
</Card>
```

---

## Common Patterns

### Loading State
```tsx
// MUI
<Button disabled={isLoading}>
  {isLoading ? <CircularProgress size={20} /> : 'Submit'}
</Button>

// shadcn
import { Loader2 } from 'lucide-react';

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>
```

### Empty State
```tsx
// shadcn
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-3 mb-4">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold">No items found</h3>
  <p className="text-sm text-muted-foreground">
    Get started by creating a new item
  </p>
  <Button className="mt-4">Create Item</Button>
</div>
```

### Error Display
```tsx
// shadcn
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>
```

---

## Pro Tips

1. **Use Tailwind classes** instead of inline styles
2. **Leverage CSS variables** from ClickUp theme
3. **Use lucide-react** for icons instead of MUI icons
4. **Keep component composition** - shadcn encourages small, composable components
5. **Test incrementally** - migrate one component at a time
6. **Use className prop** for custom styling
7. **Combine with cn() utility** for conditional classes

```tsx
import { cn } from '@/lib/utils';

<Button className={cn(
  "w-full",
  isActive && "bg-[#7B68EE]",
  isDisabled && "opacity-50"
)}>
  Dynamic Button
</Button>
```
