import type { Highlighter, BundledLanguage, BundledTheme } from "shiki";

const LANGS: BundledLanguage[] = [
    "csharp", "python", "javascript", "typescript", "go", "java",
    "rust", "cpp", "c", "sql", "shell", "bash", "ruby", "php",
    "markdown", "json", "yaml", "plaintext",
];

const LANG_ALIASES: Record<string, string> = {
    cs:         "csharp",
    js:         "javascript",
    ts:         "typescript",
    py:         "python",
    sh:         "bash",
    zsh:        "bash",
    "c++":      "cpp",
    dockerfile: "shell",
};

const THEME: BundledTheme = "dark-plus";

let _instance: Promise<Highlighter> | null = null;

export function getShikiHighlighter(): Promise<Highlighter> {
    if (_instance) return _instance;
    _instance = import("shiki").then(({ createHighlighter }) =>
        createHighlighter({ themes: [THEME], langs: LANGS })
    );
    return _instance;
}

export const SHIKI_THEME = THEME;

export function parseFencedCode(raw: string): { lang: string; code: string } {
    const langMatch = raw.match(/^```(\w*)/);
    const rawLang = langMatch?.[1]?.toLowerCase() || "";
    const normalized = LANG_ALIASES[rawLang] ?? rawLang;
    const lang = (LANGS as string[]).includes(normalized) ? normalized : "plaintext";
    const code = raw.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    return { lang, code };
}
