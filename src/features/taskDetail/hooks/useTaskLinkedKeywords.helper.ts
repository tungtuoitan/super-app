/**
 * Task Linked Keywords Helper
 * Functions only — linking/unlinking keywords to tasks via TargetKeywords table.
 * State lives in useTaskStore.
 */


import { targetKeywordService, TargetKeywordTargetType, useKeywordStore } from "@/shell";
import { useAuthStore } from "@/shell";
import { useConsoleHelper } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { Keyword } from "@/shell";
import type { LinkedKeyword } from "../types/taskDetail.types";

export const useTaskLinkedKeywordsHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { allKeywords } = useKeywordStore();
    const { setLinkedKeywords, setIsLoadingLinkedKeywords } = useTaskDetailStore();

    /**
     * Load linked keywords for a task, resolve keyword details from allKeywords
     */
    const loadLinkedKeywords = async (taskId: number) => {
        if (taskId <= 0) {
            setLinkedKeywords([]);
            return;
        }

        setIsLoadingLinkedKeywords(true);
        try {
            const token = $user.userToken;
            const result = await targetKeywordService._getTargetKeywords(token, taskId, "TASK");

            if (!result.success || !result.data || result.data.length === 0) {
                setLinkedKeywords([]);
                return;
            }

            const keywordMap = new Map<number, Keyword>(allKeywords.map((k) => [k.id, k]));

            const resolved: LinkedKeyword[] = result.data.map((link) => {
                const kw = keywordMap.get(link.keywordId);
                return {
                    linkId: link.id,
                    targetId: link.targetId,
                    targetType: link.targetType as TargetKeywordTargetType,
                    keywordId: link.keywordId,
                    name: kw?.name ?? `Keyword #${link.keywordId}`,
                    type: kw?.type ?? "external",
                    link: kw?.link ?? "",
                    longLink: kw?.longLink ?? "",
                    icon: kw?.icon,
                    color: kw?.color,
                    workspaceItemId: kw?.workspaceItemId,
                };
            });

            setLinkedKeywords(resolved);
        } catch (error) {
            console.error("Failed to load linked keywords:", error);
            setLinkedKeywords([]);
        } finally {
            setIsLoadingLinkedKeywords(false);
        }
    }

    /**
     * Link a keyword to a task
     */
    const linkKeyword = async (taskId: number, keywordId: number) => {
        try {
            const token = $user.userToken;
            const result = await targetKeywordService._linkTargetKeyword(token, {
                targetId: taskId,
                targetType: "TASK",
                keywordId,
            });

            if (result.success) {
                _console.success("Keyword linked to task");
                await loadLinkedKeywords(taskId);
            } else {
                throw new Error(result.message || "Failed to link keyword");
            }
        } catch (error) {
            console.error("Failed to link keyword:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to link keyword: ${errorMessage}`);
            }
        }
    }
    
    /**
     * Unlink a keyword from a task
     */
    const unlinkKeyword = async (taskId: number, linkId: number) => {
        try {
            const token = $user.userToken;
            const result = await targetKeywordService._unlinkTargetKeyword(token, linkId);

            if (result.success) {
                setLinkedKeywords((prev) => prev.filter((k) => k.linkId !== linkId));
                _console.success("Keyword unlinked from task");
            } else {
                throw new Error(result.message || "Failed to unlink keyword");
            }
        } catch (error) {
            console.error("Failed to unlink keyword:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to unlink keyword: ${errorMessage}`);
            }
        }
    }
    return {
        loadLinkedKeywords,
        linkKeyword,
        unlinkKeyword,
    };
};
