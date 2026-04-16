/**
 * Accounts Dialog Component
 * Provides Google OAuth login interface
 * Similar to VSCode account management UI
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/Button";
import { useAuthStore } from "@/store/Auth.store";
import { useAuthHelper } from "@/shell/hooks/useAuth.helpers";
import { initiateGoogleLogin } from "@/utils/googleOAuth";
import { Chrome, LogOut, User } from "lucide-react";
import { useActivityBarStore } from "@/store/index";

export function AccountsDialog() {
    const { isAuthenticated, $user } = useAuthStore();
    const { logout } = useAuthHelper();
    const { accountsOpen, setAccountsOpen } = useActivityBarStore();

    const handleSignOut = () => {
        logout();
        setAccountsOpen(false);
    };

    return (
        <Dialog open={accountsOpen} onOpenChange={setAccountsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Accounts</DialogTitle>
                    <DialogDescription>{isAuthenticated ? "Manage your account" : "Sign in to SuperApp to sync your data and settings"}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!isAuthenticated ? (
                        // Not authenticated - show sign in button
                        <div className="space-y-4">
                            <Button onClick={() => initiateGoogleLogin()} variant="outline" className="w-full justify-start gap-3 h-12">
                                <Chrome className="h-5 w-5" />
                                <span>Sign in with Google</span>
                            </Button>

                            <p className="text-xs text-muted-foreground text-center">By signing in, you agree to our Terms and Privacy Policy</p>
                        </div>
                    ) : (
                        // Authenticated - show user info
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                {$user.picture ? (
                                    <img src={$user.picture} alt={$user.userName} className="h-10 w-10 rounded-full" />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                        {$user.firstName && $user.lastName ? `${$user.firstName} ${$user.lastName}` : $user.userName || "User"}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">{$user.email}</div>
                                </div>
                            </div>

                            <Button onClick={handleSignOut} variant="outline" className="w-full justify-start gap-3">
                                <LogOut className="h-4 w-4" />
                                <span>Sign Out</span>
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
