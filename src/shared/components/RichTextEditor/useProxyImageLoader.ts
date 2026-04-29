/**
 * Hook to load images via proxy for RichTextEditor
 * Watches for images with data-file-id and loads them via authenticated fetch
 */

import { useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { fileService } from "@/shared";

interface UseProxyImageLoaderOptions {
    editor: Editor | null;
    token: string | null;
}

export function useProxyImageLoader({ editor, token }: UseProxyImageLoaderOptions) {
    const loadingRef = useRef<Set<string>>(new Set());
    const loadedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!editor || !token) return;

        const loadImages = async () => {
            const { state } = editor;
            const { doc } = state;
            const imagesToLoad: { pos: number; fileId: string }[] = [];

            // Find all images with data-file-id that need loading
            doc.descendants((node, pos) => {
                if (node.type.name === "proxyImage" || node.type.name === "image") {
                    const fileId = node.attrs["data-file-id"];
                    const src = node.attrs.src;

                    // Need to load if has fileId and either no src or empty src
                    if (fileId && (!src || src === "")) {
                        // Skip if already loaded or loading
                        if (!loadedRef.current.has(fileId) && !loadingRef.current.has(fileId)) {
                            imagesToLoad.push({ pos, fileId });
                        }
                    }
                }
                return true;
            });

            // Load each image
            for (const { pos, fileId } of imagesToLoad) {
                loadingRef.current.add(fileId);

                try {
                    const blobUrl = await fileService._getFileBlobUrl(token, parseInt(fileId, 10));

                    if (blobUrl) {
                        // Update via editor transaction
                        const { tr } = editor.state;
                        const node = editor.state.doc.nodeAt(pos);

                        if (node) {
                            tr.setNodeMarkup(pos, undefined, {
                                ...node.attrs,
                                src: blobUrl,
                            });
                            editor.view.dispatch(tr);
                            loadedRef.current.add(fileId);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load image:", fileId, error);
                } finally {
                    loadingRef.current.delete(fileId);
                }
            }
        };

        // Load images on mount
        loadImages();

        // Also listen for content changes
        const handleUpdate = () => {
            loadImages();
        };

        editor.on("update", handleUpdate);

        return () => {
            editor.off("update", handleUpdate);
        };
    }, [editor, token]);

    // Clear loaded cache when editor changes (new content)
    useEffect(() => {
        loadedRef.current.clear();
    }, [editor]);
}
