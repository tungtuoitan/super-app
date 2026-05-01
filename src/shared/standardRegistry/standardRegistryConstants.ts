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

export const standardRegistryConstants = {
        types: {
            hashtag: "hashtag",
            entity: "entity",
            workspaceStatus: "workspaceStatus",
            noteStatus: "noteStatus",
        } as const,
        activeStatus: {
            active: "active",
            inactive: "inactive",
        } as const,
        activeStatusOptions: [
            { id: "active", code: "active", desc: "Active", label: "Active" },
            { id: "inactive", code: "inactive", desc: "Inactive", label: "Inactive" },
        ] as const,

} as const;