# ⚠️ ERROR HANDLING - Complete Error Strategy

> **Philosophy**: Errors happen. Handle gracefully, inform users, log for debugging.

## 🎯 Error Handling Strategy

### Error Handling Layers

UI Layer (messages, toasts, inline) → Component Layer (rendering, fallback) → Hook Layer (React Query, custom hooks) → Service Layer (transformation, classification) → API Client Layer (HTTP detection) → Logging/Monitoring (Sentry, console).

## 🔤 Error Types & Classification

### Custom Error Classes

AppError (base với message, code, statusCode, details). Subclasses: NetworkError, ApiError (fromResponse), AuthenticationError (401), AuthorizationError (403), ValidationError (errors object), NotFoundError (404), TimeoutError (408), ServerError (500+), RateLimitError (429).

## 🌐 API Client Error Handling

Axios instance với interceptors request/response. handleError phân loại AxiosError thành AppError subclasses dựa trên status (401 redirect login, etc.), network/timeout. Methods (get/post/put/delete) throw handled errors.

## 🪝 React Query Error Handling

QueryClient defaultOptions: queries retry (không cho auth, max 3), onError handleQueryError (toast trừ auth, console). Mutations onError handleMutationError (toast, console).

## 🎨 UI Error Components

### Error Alert Component

Alert với title từ status, message, optional retry button, code nếu showDetails.

### Error Boundary Component

Catch errors, state hasError/error, fallback UI (message, retry, home button), dev show stack, log error.

## 📝 Form Error Handling

useForm với zodResolver, handleSubmit mutateAsync, catch ValidationError setError field-level, other toast.

## 🎯 Component-Level Error Handling

### Pattern 1: Error State in Component

If loading → Spinner; error → ErrorAlert với retry; empty → EmptyState; else success.

### Pattern 2: Inline Error Messages

Catch in handlers, toast specific messages dựa error type.

## 📊 Error Logging & Monitoring

initMonitoring Sentry với dsn, environment. logError captureException với extra context.

## 🎨 User-Friendly Error Messages

ERROR_MESSAGES dictionary cho codes/status (network, auth, permission, etc.). getUserFriendlyMessage trả message phù hợp hoặc default.

## 📝 Error Handling Checklist

### For Every API Call

- Try/catch or React Query handled
- Error typed
- User message displayed
- Logged
- Retry if appropriate
- Loading shown
- Success feedback

### For Every Form

- Client validation
- Server errors handled
- Field/form messages
- Disable submit pending
- Success feedback

### For Every Component

- Error boundary
- Null checks
- Fallback UI
- Retry if applicable

**Remember**: Good handling invisible when working, helpful when not!
