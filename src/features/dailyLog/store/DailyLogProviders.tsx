import { DailyLogProvider } from "./useDailyLog.store";
import { DailyLogDetailProvider } from "./useDailyLogDetail.store";
import { DailyLogTemplateProvider } from "./useDailyLogTemplate.store";

export const DailyLogProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <DailyLogProvider>
        <DailyLogTemplateProvider>
            <DailyLogDetailProvider>{children}</DailyLogDetailProvider>
        </DailyLogTemplateProvider>
    </DailyLogProvider>
);
