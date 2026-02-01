/**
 * Custom Image Extension for Tiptap
 * Stores fileId in data-file-id attribute for proxy loading
 * Supports resizing via width/height attributes
 */

import ImageResize from "tiptap-extension-resize-image";

export const ProxyImage = ImageResize.extend({
    name: "proxyImage",

    addAttributes() {
        return {
            ...this.parent?.(),
            // Store fileId for proxy loading
            "data-file-id": {
                default: null,
                parseHTML: (element) => element.getAttribute("data-file-id"),
                renderHTML: (attributes) => {
                    if (!attributes["data-file-id"]) {
                        return {};
                    }
                    return { "data-file-id": attributes["data-file-id"] };
                },
            },
        };
    },
});

export default ProxyImage;
