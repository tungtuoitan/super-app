/**
 * Command Palette Helper
 * Business logic for command palette operations
 */

import { useMemo } from "react";
import { useCommandPaletteStore, useGeneralStore } from "@/store/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { Keyword } from "@/types/keyword.types";
import { Layers, Folder, FileText, Link, Hash } from "lucide-react";
import { fuzzyMatchWithDiacritics } from "@/utils/string.utils";

export const useCommandPaletteHelper = () => {
    const { allKeywords } = useGeneralStore();
    const { setIsOpen, setSearchQuery, setSelectedIndex } = useCommandPaletteStore();
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
        if (!searchQuery.trim()) {
            return activeKeywords
                .map((keyword) => ({
                    keyword,
                    matchedIndices: { name: [], link: [] },
                    displayLink: getDisplayLink(keyword.longLink, keyword.name),
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
            // Get display link without name at the end
            const displayLink = getDisplayLink(keyword.longLink, keyword.name);

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
            case "h1":
                return "H1";
            case "h2":
                return "H2";
            case "h3":
                return "H3";
            case "h4":
                return "H4";
            case "h5":
                return "H5";
            case "h6":
                return "H6";
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
    };

    // Handle keyword selection with close callback
    const handleSelectKeyword = (keyword: any) => {
        if (keyword.hardDeletedAt !== null) {
            return; // Don't navigate to deleted keywords
        }

        navigateLink(keyword);
        close();
    };

    return {
        // Functions only (no state, no setters, no useEffect)
        getFilteredKeywords,
        getKeywordIcon,
        handleSelectKeyword,
        close,
    };
};
