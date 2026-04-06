import React, { useState } from "react";
import { Check, X, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useConversationHelper } from "@/hooks/conversation/useConversation.helper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useAuthStore } from "@/store/auth/Auth.store";
import { RichTextEditor } from "@/shared/components/RichTextEditor/RichTextEditor";
import { constants } from "@/utils/constants";
import type { ConMessage } from "@/types/conversation.types";
import type { AuthorInfo } from "./MessageArea";

interface MessageItemProps {
    message: ConMessage;
    isReply?: boolean;
    isFirstInGroup?: boolean;
    author?: AuthorInfo;
}

const AVATAR_COLORS = [
    "bg-violet-600", "bg-blue-600", "bg-emerald-600",
    "bg-orange-600", "bg-pink-600", "bg-teal-600",
];

function getAvatarColor(userId: number) {
    return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getInitials(name: string) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function toDate(val: Date | string | null | undefined): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
}

function formatTime(date: Date | string | null | undefined): string {
    const d = toDate(date);
    if (!d) return "";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateTime(date: Date | string | null | undefined): string {
    const d = toDate(date);
    if (!d) return "";
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(d);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + formatTime(d);
}

function isVersionComment(content?: string | null) {
    if (!content) return false;
    try { const p = JSON.parse(content); return p?.type === "version"; } catch { return false; }
}

function hasContent(html: string): boolean {
    return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ author, userId, size = "md" }: { author: AuthorInfo; userId: number; size?: "sm" | "md" }) {
    const sz = size === "sm" ? "w-4 h-4 text-[8px]" : "w-8 h-8 text-[11px]";
    if (author.picture) {
        return <img src={author.picture} alt={author.name} className={cn("rounded-full object-cover shrink-0", sz)} />;
    }
    return (
        <div className={cn("rounded-full flex items-center justify-center text-white font-semibold shrink-0", getAvatarColor(userId), sz)}>
            {getInitials(author.name)}
        </div>
    );
}

// ── MessageItem ───────────────────────────────────────────────────────────────

export function MessageItem({ message, isReply = false, isFirstInGroup = true, author }: MessageItemProps) {
    const {
        replyingToId, setReplyingToId,
        editingMessageId, setEditingMessageId,
        draftContent, setDraftContent,
        entityType, entityId,
    } = useConversationStore();
    const { updateMessage, deleteMessage, promoteToTopic } = useConversationHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { $user } = useAuthStore();

    const [promoteInput, setPromoteInput] = useState("");
    const [showPromote, setShowPromote] = useState(false);

    const isEditing = editingMessageId === message.id;
    const isBeingRepliedTo = replyingToId === message.id;
    const isVersion = isVersionComment(message.content);

    const uploadContext = (entityType === "project" || entityType === "workspace")
        ? (entityType as "project" | "workspace")
        : "conversation" as const;

    const currentUserInfo: AuthorInfo = {
        name: ($user.firstName || $user.lastName)
            ? `${$user.firstName ?? ""} ${$user.lastName ?? ""}`.trim()
            : ($user.userName || "Me"),
        picture: $user.picture || undefined,
    };

    const resolveAuthor = (userId: number): AuthorInfo =>
        userId === $user.userId ? currentUserInfo : { name: `User ${userId}` };

    const msgAuthor = author ?? resolveAuthor(message.userId);

    const handleStartEdit = () => {
        setEditingMessageId(message.id);
        setDraftContent(message.content ?? "");
        setReplyingToId(null);
    };

    const handleStartReply = () => {
        setReplyingToId(message.id);
        setEditingMessageId(null);
    };

    const handleSubmitEdit = async () => { await updateMessage(message.id, draftContent); };
    const handleCancelEdit = () => { setEditingMessageId(null); setDraftContent(""); };

    const handlePromote = async () => {
        if (!promoteInput.trim()) return;
        await promoteToTopic(message.id, promoteInput.trim());
        setShowPromote(false);
        setPromoteInput("");
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        // Allow native context menu when text is selected (for Copy, etc.)
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) return;

        showContextMenu(e, constants.contextMenu.contextMenuTypes.conversationMessage, {
            isReply,
            onReply: handleStartReply,
            onEdit: handleStartEdit,
            onPromote: () => setShowPromote(true),
            onDelete: () => deleteMessage(message.id),
        });
    };

    // ── Reply row (compact, indented) ─────────────────────────────────────────
    if (isReply) {
        return (
            <div
                className="group flex items-start gap-1.5 pl-10 pr-2 py-0.5 hover:bg-white/[0.03] rounded transition-colors"
                onContextMenu={handleContextMenu}
            >
                <Avatar author={msgAuthor} userId={message.userId} size="sm" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-foreground/70">{msgAuthor.name}</span>
                        <span className="text-[9px] text-muted-foreground/40 tabular-nums">{formatTime(message.createdAt)}</span>
                    </div>
                    <div
                        className={cn(
                            "prose prose-sm dark:prose-invert max-w-none text-left text-sm leading-relaxed select-text cursor-default",
                            isVersion && "italic text-muted-foreground text-xs",
                        )}
                        dangerouslySetInnerHTML={{ __html: message.content ?? "" }}
                    />
                </div>
            </div>
        );
    }

    // ── Main message row ──────────────────────────────────────────────────────
    return (
        <div className={cn("group", isFirstInGroup ? "mt-3" : "mt-0.5")}>
            <div
                className={cn(
                    "flex items-start gap-2 px-2 py-0.5 rounded-md transition-colors",
                    isBeingRepliedTo
                        ? "bg-violet-500/10 border-l-2 border-violet-500/60"
                        : "hover:bg-white/[0.03]"
                )}
                onContextMenu={handleContextMenu}
            >
                {/* Left column: avatar for first, hover-time for subsequent */}
                <div className="w-4 shrink-0 flex flex-col items-center pt-0.5">
                    {isFirstInGroup ? (
                        <Avatar author={msgAuthor} userId={message.userId} size="sm" />
                    ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground/40 tabular-nums transition-opacity leading-none mt-1.5">
                            {formatTime(message.createdAt)}
                        </span>
                    )}
                </div>

                {/* Content column */}
                <div className="flex-1 min-w-0">
                    {/* Header row — only for first in group */}
                    {isFirstInGroup && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-foreground/85">{msgAuthor.name}</span>
                            <span className="text-[10px] text-muted-foreground/45 tabular-nums">{formatDateTime(message.createdAt)}</span>
                            {message.updatedAt && message.updatedAt > message.createdAt && (
                                <span className="text-[10px] text-muted-foreground/30">(edited)</span>
                            )}
                        </div>
                    )}

                    {/* ── Edit mode ── */}
                    {isEditing ? (
                        <div className="space-y-2">
                            <div className="rounded-lg border border-violet-500/50 bg-background overflow-hidden ring-2 ring-violet-500/20">
                                <RichTextEditor
                                    value={draftContent}
                                    onChange={setDraftContent}
                                    minHeight="60px"
                                    autoFocus
                                    uploadContext={uploadContext}
                                    uploadContextId={entityId ?? undefined}
                                    onEnter={handleSubmitEdit}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSubmitEdit} disabled={!hasContent(draftContent)}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 transition-colors">
                                    <Check className="w-3 h-3" /> Save
                                </button>
                                <button onClick={handleCancelEdit}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-muted/50 text-muted-foreground transition-colors">
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Display mode ── */
                        <div>
                            {message.title && (
                                <p className="text-xs font-semibold text-foreground mb-0.5">{message.title}</p>
                            )}
                            <div
                                className={cn(
                                    "prose prose-sm dark:prose-invert max-w-none text-left text-sm leading-relaxed select-text cursor-default",
                                    isVersion && "italic text-muted-foreground text-xs",
                                )}
                                dangerouslySetInnerHTML={{ __html: message.content ?? "" }}
                            />
                            {!isFirstInGroup && message.updatedAt && message.updatedAt > message.createdAt && (
                                <span className="text-[10px] text-muted-foreground/30">(edited)</span>
                            )}
                        </div>
                    )}

                    {/* ── Replies ── */}
                    {message.replies && message.replies.length > 0 && (
                        <div className="mt-1.5 border-l-2 border-white/10 pl-2 space-y-0.5">
                            {message.replies.map(r => (
                                <MessageItem key={r.id} message={r} isReply author={resolveAuthor(r.userId)} />
                            ))}
                        </div>
                    )}

                    {/* ── Promote to topic ── */}
                    {showPromote && (
                        <div className="mt-2 flex gap-1.5 items-center">
                            <input
                                autoFocus
                                type="text"
                                value={promoteInput}
                                onChange={e => setPromoteInput(e.target.value)}
                                placeholder="New topic name..."
                                className="flex-1 text-xs bg-muted/50 border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
                                onKeyDown={e => { if (e.key === "Enter") handlePromote(); if (e.key === "Escape") setShowPromote(false); }}
                            />
                            <button onClick={handlePromote} disabled={!promoteInput.trim()}
                                className="text-xs px-2.5 py-1.5 bg-violet-600 text-white rounded-md hover:bg-violet-500 disabled:opacity-40 transition-colors">
                                Create
                            </button>
                            <button onClick={() => setShowPromote(false)}
                                className="text-xs px-2 py-1.5 border border-border rounded-md hover:bg-muted/50 text-muted-foreground transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
