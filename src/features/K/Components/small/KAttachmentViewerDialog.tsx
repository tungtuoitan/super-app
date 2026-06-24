import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Copy, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared";
import type { KAttachment } from "../../types/kAttachment.type";

interface Props {
    att: KAttachment | null;
    onClose: () => void;
}

const LANG_LABEL: Record<string, string> = {
    python: "py", javascript: "js", typescript: "ts", csharp: "cs",
    go: "go", java: "java", rust: "rs", cpp: "cpp", c: "c",
    sql: "sql", shell: "sh", ruby: "rb", php: "php",
    markdown: "md", json: "json", yaml: "yml", plaintext: "txt",
};

export function KAttachmentViewerDialog({ att, onClose }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!att?.content) return;
        navigator.clipboard.writeText(att.content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    const langLabel = att?.language ? (LANG_LABEL[att.language] ?? att.language) : "txt";

    return (
        <Dialog open={!!att} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden rounded-xl">
                <DialogHeader className="flex flex-row items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900 space-y-0">
                    <DialogTitle className="flex-1 text-sm font-mono text-zinc-200 truncate leading-none">
                        {att?.title ?? ""}
                    </DialogTitle>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 font-mono shrink-0">
                        {langLabel}
                    </span>
                    <button
                        onClick={handleCopy}
                        title="Copy to clipboard"
                        className="shrink-0 p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        title="Close"
                        className="shrink-0 p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </DialogHeader>

                <div className="h-[60vh] bg-[#1e1e1e]">
                    {att?.content ? (
                        <Editor
                            height="100%"
                            language={att.language ?? "plaintext"}
                            value={att.content}
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                fontSize: 13,
                                lineNumbers: "on",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 12, bottom: 12 },
                                renderLineHighlight: "line",
                                wordWrap: "off",
                                folding: true,
                                contextmenu: false,
                            }}
                            loading={<div className="h-full w-full bg-[#1e1e1e]" />}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-zinc-500">
                            No content
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
