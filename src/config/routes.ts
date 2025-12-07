/**
 * Application Routes Configuration
 * Single source of truth for all route paths
 */

export const APP_ROUTES = {
  HOME: '/',
  EXPLORER: '/explorer',
  WORKSPACE: '/workspace',
  NOTES: '/notes',
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];

/**
 * Map routes to ActivityBar view types
 */
export type ActivityBarView = 'explorer' | 'workspace' | 'note';

export const ROUTE_TO_VIEW: Record<string, ActivityBarView> = {
  '/': 'explorer',
  '/explorer': 'explorer',
  '/workspace': 'workspace',
  '/notes': 'note',
};

export const VIEW_TO_ROUTE: Record<ActivityBarView, string> = {
  'explorer': APP_ROUTES.EXPLORER,
  'workspace': APP_ROUTES.WORKSPACE,
  'note': APP_ROUTES.NOTES,
};
