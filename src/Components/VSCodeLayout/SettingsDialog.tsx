import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog'
import { Label } from '@/Components/ui/label'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { theme, setTheme } = useTheme()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Configure your application preferences
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Theme Setting */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Theme</Label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTheme('light')}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                                    ${theme === 'light'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:border-primary/50 hover:bg-accent'
                                    }
                                `}
                            >
                                <Sun className="w-5 h-5" />
                                <span className="font-medium">Light</span>
                            </button>

                            <button
                                onClick={() => setTheme('dark')}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                                    ${theme === 'dark'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:border-primary/50 hover:bg-accent'
                                    }
                                `}
                            >
                                <Moon className="w-5 h-5" />
                                <span className="font-medium">Dark</span>
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Choose your preferred color scheme
                        </p>
                    </div>

                    {/* Future settings can be added here */}
                </div>
            </DialogContent>
        </Dialog>
    )
}
