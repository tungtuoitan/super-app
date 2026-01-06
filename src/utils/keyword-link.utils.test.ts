/**
 * Tests for keyword-link.utils.ts
 */

import { parseKeywordLink, getHeadingAnchor } from "./keyword-link.utils";

describe("parseKeywordLink", () => {
    it("should parse workspace link", () => {
        const result = parseKeywordLink("w77");
        expect(result).toEqual({
            type: "workspace",
            workspaceId: 77,
            raw: "w77",
        });
    });

    it("should parse folder link", () => {
        const result = parseKeywordLink("w77/f183");
        expect(result).toEqual({
            type: "folder",
            workspaceId: 77,
            folderId: 183,
            raw: "w77/f183",
        });
    });

    it("should parse nested folder link", () => {
        const result = parseKeywordLink("w77/f183/f184");
        expect(result).toEqual({
            type: "folder",
            workspaceId: 77,
            folderId: 184,
            raw: "w77/f183/f184",
        });
    });

    it("should parse note link", () => {
        const result = parseKeywordLink("w77/n185");
        expect(result).toEqual({
            type: "note",
            workspaceId: 77,
            noteWorkspaceItemId: 185,
            raw: "w77/n185",
        });
    });

    it("should parse note link with trailing slash", () => {
        const result = parseKeywordLink("w77/n186/");
        expect(result).toEqual({
            type: "note",
            workspaceId: 77,
            noteWorkspaceItemId: 186,
            raw: "w77/n186/",
        });
    });

    it("should parse note with single heading", () => {
        const result = parseKeywordLink("w77/n186/Nhà sản xuất");
        expect(result).toEqual({
            type: "heading",
            workspaceId: 77,
            noteWorkspaceItemId: 186,
            headingPath: ["Nhà sản xuất"],
            raw: "w77/n186/Nhà sản xuất",
        });
    });

    it("should parse note with nested headings", () => {
        const result = parseKeywordLink("w77/n187/Wonbin");
        expect(result).toEqual({
            type: "heading",
            workspaceId: 77,
            noteWorkspaceItemId: 187,
            headingPath: ["Wonbin"],
            raw: "w77/n187/Wonbin",
        });
    });

    it("should parse note with multiple nested headings", () => {
        const result = parseKeywordLink("w77/n187/Wonbin2/ai nữa2");
        expect(result).toEqual({
            type: "heading",
            workspaceId: 77,
            noteWorkspaceItemId: 187,
            headingPath: ["Wonbin2", "ai nữa2"],
            raw: "w77/n187/Wonbin2/ai nữa2",
        });
    });

    it("should parse external link", () => {
        const result = parseKeywordLink("https://google.com");
        expect(result).toEqual({
            type: "external",
            url: "https://google.com",
            raw: "https://google.com",
        });
    });

    it("should return null for invalid link", () => {
        expect(parseKeywordLink("")).toBeNull();
        expect(parseKeywordLink("invalid")).toBeNull();
        expect(parseKeywordLink("123/456")).toBeNull();
    });
});

describe("getHeadingAnchor", () => {
    it("should get anchor from single heading", () => {
        expect(getHeadingAnchor(["Introduction"])).toBe("introduction");
    });

    it("should get anchor from nested headings", () => {
        expect(getHeadingAnchor(["Introduction", "Overview"])).toBe("overview");
    });

    it("should handle Vietnamese characters", () => {
        expect(getHeadingAnchor(["Nhà sản xuất"])).toBe("nhà-sản-xuất");
    });

    it("should handle multiple spaces", () => {
        expect(getHeadingAnchor(["Hello   World"])).toBe("hello-world");
    });

    it("should return empty string for empty array", () => {
        expect(getHeadingAnchor([])).toBe("");
    });
});
