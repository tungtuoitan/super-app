/**
 * File Service - API communication for file upload operations
 * Handles image and attachment uploads for rich text editors
 */

import { config } from "@/config/app.config";

export interface UploadImageResponse {
    url: string;
    fileName: string;
}

export interface UploadAttachmentResponse {
    url: string;
    fileName: string;
    originalName: string;
    size: number;
    contentType: string;
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
 * Upload an image file
 * POST /api/file/image
 */
const _uploadImage = async (token: string, file: File): Promise<FileUploadResult<UploadImageResponse>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);

    const formData = new FormData();
    formData.append("file", file);

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
 */
const _uploadAttachment = async (token: string, file: File): Promise<FileUploadResult<UploadAttachmentResponse>> => {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);

    const formData = new FormData();
    formData.append("file", file);

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

export const fileService = {
    _uploadImage,
    _uploadAttachment,
    _blobToBase64,
    _isImageFile,
    _formatFileSize,
};
