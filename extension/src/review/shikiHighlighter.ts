import type { Highlighter, BundledLanguage, BundledTheme } from "shiki";

const LANGS: BundledLanguage[] = [
    "csharp", "python", "javascript", "typescript", "go", "java",
    "rust", "cpp", "c", "sql", "shell", "ruby", "php",
    "markdown", "json", "yaml",
];

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
    const lang = langMatch?.[1] || "text";
    const code = raw.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    return { lang, code };
}
