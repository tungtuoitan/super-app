/**
 * TrackIconPicker - upload custom image for a track icon
 * No image → default Shell icon (rendered with track color elsewhere)
 * Upload: crop to square, resize to 32×32, compress to <100KB, store as base64
 */

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Shell } from "lucide-react";

interface TrackIconPickerProps {
    value: string;          // base64 data URL, or "" / DEFAULT_ICON for no custom image
    onChange: (v: string) => void;
    trackColor?: string;    // used to tint the default Shell icon preview
}

const TARGET_SIZE = 32;
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

export function TrackIconPicker({ value, onChange, trackColor }: TrackIconPickerProps) {
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
            className={cn(
                "relative flex items-center gap-3 rounded-lg border-2 border-dashed px-3 py-3 cursor-pointer transition-colors",
                dragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
            )}
            onClick={() => !hasImage && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
        >
            {/* Preview */}
            {hasImage ? (
                <img src={value} alt="icon" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
            ) : (
                <span
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ color: trackColor ?? "#f59e0b" }}
                >
                    <Shell className="w-5 h-5" />
                </span>
            )}

            {/* Label */}
            <div className="flex-1 min-w-0">
                {processing ? (
                    <span className="text-xs text-muted-foreground">Processing...</span>
                ) : hasImage ? (
                    <span className="text-xs text-muted-foreground">Custom image</span>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        Click or drag & drop to upload image
                    </span>
                )}
            </div>

            {/* Actions */}
            {hasImage && !processing && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        title="Replace image"
                    >
                        <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(""); }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                        title="Remove image"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {!hasImage && !processing && (
                <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
