/**
 * SidebarModuleNav — module list of the unified sidebar (#1514): Home + every activity-bar module,
 * as rows with icon, label, badge / status dot. Same actions as the old ActivityBar.
 */

import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivityBarStore } from "../../store/ActivityBar.store";
import { useActivityBarHelper } from "../../hooks/useActivityBar.helper";
import { useSideBarStore } from "../../store/SideBar.store";
import { moduleRegistry } from "../../moduleRegistry";
import type { ModuleDefinition } from "../../types/moduleRegistry.type";
import type { ActivityBarView } from "../../types/activeBarView";

const rowClass = (active: boolean) =>
    cn(
        "flex h-[30px] w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors duration-100",
        active ? "bg-sa-surface-2 text-foreground" : "text-muted-foreground hover:bg-sa-hover hover:text-foreground",
    );

/** Own component so module.useBadge / useStatusDot hooks run in a stable place */
function ModuleRow({ module, active, onClick }: { module: ModuleDefinition; active: boolean; onClick: () => void }) {
    const badge = module.useBadge?.() ?? 0;
    const statusDot = module.useStatusDot?.() ?? null;
    const Icon = module.icon;

    return (
        <button type="button" onClick={onClick} className={rowClass(active)} aria-current={active ? "page" : undefined}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate">{module.label}</span>
            {statusDot ? (
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusDot.color }} />
            ) : badge > 0 ? (
                <span className="font-mono text-[11px] text-muted-foreground">{badge > 99 ? "99+" : badge}</span>
            ) : null}
        </button>
    );
}

export function SidebarModuleNav() {
    const { isHomeOpen, setIsHomeOpen } = useActivityBarStore();
    const { handleActivityClick } = useActivityBarHelper();
    const { moduleName } = useSideBarStore();
    const HomeView = moduleRegistry.getHomeView();
    const modules = moduleRegistry.getAll().filter((m) => !m.hideFromActivityBar);

    return (
        <nav className="flex flex-col gap-0.5 px-2" aria-label="Modules">
            {HomeView && (
                <button type="button" onClick={() => setIsHomeOpen(true)} className={rowClass(isHomeOpen)} aria-current={isHomeOpen ? "page" : undefined}>
                    <Home className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1">Home</span>
                </button>
            )}
            {modules.map((m) => (
                <ModuleRow
                    key={m.id}
                    module={m}
                    active={!isHomeOpen && moduleName === m.id}
                    onClick={() => handleActivityClick(m.id as ActivityBarView)}
                />
            ))}
        </nav>
    );
}
