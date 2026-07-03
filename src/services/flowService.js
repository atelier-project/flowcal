import { backend } from './backend';

/**
 * Flow CRUD, delegated to the active backend provider.
 *
 * Kept as a stable facade so existing callers (Editor, Dashboard, ...) don't
 * need to know which backend is active. The real implementation lives in
 * ./backend/*Provider.js.
 */
export const flowService = {
    listFlows: (...args) => backend.listFlows(...args),
    createFlow: (...args) => backend.createFlow(...args),
    getFlow: (...args) => backend.getFlow(...args),
    updateFlow: (...args) => backend.updateFlow(...args),
    deleteFlow: (...args) => backend.deleteFlow(...args),
    duplicateFlow: (...args) => backend.duplicateFlow(...args),
    listVersions: (...args) => backend.listVersions(...args),
    createVersion: (...args) => backend.createVersion(...args),
    restoreVersion: (...args) => backend.restoreVersion(...args),
    deleteVersion: (...args) => backend.deleteVersion(...args),
};
