# 🔐 JWT Authentication Flow - Giải thích chi tiết

## 📊 Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         1. LOGIN PHASE                                   │
└─────────────────────────────────────────────────────────────────────────┘

User clicks "Sign in with Google"
    ↓
Google OAuth redirect → User logs in at Google
    ↓
Google redirects back với authorization code
    ↓
Frontend gọi: POST /api/auth/google/login { code: "..." }
    ↓
┌──────────────────────────────────────────────────────────────────────┐
│ BACKEND: AuthService.GoogleLoginAsync()                              │
│                                                                       │
│ 1. Exchange code for Google token                                    │
│ 2. Get user info from Google (email, name, picture...)               │
│ 3. Check user in database (urm.users table):                         │
│    ├─ Exists? → Get existing user                                    │
│    └─ Not exists? → INSERT new user (AuthService.cs:250-260)         │
│                                                                       │
│ 4. ✅ GENERATE JWT TOKEN (AuthService.cs:266-290)                    │
│    ┌──────────────────────────────────────────────────┐              │
│    │ var claims = new[]                                │              │
│    │ {                                                 │              │
│    │   new Claim(ClaimTypes.NameIdentifier,            │              │
│    │             user.Id.ToString()),  ← USERID HERE!  │              │
│    │   new Claim(ClaimTypes.Email, user.Email),        │              │
│    │   new Claim("sub", user.Id.ToString())            │              │
│    │ };                                                │              │
│    │                                                   │              │
│    │ JWT Token = {                                     │              │
│    │   header: { alg: "HS256", typ: "JWT" },          │              │
│    │   payload: {                                      │              │
│    │     nameid: "1",        ← userId                  │              │
│    │     email: "user@gmail.com",                      │              │
│    │     sub: "1",           ← userId (backup)         │              │
│    │     jti: "guid...",                               │              │
│    │     iat: 1234567890,                              │              │
│    │     exp: 1234657890                               │              │
│    │   },                                              │              │
│    │   signature: "encrypted..."                       │              │
│    │ }                                                 │              │
│    └──────────────────────────────────────────────────┘              │
│                                                                       │
│ 5. Return AuthResponse with:                                         │
│    - JWT token                                                        │
│    - User data (id, email, name, picture...)                         │
└──────────────────────────────────────────────────────────────────────┘
    ↓
Frontend nhận response:
    {
        success: true,
        user: {
            id: 1,                    ← userId from database
            email: "user@gmail.com",
            firstName: "Tung",
            lastName: "Lê Hoàng",
            picture: "https://...",
            token: "eyJhbGc..."       ← JWT Token (chứa userId trong claims)
        }
    }
    ↓
Frontend lưu:
    - localStorage.setItem("user_token", token)  ← Lưu JWT token
    - auth.userId = 1                            ← Lưu user info vào store
    - auth.email = "user@gmail.com"

┌─────────────────────────────────────────────────────────────────────────┐
│                      2. API CALL PHASE                                   │
└─────────────────────────────────────────────────────────────────────────┘

User makes API request (e.g., GET /api/workspace)
    ↓
Frontend (apiClient.ts) automatically adds:
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
┌──────────────────────────────────────────────────────────────────────┐
│ BACKEND: ASP.NET Core JWT Authentication Middleware                  │
│                                                                       │
│ 1. Middleware reads "Authorization: Bearer {token}" header           │
│                                                                       │
│ 2. Validate JWT Token (Program.cs:100-112):                          │
│    ✓ Check signature (using secret key)                              │
│    ✓ Check expiration (exp claim)                                    │
│    ✓ Check issuer, audience                                          │
│                                                                       │
│ 3. ✅ DECODE JWT và tạo ClaimsPrincipal:                             │
│    ┌───────────────────────────────────────────────┐                 │
│    │ ClaimsPrincipal User = {                      │                 │
│    │   Identity: {                                 │                 │
│    │     IsAuthenticated: true,                    │                 │
│    │     Claims: [                                 │                 │
│    │       { Type: "nameid", Value: "1" },         │                 │
│    │       { Type: "email", Value: "user@..." },   │                 │
│    │       { Type: "sub", Value: "1" },            │                 │
│    │       ...                                     │                 │
│    │     ]                                         │                 │
│    │   }                                           │                 │
│    │ }                                             │                 │
│    └───────────────────────────────────────────────┘                 │
│                                                                       │
│ 4. ✅ Set HttpContext.User = ClaimsPrincipal                         │
│    → Giờ controller có thể access User.Claims!                       │
└──────────────────────────────────────────────────────────────────────┘
    ↓
┌──────────────────────────────────────────────────────────────────────┐
│ CONTROLLER: WorkspaceController.GetAllUserWorkspaces()               │
│                                                                       │
│ [Authorize]  ← Middleware đã validate token, User đã có claims       │
│ public async Task<IActionResult> GetAllUserWorkspaces()              │
│ {                                                                     │
│     // ✅ EXTRACT userId FROM JWT CLAIMS                             │
│     var userId = GetAuthenticatedUserId();                           │
│     //           ↓                                                    │
│     //  private int? GetAuthenticatedUserId()                        │
│     //  {                                                             │
│     //      var userIdClaim = User.GetUserId();  ← Extension method  │
│     //                         ↓                                      │
│     //      ClaimsPrincipalExtensions.cs:7-11:                       │
│     //      return principal.FindFirstValue(ClaimTypes.NameIdentifier)│
│     //          // Tìm claim với Type = "nameid" → Value = "1"       │
│     //          ?? principal.FindFirstValue("sub");                   │
│     //          // Fallback: Tìm claim với Type = "sub" → Value = "1"│
│     //                                                                │
│     //      return "1";  ← String userId                             │
│     //                                                                │
│     //      if (!int.TryParse("1", out var userId))                  │
│     //      return userId; → 1 (int)                                 │
│     //  }                                                             │
│     //                                                                │
│     //  Result: userId = 1                                           │
│                                                                       │
│     if (userId == null) return Unauthorized();                       │
│                                                                       │
│     // ✅ Use REAL userId (from JWT claims)                          │
│     var workspaces = await _service.GetAllUserWorkspacesAsync(       │
│         userId.Value  // = 1 (from JWT claims, NOT hardcoded!)       │
│     );                                                                │
│                                                                       │
│     return Ok(workspaces);                                           │
│ }                                                                     │
└──────────────────────────────────────────────────────────────────────┘
    ↓
Service → Repository → Database query với WHERE UserId = 1
    ↓
Return user-specific data
```

---

## 🎯 Tóm tắt: userId từ đâu ra?

### Backend:
```
Database (urm.users)
    → user.Id = 1
        → GenerateJwtToken(user)
            → JWT claims: { nameid: "1", sub: "1" }
                → Token: "eyJhbGc..."
                    → Response to frontend
```

### Frontend:
```
Login response.user.token = "eyJhbGc..."
    → localStorage.setItem("user_token", token)
```

### Mỗi API Request:
```
Frontend sends: Authorization: Bearer eyJhbGc...
    → Backend JWT Middleware decodes token
        → HttpContext.User.Claims = [{ nameid: "1" }, { email: "..." }, ...]
            → Controller: User.GetUserId()
                → principal.FindFirstValue("nameid") = "1"
                    → int.TryParse("1") = 1
                        → Service uses userId = 1
```

---

## 🔍 Chi tiết Claims trong JWT

### JWT Token Structure (decoded):
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "nameid": "1",              ← ClaimTypes.NameIdentifier (userId)
    "email": "user@gmail.com",  ← ClaimTypes.Email
    "sub": "1",                 ← JwtRegisteredClaimNames.Sub (userId backup)
    "jti": "12345-guid",        ← Unique token ID
    "iat": 1734876543,          ← Issued at (timestamp)
    "exp": 1734880143           ← Expiration (timestamp)
  },
  "signature": "HMACSHA256(...)"
}
```

### Khi Backend validate token:
```csharp
// ASP.NET Core JWT Middleware tự động:
1. Verify signature với secret key
2. Check expiration
3. Decode payload thành ClaimsPrincipal
4. Set HttpContext.User = ClaimsPrincipal

// Controller có thể access:
User.Claims = [
    new Claim("nameid", "1"),
    new Claim("email", "user@gmail.com"),
    new Claim("sub", "1"),
    ...
]

// Extension method giúp extract dễ dàng:
User.GetUserId()
    → Tìm claim type "nameid" hoặc "sub"
    → Return "1"
```

---

## 📦 JWT Token được lưu Ở ĐÂU?

### Frontend (Browser):
```
localStorage
    └─ key: "user_token"
       value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxIi..."
```

### Backend KHÔNG LƯU JWT Token!
- Backend chỉ **generate** token và gửi về client
- Backend chỉ **validate** token khi nhận request
- Token được lưu ở **client side** (localStorage/memory)
- Backend chỉ cần **secret key** để verify signature

---

## ⚡ Tại sao JWT Claims có thể lưu userId?

JWT (JSON Web Token) được thiết kế để:
1. **Self-contained**: Token chứa TẤT CẢ thông tin cần thiết (claims)
2. **Stateless**: Backend KHÔNG cần lưu session, chỉ cần verify signature
3. **Secure**: Signature đảm bảo token không bị giả mạo

### Structure:
```
JWT = Base64(Header) + "." + Base64(Payload) + "." + Signature

Signature = HMACSHA256(
    Base64(Header) + "." + Base64(Payload),
    SecretKey
)
```

### Bảo mật:
- Payload (claims) có thể **đọc được** (base64 decode)
- Nhưng **KHÔNG THỂ SỬA** vì sửa → signature sai → backend reject
- Chỉ server có SecretKey mới tạo được signature hợp lệ

---

## 🔐 Security Notes

### ✅ An toàn:
- JWT chứa userId, email (public info)
- Signature đảm bảo không ai sửa được
- Token có expiration time (hết hạn)

### ❌ KHÔNG NÊN lưu trong JWT:
- Password
- Sensitive personal data (SSN, credit card...)
- Large data (JWT nên nhỏ gọn)

### 🛡️ Best Practices:
- Luôn dùng HTTPS
- Set expiration time ngắn (15-60 phút)
- Có refresh token mechanism
- Store token in httpOnly cookie hoặc secure storage
