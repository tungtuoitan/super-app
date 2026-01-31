/**
 * Rich Text Editor Component
 * Uses Tiptap for rich text editing
 * Supports bold, italic, underline, lists, headings, images, and file attachments
 */

import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { cn } from "@/lib/utils";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Undo,
    Redo,
    ImageIcon,
    Paperclip,
    Loader2,
    ListChecks,
} from "lucide-react";
import { fileService } from "@/services/file.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { FileAttachment } from "./FileAttachmentExtension";
import "./RichTextEditor.css";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    minHeight?: string;
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

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Start typing...",
    disabled = false,
    className,
    minHeight = "200px",
}: RichTextEditorProps) {
    const { $user } = useAuthStore();
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            Image.configure({
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
            TaskList.configure({
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
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Handle image upload
    const handleImageUpload = useCallback(
        async (file: File) => {
            if (!editor || !$user.userToken) return;

            try {
                setIsUploading(true);

                // Upload to server
                const result = await fileService._uploadImage($user.userToken, file);

                if (result.success && result.data) {
                    // Insert image into editor
                    editor.chain().focus().setImage({ src: result.data.url }).run();
                }
            } catch (error) {
                console.error("Failed to upload image:", error);
            } finally {
                setIsUploading(false);
            }
        },
        [editor, $user.userToken]
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

                // Upload as attachment
                const result = await fileService._uploadAttachment($user.userToken, file);

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
            } catch (error) {
                console.error("Failed to upload file:", error);
            } finally {
                setIsUploading(false);
            }
        },
        [editor, $user.userToken, handleImageUpload]
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
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    // Sync editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(!disabled);
        }
    }, [disabled, editor]);

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
        <div className={cn("border rounded-md overflow-hidden bg-background", disabled && "opacity-60", className)}>
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

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30 flex-wrap">
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

                <div className="w-px h-5 bg-border mx-1" />

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

                <div className="w-px h-5 bg-border mx-1" />

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

                <div className="w-px h-5 bg-border mx-1" />

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

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={disabled || !editor.can().undo()}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="h-4 w-4" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={disabled || !editor.can().redo()}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="h-4 w-4" />
                </ToolbarButton>

                {isUploading && (
                    <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                    </span>
                )}
            </div>

            {/* Editor Content */}
            <EditorContent
                editor={editor}
                className={cn("prose prose-sm dark:prose-invert max-w-none p-3 focus:outline-none")}
                style={{ minHeight }}
            />
        </div>
    );
}
