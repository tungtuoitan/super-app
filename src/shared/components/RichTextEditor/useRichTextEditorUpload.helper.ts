/**
 * RichTextEditor upload handlers (moved out of RichTextEditor.tsx, unchanged)
 */

import { useState } from "react";
import { _isImageFile, fileService, useConsoleHelper } from "@/shared";
import type { UseRichTextEditorUploadParams } from "./richTextEditor.type";

export function useRichTextEditorUploadHelper({
    editor,
    userToken,
    uploadContext,
    uploadContextId,
}: UseRichTextEditorUploadParams) {
    const [isUploading, setIsUploading] = useState(false);
    const _console = useConsoleHelper();

    // Handle image upload
    const handleImageUpload = async (file: File) => {
            if (!editor || !userToken) return;

            try {
                setIsUploading(true);

                // Upload to server with context
                const result = await fileService._uploadImage(
                    userToken,
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
                        const blobUrl = await fileService._getFileBlobUrl(userToken, fileId);
                        if (blobUrl) {
                            imageUrl = blobUrl;
                        }
                    }

                    // Insert image into editor with fileId for future loading
                    // The fileId is stored in data-file-id attribute for re-loading when content is loaded
                    (editor.chain().focus() as any).setImage({
                        src: imageUrl,
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
        };

    // Handle file attachment upload
    const handleFileUpload = async (file: File) => {
            if (!editor || !userToken) return;

            try {
                setIsUploading(true);

                // Check if it's an image
                if (_isImageFile(file)) {
                    await handleImageUpload(file);
                    return;
                }

                // Upload as attachment with context
                const result = await fileService._uploadAttachment(
                    userToken,
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
        };

    return { isUploading, handleImageUpload, handleFileUpload };
}
