/**
 * Accounts Dialog Component
 * Provides Google OAuth login interface
 * Similar to VSCode account management UI
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared";
import { Button } from "@/shared";
import { useAuthStore, useAuthHelper, initiateGoogleLogin } from "@/shared";
import { Chrome, LogOut, User } from "lucide-react";
import {useActivityBarStore} from "../store/ActivityBar.store";

export function AccountsDialog() {
    const { isAuthenticated, $user, loginLoading, loginError } = useAuthStore();
    const { logout, login } = useAuthHelper();
    const { accountsOpen, setAccountsOpen } = useActivityBarStore();

    const [username, setUsername] = useState("hoanhtungle3@gmail.com");
    const [password, setPassword] = useState("tung76721119");

    const handleSignOut = () => {
        logout();
        setAccountsOpen(false);
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        try {
            await login(username, password);
            setAccountsOpen(false);
            setUsername("");
            setPassword("");
        } catch {
            // error already surfaced via loginError in store
        }
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
                        // Not authenticated - show sign in options
                        <div className="space-y-4">
                            <Button onClick={() => initiateGoogleLogin()} variant="outline" className="w-full justify-start gap-3 h-12">
                                <Chrome className="h-5 w-5" />
                                <span>Sign in with Google</span>
                            </Button>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">or</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            <form onSubmit={handlePasswordLogin} className="space-y-3">
                                <input
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                {loginError && (
                                    <p className="text-xs text-red-500">{loginError}</p>
                                )}
                                <Button type="submit" disabled={loginLoading || !username || !password} className="w-full">
                                    {loginLoading ? "Signing in..." : "Sign in"}
                                </Button>
                            </form>

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
