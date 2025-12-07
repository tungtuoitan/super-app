/**
 * Application Routes Configuration
 * Single source of truth for all route paths
 */

export const APP_ROUTES = {
  HOME: '/',
  WORKSPACE: '/workspace',
  WORKSPACE_LIST: '/workspaceList',
  NOTES: '/notes',
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];

/**
 * Map routes to ActivityBar view types
 */
export type ActivityBarView = 'workspace' | 'workspaceList' | 'note';

export const ROUTE_TO_VIEW: Record<string, ActivityBarView> = {
  '/': 'workspace',
  '/workspace': 'workspace',
  '/workspaceList': 'workspaceList',
  '/notes': 'note',
};

export const VIEW_TO_ROUTE: Record<ActivityBarView, string> = {
  'workspace': APP_ROUTES.WORKSPACE,
  'workspaceList': APP_ROUTES.WORKSPACE_LIST,
  'note': APP_ROUTES.NOTES,
};
