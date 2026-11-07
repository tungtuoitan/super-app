import { Sun, Moon } from "lucide-react";
import { Label } from "@/shared";
import { useTheme } from "@/contexts/ThemeContext";

export function SettingsThemeSection() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-3">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Theme</Label>
            <div className="flex gap-2">
                <button
                    onClick={() => setTheme("light")}
                    className={`
                        flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-lg border transition-colors duration-100
                        ${theme === "light" ? "border-sa-amber/70 bg-sa-surface-2 text-foreground" : "border-sa-border-strong text-muted-foreground hover:text-foreground hover:bg-sa-hover"}
                    `}
                >
                    <Sun className="w-4 h-4" />
                    <span className="font-medium text-[13px]">Light</span>
                </button>
                <button
                    onClick={() => setTheme("dark")}
                    className={`
                        flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-lg border transition-colors duration-100
                        ${theme === "dark" ? "border-sa-amber/70 bg-sa-surface-2 text-foreground" : "border-sa-border-strong text-muted-foreground hover:text-foreground hover:bg-sa-hover"}
                    `}
                >
                    <Moon className="w-4 h-4" />
                    <span className="font-medium text-[13px]">Dark</span>
                </button>
            </div>
        </div>
    );
}
