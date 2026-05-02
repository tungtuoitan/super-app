import type * as _monaco from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import type { Keyword } from "@/shared";
import { escapeRegex } from "./markdown.conversion";

/**
 * Register a link provider (Ctrl+hover underline) and a click handler for
 * keyword navigation. Returns a cleanup function.
 */
export function setupLinkProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<Keyword>,
    navigateLink: (keyword: Keyword) => void,
    _console: { warning: (msg: string) => void },
    noteId?: number,
) {
    if (!$mi) return () => {};

    const linkProviderDisposable = $mi.languages.registerLinkProvider("markdown", {
        provideLinks: (model) => {
            const currentText = model.getValue();
            const links: _monaco.languages.ILink[] = [];

            _allKeywords.forEach((kw) => {
                const displayName = `[${kw.name}]`;
                const regex = new RegExp(escapeRegex(displayName), "gi");
                let match;

                while ((match = regex.exec(currentText)) !== null) {
                    const startPos = model.getPositionAt(match.index);
                    const endPos = model.getPositionAt(match.index + match[0].length);

                    links.push({
                        range: {
                            startLineNumber: startPos.lineNumber,
                            startColumn: startPos.column,
                            endLineNumber: endPos.lineNumber,
                            endColumn: endPos.column,
                        },
                        url: `keyword://${displayName}`,
                    });
                }
            });

            // Also detect wiki-style links [[name|link]]
            const wikiLinkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
            let wikiMatch;

            while ((wikiMatch = wikiLinkRegex.exec(currentText)) !== null) {
                const startPos = model.getPositionAt(wikiMatch.index);
                const endPos = model.getPositionAt(wikiMatch.index + wikiMatch[0].length);

                links.push({
                    range: {
                        startLineNumber: startPos.lineNumber,
                        startColumn: startPos.column,
                        endLineNumber: endPos.lineNumber,
                        endColumn: endPos.column,
                    },
                    url: wikiMatch[2],
                });
            }

            return { links };
        },
    });

    const clickDisposable = editor.onMouseDown((e) => {
        if (!e.event.ctrlKey && !e.event.metaKey) return;
        const position = e.target.position;
        if (!position) return;

        const model = editor.getModel();
        if (!model) return;

        const lineContent = model.getLineContent(position.lineNumber);
        const clickColumn = position.column;

        for (const kw of _allKeywords) {
            const displayName = `[${kw.name}]`;
            const regex = new RegExp(escapeRegex(displayName), "gi");
            let match;

            while ((match = regex.exec(lineContent)) !== null) {
                const startIndex = match.index;
                const endIndex = startIndex + match[0].length;

                if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                    if (kw.link && kw.hardDeletedAt) {
                        _console.warning("Keyword is deleted or not existed.");
                        return;
                    } else if (kw.link && !kw.hardDeletedAt) {
                        navigateLink(kw);
                        e.event.preventDefault();
                        e.event.stopPropagation();
                        return;
                    }
                }
            }
        }
    });

    return () => {
        linkProviderDisposable.dispose();
        clickDisposable.dispose();
    };
}
