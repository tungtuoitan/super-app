import { DailyLogGrid } from "./DailyLogGrid";
import { useDailyLogHeadless } from "../hooks/useDailyLog.headless";

export function DailyLogView() {
    useDailyLogHeadless();
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <DailyLogGrid />
        </div>
    );
}
