# Context Menu System

This project uses [@szhsin/react-menu](https://szhsin.github.io/react-menu/) for implementing right-click context menus throughout the application.

## Features

- **Performance Optimized**: Using @szhsin/react-menu for better performance and accessibility
- **Type Safe**: Full TypeScript support with proper type definitions
- **Multiple Menu Types**: Support for different context menu types (default, tag, note)
- **Keyboard Accessible**: Built-in keyboard navigation and screen reader support
- **Customizable**: Easy to extend with new menu types and actions

## Usage

### Basic Setup

The `ContextMenu` is already set up in the application root (`Main.tsx`), so you can use the context menu anywhere in the app.

### Using the Context Menu Hook

```tsx
import { useContextMenu } from '@/shared/contexts';

function MyComponent() {
    const { showContextMenu } = useContextMenu();

    const handleRightClick = (event: React.MouseEvent) => {
        // Show context menu at cursor position
        showContextMenu(event, 'default');
    };

    return (
        <div onContextMenu={handleRightClick}>
            Right-click me!
        </div>
    );
}
```

### Available Menu Types

1. **Default Menu** (`'default'`): Basic context menu with general actions
2. **Tag Menu** (`'tag'`): Tag-specific actions (create, edit, delete)
3. **Note Menu** (`'note'`): Note-specific actions (edit, view details, delete)

### Example Implementation

```tsx
import React from 'react';
import { Paper, Typography } from '@mui/material';
import { useContextMenu } from '@/shared/contexts';

function NoteCard({ note }: { note: Note }) {
    const { showContextMenu } = useContextMenu();

    return (
        <Paper
            onContextMenu={(e) => showContextMenu(e, 'note')}
            sx={{ p: 2, cursor: 'context-menu' }}
        >
            <Typography>{note.title}</Typography>
        </Paper>
    );
}
```

## API Reference

### ContextMenuContextValue

```tsx
interface ContextMenuContextValue {
    showContextMenu: (event: React.MouseEvent, type?: 'default' | 'tag' | 'note') => void;
    closeContextMenu: () => void;
    isOpen: boolean;
}
```

### showContextMenu Parameters

- `event: React.MouseEvent` - The right-click mouse event
- `type: 'default' | 'tag' | 'note'` - The type of context menu to display (defaults to 'default')

## Customization

### Adding New Menu Types

To add a new menu type, follow these steps:

1. Update the type union in `ContextMenuContext.tsx`:
```tsx
type MenuType = 'default' | 'tag' | 'note' | 'your-new-type';
```

2. Add the new case in the `renderMenuItems` function:
```tsx
case 'your-new-type':
    return (
        <>
            <MenuItem onClick={handleYourAction}>
                <YourIcon style={{ fontSize: 16, marginRight: 8 }} />
                Your Action
            </MenuItem>
        </>
    );
```

3. Implement the action handler:
```tsx
const handleYourAction = useCallback(() => {
    console.log('Your action clicked');
    closeContextMenu();
    // Your implementation here
}, [closeContextMenu]);
```

### Styling

The context menu uses the default styling from @szhsin/react-menu. You can customize the appearance by:

1. **CSS Classes**: Target the `.szh-menu` and `.szh-menu__item` classes
2. **Theme Props**: Use the `theming` prop on `ControlledMenu`
3. **Custom Styles**: Add custom CSS or use Material-UI's styling system

## Dependencies

- `@szhsin/react-menu`: Core context menu functionality
- `@mui/icons-material`: Icons for menu items
- `@mui/material`: Material-UI components for consistent styling

## Migration from Previous Implementation

The new implementation is backward compatible with the existing API. The main changes are:

- Removed custom CSS file (`context-menu.css`)
- Improved performance and accessibility
- Better keyboard navigation
- More consistent styling with Material-UI theme

## Best Practices

1. **Prevent Default**: Always call `event.preventDefault()` to disable the browser's default context menu
2. **Stop Propagation**: Use `event.stopPropagation()` when needed to prevent parent context menus from triggering
3. **Accessibility**: The menu is automatically keyboard accessible, but ensure your trigger elements are also accessible
4. **Performance**: The context menu is only rendered when open, providing good performance for large applications

## Examples

See `ContextMenuExample.tsx` for a complete example showing all menu types in action.