"use strict";

// ─── Pattern helpers ──────────────────────────────────────────────────────────

function feat(name) {
    return {
        group: [
            // Block all subdirectory imports…
            `@/features/${name}/**`,
            // …except *.constants and *.types which may be imported directly cross-feature
            // (TS imports omit the .ts extension, so match both with and without)
            `!@/features/${name}/**/*.constants`,
            `!@/features/${name}/**/*.constants.ts`,
            `!@/features/${name}/**/*.types`,
            `!@/features/${name}/**/*.types.ts`,
            `../../${name}/**`,
            `../../../${name}/**`,
            `../../../../${name}/**`,
        ],
        // `import type` is always allowed from subdirectories — types are erased at runtime.
        allowTypeImports: true,
        message: `Import from '@/features/${name}' (index) only. Exception: 'import type', *.constants.ts, and *.types.ts may be imported directly.`,
    };
}

const SHELL  = { group: ["@/shell/**"],  allowTypeImports: true, message: "Import from '@/shell' (index) only. Exception: 'import type' allowed from subdirectories." };
const SHARED = { group: ["@/shared/**"], allowTypeImports: true, message: "Import from '@/shared' (index) only. Exception: 'import type' allowed from subdirectories." };

// ─── Feature list ─────────────────────────────────────────────────────────────
// To add a new feature: append its name here. Done.

const FEATURES = ["project", "taskDetail", "multiProject", "K", "Wiki", "lifeLog", "note", "workspace"];

// ─── Config ───────────────────────────────────────────────────────────────────

module.exports = {
    extends: ["react-app", "react-app/jest", "plugin:storybook/recommended"],

    rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "react-hooks/exhaustive-deps": "off",
        "@typescript-eslint/no-restricted-imports": ["error", { patterns: [SHELL, SHARED] }],
    },

    overrides: [
        // Index barrel files: allowed to import anything for re-exporting
        {
            files: ["src/shell/index.ts", "src/shared/index.ts", "src/features/*/index.ts"],
            rules: { "@typescript-eslint/no-restricted-imports": "off" },
        },

        // Each feature: block subdir imports of all OTHER features + shell + shared
        ...FEATURES.map(name => ({
            files: [`src/features/${name}/**`],
            rules: {
                "@typescript-eslint/no-restricted-imports": [
                    "error",
                    { patterns: [...FEATURES.filter(f => f !== name).map(feat), SHELL, SHARED] },
                ],
            },
        })),

        // Shell: same rule as any feature — block all feature subdirs + shared subdirs
        // modules.config.ts and keywordNavigator.config.ts are wiring files that intentionally
        // import feature module files directly (registration pattern — not circular).
        {
            files: ["src/shell/**"],
            excludedFiles: [
                "src/shell/index.ts",
                "src/shell/modules.config.ts",
                "src/shell/commandPallete/keywordNavigator.config.ts",
            ],
            rules: {
                "@typescript-eslint/no-restricted-imports": ["error", { patterns: [...FEATURES.map(feat), SHARED] }],
            },
        },

        // Shared: cannot import from any feature or shell at all (fully independent layer)
        {
            files: ["src/shared/**"],
            excludedFiles: ["src/shared/index.ts"],
            rules: {
                "@typescript-eslint/no-restricted-imports": [
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
