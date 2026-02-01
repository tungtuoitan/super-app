/**
 * File Service - API communication for file upload operations
 * Handles image and attachment uploads for rich text editors
 * Files are uploaded to Google Drive with automatic store selection
 */

import { config } from "@/config/app.config";

export interface UploadImageResponse {
    url: string;
    fileName: string;
    fileId?: number;
}

export interface UploadAttachmentResponse {
    url: string;
    fileName: string;
    originalName: string;
    size: number;
    contentType: string;
    fileId?: number;
}

/**
 * File upload response from backend
 * Uses 'data' as object (not array) for file uploads
 */
export interface FileUploadResult<T> {
    success: boolean;
    message?: string;
    data?: T; // Single object for file uploads
}

/**
 * Upload context for file uploads
 */
export type UploadContext = "project" | "workspace";

/**
 * Upload an image file
 * POST /api/file/image
 * @param token - Authentication token
 * @param file - File to upload
 * @param context - Context type: "project" or "workspace"
 * @param contextId - Context ID (project_id or workspace_id)
 */
const _uploadImage = async (
    token: string,
    file: File,
    context?: UploadContext,
    contextId?: number
): Promise<FileUploadResult<UploadImageResponse>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);

    const formData = new FormData();
    formData.append("file", file);
    if (context) {
        formData.append("context", context);
    }
    if (contextId !== undefined) {
        formData.append("contextId", contextId.toString());
    }

    const res = await window.fetch(`${config.api.baseURL}/api/file/image`, {
        method: "POST",
        headers,
        body: formData,
    });

    if (res.ok) {
        return (await res.json()) as FileUploadResult<UploadImageResponse>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Upload a file attachment
 * POST /api/file/attachment
 * @param token - Authentication token
 * @param file - File to upload
 * @param context - Context type: "project" or "workspace"
 * @param contextId - Context ID (project_id or workspace_id)
 */
const _uploadAttachment = async (
    token: string,
    file: File,
    context?: UploadContext,
    contextId?: number
): Promise<FileUploadResult<UploadAttachmentResponse>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);

    const formData = new FormData();
    formData.append("file", file);
    if (context) {
        formData.append("context", context);
    }
    if (contextId !== undefined) {
        formData.append("contextId", contextId.toString());
    }

    const res = await window.fetch(`${config.api.baseURL}/api/file/attachment`, {
        method: "POST",
        headers,
        body: formData,
    });

    if (res.ok) {
        return (await res.json()) as FileUploadResult<UploadAttachmentResponse>;
    } else {
        return Promise.reject(res);
    }
};

/**
 * Convert a blob/file to base64 data URL (for preview before upload)
 */
const _blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Check if file is an image
 */
const _isImageFile = (file: File): boolean => {
    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    return imageTypes.includes(file.type);
};

/**
 * Format file size for display
 */
const _formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Fetch file content as Blob (for use with blob URLs in img tags)
 * This approach keeps files private - requires JWT auth
 * @param token - Authentication token
 * @param fileId - Database file ID
 * @returns Blob URL that can be used in img src
 */
const _fetchFileAsBlob = async (token: string, fileId: number): Promise<string | null> => {
    try {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${token}`);

        const res = await window.fetch(`${config.api.baseURL}/api/file/${fileId}/content`, {
            method: "GET",
            headers,
        });

        if (res.ok) {
            const blob = await res.blob();
            return URL.createObjectURL(blob);
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch file:", error);
        return null;
    }
};

/**
 * Revoke a blob URL to free memory
 * Call this when the image is no longer needed
 * @param blobUrl - Blob URL to revoke
 */
const _revokeBlobUrl = (blobUrl: string): void => {
    if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
    }
};

/**
 * Cache for blob URLs to avoid re-fetching
 */
const blobUrlCache = new Map<number, string>();

/**
 * Get blob URL for file (with caching)
 * @param token - Authentication token
 * @param fileId - Database file ID
 * @returns Cached or new blob URL
 */
const _getFileBlobUrl = async (token: string, fileId: number): Promise<string | null> => {
    // Check cache first
    if (blobUrlCache.has(fileId)) {
        return blobUrlCache.get(fileId)!;
    }

    // Fetch and cache
    const blobUrl = await _fetchFileAsBlob(token, fileId);
    if (blobUrl) {
        blobUrlCache.set(fileId, blobUrl);
    }
    return blobUrl;
};

/**
 * Clear blob URL cache (call on logout or when memory needs to be freed)
 */
const _clearBlobUrlCache = (): void => {
    blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
    blobUrlCache.clear();
};

export const fileService = {
    _uploadImage,
    _uploadAttachment,
    _blobToBase64,
    _isImageFile,
    _formatFileSize,
    _fetchFileAsBlob,
    _revokeBlobUrl,
    _getFileBlobUrl,
    _clearBlobUrlCache,
};
