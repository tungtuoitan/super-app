import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Copy, Check, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay, useDeviceStore } from "@/shared";
import type { KAttachment } from "../../types/kAttachment.type";
import { getShikiHighlighter, resolveLang, SHIKI_THEME } from "../../utils/shikiHighlighter";

interface Props {
    atts: KAttachment[];
    att: KAttachment | null;
    onClose: () => void;
}

const LANG_LABEL: Record<string, string> = {
    python: "py", javascript: "js", typescript: "ts", csharp: "cs",
    go: "go", java: "java", rust: "rs", cpp: "cpp", c: "c",
    sql: "sql", shell: "sh", ruby: "rb", php: "php",
    markdown: "md", json: "json", yaml: "yml", plaintext: "txt",
};

export function KAttachmentViewerDialog({ atts, att, onClose }: Props) {
    const { isMobile } = useDeviceStore();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [copied, setCopied] = useState(false);
    const [html, setHtml] = useState<string>("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!att) return;
        const idx = atts.findIndex(a => a.id === att.id);
        setCurrentIdx(idx >= 0 ? idx : 0);
    }, [att, atts]);

    const current = atts[currentIdx] ?? att;

    useEffect(() => {
        if (!current?.content) { setHtml(""); return; }
        let cancelled = false;
        setBusy(true);
        getShikiHighlighter()
            .then(hl => hl.codeToHtml(current.content!, {
                lang: resolveLang(current.title, current.language),
                theme: SHIKI_THEME,
            }))
            .then(out => { if (!cancelled) setHtml(out); })
            .catch(() => { if (!cancelled) setHtml(escapePlain(current.content!)); })
            .finally(() => { if (!cancelled) setBusy(false); });
        return () => { cancelled = true; };
    }, [current?.content, current?.language, current?.title]);

    const handleCopy = () => {
        if (!current?.content) return;
        navigator.clipboard.writeText(current.content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    const langLabel = current?.language ? (LANG_LABEL[current.language] ?? current.language) : "txt";
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx < atts.length - 1;

    return (
        <Dialog open={!!att} onOpenChange={open => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay />
                <DialogPrimitive.Content
                    className={isMobile
                        ? "fixed inset-x-0 bottom-0 z-[10002] overflow-hidden rounded-t-2xl border-t border-sa-border-strong bg-popover text-popover-foreground sa-shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4 duration-200"
                        : "fixed left-1/2 top-1/2 z-[10002] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-sa-border-strong bg-popover text-popover-foreground sa-shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] duration-200"
                    }
                >
                    {/* Drag handle — mobile only */}
                    {isMobile && (
                        <div className="flex justify-center pt-2.5 pb-1">
                            <div className="w-9 h-1 rounded-full bg-sa-border-strong" />
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-row items-center gap-2 px-3 py-2 border-b border-sa-border">
                        {/* Prev / Next */}
                        <button
                            onClick={() => setCurrentIdx(i => i - 1)}
                            disabled={!hasPrev}
                            title="Previous file"
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong transition-colors duration-100 disabled:opacity-25 disabled:pointer-events-none"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentIdx(i => i + 1)}
                            disabled={!hasNext}
                            title="Next file"
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong transition-colors duration-100 disabled:opacity-25 disabled:pointer-events-none"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Title + counter */}
                        <DialogPrimitive.Title className="flex-1 text-[13px] font-mono text-foreground truncate leading-none">
                            {current?.title ?? ""}
                        </DialogPrimitive.Title>
                        {atts.length > 1 && (
                            <span className="font-mono text-xs text-muted-foreground shrink-0">{currentIdx + 1}/{atts.length}</span>
                        )}

                        <span className="text-[11px] px-1.5 rounded-md border border-sa-border-strong text-muted-foreground font-mono shrink-0">
                            {langLabel}
                        </span>
                        <button
                            onClick={handleCopy}
                            title="Copy to clipboard"
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong transition-colors duration-100"
                        >
                            {copied ? <Check className="w-4 h-4 text-sa-good" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            title="Close"
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong transition-colors duration-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Code area — background matches the dark-plus Shiki theme (code data, not chrome) */}
                    <div
                        className="overflow-auto bg-[#1e1e1e]"
                        style={{ height: isMobile ? "70vh" : "60vh" }}
                    >
                        {!current?.content ? (
                            <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
                                No content
                            </div>
                        ) : busy && !html ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div
                                className="shiki-host text-[13px] leading-[1.55] font-mono [&_pre]:px-4 [&_pre]:py-3"
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}

function escapePlain(s: string): string {
    const escaped = s.replace(/[&<>]/g, ch =>
        ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : "&gt;"
    );
    return `<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px 16px;margin:0"><code>${escaped}</code></pre>`;
}
