/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import React from "react";
import { Button } from "../ui/Button";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);

        // Here you could log to an error reporting service
        // logErrorToService(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 text-center min-h-[200px] flex flex-col justify-center items-center">
                    <h2 className="text-2xl font-semibold text-destructive mb-4">Something went wrong</h2>
                    <p className="text-sm text-muted-foreground mt-2 mb-4">{this.state.error?.message || "An unexpected error occurred"}</p>
                    <Button onClick={() => window.location.reload()} variant="default">
                        Reload Page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
