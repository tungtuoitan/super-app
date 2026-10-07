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
import {envConfig} from "config/env.config";

export function AccountsDialog() {
    const { isAuthenticated, $user, loginLoading, loginError } = useAuthStore();
    const { logout, login } = useAuthHelper();
    const { accountsOpen, setAccountsOpen } = useActivityBarStore();

    const isDev = envConfig.NODE_ENV === "development";
    const [username, setUsername] = useState(isDev ? "hoanhtungle3@gmail.com" : "");
    const [password, setPassword] = useState(isDev ? "tung76721119" : "");

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
                            <Button onClick={() => initiateGoogleLogin()} variant="outline" className="w-full justify-start gap-3 h-10">
                                <Chrome className="h-5 w-5" />
                                <span>Sign in with Google</span>
                            </Button>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">or</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>
                            {
                                isDev &&
                                <form onSubmit={handlePasswordLogin} className="space-y-3">
                                    <input
                                        type="text"
                                        autoComplete="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Username"
                                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                                    />
                                    <input
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                                    />
                                    {loginError && (
                                        <p className="text-xs text-sa-danger">{loginError}</p>
                                    )}
                                    <Button type="submit" disabled={loginLoading || !username || !password} className="w-full">
                                        {loginLoading ? "Signing in..." : "Sign in"}
                                    </Button>
                                </form>
                            }

                            <p className="text-xs text-muted-foreground text-center">By signing in, you agree to our Terms and Privacy Policy</p>
                        </div>
                    ) : (
                        // Authenticated - show user info
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-sa-border bg-card">
                                {$user.picture ? (
                                    <img src={$user.picture} alt={$user.userName} className="h-10 w-10 rounded-full" />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-sa-hover-strong flex items-center justify-center">
                                        <User className="h-5 w-5 text-muted-foreground" />
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
