import React, { useState, useRef } from "react";
import { Plus, Trash2, Hash, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useConversationHelper } from "@/hooks/conversation/useConversation.helper";

export function TopicList() {
    const {
        topics, selectedTopicId,
        isCreatingTopic, setIsCreatingTopic,
        newTopicName, setNewTopicName,
    } = useConversationStore();
    const { selectTopic, createTopic, updateTopic, deleteTopic } = useConversationHelper();

    const [search, setSearch] = useState("");
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    const handleDoubleClick = (e: React.MouseEvent, topicId: number, currentName: string) => {
        e.stopPropagation();
        setEditingTopicId(topicId);
        setEditingName(currentName);
        setTimeout(() => editInputRef.current?.select(), 0);
    };

    const handleEditSubmit = async (topicId: number) => {
        if (editingName.trim()) await updateTopic(topicId, editingName);
        setEditingTopicId(null);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent, topicId: number) => {
        if (e.key === "Enter") { e.preventDefault(); handleEditSubmit(topicId); }
        if (e.key === "Escape") setEditingTopicId(null);
    };

    const filtered = topics.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createTopic(newTopicName);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search topics..."
                    className="w-full text-xs bg-muted/40 border border-border/60 rounded-md px-2 py-1.5 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
            </div>

            {/* Entity-level (no topic) */}
            <button
                className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs text-left w-full transition-colors",
                    selectedTopicId === null
                        ? "bg-violet-500/15 text-violet-400 font-medium"
                        : "hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => selectTopic(null)}
            >
                <Inbox className="w-3.5 h-3.5 shrink-0" />
                <span>Quick notes</span>
            </button>

            <div className="border-b border-border mx-3 my-1" />

            {/* Topics list */}
            <div className="flex-1 overflow-y-auto text-left">
                {filtered.map(topic => (
                    <div
                        key={topic.id}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors",
                            selectedTopicId === topic.id
                                ? "bg-violet-500/15 text-violet-400 font-medium"
                                : "hover:bg-muted/50 text-muted-foreground"
                        )}
                        onClick={() => editingTopicId !== topic.id && selectTopic(topic.id)}
                        onDoubleClick={e => handleDoubleClick(e, topic.id, topic.name)}
                    >
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                        {editingTopicId === topic.id ? (
                            <input
                                ref={editInputRef}
                                autoFocus
                                type="text"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onBlur={() => handleEditSubmit(topic.id)}
                                onKeyDown={e => handleEditKeyDown(e, topic.id)}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 min-w-0 bg-transparent outline-none border-b border-violet-400 text-xs"
                            />
                        ) : (
                            <span className="flex-1 truncate">{topic.name}</span>
                        )}
                        {editingTopicId !== topic.id && (
                            <button
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-opacity"
                                onClick={e => { e.stopPropagation(); deleteTopic(topic.id); }}
                                title="Delete topic"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}

                {filtered.length === 0 && !isCreatingTopic && (
                    <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">No topics yet</p>
                )}
            </div>

            {/* New topic form */}
            {isCreatingTopic ? (
                <form onSubmit={handleCreateSubmit} className="px-3 pb-3 pt-2 border-t border-border">
                    <input
                        autoFocus
                        type="text"
                        value={newTopicName}
                        onChange={e => setNewTopicName(e.target.value)}
                        placeholder="Topic name..."
                        className="w-full text-xs bg-muted/50 border border-border rounded px-2 py-1.5 outline-none focus:border-primary/50 mb-1.5"
                    />
                    <div className="flex gap-1.5">
                        <button
                            type="submit"
                            disabled={!newTopicName.trim()}
                            className="flex-1 text-xs py-1 rounded-md bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsCreatingTopic(false); setNewTopicName(""); }}
                            className="flex-1 text-xs py-1 rounded border border-border hover:bg-muted/50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border w-full"
                    onClick={() => setIsCreatingTopic(true)}
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Topic
                </button>
            )}
        </div>
    );
}
