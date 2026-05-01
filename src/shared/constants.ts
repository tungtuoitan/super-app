/**
 * Static Constants
 * Non-configuration constants used throughout the app
 *
 * NOTE: Feature-specific and shell-specific constants have been moved to their respective files:
 * - shell/shell.constants.ts: navigation, vscode, modules
 * - features/workspace/workspace.constants.ts: workspace
 * - features/project/project.constants.ts: optionColor, optionOrder, filters
 * - shared/components/RichTextEditor/richTextEditor.constants.ts: markdown
 */

export const constants = {
    environments: {
        development: "development",
        production: "production",
    },

    pagination: {
        defaultPageSize: 25,
        pageSizeOptions: [25, 50, 100],
    } as const,

    grid: {
        rowHeight: 50,
        headerHeight: 52,
        columnBuffer: 150,
        rowBuffer: 250,
    } as const,

    // standardRegistryFE: {
    //     types: {
    //         hashtag: "hashtag",
    //         entity: "entity",
    //         workspaceStatus: "workspaceStatus",
    //         noteStatus: "noteStatus",
    //     } as const,
    //     activeStatus: {
    //         active: "active",
    //         inactive: "inactive",
    //     } as const,
    //     activeStatusOptions: [
    //         { id: "active", code: "active", desc: "Active", label: "Active" },
    //         { id: "inactive", code: "inactive", desc: "Inactive", label: "Inactive" },
    //     ] as const,
    // },

    // keywordIcons: {
    //     workspace: "folder",
    //     folder: "folder",
    //     note: "file",
    //     file: "file",
    //     h1: "text",
    //     h2: "text",
    //     h3: "text",
    //     h4: "text",
    //     h5: "text",
    //     h6: "text",
    //     external: "reference",
    //     hashtag: "color",
    //     status: "enum",
    //     keyword: "keyword",
    //     class: "class",
    //     type: "interface",
    //     comment: "snippet",
    // } as const,

    // color: [
    //     { value: "#90A4AE", label: "Grey" },
    //     { value: "#42A5F5", label: "Blue" },
    //     { value: "#29B6F6", label: "Light Blue" },
    //     { value: "#26C6DA", label: "Cyan" },
    //     { value: "#26A69A", label: "Teal" },
    //     { value: "#66BB6A", label: "Green" },
    //     { value: "#9CCC65", label: "Light Green" },
    //     { value: "#D4E157", label: "Lime" },
    //     { value: "#FFEE58", label: "Yellow" },
    //     { value: "#FFCA28", label: "Amber" },
    //     { value: "#FFA726", label: "Orange" },
    //     { value: "#FF7043", label: "Deep Orange" },
    //     { value: "#EF5350", label: "Red" },
    //     { value: "#EC407A", label: "Pink" },
    //     { value: "#AB47BC", label: "Purple" },
    //     { value: "#7E57C2", label: "Deep Purple" },
    //     { value: "#5C6BC0", label: "Indigo" },
    //     { value: "#8D6E63", label: "Brown" },
    // ],
} as const;
