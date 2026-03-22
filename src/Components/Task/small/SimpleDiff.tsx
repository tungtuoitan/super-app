import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileService } from "@/services/file.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import type { SimpleDiffProps, ImageInfo } from "@/types/task/taskComment.types";
import { htmlToPlainText, computeImageDiff, computeDiff } from "@/utils/task/simpleDiff.utils";

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

function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [text]);

    return (
        <button onClick={handleCopy} title={`Copy ${label}`}
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
            {copied ? <Check className="h-2.5 w-2.5 text-green-400" /> : <Copy className="h-2.5 w-2.5" />}
            {label}
        </button>
    );
}

export function SimpleDiff({ oldText, newText, showImageDiff = false, onContentExpand, stripHtml = false }: SimpleDiffProps) {
    const [showUnchanged, setShowUnchanged] = useState(false);
    const displayOld = useMemo(() => stripHtml ? htmlToPlainText(oldText) : oldText, [oldText, stripHtml]);
    const displayNew = useMemo(() => stripHtml ? htmlToPlainText(newText) : newText, [newText, stripHtml]);
    const lines = useMemo(() => computeDiff(displayOld.split("\n"), displayNew.split("\n")), [displayOld, displayNew]);

    const imageDiff = useMemo(() => {
        if (!showImageDiff) return null;
        const diff = computeImageDiff(oldText, newText);
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
            {hasImageChanges && (
                <div className="flex flex-wrap gap-2">
                    {imageDiff!.removed.map((img) => <DiffImageThumb key={`rm-${img.fileId}`} img={img} type="remove" />)}
                    {imageDiff!.added.map((img) => <DiffImageThumb key={`add-${img.fileId}`} img={img} type="add" />)}
                </div>
            )}

            {hasTextChanges && (
                <div className="rounded border border-border overflow-hidden text-xs font-mono">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border">
                        <span className="text-[10px] text-muted-foreground">
                            <span className="text-red-400">−{lines.filter((l) => l.type === "remove").length}</span>
                            {" / "}
                            <span className="text-green-400">+{lines.filter((l) => l.type === "add").length}</span>
                        </span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <CopyButton text={displayOld} label="Old" />
                            <CopyButton text={displayNew} label="New" />
                            <button onClick={() => {
                                const next = !showUnchanged;
                                setShowUnchanged(next);
                                if (next && onContentExpand) requestAnimationFrame(() => onContentExpand());
                            }} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                {showUnchanged ? "Hide unchanged" : "Show all"}
                            </button>
                        </div>
                    </div>

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
