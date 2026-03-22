import { useState } from "react";
import { Send } from "lucide-react";
import { RichTextEditor } from "@/shared/components";

export function ReplyInput({ onSubmit, onCancel }: { onSubmit: (c: string) => void; onCancel: () => void }) {
    const [text, setText] = useState("");
    return (
        <div className="space-y-2 mt-1">
            <div className="border rounded-md overflow-hidden"
                onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                        e.preventDefault();
                        if (text.trim() && text !== "<p></p>") { onSubmit(text); setText(""); }
                    }
                }}>
                <RichTextEditor value={text} onChange={setText} placeholder="Write a reply..." minHeight="72px" className="text-left" autoFocus />
            </div>
            <div className="flex items-center gap-1.5">
                <button onClick={() => { if (text.trim() && text !== "<p></p>") { onSubmit(text); setText(""); } }}
                    disabled={!text.trim() || text === "<p></p>"}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
                    <Send className="h-3 w-3" /> Reply
                </button>
                <button onClick={onCancel} className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground">Cancel</button>
            </div>
        </div>
    );
}
