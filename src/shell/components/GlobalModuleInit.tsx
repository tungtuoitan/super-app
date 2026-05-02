/**
 * GlobalModuleInit
 *
 * Calls every registered module's useGlobalInit hook unconditionally, regardless of
 * which sidebar module is currently active. This allows features to run data-loading
 * or tab-initialization logic that must be available at all times (e.g. loading
 * projects so the always-open MultiProject tab has data).
 *
 * Mounted once in VSCodeLayout and never unmounted.
 */

import {moduleRegistry} from "../moduleRegistry";


// One component per module so each hook obeys Rules of Hooks in isolation.
function ModuleInitRunner({ useInit }: { useInit: () => void }) {
    useInit();
    return null;
}

export function GlobalModuleInit() {
    const modulesWithInit = moduleRegistry.getAll().filter((m) => m.useGlobalInit != null);
    return (
        <>
            {modulesWithInit.map((m) => (
                <ModuleInitRunner key={m.id} useInit={m.useGlobalInit!} />
            ))}
        </>
    );
}
