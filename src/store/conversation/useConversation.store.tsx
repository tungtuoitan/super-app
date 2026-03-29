import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { ConTopic, ConMessage } from "@/types/conversation.types";

export interface RecentEntity {
    type: string;
    id: number;
    label: string;
}

export interface ConversationContextData {
    // Dialog open state + current entity
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    isMinimized: boolean;
    setIsMinimized: Dispatch<SetStateAction<boolean>>;
    entityType: string | null;
    setEntityType: Dispatch<SetStateAction<string | null>>;
    entityId: number | null;
    setEntityId: Dispatch<SetStateAction<number | null>>;
    entityLabel: string;
    setEntityLabel: Dispatch<SetStateAction<string>>;
    recentEntities: RecentEntity[];
    setRecentEntities: Dispatch<SetStateAction<RecentEntity[]>>;

    // Topics
    topics: ConTopic[];
    setTopics: Dispatch<SetStateAction<ConTopic[]>>;
    isLoadingTopics: boolean;
    setIsLoadingTopics: Dispatch<SetStateAction<boolean>>;

    // Selected context:
    // selectedTopicId === null  → entity-level messages (topic_id IS NULL)
    // selectedTopicId === number → messages of that topic
    selectedTopicId: number | null;
    setSelectedTopicId: Dispatch<SetStateAction<number | null>>;

    // Messages
    messages: ConMessage[];
    setMessages: Dispatch<SetStateAction<ConMessage[]>>;
    isLoadingMessages: boolean;
    setIsLoadingMessages: Dispatch<SetStateAction<boolean>>;

    // Compose / edit state
    replyingToId: number | null;
    setReplyingToId: Dispatch<SetStateAction<number | null>>;
    editingMessageId: number | null;
    setEditingMessageId: Dispatch<SetStateAction<number | null>>;
    draftContent: string;
    setDraftContent: Dispatch<SetStateAction<string>>;

    // New topic form
    isCreatingTopic: boolean;
    setIsCreatingTopic: Dispatch<SetStateAction<boolean>>;
    newTopicName: string;
    setNewTopicName: Dispatch<SetStateAction<string>>;
}

const defaultValue: ConversationContextData = {
    isOpen: true, setIsOpen: () => {},
    isMinimized: true, setIsMinimized: () => {},
    entityType: null, setEntityType: () => {},
    entityId: null, setEntityId: () => {},
    entityLabel: "", setEntityLabel: () => {},
    recentEntities: [], setRecentEntities: () => {},
    topics: [], setTopics: () => {},
    isLoadingTopics: false, setIsLoadingTopics: () => {},
    selectedTopicId: null, setSelectedTopicId: () => {},
    messages: [], setMessages: () => {},
    isLoadingMessages: false, setIsLoadingMessages: () => {},
    replyingToId: null, setReplyingToId: () => {},
    editingMessageId: null, setEditingMessageId: () => {},
    draftContent: "", setDraftContent: () => {},
    isCreatingTopic: false, setIsCreatingTopic: () => {},
    newTopicName: "", setNewTopicName: () => {},
};

const ConversationStore = createContext<ConversationContextData>(defaultValue);
export const useConversationStore = () => useContext(ConversationStore);

export const ConversationProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isMinimized, setIsMinimized] = useState(true);
    const [entityType, setEntityType] = useState<string | null>(null);
    const [entityId, setEntityId] = useState<number | null>(null);
    const [entityLabel, setEntityLabel] = useState("");
    const [recentEntities, setRecentEntities] = useState<RecentEntity[]>([]);
    const [topics, setTopics] = useState<ConTopic[]>([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ConMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [draftContent, setDraftContent] = useState("");
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [newTopicName, setNewTopicName] = useState("");

    return (
        <ConversationStore.Provider value={{
            isOpen, setIsOpen,
            isMinimized, setIsMinimized,
            entityType, setEntityType,
            entityId, setEntityId,
            entityLabel, setEntityLabel,
            recentEntities, setRecentEntities,
            topics, setTopics,
            isLoadingTopics, setIsLoadingTopics,
            selectedTopicId, setSelectedTopicId,
            messages, setMessages,
            isLoadingMessages, setIsLoadingMessages,
            replyingToId, setReplyingToId,
            editingMessageId, setEditingMessageId,
            draftContent, setDraftContent,
            isCreatingTopic, setIsCreatingTopic,
            newTopicName, setNewTopicName,
        }}>
            {children}
        </ConversationStore.Provider>
    );
};
