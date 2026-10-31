/**
 * ProjectImagePicker - the cover image tile of a project
 * No image → dashed "Add cover image" tile; with an image → the image, with replace / remove on hover
 * Upload: crop to square, resize to 256×256, compress to <100KB, store as base64
 */

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, FolderOpen } from "lucide-react";

interface ProjectImagePickerProps {
    value: string;      // base64 data URL, or "" for no custom image
    onChange: (v: string) => void;
}

const TARGET_SIZE = 256;
const MAX_BYTES = 100 * 1024;

function processImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - side) / 2;
            const sy = (img.naturalHeight - side) / 2;

            const canvas = document.createElement("canvas");
            canvas.width = TARGET_SIZE;
            canvas.height = TARGET_SIZE;
            canvas.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);

            let quality = 0.95;
            let dataUrl = canvas.toDataURL("image/webp", quality);
            while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.1) {
                quality -= 0.05;
                dataUrl = canvas.toDataURL("image/webp", quality);
            }
            resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = url;
    });
}

const isCustomImage = (v: string) => v.startsWith("data:image");

export function ProjectImagePicker({ value, onChange }: ProjectImagePickerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);

    const hasImage = isCustomImage(value);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith("image/")) return;
        setProcessing(true);
        try {
            onChange(await processImage(file));
        } finally {
            setProcessing(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div
            tabIndex={0}
            className={cn(
                "group relative flex h-[148px] w-[148px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border text-center outline-none transition-colors duration-100 focus-visible:border-ring",
                hasImage ? "border-sa-border" : "border-dashed",
                dragging ? "border-sa-amber bg-sa-amber/10" : !hasImage && "border-sa-border-strong hover:bg-sa-hover"
            )}
            onClick={(e) => {
                if (e.shiftKey) return;
                if (!hasImage) fileInputRef.current?.click();
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onPaste={(e) => {
                const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
                if (item) { const f = item.getAsFile(); if (f) handleFile(f); }
            }}
        >
            {hasImage ? (
                <img src={value} alt="project" className="h-full w-full object-cover" />
            ) : (
                <>
                    <FolderOpen className="h-7 w-7 text-muted-foreground" />
                    <span className="px-3 text-xs leading-snug text-muted-foreground">
                        {processing ? "Processing..." : "Add cover image"}
                    </span>
                </>
            )}

            {hasImage && !processing && (
                <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="rounded-md bg-background/85 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        title="Replace image"
                    >
                        <Upload className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(""); }}
                        className="rounded-md bg-background/85 p-1.5 text-muted-foreground transition-colors hover:text-sa-danger"
                        title="Remove image"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
        </div>
    );
}
