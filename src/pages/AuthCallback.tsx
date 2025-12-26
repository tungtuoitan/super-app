/**
 * OAuth Callback Page
 * Handles Google OAuth redirect with authorization code
 */

import { useEffect } from "react";
import { useAuthCallbackStore } from "@/store/index";
import { useAuthHelper } from "@/hooks/useAuth.helpers";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export function AuthCallback() {
    const { callbackError, isProcessing } = useAuthCallbackStore();
    const { handleOAuthCallback, navigateToHome } = useAuthHelper();
    useEffect(() => {
        handleOAuthCallback();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md space-y-4">
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-foreground">Completing sign in...</h2>
                            <p className="text-sm text-muted-foreground">Please wait while we authenticate your account</p>
                        </div>
                    </div>
                ) : callbackError ? (
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{callbackError}</AlertDescription>
                        </Alert>
                        <div className="text-center">
                            <button onClick={navigateToHome} className="text-sm text-primary hover:underline">
                                Return to home
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
