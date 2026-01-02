/**
 * EditorWithKeywords Component
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

export function EditorWithKeywords({ value, onChange, disabled = false, placeholder }: EditorWithKeywordsProps) {
    console.log('[EditorWithKeywords] Component rendering...', {
        valueLength: value?.length,
        valuePreview: value?.substring(0, 50),
        disabled,
        onChangeType: typeof onChange,
        hasOnChange: !!onChange
    });

    const { registries } = useStandardRegistryStore();

    // Extract keywords from registries
    const keywords = useMemo(() => {
        const kws = registries
            .filter((r) => r.isActive && (r.type === constants.standardRegistryFE.types.hashtag || r.type === constants.standardRegistryFE.types.noteStatus))
            .map((r) => ({
                text: r.code,
                type: r.type === constants.standardRegistryFE.types.hashtag ? "hashtag" : "status",
            }));
        console.log('[EditorWithKeywords] Keywords computed:', kws.length);
        return kws;
    }, [registries]);

    console.log('[EditorWithKeywords] About to call useMonacoEditor...');

    const { containerRef } = useMonacoEditor({
        initialValue: value,
        onChange,
        disabled,
        keywords,
    });

    console.log('[EditorWithKeywords] useMonacoEditor returned, containerRef:', !!containerRef);

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
