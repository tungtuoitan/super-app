/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo } from "react";
import { useMonacoEditor } from "@/hooks/useMonacoEditor";
import { useStandardRegistryStore } from "@/store/index";
import { constants } from "@/utils/constants";

interface EditorWithKeywordsProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function MarkdownEditor({ value, onChange, disabled = false, placeholder }: EditorWithKeywordsProps) {
    console.log('[MarkdownEditor] Component rendering...', {
        valueLength: value?.length,
        valuePreview: value?.substring(0, 50),
        disabled,
        onChangeType: typeof onChange,
        hasOnChange: !!onChange
    });

    const { registries } = useStandardRegistryStore();

    // Extract keywords from registries + add dummy keywords
    const keywords = useMemo(() => {
        const kws = registries
            .filter((r) => r.isActive && (r.type === constants.standardRegistryFE.types.hashtag || r.type === constants.standardRegistryFE.types.noteStatus))
            .map((r) => ({
                text: r.code,
                type: r.type === constants.standardRegistryFE.types.hashtag ? "hashtag" : "status",
            }));
        
        // Add dummy keywords for testing
        const dummyKeywords = [
            { text: "function", type: "keyword" },
            { text: "const", type: "keyword" },
            { text: "let", type: "keyword" },
            { text: "var", type: "keyword" },
            { text: "return", type: "keyword" },
            { text: "import", type: "keyword" },
            { text: "export", type: "keyword" },
            { text: "class", type: "class" },
            { text: "interface", type: "class" },
            { text: "type", type: "class" },
            { text: "string", type: "type" },
            { text: "number", type: "type" },
            { text: "boolean", type: "type" },
            { text: "Cộng hoà xã hội chủ nghĩa việt nam", type: "comment" },
            { text: "FIXME", type: "comment" },
            { text: "NOTE", type: "comment" },
        ];
        
        console.log('[MarkdownEditor] Keywords computed:', kws.length + dummyKeywords.length);
        return [...kws, ...dummyKeywords];
    }, [registries]);

    console.log('[MarkdownEditor] About to call useMonacoEditor...');

    const { containerRef } = useMonacoEditor({
        initialValue: value,
        onChange,
        disabled,
        keywords,
    });

    console.log('[MarkdownEditor] useMonacoEditor returned, containerRef:', !!containerRef);

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
