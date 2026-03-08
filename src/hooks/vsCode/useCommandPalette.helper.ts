/**
 * Command Palette Helper
 * Business logic for command palette operations
 */

import { useMemo } from "react";
import { useCommandPaletteStore, useGeneralStore } from "@/store/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { Keyword } from "@/types/keyword.types";
import { Layers, Folder, FileText, Link, Hash, Cuboid, SquareCheckBig, ScrollText, Shell } from "lucide-react";
import { fuzzyMatchWithDiacritics } from "@/utils/fuzzy-search.utils";

export const useCommandPaletteHelper = () => {
    const { allKeywords } = useGeneralStore();
    const { setIsOpen, setSearchQuery, setSelectedIndex, setOnLinkKeyword } = useCommandPaletteStore();
    const { navigateLink } = useKeywordNavigationHelper();

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
    };

    // Handle keyword selection with close callback
    const handleSelectKeyword = (keyword: any) => {
        if (keyword.hardDeletedAt !== null) {
            return; // Don't navigate to deleted keywords
        }

        navigateLink(keyword);
        close();
    };

    /**
     * Open the palette in "link" mode.
     * Each row will show a Link button; clicking it calls onLink(keyword) and closes.
     */
    const openForLink = (onLink: (keyword: Keyword) => void) => {
        setOnLinkKeyword(() => onLink);
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
    };
};
