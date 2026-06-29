import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSignedIn, signInWithGoogle, signOut } from "../lib/auth";
import { readAuth } from "../lib/storage";
import { getReviewToken, saveReviewToken, REVIEW_TOKEN_KEY } from "../review/reviewApi";

function Popup(): JSX.Element {
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    const [reviewToken, setReviewToken] = useState("");
    const [tokenSaved, setTokenSaved]   = useState(false);
    const [hasToken, setHasToken]       = useState(false);

    useEffect(() => {
        (async () => {
            if (await isSignedIn()) {
                const auth = await readAuth();
                setEmail(auth.userEmail);
            }
            const t = await getReviewToken();
            if (t) { setHasToken(true); setReviewToken(t); }
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

    const handleSaveToken = async () => {
        await saveReviewToken(reviewToken);
        setHasToken(!!reviewToken.trim());
        setTokenSaved(true);
        setTimeout(() => setTokenSaved(false), 2000);
    };

    const handleClearToken = async () => {
        await chrome.storage.local.remove(REVIEW_TOKEN_KEY);
        setReviewToken("");
        setHasToken(false);
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

            {/* K Review token */}
            <div className="token-section">
                <div className="token-header">
                    <span className="token-label">K Review Token</span>
                    {hasToken && <span className="token-badge">Active</span>}
                </div>
                <textarea
                    className="token-input"
                    placeholder="Paste token from SuperApp → Settings → Copy Token"
                    value={reviewToken}
                    onChange={e => setReviewToken(e.target.value)}
                    rows={3}
                    spellCheck={false}
                />
                <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveToken} disabled={!reviewToken.trim()}>
                        {tokenSaved ? "Saved ✓" : "Save"}
                    </button>
                    {hasToken && (
                        <button className="btn btn-secondary" onClick={handleClearToken}>Clear</button>
                    )}
                </div>
            </div>

            <div className="shortcuts">
                <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> — capture visible page</div>
                <div><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> — pick an image to capture</div>
            </div>
        </div>
    );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
