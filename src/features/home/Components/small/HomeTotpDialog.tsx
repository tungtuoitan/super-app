import { useEffect, useRef, useState } from "react";
import { Copy, KeyRound, Loader2, Lock, X } from "lucide-react";
import { useHomeSelector } from "../../selectors/useHome.selector";
import { useHomeHelper } from "../../hooks/useHome.helper";

const fmtUntil = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/**
 * "Xem đầy đủ" → TOTP (TungRoot #1489). Setup (first time): QR + secret, then the first code.
 * Afterwards: just the 6-digit code; 6 digits typed = submitted.
 */
export function HomeTotpDialog() {
    const { totp } = useHomeSelector();
    const { closeTotp, submitTotpCode } = useHomeHelper();
    const [code, setCode] = useState("");
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const locked = !!totp.lockedUntil && Date.parse(totp.lockedUntil) > Date.now();

    useEffect(() => {
        setCode("");
        inputRef.current?.focus();
    }, [totp.mode, totp.error]);

    if (totp.mode === "closed") return null;

    const submit = (value: string) => {
        if (value.length === 6 && !totp.busy && !locked) submitTotpCode(value);
    };
    const onChange = (raw: string) => {
        const digits = raw.replace(/\D/g, "").slice(0, 6);
        setCode(digits);
        submit(digits);
    };
    const copySecret = async () => {
        if (!totp.secret) return;
        await navigator.clipboard.writeText(totp.secret).catch(() => undefined);
        setCopied(true);
    };

    return (
        <div onClick={closeTotp} style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Mã xác thực"
                style={{ width: 400, maxWidth: "calc(100% - 32px)", padding: "22px 24px", borderRadius: 18, background: "#1f1f21", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 24px 64px rgba(0,0,0,.6)", display: "flex", flexDirection: "column", gap: 14 }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <KeyRound size={16} />
                    </span>
                    <h2 style={{ fontSize: 17, fontWeight: 600 }}>{totp.mode === "setup" ? "Cài mã xác thực" : "Nhập mã xác thực"}</h2>
                    <button type="button" className="home-icon-btn" onClick={closeTotp} title="Huỷ (Esc)" style={{ marginLeft: "auto" }}><X size={14} /></button>
                </div>

                {totp.mode === "loading" && (
                    <div className="home-muted" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, padding: "18px 0" }}>
                        <Loader2 size={16} className="home-spin" /> Đang kiểm tra…
                    </div>
                )}

                {totp.mode === "setup" && (
                    <>
                        <div className="home-muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                            Lần đầu: mở app Authenticator (Google Authenticator, 2FAS, Authy…) và quét mã QR này. Từ sau chỉ cần nhập mã 6 số.
                        </div>
                        <div style={{ alignSelf: "center", width: 200, height: 200, borderRadius: 12, background: "#f2f2f2", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            {totp.qrDataUrl ? <img src={totp.qrDataUrl} alt="Mã QR TOTP" style={{ width: 200, height: 200 }} /> : <Loader2 size={20} className="home-spin" color="#111" />}
                        </div>
                        {totp.secret && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                <span className="home-muted">Không quét được? Nhập khoá:</span>
                                <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, letterSpacing: "0.04em", wordBreak: "break-all" }}>{totp.secret.match(/.{1,4}/g)?.join(" ")}</code>
                                <button type="button" className="home-ghost-btn" onClick={copySecret} title={copied ? "Đã chép" : "Chép khoá"}><Copy size={13} /></button>
                            </div>
                        )}
                        <div style={{ fontSize: 14 }}>Nhập mã 6 số app vừa hiện để bật:</div>
                    </>
                )}

                {totp.mode === "code" && !locked && (
                    <div className="home-muted" style={{ fontSize: 14 }}>Mở app Authenticator, nhập mã 6 số của SuperApp.</div>
                )}

                {(totp.mode === "setup" || totp.mode === "code") && (
                    <>
                        {locked ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(240,165,138,.1)", border: "1px solid rgba(240,165,138,.3)", color: "#f0a58a", fontSize: 14 }}>
                                <Lock size={15} />
                                Sai mã quá nhiều lần — thử lại sau {fmtUntil(totp.lockedUntil!)}.
                            </div>
                        ) : (
                            <input
                                ref={inputRef}
                                value={code}
                                onChange={(e) => onChange(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") submit(code); }}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                placeholder="••••••"
                                disabled={totp.busy}
                                aria-label="Mã 6 số"
                                style={{
                                    height: 56, borderRadius: 12, border: `1px solid ${totp.error ? "rgba(240,165,138,.6)" : "rgba(255,255,255,.16)"}`, background: "#161617",
                                    color: "#ededed", font: "inherit", fontSize: 30, fontWeight: 600, letterSpacing: "0.5em", textAlign: "center", outline: "none", paddingLeft: "0.5em",
                                }}
                            />
                        )}
                        <div style={{ minHeight: 18, fontSize: 13, color: "#f0a58a" }}>{totp.error}</div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button type="button" className="home-btn home-btn-outline" onClick={closeTotp} style={{ height: 36, padding: "0 16px", fontSize: 14 }}>Huỷ</button>
                            <button
                                type="button"
                                className="home-btn home-btn-light"
                                onClick={() => submit(code)}
                                disabled={code.length !== 6 || totp.busy || locked}
                                style={{ height: 36, padding: "0 18px", fontSize: 14, opacity: code.length !== 6 || totp.busy || locked ? 0.5 : 1 }}
                            >
                                {totp.busy ? <Loader2 size={15} className="home-spin" /> : null}
                                {totp.mode === "setup" ? "Bật & mở khoá" : "Mở khoá"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
