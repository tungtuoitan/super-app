# 🏗️ ARCHITECTURE - System Design & Structure

> **Philosophy**: Feature-first, domain-driven architecture with clear boundaries.
> 
## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │    Pages     │  │   Layouts    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT LAYER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React Query  │  │   Context    │  │  useState    │      │
│  │ (Server)     │  │ (Global UI)  │  │  (Local)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       BUSINESS LOGIC LAYER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Services   │  │    Hooks     │  │    Utils     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │              API Client (Axios/Fetch)            │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                      Backend API
```


## 📐 System Architecture

### High-Level Overview

Presentation Layer (Components, Pages, Layouts) → State Management Layer (React Query cho server, Context cho global UI, useState cho local) → Business Logic Layer (Services, Hooks, Utils) → Data Access Layer (API Client Axios/Fetch) → Backend API.

## 📁 Complete Folder Structure

src/
- features/ (feature modules: auth, notes, v.v. với components, hooks, services, store, types, index.ts)
- shared/ (components/ui, data-display, feedback; hooks; services; types; utils)
- lib/ (react-query.ts, api-client.ts, theme.ts, router.ts)
- config/ (env.ts, constants.ts, routes.ts)
- layouts/ (AppLayout, AuthLayout, DashboardLayout)
- pages/ (HomePage.tsx, NotesPage.tsx, LoginPage.tsx)
- App.tsx, main.tsx, vite-env.d.ts

## 🎯 Feature Module Structure

features/[name]/
- components/ (NoteGrid/ với .tsx, .hooks.ts, .utils.ts, .types.ts, index.ts; hoặc file đơn giản như NoteCard.tsx)
- hooks/ (useNotes.ts, useNote.ts, useCreateNote.ts, v.v.)
- services/ (noteService.ts)
- store/ (NoteUIContext.tsx)
- types/ (note.types.ts, note.dto.ts)
- index.ts (public exports)

## 📊 Layer Responsibilities

1. **Presentation Layer**: Render UI, xử lý tương tác, hiển thị loading/error, không business logic hay API calls.

2. **State Management Layer**: Quản lý server state (React Query), global UI state (Context), cache invalidation, optimistic updates, không rendering logic.

3. **Business Logic Layer**: API communication, data transformation, business rules, không React hooks hay UI logic.

4. **Data Access Layer**: HTTP requests, interceptors, auth headers, error transformation, không business logic.

## 🌐 API Client & Service Layer

### API Client Setup (lib/api-client.ts)

**Axios-based Implementation:**
- Instance config: baseURL từ env, timeout, headers JSON
- Request interceptors: Thêm token từ storage, log trong DEV mode
- Response interceptors: Log trong DEV, xử lý lỗi (401: redirect login, 403: forbidden, 500+: server error)
- Typed methods: get<T>, post<T>, put<T>, patch<T>, delete<T>

**Fetch-based Alternative:**
- Base config: baseURL, default headers
- handleResponse: Kiểm tra ok, xử lý status codes (401: logout, parse JSON)
- Typed methods với proper error handling

### Service Layer Pattern (features/*/services/)

**Service Class Structure:**
```typescript
class NoteService {
  private basePath = '/api/notes';
  
  // CRUD operations
  async getNotes(params?: GetNotesParams): Promise<Note[]>
  async getNoteById(id: string): Promise<Note>
  async createNote(data: CreateNoteDTO): Promise<Note>
  async updateNote(id: string, data: UpdateNoteDTO): Promise<Note>
  async deleteNote(id: string): Promise<void>
  
  // Convenience methods
  async archiveNote(id: string): Promise<Note>
  async bulkDelete(ids: string[]): Promise<void>
}

export const noteService = new NoteService(); // Singleton
```

**Data Transformation:**
- DTOs từ API (dates as strings) → Domain models (Date objects)
- Transform trong service layer trước khi return
- Consistent transformation cho tất cả responses

### Common Service Patterns

**Authentication Service:**
```typescript
class AuthService {
  login(credentials): Promise<AuthResponse>      // Lưu token
  logout(): void                                  // Xóa token
  getCurrentUser(): Promise<User>
  verifyToken(token): Promise<boolean>
  refreshToken(): Promise<string>                // Cập nhật token
  requestPasswordReset(email): Promise<void>
  resetPassword(token, password): Promise<void>
}
```

**File Upload Service:**
```typescript
class UploadService {
  uploadFile(file, onProgress): Promise<{url: string, id: string}>
  uploadFiles(files, onProgress): Promise<Array<{url, id}>>
  deleteFile(fileId): Promise<void>
}
```
- Sử dụng FormData cho multipart/form-data
- Progress tracking cho UX tốt hơn

### Error Handling Strategy

**Custom Error Classes:**
```typescript
class ApiError extends Error {
  constructor(status: number, message: string, data?: any)
}
class NetworkError extends Error {}
class ValidationError extends Error {
  constructor(message: string, errors: Record<string, string>)
}
```

**Service Error Handling:**
- Try/catch Axios/Fetch errors
- Transform thành typed errors (ApiError, NetworkError)
- Re-throw để React Query/Component xử lý
- Log errors trong DEV mode

### Advanced Features

**Retry Logic:**
- Sử dụng axios-retry: 3 attempts, exponential backoff
- Retry điều kiện: network errors hoặc 5xx status codes
- Không retry cho 4xx (client errors)

**Request Cancellation:**
- Axios: CancelToken source, cancel on unmount
- React Query: Tự động sử dụng AbortController signal
- Tránh memory leaks và race conditions

**Query Parameters:**
- Build với URLSearchParams
- Append key-value pairs
- Hỗ trợ arrays (multiple values cho cùng key)

**API Security:**
- CSRF token: Thêm X-CSRF-Token header từ meta tag
- API key: X-API-Key từ environment
- Rate limiting headers
- Request signing nếu cần

### Service Best Practices

**Checklist:**
- [ ] Class có tên mô tả rõ domain (NoteService, AuthService)
- [ ] basePath private, không hardcode
- [ ] Tất cả methods async, return Promise
- [ ] TypeScript types cho params và returns
- [ ] Try/catch errors, không silent fail
- [ ] Transform data từ DTO sang domain model
- [ ] JSDoc cho public methods (params, returns, throws)
- [ ] Export singleton instance
- [ ] Unit tests cho critical paths

**Guidelines:**
1. **Keep Services Thin**: Không business logic (filter/sort) - để ở component/hook
2. **Descriptive Names**: getNotes, createNote (không get, create)
3. **Consistent Error Handling**: Log và re-throw, không swallow errors
4. **Single Responsibility**: Mỗi service một domain entity

**Remember**: Services là bridge giữa React và API, tập trung vào communication.

## 🔄 Data Flow Examples

- Fetching: Component → hook (useNotes) → React Query → service.getNotes → apiClient.get → backend → transform → cache → render.
- Creating: Component → mutateAsync → service.createNote → apiClient.post → backend → transform → invalidate cache → refetch → update UI.

## 🎨 Component Organization

- Simple: Single file .tsx.
- Complex: Folder với .tsx, .hooks.ts, .utils.ts, .types.ts, index.ts.

## 🗂️ File Naming Rules

- Components: PascalCase.tsx (NoteCard.tsx), folder cho complex.
- Hooks: camelCase với use (useNotes.ts).
- Services: camelCaseService.ts (noteService.ts).
- Types: camelCase.types.ts (note.types.ts).
- Utilities: camelCase.ts (format.ts).

## 📦 Module Boundaries

- Export từ index.ts: components, hooks, service, types, context.
- Import từ feature public API, không internal files.

## 🔗 Dependencies Between Layers

- Allowed: Presentation → State/Business, State → Business, Business → Data.
- Disallowed: Ngược lại.

## 🎯 Feature Independence

- Self-contained, explicit dependencies qua public API.
- Shared code vào shared/ nếu dùng nhiều features, generic.

## 🧩 Shared vs Feature Code

- Shared: Dùng 3+ features, pure utility, generic UI/type.
- Feature: Single feature, specific logic, coupled domain.

## 📐 Scalability Patterns

- Add feature: Tạo structure, types trước, service, hooks, store nếu cần, components, public API, wire up.
- Grow feature: Bắt đầu simple (files), medium (folders), complex (full structure).

## 🔍 Code Organization Examples

- Simple feature (users): components files, hooks, services, types, index.
- Complex feature (notes): components folders/files, nhiều hooks, services, store, types/dto, index.

## 🎪 Provider Hierarchy

- Centralized ở Main.tsx: BrowserRouter, SnackbarProvider, AuthProvider, NoteUIProvider, v.v.
- Pages: Direct dùng context, không wrap provider.

## 🚀 Performance Considerations

- Code splitting: Lazy load pages/features, Suspense fallback.

## 📝 Architecture Checklist

- Feature name domain concept.
- Types first.
- Service handle API.
- Hooks cho fetching.
- Context chỉ UI state.
- Components presentational.
- Public API necessary items.
- No circular.
- Self-contained.
- Naming conventions.

## 🔧 Troubleshooting

Decision tree cho code placement:
- Component: Multi features → shared/components; Specific → features/[name]/components.
- Hook: Query → features/hooks; Generic → shared/hooks; Specific → component folder.
- Business logic → features/services.
- Type: App-wide → shared/types; Specific → features/types.
- Utility: Generic → shared/utils; Specific → features/utils or component.

**Remember**: Architecture enable fast dev, start simple, refactor when needed.