/**
 * Example component demonstrating how to use the ContextMenu
 */

import React from 'react';
import { useContextMenu } from '../contexts/ContextMenuContext';

export function ContextMenuExample() {
    const { showContextMenu } = useContextMenu();

    return (
        <div className="p-6 max-w-2xl">
            <h2 className="text-2xl font-semibold mb-4">
                Context Menu Examples
            </h2>
            
            <p className="mb-4 text-muted-foreground">
                Right-click on the areas below to see different context menus:
            </p>

            {/* Default context menu */}
            <div
                className="p-6 mb-4 rounded-lg border bg-card cursor-context-menu hover:bg-accent transition-colors"
                onContextMenu={(e) => showContextMenu(e, 'default')}
            >
                <h3 className="text-lg font-semibold mb-2">Default Menu Area</h3>
                <p className="text-sm text-muted-foreground">
                    Right-click here for the default context menu
                </p>
            </div>

            {/* Tag context menu */}
            <div
                className="p-6 mb-4 rounded-lg bg-primary text-primary-foreground cursor-context-menu hover:bg-primary/90 transition-colors"
                onContextMenu={(e) => showContextMenu(e, 'tag')}
            >
                <h3 className="text-lg font-semibold mb-2">Tag Menu Area</h3>
                <p className="text-sm">
                    Right-click here for tag-specific context menu
                </p>
            </div>

            {/* Note context menu */}
            <div
                className="p-6 mb-4 rounded-lg bg-secondary text-secondary-foreground cursor-context-menu hover:bg-secondary/90 transition-colors"
                onContextMenu={(e) => showContextMenu(e, 'note')}
            >
                <h3 className="text-lg font-semibold mb-2">Note Menu Area</h3>
                <p className="text-sm">
                    Right-click here for note-specific context menu
                </p>
            </div>
        </div>
    );
}