import { Loader2, Code2, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
import type { KAttachment } from "../../types/kAttachment.type";

interface KDialogAttachmentsProps {
    attachments: KAttachment[];
    pool: KAttachment[];
    sectionOpen: boolean;
    pickerOpen: boolean;
    linkingAttId: number | null;
    onToggleSection: () => void;
    onTogglePicker: () => void;
    onView: (att: KAttachment) => void;
    onUnlink: (att: KAttachment) => void;
    onLink: (att: KAttachment) => void;
}

export function KDialogAttachments({ attachments, pool, sectionOpen, pickerOpen, linkingAttId, onToggleSection, onTogglePicker, onView, onUnlink, onLink }: KDialogAttachmentsProps) {
    return (
            <div className="border border-sa-border rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => onToggleSection()}
                    className="w-full flex items-center justify-between px-3 h-9 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-sa-hover transition-colors duration-100"
                >
                    <span>Attachments {attachments.length > 0 && `(${attachments.length})`}</span>
                    {sectionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {sectionOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t border-sa-border">
                        {attachments.length === 0 && (
                            <p className="text-xs text-muted-foreground pt-2">No attachments linked to this node.</p>
                        )}
                        {attachments.map(att => (
                            <div key={att.id} className="flex items-center gap-2 pt-2">
                                <Code2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <button
                                    type="button"
                                    onClick={() => onView(att)}
                                    className="flex-1 text-left text-xs font-mono text-foreground/90 hover:text-foreground truncate transition-colors duration-100"
                                    title="Click to view"
                                >
                                    {att.title}
                                </button>
                                {att.language && (
                                    <span className="text-[11px] px-1.5 rounded-md border border-sa-border-strong text-muted-foreground font-mono">{att.language}</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onUnlink(att)}
                                    className="text-muted-foreground hover:text-sa-danger transition-colors duration-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Link picker */}
                        <div className="relative pt-1">
                            <button
                                type="button"
                                onClick={() => onTogglePicker()}
                                className="flex items-center gap-1.5 px-2 h-7 text-xs rounded-md border border-sa-border-strong text-muted-foreground hover:bg-sa-hover hover:text-foreground transition-colors duration-100"
                            >
                                <Link2 className="w-3 h-3" />
                                Link attachment
                            </button>
                            {pickerOpen && (
                                <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-sa-border-strong bg-popover sa-shadow-pop p-1">
                                    {pool.length === 0 ? (
                                        <div className="p-3 text-xs text-muted-foreground">No attachments available</div>
                                    ) : (
                                        <ul className="max-h-48 overflow-y-auto">
                                            {pool
                                                .filter(a => !attachments.some(n => n.id === a.id))
                                                .map(att => (
                                                    <li key={att.id}>
                                                        <button
                                                            type="button"
                                                            onClick={() => onLink(att)}
                                                            disabled={linkingAttId === att.id}
                                                            className="w-full flex items-center gap-2 px-2 h-7 rounded-md text-left text-xs text-foreground hover:bg-sa-hover-strong transition-colors duration-100"
                                                        >
                                                            {linkingAttId === att.id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Code2 className="w-3 h-3 text-muted-foreground" />
                                                            }
                                                            <span className="truncate font-mono">{att.title}</span>
                                                        </button>
                                                    </li>
                                                ))
                                            }
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
    );
}
