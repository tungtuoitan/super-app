import { useAuthHelper } from '@/hooks/useAuthHelpers';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {useAuthStore} from '@/store/index';

/**
 * Authentication container component.
 *
 * This component provides a complete authentication interface with:
 * - Username and password input fields
 * - Form validation and error display
 * - Loading state management during authentication
 * - Integration with authentication context and hooks
 *
 * The component uses a centered modal-style layout with form controls
 * for user login functionality.
 *
 * @returns The authentication container with login form
 */
export function AuthContainer() {
    const { auth, setAuth, loading, error } = useAuthStore();
    const { login } = useAuthHelper();

    /**
     * Handle input changes for authentication form fields.
     * Updates the authentication state with new field values.
     */
    const handleUsernameChange = (value: string) => {
        setAuth({ ...auth, userName: value });
    };

    const handlePasswordChange = (value: string) => {
        setAuth({ ...auth, password: value });
    };

    /**
     * Handle login form submission.
     * Attempts to authenticate the user with provided credentials.
     */
    const handleLogin = async () => {
        try {
            await login(auth.userName, auth.password);
            // The useAuth hook handles setting the auth context and localStorage
        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center bg-background w-full min-h-screen">
            <div className="flex flex-col items-center justify-center w-[300px] min-h-[300px] bg-card p-5 rounded-lg gap-5 border shadow-lg">
                <div className="w-full space-y-2">
                    <label htmlFor="userName" className="text-sm font-medium text-foreground">
                        User Name
                    </label>
                    <Input
                        id="userName"
                        value={auth.userName}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="h-[50px] text-base"
                    />
                </div>

                <div className="w-full space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                    </label>
                    <Input
                        id="password"
                        type="password"
                        value={auth.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className="h-[50px] text-base"
                    />
                </div>

                {error && (
                    <Alert variant="destructive" className="w-full">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button
                    disabled={loading}
                    onClick={handleLogin}
                    className="w-full bg-primary hover:bg-primary/90"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </Button>
            </div>
        </div>
    );
}
