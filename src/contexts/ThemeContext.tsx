import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check localStorage first
        const stored = localStorage.getItem('theme') as Theme | null
        if (stored === 'light' || stored === 'dark') {
            return stored
        }
        // Default to light mode
        return 'dark'
    })

    useEffect(() => {
        const root = document.documentElement

        // Remove both classes first
        root.classList.remove('light', 'dark')

        // Add current theme class
        root.classList.add(theme)

        // Save to localStorage
        localStorage.setItem('theme', theme)
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
    }

    const toggleTheme = () => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light')
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
