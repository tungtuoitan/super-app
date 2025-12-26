# 🔄 STATE MANAGEMENT - Data & UI State Patterns

> **Philosophy**: Right tool for job. Server ≠ UI state.

## 🎯 State Categories

### Decision Matrix

| State Type | Solution        | When             | Example          |
| ---------- | --------------- | ---------------- | ---------------- |
| Server     | React Query     | API data         | Notes, profile   |
| Global UI  | Context         | App-wide         | Auth, theme      |
| Feature UI | Context         | Feature-specific | Filters, dialogs |
| Local UI   | useState        | Component        | Inputs, toggles  |
| URL        | React Router    | Shareable        | Page, filters    |
| Form       | React Hook Form | Complex forms    | Editor, settings |

## 🚀 React Query (Server)

### Setup

QueryClient: stale 5min, cache 10min, retry 1, no refetch focus. Wrap QueryClientProvider.

### Queries (GET)

- Basic: useQuery key/params, fn service.
- Single: enabled control.
- Dependent: enabled !!data prev.

### Mutations (POST/PUT/DEL)

- Create/Update/Delete: useMutation fn, onSuccess invalidate keys.
- Optimistic: onMutate cancel/snapshot/set, onError rollback, onSettled invalidate.

### Keys

Object: all/lists/list(params)/details/detail(id) cho consistent invalidate.

## 🌐 Context (Global UI)

Good: Auth/theme/lang/nav/modals. Bad: Server/form/local.

Pattern: createContext, Provider useState/useEffect init, actions. Hook error check.

## 🎨 Feature Context (UI)

Centralized Main.tsx: Auth/NoteUI/Dialog. Benefits: Sharing, truth, debug, access.

Page: Direct use, no wrap.

## 📝 Local (useState)

Local UI: Inputs/toggles. Không server/shared/persist.

## 🎛️ Complex Local (useReducer)

Multiple/complex logic: Actions reducer.

## 🔗 URL (Router)

Shareable: useSearchParams read/set, tích hợp queries.

## 📋 Form (Hook Form)

Validation/multi-fields: useForm zodResolver, register/errors/submit.

## 🎯 Best Practices

1. Derived: Calc/useMemo, không store.
2. Colocate: Gần dùng.
3. Single Truth: Không duplicate, merge.
4. No Sync: Props direct hoặc edited only.

## 🔄 Flows

1. Server→UI: Fetch/local/derived.
2. Input→Server: Form/mutate/reset.
3. Multi-Step: Step/accumulate/submit.

## 🎨 Custom Hooks

Encapsulate: useNoteFilters setters/toggle/reset.

## 📊 Decision Tree

API? React Query. URL? SearchParams. Form? Simple useState/Complex HookForm. Shared app? Context. Feature? Feature Context. Local? Simple useState/Complex useReducer. Derived? No store.

## 🚫 Anti-Patterns

1. Context Server: Dùng Query.
2. Too Much Context: Split.
3. Unnecessary: Calc direct.

## 📝 Checklist

Server? Query. URL? Params. Shared app? Context. Feature? Feature. Local? State/Reducer. Derived? No. Re-renders? Optimize.

**Remember**: No state best. Derive/lift necessary.
