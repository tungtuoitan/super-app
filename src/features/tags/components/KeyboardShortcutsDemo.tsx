/**
 * KEYBOARD SHORTCUTS DEMO
 * Test keyboard shortcuts functionality
 */

import React, { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { AddTagDialog } from './AddTagDialog';

export function KeyboardShortcutsDemo() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <div className="p-8 max-w-[800px] mx-auto">
            <h1 className="text-3xl font-bold mb-6">
                ⌨️ Keyboard Shortcuts Demo
            </h1>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Available Shortcuts in Add Tag Dialog:</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                            Enter
                        </Badge>
                        <p className="text-sm">
                            Submit form (only when valid)
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                            Escape
                        </Badge>
                        <p className="text-sm">
                            Close dialog
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="mb-6 bg-muted">
                <CardHeader>
                    <CardTitle>✅ Safety Features:</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc pl-6 space-y-2">
                        <li className="text-sm">
                            Only active when dialog is open
                        </li>
                        <li className="text-sm">
                            Disabled during form submission
                        </li>
                        <li className="text-sm">
                            Won't interfere with typing in inputs
                        </li>
                        <li className="text-sm">
                            Enter requires valid input (tag selected or name filled)
                        </li>
                        <li className="text-sm">
                            Always have button alternative for mobile
                        </li>
                    </ul>
                </CardContent>
            </Card>

            <Card className="mb-6 bg-orange-50 dark:bg-orange-950">
                <CardHeader>
                    <CardTitle>🚫 What We DON'T Do:</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc pl-6 space-y-2">
                        <li className="text-sm">
                            ❌ No global shortcuts (Ctrl+S, Ctrl+W, etc.)
                        </li>
                        <li className="text-sm">
                            ❌ No always-on dangerous shortcuts (Delete key)
                        </li>
                        <li className="text-sm">
                            ❌ No hidden/undocumented shortcuts
                        </li>
                        <li className="text-sm">
                            ❌ No browser shortcut conflicts
                        </li>
                    </ul>
                </CardContent>
            </Card>

            <div className="flex gap-4 justify-center">
                <Button 
                    onClick={() => setIsDialogOpen(true)}
                    size="lg"
                >
                    Open Dialog & Try Shortcuts
                </Button>
            </div>

            {/* Demo dialog with workspace ID 1 */}
            <AddTagDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                workspaceId={1}
            />

            <Card className="mt-8 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                    <p className="text-sm font-semibold mb-2">
                        💡 Try it:
                    </p>
                    <div className="text-sm space-y-1">
                        <p>1. Click "Open Dialog" button</p>
                        <p>2. Select a tag or type a name</p>
                        <p>3. Press <strong>Enter</strong> to submit</p>
                        <p>4. Or press <strong>Escape</strong> to cancel</p>
                        <p>5. Notice shortcuts are shown in button labels!</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
