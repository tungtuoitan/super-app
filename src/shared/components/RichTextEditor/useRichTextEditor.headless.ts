/**
 * RichTextEditor headless effects (moved out of RichTextEditor.tsx, unchanged)
 */

import { useEffect } from "react";
import type { UseRichTextEditorHeadlessParams } from "./richTextEditor.type";

export function useRichTextEditorHeadless({
    editor,
    value,
    disabled,
    focusTrigger,
    handleImageUpload,
    handleFileUpload,
    setShowBubbleMenu,
    setShowColorPicker,
    setBubbleMenuPosition,
    editorContainerRef,
    bubbleMenuRef,
}: UseRichTextEditorHeadlessParams) {
    // Focus when focusTrigger changes (for tab-switch scenarios)
    useEffect(() => {
        if (focusTrigger && editor && !disabled) {
            // Small delay to allow the hidden→visible transition
            requestAnimationFrame(() => editor.commands.focus("end"));
        }
    }, [focusTrigger, editor, disabled]);

    // Handle paste event for images
    useEffect(() => {
        if (!editor) return;

        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    event.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        handleImageUpload(file);
                    }
                    return;
                }
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener("paste", handlePaste);

        return () => {
            editorElement.removeEventListener("paste", handlePaste);
        };
    }, [editor]);

    // Handle drop event for files
    useEffect(() => {
        if (!editor) return;

        const handleDrop = (event: DragEvent) => {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return;

            event.preventDefault();

            for (const file of files) {
                handleFileUpload(file);
            }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener("drop", handleDrop);

        return () => {
            editorElement.removeEventListener("drop", handleDrop);
        };
    }, [editor]);

    // Sync content when value changes externally
    // Compare cleaned versions to avoid overwriting blob URLs with empty src
    useEffect(() => {
        if (!editor) return;

        const cleanBlobUrls = (html: string) => html.replace(/src="blob:[^"]*"/g, 'src=""');
        const currentClean = cleanBlobUrls(editor.getHTML());
        const valueClean = cleanBlobUrls(value);

        // Only update if the actual content (excluding blob URLs) is different.
        // CRITICAL: pass `{ emitUpdate: false }` (TipTap v3 API) so TipTap
        // does NOT fire its onUpdate event in response to this programmatic
        // content sync. Without this, TipTap's HTML normalisation produces a
        // synthetic onChange that races with the parent's setState and
        // creates an infinite render loop on tab mount.
        if (currentClean !== valueClean) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [value, editor]);

    // Sync editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled);
        }
    }, [disabled, editor]);

    // Track text selection for bubble menu
    useEffect(() => {
        if (!editor || disabled) return;

        const updateBubbleMenu = () => {
            const { from, to, empty } = editor.state.selection;

            // Hide if no selection or selection is collapsed
            if (empty || from === to) {
                setShowBubbleMenu(false);
                setShowColorPicker(false);
                return;
            }

            // Get selection coordinates
            const { view } = editor;
            const start = view.coordsAtPos(from);
            const end = view.coordsAtPos(to);

            // Calculate position (center above/below selection)
            const containerRect = editorContainerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            const menuWidth = bubbleMenuRef.current?.offsetWidth || 350;
            const menuHeight = 40;
            const left = Math.max(10, Math.min(
                (start.left + end.left) / 2 - containerRect.left - menuWidth / 2,
                containerRect.width - menuWidth - 10
            ));

            // If selection is near top, show below; otherwise show above
            const spaceAbove = start.top - containerRect.top;
            const top = spaceAbove < menuHeight + 10
                ? end.bottom - containerRect.top + 8  // Show below
                : start.top - containerRect.top - menuHeight - 8;  // Show above

            setBubbleMenuPosition({ top, left });
            setShowBubbleMenu(true);
        };

        editor.on('selectionUpdate', updateBubbleMenu);
        editor.on('blur', () => {
            // Delay hiding to allow clicking on bubble menu buttons
            setTimeout(() => {
                if (!bubbleMenuRef.current?.contains(document.activeElement)) {
                    setShowBubbleMenu(false);
                    setShowColorPicker(false);
                }
            }, 150);
        });

        return () => {
            editor.off('selectionUpdate', updateBubbleMenu);
        };
    }, [editor, disabled]);
}
