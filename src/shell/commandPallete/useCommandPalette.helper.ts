/**
 * Command Palette Helper
 * Business logic for command palette operations
 */

import { useKeywordNavigationHelper } from "@/shell";
import { useAuthStore } from "@/shell";
import { Keyword } from "@/shell";
import { Layers, Folder, FileText, Link, Hash, Cuboid, SquareCheckBig, ScrollText, Shell } from "lucide-react";
import { fuzzyMatchWithDiacritics } from "@/utils/fuzzy-search.utils";
import { targetKeywordService } from "@/shell";
import { useGeneralStore } from "@/shared";
import { useCommandPaletteStore } from "./useCommandPalette.store";
import { keywordNavigatorRegistry } from "./keywordNavigator.registry";

export const useCommandPaletteHelper = () => {
    const { allKeywords } = useGeneralStore();
    const { setIsOpen, setSearchQuery, setSelectedIndex, setOnLinkKeyword, setAlreadyLinkedIds } = useCommandPaletteStore();
    const { navigateLink } = useKeywordNavigationHelper();
    const { $user } = useAuthStore();

    const getDisplayLink = (longLink: string, name: string): string => {
        if (!longLink) return "";
        const parts = longLink.split("/");
        if (parts.length > 1) {
            parts.pop();
            return parts.join("/");
        }
        return "";
    };

    const getFilteredKeywords = (searchQuery: string) => {
        const activeKeywords = allKeywords.filter((k) => k.hardDeletedAt === null);

        const resolveDisplayLink = (keyword: Keyword): string => {
            if ((keyword.type === "log" || keyword.type === "track") && keyword.description) {
                return keyword.description;
            }
            return getDisplayLink(keyword.longLink, keyword.name);
        };

        if (!searchQuery.trim()) {
            return activeKeywords.map((keyword) => ({
                keyword,
                matchedIndices: { name: [], link: [] },
                displayLink: resolveDisplayLink(keyword),
            }));
        }

        const searchWords = searchQuery.trim().split(/\s+/);

        interface MatchResult {
            keyword: Keyword;
            score: number;
            matchedIndices: { name: number[]; link: number[] };
            displayLink: string;
        }
        const matches: MatchResult[] = [];

        activeKeywords.forEach((keyword) => {
            const displayLink = resolveDisplayLink(keyword);
            const nameMatch = fuzzyMatchWithDiacritics(keyword.name, searchWords);
            const linkMatch = fuzzyMatchWithDiacritics(displayLink, searchWords);

            if (nameMatch.match || linkMatch.match) {
                matches.push({
                    keyword,
                    score: Math.max(nameMatch.score, linkMatch.score),
                    matchedIndices: {
                        name: nameMatch.matchedIndices,
                        link: linkMatch.matchedIndices,
                    },
                    displayLink,
                });
            }
        });

        matches.sort((a, b) => b.score - a.score);
        return matches;
    };

    const getKeywordIcon = (type: Keyword["type"]): React.ComponentType<{ className?: string }> | string => {
        switch (type) {
            case "workspace": return Layers;
            case "folder":    return Folder;
            case "note":      return FileText;
            case "file":      return FileText;
            case "project":   return Cuboid;
            case "task":      return SquareCheckBig;
            case "log":       return ScrollText;
            case "track":     return Shell;
            case "external":  return Link;
            default:          return Hash;
        }
    };

    const close = () => {
        setIsOpen(false);
        setSearchQuery("");
        setSelectedIndex(0);
        setOnLinkKeyword(null);
        setAlreadyLinkedIds(new Set());
    };

    const handleSelectKeyword = async (keyword: any) => {
        if (keyword.hardDeletedAt !== null) return;
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

            // Fast path: check allKeywords index first
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

            // Fallback: delegate to feature plugins (state store → API)
            return await keywordNavigatorRegistry.resolveTarget(targetType, targetId, $user.userToken);
        } catch {
            return undefined;
        }
    };

    const openForLink = (onLink: (keyword: Keyword) => void, alreadyLinkedIds?: Set<number>) => {
        setOnLinkKeyword(() => onLink);
        setAlreadyLinkedIds(alreadyLinkedIds ?? new Set());
        setSearchQuery("");
        setSelectedIndex(0);
        setIsOpen(true);
    };

    return {
        getFilteredKeywords,
        getKeywordIcon,
        handleSelectKeyword,
        close,
        openForLink,
        resolveOpenedBy: _resolveOpenedBy,
    };
};
