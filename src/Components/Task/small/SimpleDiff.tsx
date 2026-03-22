/**
 * SimpleDiff — Line-by-line diff with VS Code dark-theme colors.
 * LCS-based algorithm, image diff for HTML content, copy old/new buttons.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ImagePlus, ImageMinus, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileService } from "@/services/file.service";
import { useAuthStore } from "@/store/auth/Auth.store";

interface SimpleDiffProps {
    oldText: string;
    newText: string;
    oldLabel?: string;
    newLabel?: string;
    /** Extract and show image diffs from HTML content */
    showImageDiff?: boolean;
    /** Called after content expands so parent can adjust scroll */
    onContentExpand?: () => void;
    /** Strip HTML tags before diffing (for description content) */
    stripHtml?: boolean;
}

interface DiffLine { type: "add" | "remove" | "equal"; content: string; }
interface ImageInfo { fileId: string; src: string; }

// ─── Utils ────────────────────────────────────────────────────────────────────

/** Strip HTML tags → plain text, collapse whitespace, keep line breaks */
function htmlToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote|tr|td|th)[^>]*>/gi, "\n")
        .replace(/<img[^>]*>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ─── Image extraction ─────────────────────────────────────────────────────────

function extractImages(html: string): ImageInfo[] {
    const imgs: ImageInfo[] = [];
    const regex = /<img[^>]*data-file-id="(\d+)"[^>]*(?:src="([^"]*)")?[^>]*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
        imgs.push({ fileId: m[1], src: m[2] || "" });
    }
    const regex2 = /<img[^>]*src="([^"]*)"[^>]*data-file-id="(\d+)"[^>]*\/?>/gi;
    while ((m = regex2.exec(html)) !== null) {
        if (!imgs.some((i) => i.fileId === m![2])) {
            imgs.push({ fileId: m[2], src: m[1] || "" });
        }
    }
    return imgs;
}

function computeImageDiff(oldHtml: string, newHtml: string) {
    const oldImgs = extractImages(oldHtml);
    const newImgs = extractImages(newHtml);
    const oldIds = new Set(oldImgs.map((i) => i.fileId));
    const newIds = new Set(newImgs.map((i) => i.fileId));
    return {
        added: newImgs.filter((i) => !oldIds.has(i.fileId)),
        removed: oldImgs.filter((i) => !newIds.has(i.fileId)),
    };
}

// ─── Image thumbnail ──────────────────────────────────────────────────────────

function DiffImageThumb({ img, type }: { img: ImageInfo; type: "add" | "remove" }) {
    const { $user } = useAuthStore();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        if (img.fileId && $user.userToken) {
            fileService._getFileBlobUrl($user.userToken, Number(img.fileId)).then((url) => {
                if (mountedRef.current && url) setBlobUrl(url);
            });
        }
        return () => { mountedRef.current = false; };
    }, [img.fileId, $user.userToken]);

    const isAdd = type === "add";
    return (
        <div className={cn("flex items-center gap-2 rounded border px-2 py-1.5",
            isAdd ? "border-green-500/40 bg-green-500/10" : "border-red-500/40 bg-red-500/10")}>
            <span className={cn("text-[10px]", isAdd ? "text-green-400" : "text-red-400")}>
                {isAdd ? "+" : "-"}
            </span>
            {blobUrl ? (
                <img src={blobUrl} alt={`file-${img.fileId}`} className="h-12 max-w-[120px] object-cover rounded" />
            ) : (
                <span className="text-[10px] text-muted-foreground">Image #{img.fileId}</span>
            )}
        </div>
    );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [text]);

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            title={`Copy ${label}`}
        >
            {copied ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
            {label}
        </button>
    );
}

// ─── LCS line diff ────────────────────────────────────────────────────────────

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = oldLines[i - 1] === newLines[j - 1]
                ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const result: DiffLine[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            result.push({ type: "equal", content: oldLines[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.push({ type: "add", content: newLines[j - 1] }); j--;
        } else {
            result.push({ type: "remove", content: oldLines[i - 1] }); i--;
        }
    }
    return result.reverse();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SimpleDiff({ oldText, newText, showImageDiff = false, onContentExpand, stripHtml = false }: SimpleDiffProps) {
    const [showUnchanged, setShowUnchanged] = useState(false);

    // Prepare text: strip HTML if needed
    const displayOld = useMemo(() => stripHtml ? htmlToPlainText(oldText) : oldText, [oldText, stripHtml]);
    const displayNew = useMemo(() => stripHtml ? htmlToPlainText(newText) : newText, [newText, stripHtml]);

    const lines = useMemo(() => computeDiff(displayOld.split("\n"), displayNew.split("\n")), [displayOld, displayNew]);

    const imageDiff = useMemo(() => {
        if (!showImageDiff) return null;
        const diff = computeImageDiff(oldText, newText); // Always use raw HTML for image extraction
        if (diff.added.length === 0 && diff.removed.length === 0) return null;
        return diff;
    }, [oldText, newText, showImageDiff]);

    const hasTextChanges = lines.some((l) => l.type !== "equal");
    const hasImageChanges = imageDiff !== null;

    if (!hasTextChanges && !hasImageChanges) {
        return <div className="text-[10px] text-muted-foreground italic py-2">No differences found.</div>;
    }

    return (
        <div className="space-y-2">
            {/* Image diff */}
            {hasImageChanges && (
                <div className="flex flex-wrap gap-2">
                    {imageDiff!.removed.map((img) => <DiffImageThumb key={`rm-${img.fileId}`} img={img} type="remove" />)}
                    {imageDiff!.added.map((img) => <DiffImageThumb key={`add-${img.fileId}`} img={img} type="add" />)}
                </div>
            )}

            {/* Text diff */}
            {hasTextChanges && (
                <div className="rounded border border-border overflow-hidden text-xs font-mono">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border">
                        <span className="text-[10px] text-muted-foreground">
                            <span className="text-red-400">−{lines.filter((l) => l.type === "remove").length}</span>
                            {" / "}
                            <span className="text-green-400">+{lines.filter((l) => l.type === "add").length}</span>
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <CopyButton text={displayOld} label="Old" />
                            <CopyButton text={displayNew} label="New" />
                            <button
                                onClick={() => {
                                    const next = !showUnchanged;
                                    setShowUnchanged(next);
                                    if (next && onContentExpand) requestAnimationFrame(() => onContentExpand());
                                }}
                                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showUnchanged ? "Hide unchanged" : "Show all"}
                            </button>
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {lines.map((line, i) => {
                            if (line.type === "equal" && !showUnchanged) return null;
                            return (
                                <div key={i} className={cn(
                                    "flex px-3 py-0.5 leading-5 min-h-[20px]",
                                    line.type === "add" && "bg-green-500/15 text-green-400",
                                    line.type === "remove" && "bg-red-500/15 text-red-400",
                                    line.type === "equal" && "text-muted-foreground/70",
                                )}>
                                    <span className="w-4 shrink-0 select-none opacity-50 text-right mr-2">
                                        {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
                                    </span>
                                    <span className="whitespace-pre-wrap break-all">{line.content || " "}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
