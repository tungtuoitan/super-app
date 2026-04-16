/**
 * Rich Text Editor Component
 * Uses Tiptap for rich text editing
 * Supports bold, italic, underline, lists, headings, images, and file attachments
 */

import React, { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
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
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    ImageIcon,
    Paperclip,
    Loader2,
    ListChecks,
    Palette,
    ChevronDown,
    Code2,
} from "lucide-react";
import { fileService, UploadContext } from "@/services/file.service";
import { useAuthStore } from "@/store/Auth.store";
import { FileAttachment } from "./FileAttachmentExtension";
import { ProxyImage } from "./ProxyImageExtension";
import { useProxyImageLoader } from "./useProxyImageLoader";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";
import "./RichTextEditor.css";
import {useConsoleHelper} from "@/shell/hooks/useConsole.helper";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    minHeight?: string;
    /** Auto-focus the editor on mount */
    autoFocus?: boolean;
    /** Increment to trigger focus (for tab-switch scenarios where editor is already mounted) */
    focusTrigger?: number;
    /** Upload context: "project" or "workspace" */
    uploadContext?: UploadContext;
    /** Upload context ID: project_id or workspace_id */
    uploadContextId?: number;
    /**
     * When provided, Enter key sends (calls onEnter) and Ctrl+Enter inserts a new paragraph.
     * Without this prop, Enter behaves normally (creates paragraph).
     */
    onEnter?: () => void;
    /** Show "Copy as plain text" on right-click — strips extra blank lines between paragraphs */
    enableCopyPlainText?: boolean;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, disabled, children, title }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 rounded hover:bg-muted transition-colors",
            isActive && "bg-muted text-primary",
            disabled && "opacity-50 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);

// Basic text colors
const TEXT_COLORS = [
    { name: "Default", color: null },
    { name: "Red", color: "#ef4444" },
    { name: "Orange", color: "#f97316" },
    { name: "Yellow", color: "#eab308" },
    { name: "Green", color: "#22c55e" },
    { name: "Blue", color: "#3b82f6" },
    { name: "Purple", color: "#a855f7" },
    { name: "Pink", color: "#ec4899" },
    { name: "Gray", color: "#6b7280" },
];

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
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const [isUploading, setIsUploading] = useState(false);
    const onEnterRef = useRef<(() => void) | undefined>(onEnter);
    useLayoutEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);
    const [showBubbleMenu, setShowBubbleMenu] = useState(false);
    const [bubbleMenuPosition, setBubbleMenuPosition] = useState({ top: 0, left: 0 });
    const [showColorPicker, setShowColorPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const bubbleMenuRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const _console = useConsoleHelper();

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
            // Get HTML and clean blob URLs before saving
            // Blob URLs are session-specific and won't work after reload
            // Images with data-file-id will be reloaded via proxy
            let html = editor.getHTML();
            html = html.replace(/src="blob:[^"]*"/g, 'src=""');
            onChange(html);
        },
    });

    // Load images with data-file-id via proxy
    useProxyImageLoader({ editor, token: $user.userToken || null });

    // Copy as plain text — joins paragraphs with \n instead of \n\n
    const handleCopyPlainText = useCallback(() => {
        if (!editor) return;
        const { from, to, empty } = editor.state.selection;
        const text = empty
            ? editor.getText({ blockSeparator: '\n' })
            : editor.state.doc.textBetween(from, to, '\n');
        navigator.clipboard.writeText(text);
    }, [editor]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        showContextMenu(e, constants.contextMenu.contextMenuTypes.richTextEditor, {
            onCopyPlainText: handleCopyPlainText,
        });
    }, [showContextMenu, handleCopyPlainText]);

    // Focus when focusTrigger changes (for tab-switch scenarios)
    useEffect(() => {
        if (focusTrigger && editor && !disabled) {
            // Small delay to allow the hidden→visible transition
            requestAnimationFrame(() => editor.commands.focus("end"));
        }
    }, [focusTrigger, editor, disabled]);

    // Handle image upload
    const handleImageUpload = useCallback(
        async (file: File) => {
            if (!editor || !$user.userToken) return;

            try {
                setIsUploading(true);

                // Upload to server with context
                const result = await fileService._uploadImage(
                    $user.userToken,
                    file,
                    uploadContext,
                    uploadContextId
                );

                if (result.success && result.data) {
                    // Get blob URL for immediate display
                    let imageUrl = "";
                    const fileId = result.data.fileId;

                    if (fileId) {
                        // Fetch as blob for secure display
                        const blobUrl = await fileService._getFileBlobUrl($user.userToken, fileId);
                        if (blobUrl) {
                            imageUrl = blobUrl;
                        }
                    }

                    // Insert image into editor with fileId for future loading
                    // The fileId is stored in data-file-id attribute for re-loading when content is loaded
                    editor.chain().focus().setImage({
                        src: imageUrl,
                        // @ts-expect-error - custom attribute for ProxyImage extension
                        "data-file-id": fileId?.toString() || null,
                    }).run();
                }
            } catch (error: unknown) {
                console.error("Failed to upload image:", error);
                // Handle insufficient storage error (507)
                if (error instanceof Response && error.status === 507) {
                    const errorData = await error.json();
                    _console.error(`Không đủ dung lượng Google Drive: ${errorData.message || ""}`);
                } else {
                    _console.error(`Upload ảnh thất bại: ${error instanceof Error ? error.message : String(error)}`);
                }
            } finally {
                setIsUploading(false);
            }
        },
        [editor, $user.userToken, uploadContext, uploadContextId]
    );

    // Handle file attachment upload
    const handleFileUpload = useCallback(
        async (file: File) => {
            if (!editor || !$user.userToken) return;

            try {
                setIsUploading(true);

                // Check if it's an image
                if (fileService._isImageFile(file)) {
                    await handleImageUpload(file);
                    return;
                }

                // Upload as attachment with context
                const result = await fileService._uploadAttachment(
                    $user.userToken,
                    file,
                    uploadContext,
                    uploadContextId
                );

                if (result.success && result.data) {
                    // Insert file attachment into editor
                    editor
                        .chain()
                        .focus()
                        .setFileAttachment({
                            url: result.data.url,
                            fileName: result.data.fileName,
                            originalName: result.data.originalName,
                            size: result.data.size,
                            contentType: result.data.contentType,
                        })
                        .run();
                }
            } catch (error: unknown) {
                console.error("Failed to upload file:", error);
                // Handle insufficient storage error (507)
                if (error instanceof Response && error.status === 507) {
                    const errorData = await error.json();
                    _console.error(`Không đủ dung lượng Google Drive: ${errorData.message || ""}`);
                } else {
                    _console.error(`Upload file thất bại: ${error instanceof Error ? error.message : String(error)}`);
                }
            } finally {
                setIsUploading(false);
            }
        },
        [editor, $user.userToken, handleImageUpload, uploadContext, uploadContextId]
    );

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
    }, [editor, handleImageUpload]);

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
    }, [editor, handleFileUpload]);

    // Sync content when value changes externally
    // Compare cleaned versions to avoid overwriting blob URLs with empty src
    useEffect(() => {
        if (!editor) return;

        const cleanBlobUrls = (html: string) => html.replace(/src="blob:[^"]*"/g, 'src=""');
        const currentClean = cleanBlobUrls(editor.getHTML());
        const valueClean = cleanBlobUrls(value);

        // Only update if the actual content (excluding blob URLs) is different
        if (currentClean !== valueClean) {
            editor.commands.setContent(value);
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

            {/* Floating Bubble Menu - appears when text is selected */}
            {showBubbleMenu && (
                <div
                    ref={bubbleMenuRef}
                    className="absolute z-50 flex items-center gap-0.5 p-1 bg-popover border border-border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
                    style={{
                        top: bubbleMenuPosition.top,
                        left: bubbleMenuPosition.left,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        disabled={disabled}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        disabled={disabled}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive("underline")}
                        disabled={disabled}
                        title="Underline (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-border mx-0.5" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        isActive={editor.isActive("heading", { level: 1 })}
                        disabled={disabled}
                        title="Heading 1"
                    >
                        <Heading1 className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive("heading", { level: 2 })}
                        disabled={disabled}
                        title="Heading 2"
                    >
                        <Heading2 className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-border mx-0.5" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        disabled={disabled}
                        title="Bullet List"
                    >
                        <List className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        disabled={disabled}
                        title="Ordered List"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        isActive={editor.isActive("taskList")}
                        disabled={disabled}
                        title="Checklist"
                    >
                        <ListChecks className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        isActive={editor.isActive("codeBlock")}
                        disabled={disabled}
                        title="Code Block"
                    >
                        <Code2 className="h-4 w-4" />
                    </ToolbarButton>

                    <div className="w-px h-5 bg-border mx-0.5" />

                    {/* Color Picker */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            disabled={disabled}
                            title="Text Color"
                            className={cn(
                                "p-1.5 rounded hover:bg-muted transition-colors flex items-center gap-0.5",
                                showColorPicker && "bg-muted",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Palette className="h-4 w-4" />
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        {showColorPicker && (
                            <div
                                className="absolute top-full w-72 left-0 mt-1 p-1.5 bg-popover border border-border rounded-lg shadow-lg flex  gap-1 z-10"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                {TEXT_COLORS.map((item) => (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => {
                                            if (item.color) {
                                                editor.chain().focus().setColor(item.color).run();
                                            } else {
                                                editor.chain().focus().unsetColor().run();
                                            }
                                            setShowColorPicker(false);
                                        }}
                                        title={item.name}
                                        className={cn(
                                            "w-6 h-6 rounded border border-border hover:scale-110 transition-transform",
                                            !item.color && "bg-foreground"
                                        )}
                                        style={item.color ? { backgroundColor: item.color } : undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-border mx-0.5" />

                    <ToolbarButton
                        onClick={() => imageInputRef.current?.click()}
                        disabled={disabled || isUploading}
                        title="Insert Image"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isUploading}
                        title="Attach File"
                    >
                        <Paperclip className="h-4 w-4" />
                    </ToolbarButton>
                </div>
            )}

            {/* Upload indicator */}
            {isUploading && (
                <div className="flex items-center gap-1 px-3 py-1 border-b bg-muted/30 text-xs text-muted-foreground">
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
