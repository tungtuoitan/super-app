/**
 * WikiIconPicker — upload/remove a custom image for a keyword node.
 * Same processing logic as TrackIconPicker: crop to square, resize 48×48, compress as webp.
 */
import { useRef, useState } from "react";
import { Upload, X, BookOpen, Loader2 } from "lucide-react";

interface Props {
    value?: string;   // base64 data URL or undefined
    onChange: (v: string | undefined) => void;
}

const TARGET_SIZE = 48;
const MAX_BYTES   = 150 * 1024;

function processImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const sx   = (img.naturalWidth - side) / 2;
            const sy   = (img.naturalHeight - side) / 2;
            const cvs  = document.createElement("canvas");
            cvs.width  = TARGET_SIZE;
            cvs.height = TARGET_SIZE;
            cvs.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
            let q = 0.92, dataUrl = cvs.toDataURL("image/webp", q);
            while (dataUrl.length * 0.75 > MAX_BYTES && q > 0.1) {
                q -= 0.05;
                dataUrl = cvs.toDataURL("image/webp", q);
            }
            resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = url;
    });
}

const isCustomImage = (v?: string) => !!v && v.startsWith("data:image");

export function WikiIconPicker({ value, onChange }: Props) {
    const fileRef    = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy]         = useState(false);

    const hasImg = isCustomImage(value);

    const handle = async (file: File) => {
        if (!file.type.startsWith("image/")) return;
        setBusy(true);
        try { onChange(await processImage(file)); }
        finally { setBusy(false); }
    };

    return (
        <div
            className={`relative flex items-center gap-3 rounded-xl h-16 border-2 border-dashed px-3 cursor-pointer transition-colors
                ${dragging
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/[0.1] hover:border-violet-500/50 hover:bg-white/[0.02]"}
            `}
            onClick={() => { if (!hasImg) fileRef.current?.click(); }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
                e.preventDefault(); setDragging(false);
                const f = e.dataTransfer.files[0]; if (f) handle(f);
            }}
            onPaste={e => {
                const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
                if (item) { const f = item.getAsFile(); if (f) handle(f); }
            }}
            tabIndex={0}
        >
            {/* Preview */}
            {hasImg ? (
                <img src={value} alt="icon" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10" />
            ) : (
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-zinc-600" />
                </div>
            )}

            {/* Label */}
            <div className="flex-1 min-w-0">
                {busy ? (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing…
                    </span>
                ) : hasImg ? (
                    <span className="text-xs text-zinc-400">Custom image set</span>
                ) : (
                    <span className="text-xs text-zinc-500">Click, drag & drop, or paste image</span>
                )}
            </div>

            {/* Actions */}
            {hasImg && !busy && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        title="Replace"
                    >
                        <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onChange(undefined); }}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        title="Remove"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {!hasImg && !busy && <Upload className="w-4 h-4 text-zinc-600 flex-shrink-0" />}

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }}
            />
        </div>
    );
}
