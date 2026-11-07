/**
 * RichTextEditor floating bubble menu (moved out of RichTextEditor.tsx, unchanged)
 */

import React from "react";
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
import { cn } from "@/lib/utils";
import { TEXT_COLORS } from "../richTextEditor.constants";
import type { RichTextBubbleMenuProps } from "../richTextEditor.type";
import { ToolbarButton } from "./ToolbarButton";

export function RichTextBubbleMenu({
    editor,
    disabled,
    isUploading,
    showColorPicker,
    setShowColorPicker,
    bubbleMenuRef,
    bubbleMenuPosition,
    imageInputRef,
    fileInputRef,
}: RichTextBubbleMenuProps) {
    return (
                <div
                    ref={bubbleMenuRef}
                    className="absolute z-50 flex items-center gap-0.5 p-1 bg-popover border border-sa-border-strong sa-shadow-pop rounded-lg animate-in fade-in-0 zoom-in-95 duration-100"
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
                        <Bold className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        disabled={disabled}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive("underline")}
                        disabled={disabled}
                        title="Underline (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <div className="w-px h-4 bg-sa-border-strong mx-0.5" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        isActive={editor.isActive("heading", { level: 1 })}
                        disabled={disabled}
                        title="Heading 1"
                    >
                        <Heading1 className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive("heading", { level: 2 })}
                        disabled={disabled}
                        title="Heading 2"
                    >
                        <Heading2 className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <div className="w-px h-4 bg-sa-border-strong mx-0.5" />

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        disabled={disabled}
                        title="Bullet List"
                    >
                        <List className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        disabled={disabled}
                        title="Ordered List"
                    >
                        <ListOrdered className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleTaskList().run()}
                        isActive={editor.isActive("taskList")}
                        disabled={disabled}
                        title="Checklist"
                    >
                        <ListChecks className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        isActive={editor.isActive("codeBlock")}
                        disabled={disabled}
                        title="Code Block"
                    >
                        <Code2 className="h-3.5 w-3.5" />
                    </ToolbarButton>

                    <div className="w-px h-4 bg-sa-border-strong mx-0.5" />

                    {/* Color Picker */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            disabled={disabled}
                            title="Text Color"
                            className={cn(
                                "inline-flex h-7 items-center gap-0.5 rounded-md px-1.5 text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground transition-colors duration-100",
                                showColorPicker && "bg-sa-hover-strong text-foreground",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Palette className="h-3.5 w-3.5" />
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        {showColorPicker && (
                            <div
                                className="absolute top-full left-0 mt-1 p-1.5 bg-popover border border-sa-border-strong sa-shadow-pop rounded-lg flex gap-1 z-10"
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
                                            "w-5 h-5 rounded-md border border-sa-border-strong hover:scale-110 transition-transform duration-100",
                                            !item.color && "bg-foreground"
                                        )}
                                        style={item.color ? { backgroundColor: item.color } : undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-sa-border-strong mx-0.5" />

                    <ToolbarButton
                        onClick={() => imageInputRef.current?.click()}
                        disabled={disabled || isUploading}
                        title="Insert Image"
                    >
                        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    </ToolbarButton>

                    <ToolbarButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isUploading}
                        title="Attach File"
                    >
                        <Paperclip className="h-3.5 w-3.5" />
                    </ToolbarButton>
                </div>
    );
}
