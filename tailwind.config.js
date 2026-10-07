/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ["Geist", ...defaultTheme.fontFamily.sans],
                mono: ["Geist Mono", ...defaultTheme.fontFamily.mono],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // VS Code-style Editor Colors (for VSCodeLayout components)
                "editor-bg": "hsl(var(--editor-background))",
                "editor-fg": "hsl(var(--editor-foreground))",
                "editor-sidebar": "hsl(var(--editor-sidebar))",
                "editor-panel": "hsl(var(--editor-panel))",
                "editor-activitybar": "hsl(var(--editor-activitybar))",
                "editor-border": "hsl(var(--editor-border))",
                "editor-hover": "hsl(var(--editor-hover))",
                "editor-hover-light": "hsl(var(--editor-hover-light))",
                "editor-active": "hsl(var(--editor-active-border))",
                // SuperApp design tokens (#1514) — see src/index.css
                "sa-bg": "hsl(var(--sa-bg) / <alpha-value>)",
                "sa-surface": "hsl(var(--sa-surface) / <alpha-value>)",
                "sa-surface-2": "hsl(var(--sa-surface-2) / <alpha-value>)",
                "sa-border": "hsl(var(--sa-border) / <alpha-value>)",
                "sa-border-strong": "hsl(var(--sa-border-strong) / <alpha-value>)",
                "sa-text": "hsl(var(--sa-text) / <alpha-value>)",
                "sa-muted": "hsl(var(--sa-muted) / <alpha-value>)",
                "sa-amber": "hsl(var(--sa-accent-amber) / <alpha-value>)",
                "sa-amber-ink": "hsl(var(--sa-amber-ink) / <alpha-value>)",
                "sa-good": "hsl(var(--sa-good) / <alpha-value>)",
                "sa-danger": "hsl(var(--sa-danger) / <alpha-value>)",
                "sa-focus": "hsl(var(--sa-focus) / <alpha-value>)",
                "sa-hover": "var(--sa-hover)",
                "sa-hover-strong": "var(--sa-hover-strong)",
            },
            boxShadow: {
                "sa-pop": "var(--sa-shadow-pop)",
            },
            transitionDuration: {
                DEFAULT: "120ms",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
