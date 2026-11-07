/**
 * Rich Text Editor Component
 * Uses Tiptap for rich text editing
 * Supports bold, italic, underline, lists, headings, images, and file attachments
 */

import React, { useLayoutEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskGrid from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared";
import { FileAttachment } from "./FileAttachmentExtension";
import { ProxyImage } from "./ProxyImageExtension";
import { useProxyImageLoader } from "./useProxyImageLoader";
import { useMenuContextHelper } from "@/shared";
import type { RichTextEditorProps } from "./richTextEditor.type";
import { useRichTextEditorUploadHelper } from "./useRichTextEditorUpload.helper";
import { useRichTextEditorHeadless } from "./useRichTextEditor.headless";
import { RichTextBubbleMenu } from "./small/RichTextBubbleMenu";
import "./RichTextEditor.css";

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Start typing...",
    disabled = false,
    className,
    minHeight = "200px",
    autoFocus = false,
    focusTrigger,
    uploadContext,
    uploadContextId,
    onEnter,
    enableCopyPlainText = false,
}: RichTextEditorProps) {
    const { $user } = useAuthStore();
    const { showContextMenu } = useMenuContextHelper();
    const onEnterRef = useRef<(() => void) | undefined>(onEnter);
    useLayoutEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);

    // Track the latest external `value` prop and the latest HTML we emitted
    // upward via onChange. TipTap fires `onUpdate` on a number of internal
    // transactions (placeholders, decorations, image-src patches) — even when
    // `emitUpdate: false` is passed to `setContent`. Guarding here ensures
    // we never push HTML upward that the parent already knows about, which
    // would otherwise cause an infinite tab→state→prop→editor→onUpdate loop.
    const valueRef = useRef<string>(value);
    useLayoutEffect(() => { valueRef.current = value; }, [value]);
    const lastEmittedRef = useRef<string>("");
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ top: 0, left: 0 });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        editorProps: {
            handleKeyDown: (view, event) => {
                if (!onEnterRef.current) return false;
                if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
                    // Enter → send
                    onEnterRef.current();
                    return true;
                }
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    // Ctrl+Enter → new paragraph
                    const { state } = view;
                    const tr = state.tr;
                    if (!state.selection.empty) tr.deleteSelection();
                    tr.split(tr.mapping.map(state.selection.$from.pos)).scrollIntoView();
                    view.dispatch(tr);
                    return true;
                }
                return false;
            },
            handlePaste: (view, event) => {
                const clipData = event.clipboardData;
                if (!clipData) return false;
                // If clipboard has image, let the existing image paste handler handle it
                for (const item of clipData.items) {
                    if (item.type.startsWith("image/")) return false;
                }
                const plain = clipData.getData("text/plain");
                const html = clipData.getData("text/html");
                // If there's no HTML (plain text paste) and content has indentation → wrap in code block
                if (!html && plain && /^[ \t]+\S/m.test(plain)) {
                    event.preventDefault();
                    view.dispatch(
                        view.state.tr.replaceSelectionWith(
                            view.state.schema.nodes.codeBlock.create(null, view.state.schema.text(plain))
                        )
                    );
                    return true;
                }
                return false;
            },
        },
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2] },
                codeBlock: false,
            }),
            CodeBlock.configure({
                HTMLAttributes: { class: "rich-text-codeblock" },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            TextStyle,
            Color,
            ProxyImage.configure({
                // @ts-ignore - HTMLAttributes is valid Tiptap config but not typed in tiptap-extension-resize-image
                HTMLAttributes: {
                    class: "rich-text-image",
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "rich-text-link",
                },
            }),
            TaskGrid.configure({
                HTMLAttributes: {
                    class: "task-list",
                },
            }),
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    class: "task-item",
                },
            }),
            FileAttachment,
        ],
        content: value,
        editable: !disabled,
        autofocus: autoFocus ? "end" : false,
        onUpdate: ({ editor }) => {
            let html = editor.getHTML();
            html = html.replace(/src="blob:[^"]*"/g, 'src=""');
            // Suppress synthetic onUpdate echoes that match either the parent's
            // current `value` prop or the HTML we last emitted upward.
            if (html === valueRef.current) return;
            if (html === lastEmittedRef.current) return;
            lastEmittedRef.current = html;
            onChange(html);
        },
    });

    // Load images with data-file-id via proxy
    useProxyImageLoader({ editor, token: $user.userToken || null });

    // Copy as plain text — joins paragraphs with \n instead of \n\n
    const handleCopyPlainText = () => {
        if (!editor) return;
        const { from, to, empty } = editor.state.selection;
        const text = empty
            ? editor.getText({ blockSeparator: '\n' })
            : editor.state.doc.textBetween(from, to, '\n');
        navigator.clipboard.writeText(text);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        showContextMenu(e, "richtext-editor", {
            onCopyPlainText: handleCopyPlainText,
        });
    };

    const { isUploading, handleImageUpload, handleFileUpload } = useRichTextEditorUploadHelper({
        editor,
        userToken: $user.userToken,
        uploadContext,
        uploadContextId,
    });

    useRichTextEditorHeadless({
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
    });

    // Handle image input change
    const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
        // Reset input
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    // Handle file input change
    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div
            ref={editorContainerRef}
            className={cn("overflow-hidden bg-background relative", disabled && "opacity-60", className)}
            onContextMenu={enableCopyPlainText ? handleContextMenu : undefined}
        >
            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageInputChange}
                className="hidden"
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,image/*"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {showBubbleMenu && (
                <RichTextBubbleMenu
                    editor={editor}
                    disabled={disabled}
                    isUploading={isUploading}
                    showColorPicker={showColorPicker}
                    setShowColorPicker={setShowColorPicker}
                    bubbleMenuRef={bubbleMenuRef}
                    bubbleMenuPosition={bubbleMenuPosition}
                    imageInputRef={imageInputRef}
                    fileInputRef={fileInputRef}
                />
            )}

            {/* Upload indicator */}
            {isUploading && (
                <div className="flex items-center gap-1.5 px-3 py-1 border-b border-sa-border text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading...
                </div>
            )}

            {/* Editor Content */}
            <EditorContent
                editor={editor}
                className={cn("prose prose-sm dark:prose-invert max-w-none p-3 focus:outline-none")}
                style={{ minHeight }}
            />
        </div>
    );
}
