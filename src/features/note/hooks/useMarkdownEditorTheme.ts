import React, { useEffect } from "react";
import { richTextEditorConstants } from "@/shared";

export function useMarkdownEditorTheme({ $mi }: { $mi: any }) {
    useEffect(() => {
        if ($mi) {
            $mi.editor.defineTheme(richTextEditorConstants.markdown.theme.name, richTextEditorConstants.markdown.theme.config);
        }
    }, [$mi]);

    return null;
}
