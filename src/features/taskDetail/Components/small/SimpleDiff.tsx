import { useMemo, useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileService } from "@/shared";
import { useAuthStore } from "@/shared";
import type { SimpleDiffProps, ImageInfo, DiffLine, InlineSegment } from "../../types/taskComment.types";
import { htmlToPlainText, computeImageDiff, computeDiff } from "../../utils/simpleDiff.utils";

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
        <div className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5",
            isAdd ? "border-sa-good/35 bg-sa-good/10" : "border-sa-danger/35 bg-sa-danger/10")}>
            <span className={cn("font-mono text-[11px]", isAdd ? "text-sa-good" : "text-sa-danger")}>
                {isAdd ? "+" : "-"}
            </span>
            {blobUrl ? (
                <img src={blobUrl} alt={`file-${img.fileId}`} className="h-12 max-w-[120px] rounded-md object-cover" />
            ) : (
                <span className="text-[10px] text-muted-foreground">Image #{img.fileId}</span>
            )}
        </div>
    );
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <button onClick={handleCopy} title={`Copy ${label}`}
            className="flex h-6 items-center gap-1 rounded-md border border-sa-border px-1.5 text-[11px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground">
            {copied ? <Check className="h-2.5 w-2.5 text-sa-good" /> : <Copy className="h-2.5 w-2.5" />}
            {label}
        </button>
    );
}

/** Render inline segments with word-level highlights */
function InlineHighlight({ segments, side }: { segments: InlineSegment[]; side: "old" | "new" }) {
    return (
        <span className="whitespace-pre-wrap break-all">
            {segments.map((seg, i) => {
                if (seg.type === "equal") return <span key={i}>{seg.text}</span>;
                const isHighlight = (side === "old" && seg.type === "remove") || (side === "new" && seg.type === "add");
                if (!isHighlight) return null;
                return (
                    <span key={i} className={cn(
                        "rounded-sm",
                        side === "old" ? "bg-sa-danger/25 text-sa-danger" : "bg-sa-good/25 text-sa-good",
                    )}>
                        {seg.text}
                    </span>
                );
            })}
        </span>
    );
}

function DiffLineRow({ line, showUnchanged }: { line: DiffLine; showUnchanged: boolean }) {
    if (line.type === "equal" && !showUnchanged) return null;

    const isModify = line.type === "modify";
    const isOldModify = isModify && line.side === "old";
    const isNewModify = isModify && line.side === "new";

    return (
        <div className={cn(
            "flex leading-5 min-h-[20px] text-xs font-mono",
            line.type === "add" && "bg-sa-good/10 text-sa-good",
            line.type === "remove" && "bg-sa-danger/10 text-sa-danger",
            isOldModify && "bg-sa-danger/10 text-sa-danger",
            isNewModify && "bg-sa-good/10 text-sa-good",
            line.type === "equal" && "text-muted-foreground/70",
        )}>
            {/* Old line number */}
            <span className={cn(
                "w-8 shrink-0 select-none text-right pr-1 border-r border-sa-border text-[10px] leading-5",
                (line.type === "add" || isNewModify) ? "text-transparent" : "text-muted-foreground/40",
            )}>
                {line.oldLineNo ?? ""}
            </span>
            {/* New line number */}
            <span className={cn(
                "w-8 shrink-0 select-none text-right pr-1 border-r border-sa-border text-[10px] leading-5",
                (line.type === "remove" || isOldModify) ? "text-transparent" : "text-muted-foreground/40",
            )}>
                {line.newLineNo ?? ""}
            </span>
            {/* +/- indicator */}
            <span className="w-4 shrink-0 select-none opacity-50 text-center">
                {line.type === "add" || isNewModify ? "+" : line.type === "remove" || isOldModify ? "−" : " "}
            </span>
            {/* Content */}
            <span className="flex-1 px-1">
                {isModify && line.segments ? (
                    <InlineHighlight segments={line.segments} side={line.side!} />
                ) : (
                    <span className="whitespace-pre-wrap break-all">{line.content || " "}</span>
                )}
            </span>
        </div>
    );
}

export function SimpleDiff({ oldText, newText, showImageDiff = false, onContentExpand, stripHtml = false }: SimpleDiffProps) {
    const [showUnchanged, setShowUnchanged] = useState(false);
    const displayOld = stripHtml ? htmlToPlainText(oldText) : oldText
    const displayNew = stripHtml ? htmlToPlainText(newText) : newText
    const lines = computeDiff(displayOld.split("\n"), displayNew.split("\n"))

    const imageDiff = (() => {
        if (!showImageDiff) return null;
        const diff = computeImageDiff(oldText, newText);
        if (diff.added.length === 0 && diff.removed.length === 0) return null;
        return diff;
    })()

    const hasTextChanges = lines.some((l) => l.type !== "equal");
    const hasImageChanges = imageDiff !== null;
    const removeCount = lines.filter((l) => l.type === "remove" || (l.type === "modify" && l.side === "old")).length;
    const addCount = lines.filter((l) => l.type === "add" || (l.type === "modify" && l.side === "new")).length;

    if (!hasTextChanges && !hasImageChanges) {
        return <div className="py-2 text-[11px] text-muted-foreground">No differences found.</div>;
    }

    return (
        <div className="space-y-2 text-left">
            {hasImageChanges && (
                <div className="flex flex-wrap gap-2">
                    {imageDiff!.removed.map((img) => <DiffImageThumb key={`rm-${img.fileId}`} img={img} type="remove" />)}
                    {imageDiff!.added.map((img) => <DiffImageThumb key={`add-${img.fileId}`} img={img} type="add" />)}
                </div>
            )}

            {hasTextChanges && (
                <div className="overflow-hidden rounded-lg border border-sa-border">
                    <div className="flex h-8 items-center gap-2 border-b border-sa-border px-3">
                        <span className="font-mono text-[11px] text-muted-foreground">
                            <span className="text-sa-danger">−{removeCount}</span>
                            {" / "}
                            <span className="text-sa-good">+{addCount}</span>
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <CopyButton text={displayOld} label="Old" />
                            <CopyButton text={displayNew} label="New" />
                            <button onClick={() => {
                                const next = !showUnchanged;
                                setShowUnchanged(next);
                                if (next && onContentExpand) requestAnimationFrame(() => onContentExpand());
                            }} className="text-[11px] text-muted-foreground transition-colors duration-100 hover:text-foreground">
                                {showUnchanged ? "Hide unchanged" : "Show all"}
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {lines.map((line, i) => (
                            <DiffLineRow key={i} line={line} showUnchanged={showUnchanged} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
