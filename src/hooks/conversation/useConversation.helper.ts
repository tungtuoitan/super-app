import { useCallback } from "react";
import { conversationService } from "@/services/conversation.service";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError } from "@/utils/api-error.utils";
import { useConsoleHelper } from "../console/useConsole.helper";
import type { ConTopic, ConMessage, ConTopicDTO, ConMessageDTO } from "@/types/conversation.types";

// ── DTO transforms ────────────────────────────────────────────────────────

const toDate = (s: string | null | undefined): Date | null =>
    s ? new Date(s) : null;

const toTopic = (dto: ConTopicDTO): ConTopic => ({
    ...dto,
    createdAt: toDate(dto.createdAt) ?? new Date(),
    updatedAt: toDate(dto.updatedAt),
    deletedAt: toDate(dto.deletedAt),
});

const toMessage = (dto: ConMessageDTO): ConMessage => ({
    ...dto,
    createdAt: toDate(dto.createdAt) ?? new Date(),
    updatedAt: toDate(dto.updatedAt),
    deletedAt: toDate(dto.deletedAt),
    occurAt: toDate(dto.occurAt),
    replies: dto.replies?.map(toMessage) ?? [],
});

// ── Hook ──────────────────────────────────────────────────────────────────

export const useConversationHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const {
        entityType, entityId, selectedTopicId,
        setTopics, setIsLoadingTopics,
        setMessages, setIsLoadingMessages,
        setIsOpen, setIsMinimized, setEntityType, setEntityId, setEntityLabel,
        setSelectedTopicId,
        setReplyingToId, setEditingMessageId, setDraftContent,
        setIsCreatingTopic, setNewTopicName,
        recentEntities, setRecentEntities,
    } = useConversationStore();

    const token = $user.userToken;

    // ── Open dialog ───────────────────────────────────────────────────────

    const openDialog = useCallback((type: string | null, id: number | null, label: string) => {
        setEntityType(type);
        setEntityId(id);
        setEntityLabel(label);
        setSelectedTopicId(null);
        setMessages([]);
        setTopics([]);
        setIsCreatingTopic(false);
        setNewTopicName("");
        setReplyingToId(null);
        setEditingMessageId(null);
        setDraftContent("");
        setIsMinimized(false);
        setIsOpen(true);

        // Track recent entities (deduplicated, max 8, newest first)
        if (type && id) {
            setRecentEntities(prev => {
                const filtered = prev.filter(r => !(r.type === type && r.id === id));
                return [{ type, id, label }, ...filtered].slice(0, 8);
            });
        }
    }, [setEntityType, setEntityId, setEntityLabel, setSelectedTopicId, setMessages, setTopics, setIsOpen, setIsMinimized, setIsCreatingTopic, setNewTopicName, setReplyingToId, setEditingMessageId, setDraftContent, setRecentEntities]);

    // ── Switch entity (without resetting dialog open/minimize state) ─────

    const switchEntity = useCallback((type: string | null, id: number | null, label: string) => {
        setEntityType(type);
        setEntityId(id);
        setEntityLabel(label);
        setSelectedTopicId(null);
        setMessages([]);
        setTopics([]);
        setIsCreatingTopic(false);
        setNewTopicName("");
        setReplyingToId(null);
        setEditingMessageId(null);
        setDraftContent("");
    }, [setEntityType, setEntityId, setEntityLabel, setSelectedTopicId, setMessages, setTopics, setIsCreatingTopic, setNewTopicName, setReplyingToId, setEditingMessageId, setDraftContent]);

    // ── Topics ────────────────────────────────────────────────────────────

    const loadTopics = useCallback(async () => {
        setIsLoadingTopics(true);
        try {
            const res = await conversationService._getTopics(token, {
                entityType: entityType ?? undefined,
                entityId: entityId ?? undefined,
            });
            if (res.success) setTopics((res.data ?? []).map(toTopic));
        } catch (err) {
            _console.error(await parseApiError(err));
        } finally {
            setIsLoadingTopics(false);
        }
    }, [token, entityType, entityId, setTopics, setIsLoadingTopics, _console]);

    const createTopic = useCallback(async (name: string) => {
        if (!name.trim()) return;
        try {
            const res = await conversationService._upsertTopic(token, {
                id: 0,
                entityType,
                entityId,
                name: name.trim(),
            });
            if (res.success && res.object) {
                const topic = toTopic(res.object as ConTopicDTO);
                setTopics(prev => [...prev, topic]);
                setSelectedTopicId(topic.id);
                setIsCreatingTopic(false);
                setNewTopicName("");
                await loadMessages(topic.id);
            }
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, entityType, entityId, setTopics, setSelectedTopicId, setIsCreatingTopic, setNewTopicName, _console]);

    const updateTopic = useCallback(async (topicId: number, name: string) => {
        if (!name.trim()) return;
        try {
            const res = await conversationService._upsertTopic(token, {
                id: topicId,
                entityType,
                entityId,
                name: name.trim(),
            });
            if (res.success && res.object) {
                const updated = toTopic(res.object as ConTopicDTO);
                setTopics(prev => prev.map(t => t.id === topicId ? { ...t, name: updated.name } : t));
            }
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, entityType, entityId, setTopics, _console]);

    const deleteTopic = useCallback(async (topicId: number) => {
        try {
            await conversationService._deleteTopic(token, topicId);
            setTopics(prev => prev.filter(t => t.id !== topicId));
            if (selectedTopicId === topicId) {
                setSelectedTopicId(null);
                setMessages([]);
            }
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, selectedTopicId, setTopics, setSelectedTopicId, setMessages, _console]);

    // ── Messages ──────────────────────────────────────────────────────────

    const loadMessages = useCallback(async (topicId?: number | null) => {
        const tid = topicId !== undefined ? topicId : selectedTopicId;
        setIsLoadingMessages(true);
        try {
            const res = await conversationService._getMessages(token, {
                entityType: entityType ?? undefined,
                entityId: entityId ?? undefined,
                topicId: tid ?? undefined,
                entityLevelOnly: tid === null,
            });
            if (res.success) setMessages((res.data ?? []).map(toMessage));
        } catch (err) {
            _console.error(await parseApiError(err));
        } finally {
            setIsLoadingMessages(false);
        }
    }, [token, entityType, entityId, selectedTopicId, setMessages, setIsLoadingMessages, _console]);

    const selectTopic = useCallback(async (topicId: number | null) => {
        setSelectedTopicId(topicId);
        setReplyingToId(null);
        setEditingMessageId(null);
        setDraftContent("");
        await loadMessages(topicId);
    }, [setSelectedTopicId, setReplyingToId, setEditingMessageId, setDraftContent, loadMessages]);

    const submitMessage = useCallback(async (content: string, parentId?: number | null) => {
        if (!content.trim()) return;
        try {
            const res = await conversationService._upsertMessage(token, {
                id: 0,
                topicId: selectedTopicId,
                entityType,
                entityId,
                parentId: parentId ?? null,
                content: content.trim(),
                type: "comment",
            });
            if (res.success && res.object) {
                const msg = toMessage(res.object as ConMessageDTO);
                if (parentId) {
                    setMessages(prev => prev.map(m =>
                        m.id === parentId
                            ? { ...m, replies: [...(m.replies ?? []), msg] }
                            : m
                    ));
                } else {
                    setMessages(prev => [...prev, msg]);
                }
                setReplyingToId(null);
                setDraftContent("");
            }
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, selectedTopicId, entityType, entityId, setMessages, setReplyingToId, setDraftContent, _console]);

    const updateMessage = useCallback(async (messageId: number, content: string) => {
        try {
            const res = await conversationService._upsertMessage(token, { id: messageId, content });
            if (res.success && res.object) {
                const updated = toMessage(res.object as ConMessageDTO);
                setMessages(prev => prev.map(m => {
                    if (m.id === messageId) return { ...m, content: updated.content, updatedAt: updated.updatedAt };
                    return { ...m, replies: m.replies?.map(r => r.id === messageId ? { ...r, content: updated.content, updatedAt: updated.updatedAt } : r) };
                }));
                setEditingMessageId(null);
                setDraftContent("");
            }
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, setMessages, setEditingMessageId, setDraftContent, _console]);

    const deleteMessage = useCallback(async (messageId: number) => {
        try {
            await conversationService._deleteMessage(token, messageId);
            setMessages(prev => prev
                .filter(m => m.id !== messageId)
                .map(m => ({ ...m, replies: m.replies?.filter(r => r.id !== messageId) }))
            );
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, setMessages, _console]);

    const promoteToTopic = useCallback(async (messageId: number, topicName: string) => {
        try {
            const res = await conversationService._promoteToTopic(token, messageId, topicName);
            if (res.success && res.object) {
                const topic = toTopic(res.object as ConTopicDTO);
                setTopics(prev => [...prev, topic]);
                // Remove from current message list and switch to new topic
                setMessages(prev => prev.filter(m => m.id !== messageId));
                setSelectedTopicId(topic.id);
                await loadMessages(topic.id);
            }
        } catch (err) {
            _console.error(await parseApiError(err));
        }
    }, [token, setTopics, setMessages, setSelectedTopicId, loadMessages, _console]);

    return {
        openDialog,
        switchEntity,
        loadTopics,
        createTopic,
        updateTopic,
        deleteTopic,
        selectTopic,
        loadMessages,
        submitMessage,
        updateMessage,
        deleteMessage,
        promoteToTopic,
    };
};
