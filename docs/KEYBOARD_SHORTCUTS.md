# ⌨️ KEYBOARD SHORTCUTS - User Guide

> **Philosophy**: Enhance productivity without overwhelming users

---

## 🎯 Global Shortcuts

Currently, we use **minimal safe approach** - no global app-wide shortcuts to avoid conflicts with browser shortcuts.

---

## 📝 Dialog Shortcuts

### Add Tag Dialog

| Shortcut | Action | Context |
|----------|--------|---------|
| **Enter** | Submit form | When dialog is open and form is valid |
| **Escape** | Close dialog | When dialog is open |

**Validation Rules:**
- **Add Existing Tab**: Enter only works when a tag is selected
- **Create New Tab**: Enter only works when tag name is filled

**Safety Features:**
- ✅ Only active when dialog is open
- ✅ Disabled during submission
- ✅ Won't interfere with typing in inputs
- ✅ Won't conflict with browser shortcuts

---

## 🛠️ Implementation Details

### Hook: `useKeyboardShortcut`

```typescript
import { useKeyboardShortcut } from '@/shared/hooks'

// Example: Enter to submit
useKeyboardShortcut({
    key: 'Enter',
    enabled: isDialogOpen && hasValidInput,
    callback: handleSubmit,
})

// Example: Escape to close
useKeyboardShortcut({
    key: 'Escape',
    enabled: isDialogOpen,
    callback: handleClose,
})
```

### Features:
- ✅ Automatic cleanup on unmount
- ✅ Conditional activation via `enabled` flag
- ✅ Type-safe TypeScript
- ✅ No memory leaks
- ✅ React best practices

---

## 🚫 What We DON'T Do

To maintain safety and avoid conflicts:

### ❌ NO Global App Shortcuts
```typescript
// ❌ AVOIDED: Can conflict with browser
Ctrl+S  // Browser "Save Page"
Ctrl+W  // Browser "Close Tab"
Ctrl+T  // Browser "New Tab"
Ctrl+N  // Browser "New Window"
Ctrl+F  // Browser "Find"
```

### ❌ NO Always-On Shortcuts
```typescript
// ❌ AVOIDED: Dangerous without context
Delete  // Could delete while typing
Backspace  // Could navigate back
```

### ❌ NO Undocumented Shortcuts
All shortcuts are:
- ✅ Documented in UI (button labels show "(Enter)" or "(Esc)")
- ✅ Contextual (only work when relevant)
- ✅ Safe (disabled when dangerous)

---

## 📱 Mobile Considerations

- Mobile devices don't have keyboards
- **All shortcuts have button alternatives**
- Shortcuts are progressive enhancement, not requirements

---

## ♿ Accessibility

### Keyboard Navigation Support

All dialogs and forms support:
- **Tab**: Navigate between fields
- **Shift+Tab**: Navigate backward
- **Enter**: Submit (when valid)
- **Escape**: Cancel/Close
- **Arrow Keys**: Navigate options in dropdowns

### Screen Reader Support

- Shortcuts don't interfere with screen readers
- All actions have accessible button alternatives
- ARIA labels provided for all interactive elements

---

## 🎨 Future Enhancements

If we want to add more shortcuts later (with user opt-in):

### Possible Safe Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Ctrl+K` | Focus search | Common in modern apps |
| `Ctrl+/` | Show shortcuts help | Non-conflicting |
| `?` | Keyboard shortcuts guide | When not typing |

### Implementation Pattern

```typescript
// Only add if users request it
function useGlobalShortcuts() {
    const [enabled, setEnabled] = useState(() => {
        return localStorage.getItem('shortcuts_enabled') === 'true'
    })

    useKeyboardShortcut({
        key: 'k',
        ctrl: true,
        enabled,
        callback: focusSearch,
    })

    return { enabled, setEnabled }
}
```

---

## 📊 Testing Keyboard Shortcuts

### Component Tests

```typescript
import { fireEvent, render, screen } from '@testing-library/react'

it('submits on Enter key', () => {
    render(<AddTagDialog open={true} />)
    
    const input = screen.getByLabelText('Tag Name')
    fireEvent.change(input, { target: { value: 'New Tag' } })
    
    // Simulate Enter key
    fireEvent.keyDown(window, { key: 'Enter' })
    
    expect(mockSubmit).toHaveBeenCalled()
})

it('closes on Escape key', () => {
    const handleClose = vi.fn()
    render(<AddTagDialog open={true} onClose={handleClose} />)
    
    // Simulate Escape key
    fireEvent.keyDown(window, { key: 'Escape' })
    
    expect(handleClose).toHaveBeenCalled()
})
```

---

## 🔧 Troubleshooting

### Shortcut Not Working?

**Check:**
1. ✅ Is dialog/form open? (Shortcuts are contextual)
2. ✅ Is form valid? (Enter requires valid input)
3. ✅ Is submission in progress? (Disabled during loading)
4. ✅ Are you typing in an input? (Some shortcuts ignore input focus)

### Conflicts with Browser?

We **intentionally avoid** common browser shortcuts:
- If you need `Ctrl+S`, use the Save button instead
- If you need `Ctrl+F`, use your browser's find
- Our shortcuts are **additions**, not replacements

---

## 📝 Best Practices for Developers

### When Adding New Shortcuts

1. **Check Conflicts**: Avoid browser/OS shortcuts
2. **Make Optional**: Use `enabled` flag
3. **Document in UI**: Show hint in button text
4. **Provide Alternative**: Always have a button
5. **Test Thoroughly**: Write tests for keyboard interactions

### Safe Shortcuts Checklist

- [ ] Doesn't conflict with browser shortcuts
- [ ] Only active in relevant context (`enabled` flag)
- [ ] Disabled during async operations
- [ ] Documented in UI (tooltip, button text)
- [ ] Has button alternative for mobile
- [ ] Properly cleaned up on unmount
- [ ] Tested with unit tests

---

## 🎯 Summary

**Current Implementation:**
- ✅ Enter to submit in dialogs
- ✅ Escape to close dialogs
- ✅ Safe, contextual, documented

**Not Implemented (by design):**
- ❌ Global app shortcuts
- ❌ Always-on shortcuts
- ❌ Conflicting shortcuts

**Result:**
- 🚀 Better UX for power users
- ✅ No conflicts or confusion
- ♿ Accessible and safe
- 📱 Works everywhere

---

**Remember**: Keyboard shortcuts should enhance the experience, not complicate it. Keep it simple and safe!
