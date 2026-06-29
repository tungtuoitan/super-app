import type { Highlighter, BundledLanguage, BundledTheme } from "shiki";

// Languages we actually use (matches BE DetectLanguage output).
const LANGS: BundledLanguage[] = [
    "csharp", "python", "javascript", "typescript", "go", "java",
    "rust", "cpp", "c", "sql", "shell", "bash", "ruby", "php",
    "markdown", "json", "yaml",
];

// Aliases for common fence labels not matching Shiki's bundled-language ids.
const FENCE_LANG_ALIASES: Record<string, string> = {
    cs:         "csharp",
    js:         "javascript",
    ts:         "typescript",
    py:         "python",
    sh:         "bash",
    zsh:        "bash",
    "c++":      "cpp",
    dockerfile: "shell",
};

const THEME: BundledTheme = "dark-plus"; // VSCode's literal default dark theme

let _instance: Promise<Highlighter> | null = null;

export function getShikiHighlighter(): Promise<Highlighter> {
    if (_instance) return _instance;
    _instance = import("shiki").then(({ createHighlighter }) =>
        createHighlighter({ themes: [THEME], langs: LANGS })
    );
    return _instance;
}

export const SHIKI_THEME = THEME;

// Normalise a BE language string to a Shiki bundled-language id.
export function normaliseLang(lang: string | null | undefined): BundledLanguage | "plaintext" {
    if (!lang) return "plaintext";
    const lower = lang.toLowerCase();
    if ((LANGS as string[]).includes(lower)) return lower as BundledLanguage;
    return "plaintext";
}

// Resolve the language for an attachment, preferring the filename's extension
// (the source of truth) over the stored DB language. The DB column may be stale
// when DetectLanguage gains new extensions (e.g. ".csx" added later).
const EXT_TO_LANG: Record<string, BundledLanguage> = {
    cs: "csharp", csx: "csharp",
    py: "python",
    js: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescript",
    go: "go",
    java: "java",
    rs: "rust",
    cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", h: "cpp",
    c: "c",
    sql: "sql",
    sh: "shell", bash: "shell", zsh: "shell",
    rb: "ruby",
    php: "php",
    md: "markdown",
    json: "json",
    yaml: "yaml", yml: "yaml",
};

export function resolveLang(
    title: string | null | undefined,
    lang: string | null | undefined,
): BundledLanguage | "plaintext" {
    if (title) {
        const dot = title.lastIndexOf(".");
        if (dot > 0) {
            const ext = title.substring(dot + 1).toLowerCase();
            const fromExt = EXT_TO_LANG[ext];
            if (fromExt) return fromExt;
        }
    }
    return normaliseLang(lang);
}

// Parse a fenced code block string (```lang\ncode\n```) into lang + code.
// Applies FENCE_LANG_ALIASES and falls back to "plaintext" for unknown langs.
export function parseFencedCode(raw: string): { lang: string; code: string } {
    const langMatch = raw.match(/^```(\w*)/);
    const rawLang = langMatch?.[1]?.toLowerCase() || "";
    const normalized = FENCE_LANG_ALIASES[rawLang] ?? rawLang;
    const lang = (LANGS as string[]).includes(normalized) ? normalized : "text";
    const code = raw.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    return { lang, code };
}
