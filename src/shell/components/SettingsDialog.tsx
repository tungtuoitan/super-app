import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared";
import { useActivityBarStore } from "../store/ActivityBar.store";
import { KRepoConflictDialog } from "@/features/K";
import { useKeywordSync } from "../hooks/useKeywordSync.helper";
import { useKRepoSyncSettings } from "../hooks/useKRepoSyncSettings.helper";
import { SettingsThemeSection } from "./small/SettingsThemeSection";
import { SettingsKeywordsSection } from "./small/SettingsKeywordsSection";
import { SettingsExtensionTokenSection } from "./small/SettingsExtensionTokenSection";
import { SettingsKRepoSyncSection } from "./small/SettingsKRepoSyncSection";
import { SettingsKeywordSyncLists } from "./small/SettingsKeywordSyncLists";

export function SettingsDialog() {
    const { settingsOpen, setSettingsOpen } = useActivityBarStore();

    const { isSyncing, syncReport, syncError, handleSync } = useKeywordSync(settingsOpen);
    const repoSync = useKRepoSyncSettings(settingsOpen);

    return (
        <>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="max-w-5xl w-full max-h-[88vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your application preferences</DialogDescription>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 min-h-0 pr-1">
                <div className="space-y-6 py-2">
                    {/* Top row: two equal columns */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* ── Left: Theme + Keywords ── */}
                        <div className="space-y-6">
                            <SettingsThemeSection />
                            <SettingsKeywordsSection
                                isSyncing={isSyncing}
                                syncReport={syncReport}
                                syncError={syncError}
                                onSync={handleSync}
                            />
                            <SettingsExtensionTokenSection />
                        </div>

                        {/* ── Right: K Repo Sync ── */}
                        <SettingsKRepoSyncSection
                            syncStatus={repoSync.syncStatus}
                            syncDirection={repoSync.syncDirection}
                            statusMessage={repoSync.statusMessage}
                            lastPushAt={repoSync.lastPushAt}
                            repoUrl={repoSync.repoUrl}
                            repoUrlInput={repoSync.repoUrlInput}
                            branchInput={repoSync.branchInput}
                            patInput={repoSync.patInput}
                            onRepoUrlInputChange={(value) => { repoSync.setRepoUrlInput(value); repoSync.setConfigSaved(false); }}
                            onBranchInputChange={(value) => { repoSync.setBranchInput(value); repoSync.setConfigSaved(false); }}
                            onPatInputChange={(value) => { repoSync.setPatInput(value); repoSync.setConfigSaved(false); }}
                            isSavingConfig={repoSync.isSavingConfig}
                            configError={repoSync.configError}
                            configSaved={repoSync.configSaved}
                            onSaveConfig={repoSync.handleSaveConfig}
                            isComparing={repoSync.isComparing}
                            compareDiff={repoSync.compareDiff}
                            hasAnyDiff={repoSync.hasAnyDiff}
                            secondsToRefresh={repoSync.secondsToRefresh}
                            isResolving={repoSync.isResolving}
                            onViewChanges={() => repoSync.setReviewOpen(true)}
                            repoActionError={repoSync.repoActionError}
                        />
                    </div>

                    {/* Bottom row (conditional, full width): Sync result lists */}
                    {syncReport && (syncReport.updates.length > 0 || syncReport.created.length > 0) && (
                        <SettingsKeywordSyncLists syncReport={syncReport} />
                    )}
                </div>
                </div>{/* end scroll wrapper */}
            </DialogContent>
        </Dialog>

        <KRepoConflictDialog
            open={repoSync.reviewOpen}
            onOpenChange={repoSync.setReviewOpen}
            entries={repoSync.compareDiff?.entries ?? []}
            onResolve={repoSync.handleResolveConflicts}
            isResolving={repoSync.isResolving}
        />
        </>
    );
}
