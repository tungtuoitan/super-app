import React, { useEffect } from "react";
import { richTextEditorConstants } from "@/shared";
import type { Monaco } from "@monaco-editor/react";

export function useMarkdownEditorTheme({ $mi }: { $mi: Monaco | null }) {
    useEffect(() => {
        if ($mi) {
            $mi.editor.defineTheme(richTextEditorConstants.markdown.theme.name, richTextEditorConstants.markdown.theme.config);
        }
    }, [$mi]);

    return null;
}
