import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Label } from "@/shared";
import { useAuthStore } from "@/shared";

export function SettingsExtensionTokenSection() {
    const { $user } = useAuthStore();
    const [tokenCopied, setTokenCopied] = useState(false);

    return (
        <div className="space-y-2">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Extension Token</Label>
            <p className="text-xs text-muted-foreground">
                Copy your JWT to paste into the SuperApp Chrome extension.
            </p>
            <button
                onClick={() => {
                    if (!$user?.userToken) return;
                    navigator.clipboard.writeText($user.userToken);
                    setTokenCopied(true);
                    setTimeout(() => setTokenCopied(false), 2000);
                }}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-sa-border-strong hover:bg-sa-hover-strong transition-colors duration-100 text-sm w-full justify-center"
            >
                {tokenCopied
                    ? <><Check className="w-4 h-4 text-sa-good" /><span className="text-sa-good">Copied!</span></>
                    : <><Copy className="w-4 h-4" />Copy Token</>
                }
            </button>
        </div>
    );
}
