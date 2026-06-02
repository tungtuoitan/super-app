import { apiFetch } from "./api";

export interface UploadImageResponse {
    url: string;
    fileName: string;
    fileId?: number;
}

export interface FileUploadResult<T> {
    success: boolean;
    message?: string;
    data?: T;
}

export async function uploadImage(blob: Blob, filename: string): Promise<FileUploadResult<UploadImageResponse>> {
    const fd = new FormData();
    const type = blob.type || "image/png";
    fd.append("file", new File([blob], filename, { type }));

    const res = await apiFetch("/api/design/capture", { method: "POST", body: fd });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as FileUploadResult<UploadImageResponse>;
}

export function dataUrlToBlob(dataUrl: string): Blob {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/png";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}
