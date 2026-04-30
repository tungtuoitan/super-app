/**
 * File Service - API communication for file upload operations
 * Handles image and attachment uploads for rich text editors
 * Files are uploaded to Google Drive with automatic store selection
 */

import { config } from "config/app.config";
import {apiFetch} from "../fetch/apiClient";

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

export interface FileUploadResult<T> {
    success: boolean;
    message?: string;
    data?: T;
}

export type UploadContext = "project" | "workspace" | "conversation" | "general";

