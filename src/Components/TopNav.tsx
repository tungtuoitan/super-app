import { MouseEvent, useEffect } from 'react';
import { useSnackbar } from 'notistack';

import { useAuthStore } from '@/store/auth/Auth.store';
import { config } from '@/config/app.config';
import { constants } from '@/utils/constants';
import {envConfig} from '../config';

/**
 * Top navigation component.
 * 
 * This component renders the application's top navigation bar, providing
 * navigation elements and user interaction features. It includes:
 * - App bar with sticky positioning for consistent visibility
 * - Integration with authentication context for user-specific features
 * - Snackbar notifications for user feedback
 * 
 * Currently in development with placeholder content ('xxx').
 * 
 * @returns The top navigation component
 */
export function TopNav() {
    const { enqueueSnackbar } = useSnackbar();
    const { auth } = useAuthStore();

    const showDevBadge = envConfig.ENVIRONMENT !== constants.environments.production;

    return (
        <div className="top-navigation flex-grow bg-black h-[36px] z-[10000000000] sticky top-0">
            <nav className="bg-[#1B1D23] sticky top-0 h-[36px] flex items-center px-4">
                {showDevBadge && (
                    <div className="text-red-500 font-bold text-sm uppercase">
                        DEV
                    </div>
                )}
                <div className="flex-1">
                    {/* Right side content can go here */}
                </div>
            </nav>
        </div>
    );
}
