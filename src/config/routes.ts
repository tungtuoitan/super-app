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
export type ActivityBarView = typeof constants.vscode.viewTypes.workspace | typeof constants.vscode.viewTypes.workspaceList | typeof constants.vscode.viewTypes.note;

export const ROUTE_TO_VIEW: Record<string, ActivityBarView> = {
  '/': constants.vscode.viewTypes.workspace,
  '/workspace': constants.vscode.viewTypes.workspace,
  '/workspaceList': constants.vscode.viewTypes.workspaceList,
  '/notes': constants.vscode.viewTypes.note,
};

export const VIEW_TO_ROUTE: Record<ActivityBarView, string> = {
  [constants.vscode.viewTypes.workspace]: APP_ROUTES.WORKSPACE,
  'workspaceList': APP_ROUTES.WORKSPACE_LIST,
  [constants.vscode.viewTypes.note]: APP_ROUTES.NOTES,
};
