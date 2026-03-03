# Auth System Documentation

## Overview

SuperApp sử dụng hệ thống xác thực hỗ trợ **2 phương thức đăng nhập**:
1. **Local login** - Username + Password
2. **Google OAuth 2.0** - Authorization Code Flow với PKCE (S256) + CSRF state validation

---

## Architecture

```
[Frontend - React]                    [Backend - ASP.NET Core]
─────────────────────────────────     ────────────────────────────────
AuthStoreProvider (Context)           AuthController
  └─ AuthStore (state)                  ├─ POST /api/auth/login
                                        └─ POST /api/auth/google/login
useAuthHelper (business logic)
  ├─ login()                          IAuthService
  ├─ logout()                           ├─ LocalLoginAsync()
  ├─ loginWithGoogleCode()              └─ GoogleLoginAsync()
  ├─ handleOAuthCallback()
  ├─ initAuthFromStorageToken()
  └─ upsertUserFilters()

authApi (HTTP layer)
  ├─ login()       → POST /api/auth/login
  ├─ googleLogin() → POST /api/auth/google/login
  └─ exchangeCodeForToken() → POST /api/auth/exchange-token
```

---

## Files

| File | Mô tả |
|------|-------|
| `src/store/auth/Auth.store.tsx` | React Context store - quản lý state auth |
| `src/store/authCallback/AuthCallback.store.tsx` | State cho trang OAuth callback |
| `src/hooks/useAuth.helpers.ts` | Business logic - các hàm xử lý auth |
| `src/services/auth.service.ts` | HTTP layer - gọi API auth |
| `src/pages/AuthCallback.tsx` | Trang `/auth/callback` - xử lý redirect từ Google |
| `src/utils/pkce.utils.ts` | PKCE utilities - generate/store/validate PKCE values |
| `src/utils/googleOAuth.ts` | Google OAuth config + `initiateGoogleLogin()` |
| `SuperAppAPI/Controllers/AuthController.cs` | Backend controller - xử lý request auth |

---

## Backend API

### `POST /api/auth/login`
Đăng nhập bằng username và password.

- **Request:** `multipart/form-data`
  - `username`: string
  - `password`: string
- **Response:** `AuthResponse` chứa JWT token
- **Errors:** 400 (thiếu field), 401 (sai credentials), 500 (lỗi server)

### `POST /api/auth/google/login`
Đổi Google authorization code lấy JWT token (hỗ trợ PKCE).

- **Request:** `application/json`
  ```json
  {
    "code": "google_authorization_code",
    "codeVerifier": "pkce_code_verifier (optional)"
  }
  ```
- **Response:** `AuthResponse` chứa JWT token + thông tin user
- **Errors:** 400 (thiếu code), 401 (code không hợp lệ), 500 (lỗi server)

---

## Frontend State (`Auth.store.tsx`)

### `User` interface
```ts
interface User {
    userId: number | null;
    userName: string;
    email: string;
    password?: string;       // Không bao giờ lưu thực tế
    firstName?: string;
    lastName?: string;
    picture?: string;
    authType?: "google" | "local";
    userToken: string;       // JWT token
    filters?: UserFilters;   // Preferences theo từng view
}
```

### `AuthStoreData` - State quản lý
| Field | Type | Mô tả |
|-------|------|-------|
| `$user` | `User` | Thông tin user hiện tại |
| `isAuthenticated` | `boolean` | Trạng thái đăng nhập |
| `loading` | `boolean` | Loading chung |
| `error` | `string \| null` | Lỗi chung |
| `loginLoading` | `boolean` | Loading khi đang login |
| `loginError` | `string \| null` | Lỗi khi login |
| `tokenExchangeLoading` | `boolean` | Loading khi exchange token |
| `tokenExchangeError` | `string \| null` | Lỗi khi exchange token |

---

## Frontend Business Logic (`useAuth.helpers.ts`)

### `login(username, password)`
- Gọi `authApi.login()` → `POST /api/auth/login`
- Lưu user vào store với `authType: "local"`
- **Không** lưu password vào store
- Set `isAuthenticated = true`

### `logout()`
- Reset toàn bộ `$user` về state mặc định
- Set `isAuthenticated = false`
- Xóa `USER_TOKEN` và `USER_PROFILE` khỏi localStorage

### `loginWithGoogleCode(code, codeVerifier?)`
- Gọi `authApi.googleLogin()` → `POST /api/auth/google/login`
- Parse `filters` từ JSON string của response (fallback về `constants.filters.defaults`)
- **Chỉ trong dev:** Lưu token và profile vào localStorage
- Set `isAuthenticated = true`

### `handleOAuthCallback()`
Xử lý redirect sau Google OAuth:
1. Kiểm tra lỗi OAuth trong URL
2. Trích xuất `code` và `state` từ query params
3. Lấy `codeVerifier` và `state` từ sessionStorage (PKCE), **xóa ngay sau khi lấy**
4. Validate `state` để chống CSRF
5. Gọi `loginWithGoogleCode(code, codeVerifier)`
6. Navigate về `/` nếu thành công

### `initAuthFromStorageToken()`
- **Chỉ chạy trong dev environment**
- Khôi phục session từ localStorage (`USER_TOKEN` + `USER_PROFILE`)
- Trả về `true` nếu khôi phục thành công

### `upsertUserFilters()`
- Sync filter preferences của user lên backend
- Gọi `userProfileService._upsertUserProfile()`
- **Chỉ trong dev:** Cập nhật localStorage

---

## Google OAuth Config (`googleOAuth.ts`)

```ts
GOOGLE_OAUTH_CONFIG = {
  clientId: env.REACT_APP_GOOGLE_CLIENT_ID || "<hardcoded_fallback_id>",
  redirectUri: getRedirectUri(),   // auto-detect từ window.location.origin
  scope: "openid profile email https://www.googleapis.com/auth/drive.file",
  responseType: "code",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
}
```

**Lưu ý scope:** Bao gồm `drive.file` → user phải cấp quyền Google Drive khi đăng nhập.

**Redirect URI logic:**
- Production: dùng `REACT_APP_GOOGLE_REDIRECT_URI` nếu có env var, ngược lại auto-detect
- Dev/staging: tự động dùng `window.location.origin + /auth/callback`

### `initiateGoogleLogin()` - Bước đầu tiên của OAuth flow
```
1. generateCodeVerifier()   → 64-char random URL-safe string
2. generateCodeChallenge()  → SHA-256(verifier) → base64url
3. generateState()          → 32-char random string (CSRF token)
4. storePkceValues()        → sessionStorage
5. Redirect → Google với params:
   - code_challenge_method: "S256"
   - access_type: "offline"   (nhận refresh_token)
   - prompt: "consent"        (force show consent screen)
```

---

## Google OAuth Full Flow

```
1. User click "Login with Google"
        ↓
2. initiateGoogleLogin():
   - Tạo codeVerifier (64-char), codeChallenge (SHA-256), state (32-char)
   - Lưu codeVerifier + state → sessionStorage
   - Redirect → Google OAuth với code_challenge_method=S256, access_type=offline
        ↓
3. Google hiện consent screen → user approve
        ↓
4. Google redirect về /auth/callback?code=...&state=...
        ↓
5. AuthCallback page mount:
   - useRef(hasProcessed) chống double-run (React StrictMode)
   - isProcessing = true (default) → spinner hiện ngay
   - Gọi handleOAuthCallback()
        ↓
6. handleOAuthCallback():
   - Kiểm tra ?error= trong URL
   - Trích xuất code + returnedState từ URL
   - Lấy codeVerifier + storedState từ sessionStorage (xóa ngay)
   - validateState(returnedState, storedState) → chống CSRF
   - Gọi loginWithGoogleCode(code, codeVerifier)
        ↓
7. POST /api/auth/google/login { code, codeVerifier }
        ↓
8. Backend verify với Google → trả về JWT token + user info
        ↓
9. Frontend: set$User(), setIsAuthenticated(true), navigate("/")
   (isProcessing không được set false khi thành công vì đã navigate đi)
```

### AuthCallback page (`src/pages/AuthCallback.tsx`)
- Mount tại route `/auth/callback`
- Hiển thị spinner trong khi `isProcessing = true`
- Hiển thị lỗi + link "Return to home" nếu `callbackError` có giá trị
- `isProcessing` chỉ được set `false` khi có **lỗi** (thành công thì navigate đi luôn)

---

## Storage

| Key | Storage | Nội dung | Khi nào |
|-----|---------|---------|--------|
| `USER_TOKEN` | localStorage | JWT token string | Chỉ dev environment |
| `USER_PROFILE` | localStorage | User object (JSON) | Chỉ dev environment |
| PKCE values | sessionStorage | `codeVerifier`, `state` | Trong OAuth flow, xóa sau khi dùng |

> **Lưu ý:** Trong production, token **không** được lưu vào localStorage (các dòng `storageService.setString` bị comment). Token chỉ tồn tại trong React Context (in-memory).

---

## Security Notes

- **PKCE:** Bắt buộc với Google OAuth để chống authorization code interception
- **State parameter:** Random string để chống CSRF, validate trước khi exchange token
- **Password:** Không bao giờ lưu vào store hay storage
- **Token storage:** Production dùng in-memory (React Context) thay vì localStorage
- **CSRF protection:** State parameter được validate trong `handleOAuthCallback()`
