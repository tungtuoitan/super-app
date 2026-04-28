/**
 * Command Palette Helper
 * Business logic for command palette operations
 */

import { useKeywordNavigationHelper } from "@/shared/hooks/useKeywordNavigation.helper";
import { useAuthStore } from "@/shell/store/Auth.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import { useLifeLogStore } from "@/features/lifeLog/store/useLifeLog.store";
import { Keyword } from "@/shared/types/keyword.types";
import { Layers, Folder, FileText, Link, Hash, Cuboid, SquareCheckBig, ScrollText, Shell } from "lucide-react";
import { fuzzyMatchWithDiacritics } from "@/utils/fuzzy-search.utils";
import { targetKeywordService } from "@/services/targetKeyword.service";
import { projectService } from "@/features/project/service/project.service";
import { taskService } from "@/features/taskDetail/service/task.service";
import { lifeLogService } from "@/features/lifeLog/service/lifeLog.service";
import {useGeneralStore} from "@/shared/store/General.store";
import {useCommandPaletteStore} from "../store/useCommandPalette.store";
import {usePTaskStore} from "@/features/project/store/usePTask.store";

export const useCommandPaletteHelper = () => {
    const { allKeywords } = useGeneralStore();
    const { setIsOpen, setSearchQuery, setSelectedIndex, setOnLinkKeyword, setAlreadyLinkedIds } = useCommandPaletteStore();
    const { navigateLink } = useKeywordNavigationHelper();
    const { $user } = useAuthStore();
    const { projects } = useProjectStore();
    const { tasks } = usePTaskStore();
    const { logs, tracks } = useLifeLogStore();

    // Helper: Remove name (last part) from longLink
    // Example: "Workspace[1]/Folder[2]/NoteName[3]" -> "Workspace[1]/Folder[2]"
    const getDisplayLink = (longLink: string, name: string): string => {
        if (!longLink) return "";

        // Split by '/' to get all parts
        const parts = longLink.split("/");

        // Remove last part (which should be the name)
        if (parts.length > 1) {
            parts.pop();
            return parts.join("/");
        }

        // If only one part, return empty (it's just the name itself)
        return "";
    };

    // Filter keywords based on search query with fuzzy matching (diacritics-insensitive)
    const getFilteredKeywords = (searchQuery: string) => {
        const activeKeywords = allKeywords.filter((k) => k.hardDeletedAt === null);

        const resolveDisplayLink = (keyword: Keyword): string => {
            if ((keyword.type === "log" || keyword.type === "track") && keyword.description) {
                return keyword.description;
            }
            return getDisplayLink(keyword.longLink, keyword.name);
        };

        if (!searchQuery.trim()) {
            return activeKeywords
                .map((keyword) => ({
                    keyword,
                    matchedIndices: { name: [], link: [] },
                    displayLink: resolveDisplayLink(keyword),
                }));
        }

        const searchWords = searchQuery.trim().split(/\s+/);

        interface MatchResult {
            keyword: Keyword;
            score: number;
            matchedIndices: {
                name: number[];
                link: number[];
            };
            displayLink: string;
        }
        const matches: MatchResult[] = [];

        activeKeywords.forEach((keyword) => {
            // Get display link without name at the end (or description for log/track)
            const displayLink = resolveDisplayLink(keyword);

            // Search in both name and displayLink (without diacritics)
            const nameMatch = fuzzyMatchWithDiacritics(keyword.name, searchWords);
            const linkMatch = fuzzyMatchWithDiacritics(displayLink, searchWords);

            // If either name or link matches, include it
            if (nameMatch.match || linkMatch.match) {
                // Use the better score (higher is better)
                const bestScore = Math.max(nameMatch.score, linkMatch.score);
                matches.push({
                    keyword,
                    score: bestScore,
                    matchedIndices: {
                        name: nameMatch.matchedIndices,
                        link: linkMatch.matchedIndices,
                    },
                    displayLink,
                });
            }
        });

        // Sort by score (highest first)
        matches.sort((a, b) => b.score - a.score);

        return matches;
    };

    // Get icon for keyword type
    const getKeywordIcon = (type: Keyword["type"]): React.ComponentType<{ className?: string }> | string => {
        switch (type) {
            case "workspace":
                return Layers;
            case "folder":
                return Folder;
            case "note":
                return FileText;
            case "file":
                return FileText;
            case "project":
                return Cuboid;
            case "task":
                return SquareCheckBig;
            case "log":
                return ScrollText;
            case "track":
                return Shell;
            case "external":
                return Link;
            default:
                return Hash;
        }
    };

    const close = () => {
        setIsOpen(false);
        setSearchQuery("");
        setSelectedIndex(0);
        setOnLinkKeyword(null);
        setAlreadyLinkedIds(new Set());
    };

    // Handle keyword selection with close callback
    const handleSelectKeyword = async (keyword: any) => {
        if (keyword.hardDeletedAt !== null) return;

        // Resolve openedBy BEFORE navigating so it's available when the tab is created
        const openedBy = await _resolveOpenedBy(keyword.id);

        navigateLink(keyword, openedBy);
        close();
    };

    const _resolveOpenedBy = async (keywordId: number): Promise<{ link: string; label: string } | undefined> => {
        try {
            const result = await targetKeywordService._getKeywordTargets($user.userToken, keywordId);
            if (!result.success || !result.data?.length) return undefined;

            const first = result.data[0] as { targetId: number; targetType: string; keywordId: number };
            const { targetId, targetType } = first;

            // 1. Try allKeywords first (fast path)
            const ownerKw = allKeywords.find(k => {
                switch (targetType) {
                    case "TASK":    return k.type === "task"    && k.link.endsWith(`/t${targetId}`);
                    case "PROJECT": return k.type === "project" && k.link === `sa/p${targetId}`;
                    case "NOTE":    return k.type === "note"    && k.entityId === targetId;
                    case "LOG":     return k.type === "log"     && k.entityId === targetId;
                    case "TRACK":   return k.type === "track"   && k.entityId === targetId;
                    case "FOLDER":  return k.type === "folder"  && k.workspaceItemId === targetId;
                    default:        return false;
                }
            });
            if (ownerKw) return { link: ownerKw.link, label: ownerKw.name };

            // 2. Fallback: check state stores, then fetch from API
            switch (targetType) {
                case "PROJECT": {
                    const fromState = projects.find(p => p.id === targetId);
                    if (fromState) return { link: `sa/p${targetId}`, label: fromState.name };
                    const res = await projectService._getProjectById($user.userToken, targetId);
                    if (res.success && res.data?.[0]) return { link: `sa/p${targetId}`, label: res.data[0].name };
                    break;
                }
                case "TASK": {
                    const fromState = tasks.find(t => t.id === targetId);
                    if (fromState) return { link: `sa/p${fromState.projectId}/t${targetId}`, label: fromState.title };
                    const res = await taskService._getTaskById($user.userToken, targetId);
                    if (res.success && res.data?.[0]) {
                        const dto = res.data[0];
                        return { link: `sa/p${dto.projectId}/t${targetId}`, label: dto.title };
                    }
                    break;
                }
                case "LOG": {
                    const fromState = logs.find(l => l.id === targetId);
                    if (fromState) return { link: `sa/l${targetId}`, label: fromState.title ?? `Log ${targetId}` };
                    const res = await lifeLogService._getLogById($user.userToken, targetId);
                    if (res.success && res.data?.[0]) return { link: `sa/l${targetId}`, label: res.data[0].title ?? `Log ${targetId}` };
                    break;
                }
                case "TRACK": {
                    const fromState = tracks.find(t => t.id === targetId);
                    if (fromState) return { link: `sa/tr${targetId}`, label: fromState.name };
                    const res = await lifeLogService._getTrackById($user.userToken, targetId);
                    if (res.success && res.data?.[0]) return { link: `sa/tr${targetId}`, label: res.data[0].name };
                    break;
                }
            }

            return undefined;
        } catch {
            return undefined;
        }
    };

    /**
     * Open the palette in "link" mode.
     * Each row will show a Link button; clicking it calls onLink(keyword) and closes.
     * @param alreadyLinkedIds - Set of keyword IDs already linked, to disable them in the palette
     */
    const openForLink = (onLink: (keyword: Keyword) => void, alreadyLinkedIds?: Set<number>) => {
        setOnLinkKeyword(() => onLink);
        setAlreadyLinkedIds(alreadyLinkedIds ?? new Set());
        setSearchQuery("");
        setSelectedIndex(0);
        setIsOpen(true);
    };

    return {
        // Functions only (no state, no setters, no useEffect)
        getFilteredKeywords,
        getKeywordIcon,
        handleSelectKeyword,
        close,
        openForLink,
        resolveOpenedBy: _resolveOpenedBy,
    };
};
