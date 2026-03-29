import React, { useRef, useEffect, useState } from "react";
import { Loader2, X, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useConversationHelper } from "@/hooks/conversation/useConversation.helper";
import { useConversationSelector } from "@/Selectors/conversation/useConversation.selector";
import { useAuthStore } from "@/store/auth/Auth.store";
import { RichTextEditor } from "@/shared/components/RichTextEditor/RichTextEditor";
import { MessageItem } from "./MessageItem";
import type { ConMessage } from "@/types/conversation.types";

const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

function hasContent(html: string): boolean {
    return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
}

export interface AuthorInfo {
    name: string;
    picture?: string;
}

export interface AnnotatedMessage {
    message: ConMessage;
    isFirstInGroup: boolean;
    author: AuthorInfo;
}

function findMessage(messages: ConMessage[], id: number): ConMessage | undefined {
    for (const m of messages) {
        if (m.id === id) return m;
        if (m.replies) {
            const found = findMessage(m.replies, id);
            if (found) return found;
        }
    }
    return undefined;
}

function annotateMessages(
    messages: ConMessage[],
    currentUserId: number | null,
    currentUser: AuthorInfo,
): AnnotatedMessage[] {
    return messages.map((msg, i) => {
        const prev = messages[i - 1];
        const sameUser = prev && prev.userId === msg.userId;
        const closeInTime = prev && (msg.createdAt.getTime() - prev.createdAt.getTime()) < GROUP_THRESHOLD_MS;
        const isFirstInGroup = !sameUser || !closeInTime;
        const author: AuthorInfo = msg.userId === currentUserId
            ? currentUser
            : { name: `User ${msg.userId}` };
        return { message: msg, isFirstInGroup, author };
    });
}

export function MessageArea() {
    const {
        isLoadingMessages, selectedTopicId, entityType, entityId,
        messages, replyingToId, setReplyingToId,
    } = useConversationStore();
    const { submitMessage } = useConversationHelper();
    const { groupedMessages, selectedTopic } = useConversationSelector();
    const { $user } = useAuthStore();

    const [input, setInput] = useState("");
    const [submitKey, setSubmitKey] = useState(0);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [groupedMessages]);

    const handleSend = async () => {
        if (!hasContent(input)) return;
        await submitMessage(input, replyingToId ?? undefined);
        setInput("");
        setSubmitKey(k => k + 1);
        if (replyingToId) setReplyingToId(null);
    };

    const uploadContext = (entityType === "project" || entityType === "workspace")
        ? (entityType as "project" | "workspace")
        : "conversation" as const;

    const isEmpty = groupedMessages.every(g => g.items.length === 0) || groupedMessages.length === 0;

    const currentUserId = $user.userId;
    const currentUserInfo: AuthorInfo = {
        name: ($user.firstName || $user.lastName)
            ? `${$user.firstName ?? ""} ${$user.lastName ?? ""}`.trim()
            : ($user.userName || "Me"),
        picture: $user.picture || undefined,
    };

    // Find the message being replied to for the banner
    const replyingToMessage = replyingToId ? findMessage(messages, replyingToId) : null;
    const replyingToAuthor = replyingToMessage
        ? (replyingToMessage.userId === currentUserId ? currentUserInfo.name : `User ${replyingToMessage.userId}`)
        : null;
    const replyingToPreview = replyingToMessage
        ? stripHtml(replyingToMessage.content ?? "").slice(0, 80) || "(attachment)"
        : null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            {/* <div className="px-4 py-2.5 border-b border-border/60 shrink-0 bg-muted/10">
                <p className="text-xs text-left font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {selectedTopicId === null ? "Quick notes" : (selectedTopic?.name ?? "...")}
                </p>
            </div> */}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-3">
                {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
                        <p className="text-xs text-muted-foreground italic">
                            No messages yet. Write your first thought below.
                        </p>
                    </div>
                ) : (
                    groupedMessages.map(group => {
                        const annotated = annotateMessages(group.items, currentUserId, currentUserInfo);
                        return (
                            <div key={group.label} className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex-1 h-px bg-border/40" />
                                    <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest shrink-0">
                                        {group.label}
                                    </span>
                                    <div className="flex-1 h-px bg-border/40" />
                                </div>
                                <div>
                                    {annotated.map(item => (
                                        <MessageItem
                                            key={item.message.id}
                                            message={item.message}
                                            isFirstInGroup={item.isFirstInGroup}
                                            author={item.author}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Compose area */}
            <div className="shrink-0 border-t border-border/60 bg-muted/5">
                {/* Reply banner */}
                {replyingToMessage && (
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold text-violet-400">{replyingToAuthor}</span>
                            <span className="text-[11px] text-muted-foreground/60 ml-1.5 truncate">{replyingToPreview}</span>
                        </div>
                        <button
                            onClick={() => setReplyingToId(null)}
                            className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Input */}
                <div className={cn(
                    "rounded-lg text-left border border-border/80 bg-background overflow-hidden mx-3 mb-3",
                    "focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all",
                    replyingToMessage && "border-violet-500/30"
                )}>
                    <RichTextEditor
                        key={submitKey}
                        value={input}
                        onChange={setInput}
                        placeholder={replyingToMessage ? "Write a reply... (Enter to send)" : "Write a message... (Enter to send, Ctrl+Enter for newline)"}
                        minHeight="72px"
                        autoFocus
                        uploadContext={uploadContext}
                        uploadContextId={entityId ?? undefined}
                        onEnter={handleSend}
                    />
                </div>
            </div>
        </div>
    );
}

