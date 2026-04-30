"use strict";

// ─── Pattern helpers ──────────────────────────────────────────────────────────

function feat(name) {
    return {
        group: [
            `@/features/${name}/**`,
            `../../${name}/**`,
            `../../../${name}/**`,
            `../../../../${name}/**`,
        ],
        message: `Import from '@/features/${name}' (index) only, not subdirectories.`,
    };
}

const SHELL  = { group: ["@/shell/**"],  message: "Import from '@/shell' (index) only, not subdirectories." };
const SHARED = { group: ["@/shared/**"], message: "Import from '@/shared' (index) only, not subdirectories." };

// ─── Feature list ─────────────────────────────────────────────────────────────
// To add a new feature: append its name here. Done.

const FEATURES = ["project", "taskDetail", "multiProject", "K", "Wiki", "lifeLog", "note", "workspace"];

// ─── Config ───────────────────────────────────────────────────────────────────

module.exports = {
    extends: ["react-app", "react-app/jest", "plugin:storybook/recommended"],

    rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "react-hooks/exhaustive-deps": "off",
        "no-restricted-imports": ["error", { patterns: [SHELL, SHARED] }],
    },

    overrides: [
        // Index barrel files: allowed to import anything for re-exporting
        {
            files: ["src/shell/index.ts", "src/shared/index.ts", "src/features/*/index.ts"],
            rules: { "no-restricted-imports": "off" },
        },

        // Each feature: block subdir imports of all OTHER features + shell + shared
        ...FEATURES.map(name => ({
            files: [`src/features/${name}/**`],
            rules: {
                "no-restricted-imports": [
                    "error",
                    { patterns: [...FEATURES.filter(f => f !== name).map(feat), SHELL, SHARED] },
                ],
            },
        })),

        // Shell: same rule as any feature — block all feature subdirs + shared subdirs
        {
            files: ["src/shell/**"],
            excludedFiles: ["src/shell/index.ts"],
            rules: {
                "no-restricted-imports": ["error", { patterns: [...FEATURES.map(feat), SHARED] }],
            },
        },

        // Shared: cannot import from any feature or shell at all (fully independent layer)
        {
            files: ["src/shared/**"],
            excludedFiles: ["src/shared/index.ts"],
            rules: {
                "no-restricted-imports": [
                    "error",
                    {
                        patterns: [
                            { group: ["@/features/**"], message: "shared cannot import from any feature." },
                            { group: ["@/shell", "@/shell/**"], message: "shared cannot import from shell." },
                        ],
                    },
                ],
            },
        },
    ],
};
