/**
 * RichTextEditor types (moved out of RichTextEditor.tsx, unchanged)
 */

import type React from "react";
import type { Editor } from "@tiptap/react";
import type { UploadContext } from "@/shared";

export interface RichTextEditorProps {
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

export interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
}

export interface RichTextBubbleMenuProps {
    editor: Editor;
    disabled: boolean;
    isUploading: boolean;
    showColorPicker: boolean;
    setShowColorPicker: (value: boolean) => void;
    bubbleMenuRef: React.RefObject<HTMLDivElement>;
    bubbleMenuPosition: { top: number; left: number };
    imageInputRef: React.RefObject<HTMLInputElement>;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export interface UseRichTextEditorUploadParams {
    editor: Editor | null;
    userToken: string | null | undefined;
    uploadContext?: UploadContext;
    uploadContextId?: number;
}

export interface UseRichTextEditorHeadlessParams {
    editor: Editor | null;
    value: string;
    disabled: boolean;
    focusTrigger?: number;
    handleImageUpload: (file: File) => Promise<void>;
    handleFileUpload: (file: File) => Promise<void>;
    setShowBubbleMenu: (value: boolean) => void;
    setShowColorPicker: (value: boolean) => void;
    setBubbleMenuPosition: (value: { top: number; left: number }) => void;
    editorContainerRef: React.RefObject<HTMLDivElement>;
    bubbleMenuRef: React.RefObject<HTMLDivElement>;
}
