import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSignedIn, signInWithGoogle, signOut } from "../lib/auth";
import { readAuth } from "../lib/storage";

function Popup(): JSX.Element {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        (async () => {
            if (await isSignedIn()) {
                const auth = await readAuth();
                setEmail(auth.userEmail);
            }
            setReady(true);
        })();
    }, []);

    const handleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await signInWithGoogle();
            setEmail(r.email);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        setLoading(true);
        try {
            await signOut();
            setEmail(null);
        } finally {
            setLoading(false);
        }
    };

    if (!ready) return <div className="container"><div className="subtitle">Loading…</div></div>;

    return (
        <div className="container">
            <div>
                <div className="title">SuperApp Capture</div>
                <div className="subtitle">Capture screenshots and upload to SuperApp.</div>
            </div>

            {email ? (
                <>
                    <div className="user-row">
                        <span className="user-email" title={email}>{email}</span>
                        <button className="btn btn-secondary" onClick={handleSignOut} disabled={loading}>
                            Sign out
                        </button>
                    </div>
                </>
            ) : (
                <button className="btn btn-primary" onClick={handleSignIn} disabled={loading}>
                    {loading ? "Signing in…" : "Sign in with Google"}
                </button>
            )}

            {error && <div className="error">{error}</div>}

            <div className="shortcuts">
                <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> — capture visible page</div>
                <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> — pick an image to capture</div>
            </div>
        </div>
    );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
