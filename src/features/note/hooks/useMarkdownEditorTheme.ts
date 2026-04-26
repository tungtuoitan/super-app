import React, { useEffect } from "react";
import { constants } from "@/utils/constants";

export function useMarkdownEditorTheme({ $mi }: { $mi: any }) {
    useEffect(() => {
        if ($mi) {
            $mi.editor.defineTheme(constants.markdown.theme.name, constants.markdown.theme.config);
        }
    }, [$mi]);

    return null;
}
