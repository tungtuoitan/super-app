---
name: sa-authentication
description: Authentication architecture của SuperApp — login (local + Google OAuth PKCE), JWT access token + HttpOnly refresh cookie, proactive refresh, 401 interceptor, logout, session restore. Trigger khi sửa bất cứ gì trong `src/shared/auth/`, `src/shared/fetch/apiClient.ts`, khi debug "user bị kick ra sau N phút", "refresh không chạy", "Google login fail", "401 loop", hoặc khi thêm flow login mới (SSO khác, magic link...). Đọc TRƯỚC KHI sửa để hiểu cả 3 đường refresh (proactive timer / visibility / 401 reactive) và race conditions đã được fix.
---

# SuperApp — Authentication

Tài liệu hệ thống auth của SuperApp FE. Tất cả file dưới đây nằm trong `src/shared/auth/` trừ khi nói khác.

---

## 1. Thành phần & file

| File | Vai trò |
|---|---|
| `Auth.store.tsx` | React Context store — giữ `$user`, `isAuthenticated`, các flag loading/error. |
| `AuthCallback.store.tsx` | Store riêng cho trang `/auth/callback` (`isProcessing`, `callbackError`). |
| `auth.types.ts` | `User`, `UserData`, `LoginRequest`, `AuthResponse`, `GoogleCodeRequest`. |
| `auth.service.ts` | Native `fetch` cho 4 endpoint: `login`, `googleLogin`, `refreshToken`, `logout`. **Không qua `apiFetch`** để tránh interceptor vòng lặp. |
| `auth.events.ts` | DOM events `auth:unauthorized` / `auth:special-success` — cầu nối `apiClient.ts` (plain module) ↔ `AuthGuard` (React). |
| `useAuth.helpers.ts` | Business logic: `login`, `logout`, `loginWithGoogleCode`, `handleOAuthCallback`, `initAuthFromStorageToken`. |
| `AuthGuard.tsx` | Bootstrap: configure `apiClient`, restore session, lắng nghe 401, proactive refresh khi tab visible trở lại. |
| `AuthCallback.tsx` | Trang `/auth/callback` — gọi `handleOAuthCallback` 1 lần (chống StrictMode double-invoke). |
| `googleOAuth.utils.ts` | `initiateGoogleLogin`, build auth URL có PKCE + state, extract code/state/error từ URL. |
| `pkce.utils.ts` | RFC 7636 — generate verifier/challenge/state, lưu vào `sessionStorage`, validate state. Có fallback SHA-256 thuần JS cho insecure context (LAN IP qua HTTP). |
| `../fetch/apiClient.ts` | `apiFetch` wrapper + 401 interceptor + `acquireRefreshToken` (single-flight lock) + `scheduleProactiveRefresh` (timer 60s trước expiry). |
| `../localStorage/storage.config.ts` | `STORAGE_KEYS.USER_PROFILE = "userProfile"` — chỉ lưu profile, **không** lưu token. |
| `../device/deviceFingerprint.ts` | `getDeviceFingerprint()` (human-readable string) + `getOrCreateDeviceId()` (UUID stable, lưu `localStorage["deviceId"]`). |

---

## 2. Mô hình token

- **Access token (JWT)**: trả về trong response body, lưu trong React state (`$user.userToken`). **Không** persist xuống localStorage. Gắn vào header `Authorization: Bearer ...` qua `apiFetch`. TTL dev: 15 phút, prod: 60 phút.
- **Refresh token**: BE set vào **HttpOnly cookie** (`credentials: "include"` ở mọi auth request). FE không đọc được — chỉ cần gọi `POST /api/auth/refresh` là BE rotate và trả access token mới.
- **Device ID**: UUID stable lưu `localStorage["deviceId"]`, tạo 1 lần bởi `getOrCreateDeviceId()`. Gửi kèm header `X-Device-Id` trong mọi request `/api/auth/refresh` và `/api/auth/logout`. BE dùng để scope token chain theo device — reuse-attack chỉ revoke chain của device đó thay vì RevokeAll.
- **User profile cache**: localStorage `userProfile` — lưu mọi field của `User` *trừ* `userToken` (luôn set `userToken: ""` khi ghi). Dùng để hiện UI ngay lúc mount trước khi refresh xong.

---

## 3. Các luồng chính

### 3.1 App khởi động → restore session (`AuthGuard` mount)

```
AuthGuard mount
  ├─ configureApiClient({ getToken, setToken, onAuthFailed })   // useEffect [] — 1 lần
  ├─ if pathname === "/auth/callback" → SKIP (loginWithGoogleCode tự xử)
  ├─ hasInitializedRef guard (chống StrictMode double-invoke)
  └─ initAuthFromStorageToken()
        ├─ đọc userProfile từ localStorage → set$User ngay (UI hiện liền)
        ├─ authApi.refreshToken()  → POST /api/auth/refresh (cookie tự đính kèm)
        │     ├─ OK: build User mới với userToken từ response → set$User → setIsAuthenticated(true)
        │     │       → scheduleProactiveRefresh(token)
        │     └─ Fail: remove userProfile, set$User(DEFAULT), setIsAuthenticated(false)
        └─ return restored: boolean
```

Lý do skip ở `/auth/callback`: `loginWithGoogleCode` đang chạy đồng thời, hai refresh đồng thời sẽ rotate cookie và call thứ 2 thất bại → user bị kick.

### 3.2 Login local (username/password)

`useAuthHelper().login(username, password)`:
1. `authApi.login` → POST `/api/auth/login` (multipart form-data, `credentials: "include"`).
2. Response OK: build `User` → lưu profile (không token) vào localStorage → `set$User` → `setIsAuthenticated(true)` → `scheduleProactiveRefresh`.
3. Lỗi: `parseApiError` → `setLoginError` + `setError` + rethrow.

### 3.3 Login Google OAuth (Authorization Code + PKCE)

**Bước 1 — Redirect đi (`initiateGoogleLogin`):**
1. `generateCodeVerifier()` (48 bytes random → 64 chars base64url).
2. `generateCodeChallenge(verifier)` = `BASE64URL(SHA256(verifier))`. Dùng `crypto.subtle.digest` nếu có; fallback pure-JS SHA-256 khi origin là HTTP-LAN-IP (insecure context, `crypto.subtle` undefined).
3. `generateState()` cho CSRF protection.
4. `storePkceValues(verifier, state)` → `sessionStorage` (key `oauth_code_verifier`, `oauth_state`).
5. Redirect tới `accounts.google.com/o/oauth2/v2/auth?...&code_challenge=...&code_challenge_method=S256&state=...&prompt=consent&access_type=offline`.

**Bước 2 — Callback về `/auth/callback` (`handleOAuthCallback`):**
1. Check `error` param trong URL (user cancel...).
2. Extract `code` + `state` từ URL.
3. `retrieveAndClearPkceValues()` → đọc & xoá ngay verifier + storedState.
4. `validateState(returnedState, storedState)` — chống CSRF.
5. `loginWithGoogleCode(code, codeVerifier)` → POST `/api/auth/google/login` với JSON `{code, codeVerifier}`. BE verify với Google, tạo user nếu cần, trả JWT + set refresh cookie.
6. `navigate("/", { replace: true })`.

Mọi failure đều `setCallbackError` + `setIsProcessing(false)` để UI hiện Alert.

**Gotcha**: `useEffect` trong `AuthCallback.tsx` dùng `hasProcessed.useRef` chống StrictMode chạy 2 lần (code OAuth chỉ dùng được 1 lần).

### 3.4 Token refresh — 3 đường

| Đường | Trigger | Code |
|---|---|---|
| **Proactive timer** | `setTimeout` đặt 60s trước `exp` của JWT, sau mỗi lần có token mới | `scheduleProactiveRefresh` trong `apiClient.ts` |
| **Visibility** | User quay lại tab; nếu còn < 5 phút thì refresh ngay | `AuthGuard` `visibilitychange` effect |
| **Reactive 401** | `apiFetch` nhận 401 từ non-auth endpoint | `apiClient.apiFetch` |

Cả ba đều đi qua **một hàm chung**: `acquireRefreshToken()` — dùng `isRefreshing` + `refreshPromise` để **single-flight**. Nhiều caller đồng thời chia sẻ cùng 1 promise → BE chỉ thấy 1 request, không bị rotate cookie chồng lên nhau.

**401 interceptor flow**:
```
apiFetch(url)
  ├─ gắn Bearer + credentials:"include" → fetch
  ├─ status !== 401 || isAuthEndpoint(url) → return response
  └─ 401:
       ├─ acquireRefreshToken()
       │     ├─ thành công → setToken(new) → dispatchAuthSpecialSuccess
       │     │   → retry fetch với token mới → return
       │     └─ thất bại → reset lock
       │         ├─ nếu pathname === "/auth/callback" → SUPPRESS (đang exchange code)
       │         └─ else → onAuthFailed() (= logout()) + dispatchAuthUnauthorized
```

`AUTH_ENDPOINTS = ["/api/auth/", "/api/diagnostic/"]` — các endpoint này bị 401 thì **không** interceptor refresh (sẽ vòng lặp).

### 3.5 Logout

```
useAuthHelper().logout()
  ├─ authApi.logout()  → POST /api/auth/logout (BE revoke refresh token + xoá cookie)
  │     (try/catch nuốt lỗi — vẫn cleanup FE state)
  ├─ set$User(DEFAULT_USER)
  ├─ setIsAuthenticated(false)
  ├─ setError(null) / setLoginError(null)
  └─ localStorage.remove(USER_PROFILE)
```

Logout được trigger từ:
- User click logout button → gọi `logout()` trực tiếp.
- `AuthGuard` nhận event `auth:unauthorized` (do `apiFetch` dispatch khi refresh fail).
- `configureApiClient.onAuthFailed` (callback truyền cho `apiClient` để nó gọi `logout` mà không cần biết React).

---

## 4. Patterns & quy tắc

### 4.1 Ref-based config cho `apiClient`
`configureApiClient` chỉ gọi **1 lần** ở `AuthGuard` mount. Token và logout function thay đổi liên tục → dùng `tokenRef` / `logoutRef` cập nhật mỗi render, closure đọc `.current`. **Không** re-configure `apiClient` mỗi khi token đổi.

### 4.2 Không lưu access token vào localStorage
Luôn lưu profile với `userToken: ""`. Lý do:
- Access token TTL ngắn, lưu xong cũng hết hạn.
- Tránh XSS đánh cắp. Refresh token đã ở HttpOnly cookie, JS không đọc được.

### 4.3 Service layer dùng native `fetch`
`auth.service.ts` **không** dùng `apiFetch`. Nếu dùng thì khi `/api/auth/refresh` bị 401, interceptor sẽ gọi lại `/api/auth/refresh` → vòng lặp. (Hiện tại có `isAuthEndpoint` chặn rồi, nhưng vẫn tách ra cho rõ ràng.)

### 4.4 DOM events thay vì store reference
`apiClient.ts` là plain module (không phụ thuộc React/store). Khi cần báo cho UI biết "401 toang rồi" → dispatch DOM event, `AuthGuard` listen và gọi `logout`. Tránh circular import.

### 4.5 Mọi auth request đều `credentials: "include"`
Bắt buộc — không có dòng này thì cookie refresh token không được gửi/nhận.

### 4.6 Debug logging
Mọi step quan trọng đều `debugLog.log("auth" | "apiClient", "<event>", { ...context, device })` và `debugLog.flush()` ở các điểm cuối (login success/fail, refresh fail, OAuth callback, logout). Khi debug bug mobile, đọc skill `use-debug-log`.

---

## 5. Gotchas đã gặp

1. **Race ở `/auth/callback`**: nếu `initAuthFromStorageToken` chạy song song với `loginWithGoogleCode`, hai refresh rotate cookie → call thứ 2 bị 401 → kick user. Fix: `AuthGuard` skip init khi pathname là `/auth/callback`.
2. **StrictMode double-invoke**:
   - `AuthGuard` dùng `hasInitializedRef` chống init 2 lần (refresh thứ 2 sẽ fail vì cookie đã rotate).
   - `AuthCallback` dùng `hasProcessed` chống xử OAuth code 2 lần (Google chỉ cho dùng code 1 lần).
3. **`crypto.subtle` undefined trên LAN IP HTTP**: phone gõ `http://192.168.x.x:3000` không phải secure context → `subtle.digest` undefined. `pkce.utils.ts` có SHA-256 fallback thuần JS.
4. **401 trong lúc OAuth exchange**: nếu BE trả 401 cho `/api/auth/google/login` (sai code/verifier), interceptor sẽ thử refresh → cũng fail → logout dispatch. Đã `suppress` bằng cách check `pathname === "/auth/callback"`.
5. **Proactive timer khi token đã hết hạn**: `delay <= 0` thì không setTimeout — để 401 reactive xử lý.
6. **`isRefreshing` reset trong `.finally`**: nếu quên reset, lần refresh tiếp theo sẽ chờ promise cũ đã settle → treo. Hiện tại reset cả ở `.finally` của `buildRefreshPromise` và ở catch của `apiFetch` 401 branch.
7. **Email blocklist trong `loginWithGoogleCode`**: chặn cứng `hoanhtungle@gmail.com` ở dev và `hoanhtungle2@gmail.com` ở prod để tránh nhầm môi trường. Nếu thay đổi email test, sửa luôn ở đây.
8. **Per-device token chain (2026-06-23)**: BE có `device_id` column trong `auth.refresh_tokens`. Khi detect reuse-attack, BE chỉ revoke chain của device đó (qua `X-Device-Id` header) thay vì RevokeAll. Token cũ không có `DeviceId` (null) vẫn fallback RevokeAll. Root cause của incident: sleeping tab với stale token từ IP khác wake up → BE tưởng là attack → RevokeAll → mọi session bị kick.

---

## 6. Khi thêm flow login mới (vd magic link, OTP)

Checklist:
- [ ] Thêm endpoint vào `auth.service.ts` (native `fetch`, `credentials: "include"`).
- [ ] Thêm type `*Request` / mở rộng `AuthResponse` trong `auth.types.ts` nếu cần.
- [ ] Thêm helper function trong `useAuth.helpers.ts` (theo pattern của `login` / `loginWithGoogleCode`: setLoginLoading → call API → build User → `set$User` + persist profile **trừ token** + `setIsAuthenticated(true)` + **`scheduleProactiveRefresh(token)`** + flush debug log).
- [ ] BE phải set HttpOnly refresh cookie giống `/api/auth/login` để các đường refresh hoạt động.
- [ ] Nếu có redirect (OAuth-style): thêm route `/auth/<provider>/callback` + page tương tự `AuthCallback.tsx`, và thêm `pathname.includes("/auth/...callback")` vào logic skip trong `AuthGuard` và `apiClient` suppress nếu cần.
- [ ] Export hook/helper qua `src/shared/auth/index.ts` (chỉ thêm vào barrel, đừng re-export từ helper khác).
- [ ] Test: token sắp hết hạn → proactive refresh chạy; tab idle 1h → quay lại refresh ngay; gọi API sau khi cookie hết hạn → 401 → logout dispatch.

---

## 7. Task

{ARGS}

Dùng kiến trúc ở trên để trả lời / sửa code. Nếu chỉ cần overview thì trả về tài liệu này.
