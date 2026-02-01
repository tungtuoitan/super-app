/**
 * File Attachment Extension for Tiptap
 * Renders file attachments as styled blocks with download links
 */

import { Node, mergeAttributes } from "@tiptap/core";

export interface FileAttachmentOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        fileAttachment: {
            setFileAttachment: (options: {
                url: string;
                fileName: string;
                originalName: string;
                size: number;
                contentType: string;
            }) => ReturnType;
        };
    }
}

export const FileAttachment = Node.create<FileAttachmentOptions>({
    name: "fileAttachment",

    group: "block",

    atom: true,

    addAttributes() {
        return {
            url: {
                default: null,
            },
            fileName: {
                default: null,
            },
            originalName: {
                default: null,
            },
            size: {
                default: 0,
            },
            contentType: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-file-attachment]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const size = HTMLAttributes.size || 0;
        const sizeStr = formatFileSize(size);
        const originalName = HTMLAttributes.originalName || HTMLAttributes.fileName || "File";

        return [
            "div",
            mergeAttributes(this.options.HTMLAttributes, {
                "data-file-attachment": "",
                class: "file-attachment",
            }),
            [
                "a",
                {
                    href: HTMLAttributes.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    download: originalName,
                    class: "file-attachment-link",
                },
                [
                    "span",
                    { class: "file-attachment-icon" },
                    "📎",
                ],
                [
                    "span",
                    { class: "file-attachment-info" },
                    [
                        "span",
                        { class: "file-attachment-name" },
                        originalName,
                    ],
                    [
                        "span",
                        { class: "file-attachment-size" },
                        sizeStr,
                    ],
                ],
            ],
        ];
    },

    addCommands() {
        return {
            setFileAttachment:
                (options) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: options,
                    });
                },
        };
    },
});

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
