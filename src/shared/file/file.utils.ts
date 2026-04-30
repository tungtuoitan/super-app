/**
 * File Service - API communication for file upload operations
 * Handles image and attachment uploads for rich text editors
 * Files are uploaded to Google Drive with automatic store selection
 */

import { config } from "config/app.config";
import {apiFetch} from "../fetch/apiClient";

export const _blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const _isImageFile = (file: File): boolean => {
    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    return imageTypes.includes(file.type);
};

export const _formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};


export const _revokeBlobUrl = (blobUrl: string): void => {
    if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
    }
};

