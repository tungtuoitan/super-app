---
name: sa-richtext-editor
description: Context and usage patterns for the SuperApp RichTextEditor component (Tiptap-based).
---

# SuperApp RichTextEditor

Tiptap-based rich text editor with image upload (via proxy), file attachments, bubble menu toolbar, and task lists.

## File Locations

| File | Purpose |
|---|---|
| `src/shared/components/RichTextEditor/RichTextEditor.tsx` | Main component |
| `src/shared/components/RichTextEditor/RichTextEditor.css` | All styles (ProseMirror, images, file attachments, task-list, bubble menu) |
| `src/shared/components/RichTextEditor/ProxyImageExtension.ts` | Custom Tiptap extension — stores `data-file-id` on `<img>` for authenticated proxy loading |
| `src/shared/components/RichTextEditor/FileAttachmentExtension.ts` | Custom Tiptap extension for file attachment nodes |
| `src/shared/components/RichTextEditor/useProxyImageLoader.ts` | Hook that watches Tiptap doc for images with `data-file-id` + empty `src`, then fetches blob URLs via `fileService._getFileBlobUrl()` |

## Props

```typescript
interface RichTextEditorProps {
    value: string;                        // HTML string
    onChange: (value: string) => void;     // Called with HTML on every change
    placeholder?: string;                 // Default: "Start typing..."
    disabled?: boolean;                   // Read-only mode (adds opacity-60)
    className?: string;                   // Extra CSS class on container
    minHeight?: string;                   // Default: "200px", use "auto" for readonly inline display
    uploadContext?: "project" | "workspace"; // Required for image/file upload
    uploadContextId?: number;             // project_id or workspace_id
}
```

## Usage Patterns

### 1. Full editor (description, notes)
```tsx
<RichTextEditor
    value={selectedTask.note || ""}
    onChange={(value) => handleFieldChange("note", value)}
    placeholder="Enter task description..."
    minHeight="580px"
    className="text-left"
    disabled={isDisabled}
    uploadContext="project"
    uploadContextId={selectedTask.projectId}
/>
```

### 2. Compact input (comments, replies)
```tsx
<div className="border rounded-md overflow-hidden">
    <RichTextEditor
        value={newComment}
        onChange={setNewComment}
        placeholder="Add a comment..."
        minHeight="96px"
        className="text-left"
        uploadContext="project"
        uploadContextId={selectedTask?.projectId}
    />
</div>
```

### 3. Read-only display (showing saved HTML with images)
```tsx
<RichTextEditor
    value={comment.content}
    onChange={() => {}}
    disabled
    minHeight="auto"
    className="text-left comment-readonly"
/>
```

**IMPORTANT:** Do NOT use `dangerouslySetInnerHTML` to display RichTextEditor content that may contain images. Images are stored with `data-file-id` and `src=""` (blob URLs are stripped before saving). Only a Tiptap editor instance with the `ProxyImage` extension and `useProxyImageLoader` hook can load these images. Always use `<RichTextEditor disabled>` for read-only display.

### CSS class: `comment-readonly`
Defined in `RichTextEditor.css`:
- Removes `opacity: 0.6` from disabled state
- Sets `min-height: auto` and `padding: 0` on ProseMirror
- Hides any toolbar elements

## Image Upload Flow

1. User pastes/drops/selects image → `handleImageUpload(file)`
2. Upload via `fileService._uploadImage()` → returns `fileId`
3. Fetch blob URL via `fileService._getFileBlobUrl(token, fileId)` for immediate display
4. Insert into editor: `editor.setImage({ src: blobUrl, "data-file-id": fileId })`
5. On save: blob URLs stripped → stored HTML has `src=""` + `data-file-id="123"`
6. On load: `useProxyImageLoader` scans doc for `data-file-id` with empty `src`, fetches new blob URLs

## Key Behaviors

- **Blob URL cleanup:** `onUpdate` callback strips `src="blob:..."` before calling `onChange`, so saved HTML never contains session-specific blob URLs
- **Content sync:** `useEffect` compares cleaned HTML (ignoring blob URLs) to avoid re-setting content unnecessarily
- **Bubble menu:** Floating toolbar appears on text selection with bold/italic/underline/headings/lists/color/image/file buttons
- **Paste support:** Images pasted from clipboard auto-upload
- **Drop support:** Files dropped into editor auto-upload (images → inline, others → file attachment)

## Task: {user_input}

Apply the above patterns when working with RichTextEditor. Use readonly mode for displaying saved content. Never use `dangerouslySetInnerHTML` for content that may contain proxy images.
