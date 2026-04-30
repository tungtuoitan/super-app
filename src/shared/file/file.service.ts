/**
 * File Service - API communication for file upload operations
 * Handles image and attachment uploads for rich text editors
 * Files are uploaded to Google Drive with automatic store selection
 */

import { config } from "config/app.config";
import {apiFetch} from "../fetch/apiClient";
import {FileUploadResult, UploadAttachmentResponse, UploadContext, UploadImageResponse} from "./file.types";

const _uploadImage = async (
    _token: string,
    file: File,
    context?: UploadContext,
    contextId?: number
): Promise<FileUploadResult<UploadImageResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    if (context) formData.append("context", context);
    if (contextId !== undefined) formData.append("contextId", contextId.toString());

    const res = await apiFetch(`${config.api.baseURL}/api/file/image`, {
        method: "POST",
        body: formData,
    });

    if (res.ok) return (await res.json()) as FileUploadResult<UploadImageResponse>;
    return Promise.reject(res);
};

const _uploadAttachment = async (
    _token: string,
    file: File,
    context?: UploadContext,
    contextId?: number
): Promise<FileUploadResult<UploadAttachmentResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    if (context) formData.append("context", context);
    if (contextId !== undefined) formData.append("contextId", contextId.toString());

    const res = await apiFetch(`${config.api.baseURL}/api/file/attachment`, {
        method: "POST",
        body: formData,
    });

    if (res.ok) return (await res.json()) as FileUploadResult<UploadAttachmentResponse>;
    return Promise.reject(res);
};

const _blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};



const _fetchFileAsBlob = async (_token: string, fileId: number): Promise<string | null> => {
    try {
        const res = await apiFetch(`${config.api.baseURL}/api/file/${fileId}/content`, {
            method: "GET",
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

const blobUrlCache = new Map<number, string>();
const _getFileBlobUrl = async (_token: string, fileId: number): Promise<string | null> => {
    if (blobUrlCache.has(fileId)) return blobUrlCache.get(fileId)!;

    const blobUrl = await _fetchFileAsBlob("", fileId);
    if (blobUrl) blobUrlCache.set(fileId, blobUrl);
    return blobUrl;
};


export const fileService = {
    _uploadImage,
    _uploadAttachment,
    _fetchFileAsBlob,
    _getFileBlobUrl
};
