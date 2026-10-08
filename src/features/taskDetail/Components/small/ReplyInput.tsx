import { useState } from "react";
import { Send } from "lucide-react";
import { RichTextEditor, ShadcnButton } from "@/shared";

export function ReplyInput({ onSubmit, onCancel }: { onSubmit: (c: string) => void; onCancel: () => void }) {
    const [text, setText] = useState("");
    const handleEnter = () => {
        if (text.trim() && text !== "<p></p>") { onSubmit(text); setText(""); }
    };

    return (
        <div className="space-y-2 mt-1">
            <div className="overflow-hidden rounded-xl border border-sa-border transition-colors duration-100 focus-within:border-sa-border-strong">
                <RichTextEditor value={text} onChange={setText} placeholder="Write a reply... (Enter to send)" minHeight="72px" className="text-left" autoFocus onEnter={handleEnter} />
            </div>
            <div className="flex items-center gap-1.5">
                <ShadcnButton size="sm" onClick={() => { if (text.trim() && text !== "<p></p>") { onSubmit(text); setText(""); } }}
                    disabled={!text.trim() || text === "<p></p>"}
                    className="[&_svg]:size-3.5">
                    <Send /> Reply
                </ShadcnButton>
                <ShadcnButton size="sm" variant="ghost" onClick={onCancel} className="text-muted-foreground">Cancel</ShadcnButton>
            </div>
        </div>
    );
}
