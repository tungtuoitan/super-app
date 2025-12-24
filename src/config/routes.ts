/**
 * Application Routes Configuration
 * Single source of truth for all route paths and view mappings
 */

export const routes = {
    paths: {
        home: '/',
        workspace: '/workspace',
        workspaceList: '/workspaceList',
        notes: '/notes',
    } as const,

    views: {
        workspace: 'workspace',
        workspaceList: 'workspaceList',
        note: 'note',
        notes: 'notes',
    } as const,

    mappings: {
        routeToView: {
            '/': 'workspace',
            '/workspace': 'workspace',
            '/workspaceList': 'workspaceList',
            '/notes': 'note',
        } as const,

        viewToRoute: {
            workspace: '/workspace',
            workspaceList: '/workspaceList',
            note: '/notes',
        } as const,
    },
} as const;

// Type exports
export type ActivityBarView = typeof routes.views.workspace | typeof routes.views.workspaceList | typeof routes.views.note;
export type AppRoute = typeof routes.paths[keyof typeof routes.paths];