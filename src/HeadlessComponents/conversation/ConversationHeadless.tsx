import { useEffect } from "react";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useConversationHelper } from "@/hooks/conversation/useConversation.helper";

/**
 * Loads topics + messages when the dialog opens or entity changes.
 */
export function ConversationHeadless() {
    const { isOpen, entityType, entityId, selectedTopicId } = useConversationStore();
    const { loadTopics, loadMessages } = useConversationHelper();

    useEffect(() => {
        if (!isOpen) return;
        loadTopics();
        loadMessages(null); // entity-level messages on open
    }, [isOpen, entityType, entityId]);

    return null;
}
