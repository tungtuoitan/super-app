import { useMemo } from "react";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import type { ConMessage } from "@/types/conversation.types";

/** Groups messages by calendar date label */
function groupByDate(messages: ConMessage[]): { label: string; items: ConMessage[] }[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);

    const buckets = new Map<string, ConMessage[]>();

    for (const msg of messages) {
        const d = msg.createdAt;
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        let label: string;
        if (day.getTime() === today.getTime()) label = "Today";
        else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
        else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        if (!buckets.has(label)) buckets.set(label, []);
        buckets.get(label)!.push(msg);
    }

    return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

export const useConversationSelector = () => {
    const { messages, topics, selectedTopicId } = useConversationStore();

    const groupedMessages = useMemo(() => groupByDate(messages), [messages]);

    const selectedTopic = useMemo(
        () => topics.find(t => t.id === selectedTopicId) ?? null,
        [topics, selectedTopicId]
    );

    return { groupedMessages, selectedTopic };
};
