/**
 * Application Routes Configuration
 * Single source of truth for all route paths
 */

import { constants } from '@/utils/constants';

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
export type ActivityBarView = typeof constants.viewTypes.workspace | typeof constants.viewTypes.workspaceList | typeof constants.viewTypes.note;

export const ROUTE_TO_VIEW: Record<string, ActivityBarView> = {
  '/': constants.viewTypes.workspace,
  '/workspace': constants.viewTypes.workspace,
  '/workspaceList': constants.viewTypes.workspaceList,
  '/notes': constants.viewTypes.note,
};

export const VIEW_TO_ROUTE: Record<ActivityBarView, string> = {
  [constants.viewTypes.workspace]: APP_ROUTES.WORKSPACE,
  'workspaceList': APP_ROUTES.WORKSPACE_LIST,
  [constants.viewTypes.note]: APP_ROUTES.NOTES,
};
