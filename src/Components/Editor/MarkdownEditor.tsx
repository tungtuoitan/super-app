/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect } from "react";
import { useMonacoEditor } from "@/hooks/useMonacoEditor";
import { useStandardRegistryStore, useWorkspaceStore } from "@/store/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { constants } from "@/utils/constants";
import { convertToDisplayVersion, convertToOriginalVersion } from "@/utils/markdown.utils";

interface EditorWithKeywordsProps {
    value: string; // Original version (with links)
    onChange: (value: string) => void; // Returns original version
    disabled?: boolean;
    placeholder?: string;
    currentNoteId?: number; // For cross-note reference navigation
}

export function MarkdownEditor({ value, onChange, disabled = false, placeholder, currentNoteId }: EditorWithKeywordsProps) {
    const { registries, allKeywords } = useStandardRegistryStore();
    const { navigateToKeyword } = useKeywordNavigationHelper();
    const {currentWorkspace } = useWorkspaceStore();

    // Internal state: Display version (clean text for editing)
    const [displayValue, setDisplayValue] = useState(() => convertToDisplayVersion(value));

    // Sync display version when external value changes
    useEffect(() => {
        const newDisplayValue = convertToDisplayVersion(value);
        setDisplayValue(newDisplayValue);
    }, [value]);

    // Handle internal changes: Update display and convert to original for parent
    const handleDisplayChange = (newDisplayValue: string) => {
        setDisplayValue(newDisplayValue);

        // Convert display → original before calling parent onChange
        // Use allKeywords to map [name] to [[link]]
        const originalValue = convertToOriginalVersion(newDisplayValue, allKeywords);
        onChange(originalValue);
    };

    // Extract keywords from registries + allKeywords
    const keywords = useMemo(() => {
        // Get hashtag and status keywords from registries
        const registryKeywords = registries
            .filter((r) => r.isActive && (r.type === constants.standardRegistryFE.types.hashtag || r.type === constants.standardRegistryFE.types.noteStatus))
            .map((r) => ({
                text: r.code,
                type: r.type === constants.standardRegistryFE.types.hashtag ? "hashtag" : "status",
            }));

        // Get keywords from allKeywords (workspaces, folders, notes, headings, external links)
        // Filter out deleted keywords if needed
        const systemKeywords = allKeywords
            .filter((k) => !k.isDeleted) // Only show non-deleted keywords
            .map((k) => ({
                text: k.name,
                type: k.type,
                // type: "comment", // Show all as comment type for now
            }));
        console.log("System Keywords:", systemKeywords);

        //         const dummyKeywords = [
        //     { text: "function", type: "keyword" },
        //     { text: "const", type: "keyword" },
        //     { text: "let", type: "keyword" },
        //     { text: "var", type: "keyword" },
        //     { text: "return", type: "keyword" },
        //     { text: "import", type: "keyword" },
        //     { text: "export", type: "keyword" },
        //     { text: "class", type: "class" },
        //     { text: "interface", type: "class" },
        //     { text: "type", type: "class" },
        //     { text: "string", type: "type" },
        //     { text: "number", type: "type" },
        //     { text: "boolean", type: "type" },
        //     { text: "Cộng hoà xã hội chủ nghĩa việt nam", type: "comment" },
        //     { text: "FIXME", type: "comment" },
        //     { text: "NOTE", type: "comment" },

        // ];

        return [
            // ...registryKeywords,
            ...systemKeywords,
        ];
    }, [registries, allKeywords]);
    console.log("Keywords for MarkdownEditor:", keywords);
    console.log("[MarkdownEditor] allKeywords to pass:", {
        count: allKeywords.length,
        sample: allKeywords.slice(0, 3).map((k) => ({ name: k.name, type: k.type, link: k.link })),
    });
    console.log("[MarkdownEditor] navigateToKeyword function:", navigateToKeyword);

    const { containerRef } = useMonacoEditor({
        initialValue: displayValue, // Use display version for editor
        onChange: handleDisplayChange, // Convert on change
        disabled,
        keywords,
        currentNoteId,
        allKeywords, // Pass all keywords for link resolution
        onKeywordClick: navigateToKeyword, // Handle keyword navigation
    });

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "400px",
                overflow: "hidden",
                textAlign: "left",
                backgroundColor: "#09090B",
                fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
            }}
            // className="bred"
        />
    );
}
