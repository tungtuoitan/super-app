import { Maximize2, Minimize2 } from "lucide-react";
import { useHomeStore } from "../../store/useHome.store";
import { useHomeHelper } from "../../hooks/useHome.helper";
import type { HomeView } from "../../types/home.types";

/** Round button in a section header: overview → open that tab; inside the tab → back to overview. Reusable. */
export function HomeExpandButton({ target, title }: { target: HomeView; title?: string }) {
    const { view } = useHomeStore();
    const { toggleView } = useHomeHelper();
    const open = view === target;
    return (
        <button
            type="button"
            className="home-icon-btn"
            onClick={() => toggleView(target)}
            title={title ?? (open ? "Về tổng quan" : "Mở rộng")}
            style={{ marginLeft: "auto", alignSelf: "center" }}
        >
            {open ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
    );
}
