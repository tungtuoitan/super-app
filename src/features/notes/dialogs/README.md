# Note Detail Dialog

## Overview

The `NoteDetailDialog` component replicates the exact UI structure of the RFDDetailDialog from the portal project while following SuperApp architecture guidelines.

## Features

### Three-Column Layout
- **Left Column**: Note form fields (name, type, tags, metadata)
- **Center Column**: Content editor (description/content textarea)
- **Right Column**: Action buttons and metadata display

### UI Components
- Fullscreen dialog with AppBar header
- Content toolbar with Save/Cancel actions
- Form fields with validation support
- Tag management with add/remove functionality
- Action buttons (duplicate, archive, delete)
- Status and metadata display

### Architecture
- Follows SuperApp feature-based structure
- Uses Material-UI components consistently
- TypeScript with strict typing
- Centralized state management via NoteUIContext

## Usage

The dialog is opened through the `NoteUIContext`:

```typescript
const { openDialog } = useNoteUI();

// Open with existing note
openDialog(existingNote);

// Open with new note
const newNote: Note = {
    noteId: 0,
    name: '',
    description: '',
    tags: [],
    type: undefined,
    createdBy: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    isArchived: false,
};
openDialog(newNote);
```

## Testing

To test the dialog:

1. Navigate to the Notes page
2. Click the "+" button in the bottom navigation to create a new note
3. Or click on an existing note to edit it
4. Verify all three columns display correctly
5. Test form interactions, tag management, and action buttons

## Type Updates

The dialog includes updated type definitions:
- `NoteType`: Union type for note categories
- `NOTE_TYPES`: Constant array of available types
- `tags`: Changed from `string` to `string[]` array format

## Files Structure

```
dialogs/
├── NoteDetailDialog.tsx          # Main dialog component
├── NoteContentToolbar.tsx        # Action toolbar
├── sections/                     # Individual column components (created but not used)
│   ├── LeftDialogContent.tsx
│   ├── CenterDialogContent.tsx
│   └── RightDialogContent.tsx
└── footer/
    └── NoteFooter.tsx
```

## Implementation Notes

- The dialog uses inline Grid layout instead of separate section components due to TypeScript module resolution issues
- All handler functions are implemented as placeholders with console.log for now
- Form validation and actual save/update functionality need to be implemented
- Tags are managed as string arrays for better type safety