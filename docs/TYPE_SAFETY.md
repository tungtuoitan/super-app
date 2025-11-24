# 🔒 TYPE SAFETY - TypeScript Best Practices

> **Philosophy**: Compiles = works. Types document.

## 🎯 Type Organization

### Type File Structure

src/features/[feature]/types/: note.types.ts (domain), note.dto.ts (API DTOs).  
src/shared/types/: common.types.ts (shared), api.types.ts (generic API), utility.types.ts (utilities).

## 📦 Domain Models

Domain interfaces (e.g., Note với properties), enums/unions cho fixed values (e.g., NoteType), params interfaces (e.g., GetNotesParams).

## 🔄 DTOs (Data Transfer Objects)

API response DTOs (dates as strings), request DTOs (CreateNoteDTO, UpdateNoteDTO), bulk DTOs.

## 🌐 API Types

Generic ApiResponse<T>, ApiError, PaginatedResponse<T>, ListResponse<T>.

## 🛠️ Utility Types

Required<T>, RequiredFields<T,K>, PartialExcept<T,K>, Nullable<T>, Maybe<T>, Dictionary<T>, ID, Timestamp, Prettify<T>.

## 🎯 Component Props Types

Interfaces cho props (children, onClick, variants), extend HTML attributes, generics cho data/render.

## 🪝 Hook Types

Return interfaces cho hooks (queries/mutations với data/loading/error/actions).

## 🎨 Event Handler Types

Typed handlers cho mouse/form/change/keyboard/focus events.

## 🔄 Type Transformations

Pick, Omit, Partial, Required, Readonly, Record, Extract, Exclude, NonNullable, ReturnType, Parameters, Awaited.

## 🎯 Advanced Patterns

Discriminated unions cho results (success/error), generic components (e.g., DataTable<T>), type guards cho narrowing (isNote, isDefined).

## 🎨 Context Types

ContextValue interfaces, createContext<T|null>, typed hooks với error check, Provider value typed.

## 🔐 Type Safety Best Practices

1. No any: Use unknown + narrow.
2. Type params/returns.
3. Const assertions cho literals.
4. Inference where possible, explicit cho exported.
5. Interfaces cho objects.
6. Branded types cho IDs.

## 📝 Type Documentation

JSDoc cho functions (params, returns, throws, example).

## 🚫 Anti-Patterns

1. Assertions without guards.
2. Optional chaining overuse.
3. {} type: Use Record<string,unknown> hoặc exact.

## 📝 Type Safety Checklist

- No any.
- Functions typed.
- Params/returns specified.
- Event handlers typed.
- Props defined.
- API responses typed.
- Guards cho unknown.
- Const assertions.
- Interfaces cho objects.
- JSDoc cho complex.

**Remember**: Types self-document, catch bugs compile-time!