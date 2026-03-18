/**
 * Task Linked Keywords Helper
 * Functions only — linking/unlinking keywords to tasks via TargetKeywords table.
 * State lives in useTaskStore.
 */

import { useCallback } from "react";
import { targetKeywordService, TargetKeywordTargetType } from "@/services/targetKeyword.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useConsoleHelper } from "../console/useConsole.helper";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useGeneralStore } from "@/store/index";
import { useTaskStore } from "@/store/task/useTask.store";
import { Keyword } from "@/types/keyword.types";
import type { LinkedKeyword } from "@/types/task/taskDetail.types";

export const useTaskLinkedKeywordsHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { allKeywords } = useGeneralStore();
    const { setLinkedKeywords, setIsLoadingLinkedKeywords } = useTaskStore();

    /**
     * Load linked keywords for a task, resolve keyword details from allKeywords
     */
    const loadLinkedKeywords = useCallback(async (taskId: number) => {
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
    }, [$user.userToken, allKeywords, setLinkedKeywords, setIsLoadingLinkedKeywords]);

    /**
     * Link a keyword to a task
     */
    const linkKeyword = useCallback(async (taskId: number, keywordId: number) => {
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
    }, [$user.userToken, _console, loadLinkedKeywords]);

    /**
     * Unlink a keyword from a task
     */
    const unlinkKeyword = useCallback(async (taskId: number, linkId: number) => {
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
    }, [$user.userToken, _console, setLinkedKeywords]);

    return {
        loadLinkedKeywords,
        linkKeyword,
        unlinkKeyword,
    };
};
