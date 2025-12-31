# Google OAuth Login - Implementation Plan

## Tổng Quan

Triển khai Google OAuth login với **Authorization Code Flow** và **Dialog/Modal UI** từ ActivityBar.

---

## Backend Tasks (C:\Users\Admin\source\Timeline)

### 1. DTOs & Models

- [ ] `SuperAppModels/DTOs/Responses/AuthResponse.cs` - Response cho login
    - Token, UserId, Email, FirstName, LastName, Picture, AuthType

### 2. Services & Repository

- [ ] `SuperAppServices/Interfaces/IAuthService.cs` - Interface
- [ ] `SuperAppServices/Services/AuthService.cs` - Business logic
    - `GoogleLoginAsync(code)` - Main method
    - `ExchangeCodeForGoogleTokenAsync(code)` - Call Google API
    - `VerifyGoogleIdTokenAsync(idToken)` - Verify token
    - `GetOrCreateGoogleUserAsync(googleInfo)` - Get/Create user
    - `GenerateJwtToken(user)` - Generate JWT
- [ ] `SuperAppDataRepositories/Repositories/UserRepository.cs` - Add methods:
    - `GetByEmailAsync(email)`
    - `CreateAsync(user)`
    - `UpdateAsync(user)`

### 3. Controller

- [ ] `SuperAppAPI/Controllers/AuthController.cs` - NEW controller
    - `POST /api/auth/google/login` - Accept code, return JWT

### 4. Configuration

- [ ] `appsettings.json` - Fix RedirectUri: `http://localhost:3000/auth/callback`
- [ ] `Startup.cs` - Register services:
    ```csharp
    services.AddScoped<IAuthService, AuthService>();
    services.AddHttpClient();
    ```

---

## Frontend Tasks (C:\Users\Admin\source\SuperApp)

### 1. OAuth Helper

- [ ] `src/utils/googleOAuth.ts` - NEW

    ```typescript
    export const GOOGLE_OAUTH_CONFIG = {
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        redirectUri: "http://localhost:3000/auth/callback",
        scope: "openid profile email",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    };

    export function initiateGoogleLogin(): void {
        // Build URL và redirect đến Google
    }
    ```

### 2. Components

- [ ] `src/Components/VSCodeLayout/AccountsDialog.tsx` - NEW
    - Dialog với "Sign in with Google" button
    - Show user info khi đã authenticated

- [ ] `src/pages/AuthCallback.tsx` - NEW
    - Handle redirect từ Google
    - Extract `code` từ URL
    - Call API để exchange code for JWT
    - Navigate về home sau khi thành công

- [ ] `src/Components/VSCodeLayout/ActivityBar.tsx` - UPDATE
    - Add Accounts icon (UserCircle from lucide-react)
    - Add state: `useState(false)` cho dialog
    - Render `<AccountsDialog />`

### 3. API & Hooks

- [ ] `src/services/api/auth.api.ts` - UPDATE

    ```typescript
    async googleLogin(code: string): Promise<AuthResponse> {
      return apiClient.post('/api/auth/google/login', { code })
    }
    ```

- [ ] `src/hooks/useAuth.helpers.ts` - UPDATE
    ```typescript
    const loginWithGoogleCode = async (code: string) => {
      const response = await authApi.googleLogin(code)
      storageService.setToken(response.token)
      setUser({ ... })
      setIsAuthenticated(true)
    }
    ```

### 4. Types & Config

- [ ] `src/types/index.ts` - UPDATE

    ```typescript
    export interface AuthResponse {
        token: string;
        userId: number;
        email: string;
        firstName?: string;
        lastName?: string;
        picture?: string;
        authType: "google" | "local";
    }
    ```

- [ ] `src/config/api.config.ts` - UPDATE
    ```typescript
    auth: {
      googleLogin: '/api/auth/google/login',
    }
    ```

### 5. Routing

- [ ] `src/App.tsx` - UPDATE
    ```tsx
    <Route path="/auth/callback" element={<AuthCallback />} />
    ```

### 6. Environment

- [ ] `.env` - UPDATE
    ```
    REACT_APP_GOOGLE_CLIENT_ID=887853390661-j2bepobhb90k357d0k5p1atqd2k8oe6l.apps.googleusercontent.com
    REACT_APP_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
    ```

---

## Google Cloud Console

- [ ] Update Authorized redirect URIs:
    - `http://localhost:3000/auth/callback`
    - Production URL khi deploy

---

## Implementation Order

### Phase 1: Backend (BE trước để test API)

1. AuthService + UserRepository
2. AuthController
3. Register services
4. Test với Postman

### Phase 2: Frontend UI

1. AccountsDialog component
2. Update ActivityBar với Accounts icon
3. Test dialog open/close

### Phase 3: OAuth Flow

1. googleOAuth.ts helper
2. AuthCallback page
3. Update API service + hooks
4. Add route + env vars

### Phase 4: Integration

1. Test full flow end-to-end
2. Error handling
3. Test với new/existing users

---

## Flow Diagram

```
1. User clicks Accounts icon in ActivityBar
   ↓
2. AccountsDialog opens
   ↓
3. User clicks "Sign in with Google"
   ↓
4. Redirect to Google OAuth (initiateGoogleLogin)
   ↓
5. User authenticates với Google
   ↓
6. Google redirects to http://localhost:3000/auth/callback?code=xxx
   ↓
7. AuthCallback page extracts code
   ↓
8. Call POST /api/auth/google/login { code }
   ↓
9. BE exchanges code for Google token
   ↓
10. BE verifies token, gets user info
    ↓
11. BE creates/updates User record (AuthType = "google")
    ↓
12. BE generates JWT token
    ↓
13. Returns AuthResponse { token, userId, email, ... }
    ↓
14. FE saves token to localStorage
    ↓
15. FE updates auth state
    ↓
16. Navigate to home page (authenticated)
```

---

## Critical Files

### Backend

- `SuperAppServices/Services/AuthService.cs` - NEW
- `SuperAppAPI/Controllers/AuthController.cs` - NEW
- `SuperAppModels/DTOs/Responses/AuthResponse.cs` - NEW
- `SuperAppDataRepositories/Repositories/UserRepository.cs` - UPDATE

### Frontend

- `src/utils/googleOAuth.ts` - NEW
- `src/Components/VSCodeLayout/AccountsDialog.tsx` - NEW
- `src/pages/AuthCallback.tsx` - NEW
- `src/Components/VSCodeLayout/ActivityBar.tsx` - UPDATE
- `src/services/api/auth.api.ts` - UPDATE
- `src/hooks/useAuth.helpers.ts` - UPDATE

---

## Testing Checklist

- [ ] Backend API responds correctly với valid code
- [ ] Invalid code returns 401
- [ ] New Google user tạo User record
- [ ] Existing Google user login thành công
- [ ] JWT token valid
- [ ] Accounts icon hiển thị trong ActivityBar
- [ ] Dialog mở/đóng correctly
- [ ] Google redirect flow works
- [ ] Callback extracts code
- [ ] Token saved to localStorage
- [ ] User authenticated sau login
- [ ] Error handling works

---

## Security Notes

- ClientSecret trong user secrets (NOT in appsettings.json)
- Validate authorization code với Google
- HTTPS trong production
- Rate limiting trên auth endpoints
- No sensitive data trong localStorage (chỉ JWT)
- Validate redirect URI

---

## Future Enhancements

1. Refresh token flow
2. Logout functionality
3. Display user profile trong AccountsDialog
4. Profile picture
5. Multiple OAuth providers (Facebook, GitHub)
6. Account linking

---

**File chi tiết hơn**: `.claude/plans/joyful-splashing-sparkle.md`
