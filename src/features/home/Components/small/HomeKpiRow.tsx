import { useHomeSelector } from "../../selectors/useHome.selector";
import { HomeKpiCard } from "./HomeKpiCard";
import { HomePsychKpi } from "./HomePsychKpi";

/** Overview only: one card per habit + the Tâm lý card. */
export function HomeKpiRow() {
    const { kpis } = useHomeSelector();
    return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${kpis.length + 1},minmax(0,1fr))`, gap: 12, flex: "none" }}>
            {kpis.map((k) => (
                <HomeKpiCard key={k.key} kpiKey={k.key} />
            ))}
            <HomePsychKpi />
        </div>
    );
}
