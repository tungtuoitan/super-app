import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import type { FallbackProps } from "react-error-boundary";

const isDev = process.env.NODE_ENV === "development";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack;
    return undefined;
}

/**
 * Full-page fallback — used at the root boundary (index.tsx).
 * The entire app is down; only option is a hard reload.
 */
export function RootErrorFallback({ error }: FallbackProps) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background text-foreground p-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div className="text-center space-y-1">
                <h1 className="text-xl font-semibold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground max-w-md">
                    An unexpected error caused the application to crash. Reload the page to continue.
                </p>
            </div>

            {isDev && (
                <pre className="max-w-xl max-h-40 overflow-auto rounded-md bg-muted px-4 py-3 text-xs text-left text-destructive border border-destructive/30">
                    {getErrorMessage(error)}
                    {"\n"}
                    {getErrorStack(error)}
                </pre>
            )}

            <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                Reload application
            </button>
        </div>
    );
}

/**
 * Editor-area fallback — used around the entire VSEditorArea.
 * Sidebar / activity bar still work; only the editor crashed.
 */
export function EditorAreaErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-editor-bg text-foreground p-8">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold">Editor crashed</h2>
                <p className="text-sm text-muted-foreground">
                    The editor encountered an unexpected error.
                </p>
            </div>

            {isDev && (
                <pre className="max-w-lg max-h-32 overflow-auto rounded-md bg-muted px-4 py-3 text-xs text-left text-destructive border border-destructive/30">
                    {getErrorMessage(error)}
                </pre>
            )}

            <button
                onClick={resetErrorBoundary}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                <RotateCcw className="h-4 w-4" />
                Try again
            </button>
        </div>
    );
}

/**
 * Per-tab panel fallback — used around each individual editor panel.
 * Other open tabs are completely unaffected.
 */
export function TabPanelErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-editor-bg text-foreground p-8">
            <AlertTriangle className="h-8 w-8 text-destructive/80" />
            <div className="text-center space-y-1">
                <p className="text-sm font-medium">This panel encountered an error</p>
                <p className="text-xs text-muted-foreground">Other tabs are not affected.</p>
            </div>

            {isDev && (
                <pre className="max-w-lg max-h-28 overflow-auto rounded-md bg-muted px-4 py-3 text-xs text-left text-destructive border border-destructive/30">
                    {getErrorMessage(error)}
                </pre>
            )}

            <button
                onClick={resetErrorBoundary}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <RotateCcw className="h-3 w-3" />
                Reload panel
            </button>
        </div>
    );
}
