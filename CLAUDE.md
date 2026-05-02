# Code Validation Rules

Validate all new/modified code against these rules before committing.

## Module Structure

- Each module has 5-10 corresponding files: UI, helper, utils, store, selector, constants, service, type
- When a module grows too large, split into submodules
  - Example: module `Task` -> submodules: `TaskLinked`, `TaskChecklist`, `TaskComment`
- File naming convention:
  - **UI**: `ModuleName.tsx` (PascalCase)
  - **helper**: `useModuleName.helper.ts`
  - **selector**: `useModuleName.selector.ts`
  - **store**: `useModuleName.store.ts`
  - **service**: `moduleName.service.ts`
  - **type**: `moduleName.type.ts`
  - **constants**: `moduleName.constants.ts`
  - **utils**: `moduleName.utils.ts`

## File Size

- Maximum 300 lines per file

## Single Responsibility (each file type exports ONLY its own concern)

- **helper**: only contains and exports functions — MUST NOT re-export functions from other helpers
- **selector**: only contains and exports selectors — MUST NOT re-export state/selectors from other stores/selectors
- **UI**: only contains UI components, no contain type, constants,...
- **headless**: only contains `useEffect` hooks
- **constants**: only contains constants
- **service**: only contains service calls
- **type**: only contains type definitions
- **utils**: only contains independent (pure) functions

## No Duplicate Exports

- A file MUST NOT re-export something that belongs to another file
  - Bad: helper file re-exports a function from another helper
  - Bad: selector file re-exports state/selector from another store/selector



## Destructuring

- Always use destructuring when consuming state/helper
  ```ts
  // Good
  const { loadFolderItems, openFolderItem, createTaskNote } = useTaskWorkspaceItemHelper();

  // Bad — no alias
  const { loadFolderItems: loadData } = useTaskWorkspaceItemHelper();
  ```
- Do NOT use aliases when destructuring
- Exception: special cases like `useConsoleHelper`

## Performance
- Do NOT wrap functions in `memo`/`useMemo` inside helper files unless truly necessary

## State Management

Two patterns are used in this codebase. Pick the right one:

### Zustand — for stores read outside React or shared cross-feature

Use Zustand when ANY of these apply:
- The store is read by module-registry handlers (`onTabActivate`, `onTabClose`, `buildBreadcrumb`) or other code that runs outside a React component
- Multiple features depend on the same store (cross-feature)
- The store is large/frequently-updated and Provider re-render storms would hurt
- You need an imperative `getState()` / `subscribe()` API

Pattern (see `src/shell/store/EditorTab.store.tsx` as reference):

```ts
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { zSetter } from "@/shared";

const _store = create<MyStoreData>((set, get) => ({
    foo: 0,
    setFoo: zSetter("foo", set, get),  // mimics Dispatch<SetStateAction<T>>
    // ...
}));

export const useMyStore = () => _store(useShallow((s) => s));
export const getMyState = () => _store.getState();
export const subscribeMyState = _store.subscribe;
```

- Hook destructure works unchanged: `const { foo, setFoo } = useMyStore();`
- `useShallow(s => s)` returns whole state shallow-compared — re-renders only when a top-level field changes
- `zSetter` (from `@/shared`) preserves the `Dispatch<SetStateAction<T>>` API so `setX(value)` and `setX(prev => next)` both work
- Refs (DOM refs, ref objects passed across components) live as **module-level mutable objects**, NOT in Zustand state — they should never trigger re-renders
- **No Provider needed** — do NOT wrap children in any provider for Zustand stores

### React Context — for narrow-scope local state

Keep using React Context only for:
- Theme / locale / auth (low-frequency, app-wide config)
- Truly local state (e.g. a wizard's step state) where a specific subtree is the natural scope

If you find yourself writing `getXState` / `subscribe` workarounds for a Context store, that's a signal to migrate it to Zustand.

## Module Registry Handlers

Modules contribute behaviour to the shell via `ModuleDefinition` (see `src/shell/types/moduleRegistry.type.ts`). Handlers come in two flavours:

- **Plain functions** (`onTabActivate`, `onTabClose`, `buildBreadcrumb`): run **outside** React. Read store state via Zustand `getXState()` accessors. Easy to unit-test, no React lifecycle to worry about.
- **Hooks** (`useGlobalInit`, `useShortcuts`, `useIsInModule`, `useGetBackButton`, `useSaveActions`, `usePanelTabs`, `useBreadcrumbTrigger`, `useOnBeforeModuleSwitch`): run **inside** React, one isolated `<ModuleHandlerRunner>`-style component per module.

When adding a new handler type, prefer the plain-function form unless you genuinely need React lifecycle (subscriptions, refs, render-time DOM access).

## Import Architecture (enforced by ESLint)

Dependency direction: `features → shell`, `features → shared`, `shell → shared`

- **features**: can import from `@/features/X` (index only), `@/shell` (index only), `@/shared` (index only)
- **shell**: same as a feature — can import from feature indexes and `@/shared` index; no subdirectory imports
- **shared**: fully independent — CANNOT import from any feature or shell at all
- **Cross-boundary imports MUST go through the index barrel file (except types and constants)** — never import from subdirectories (`@/features/X/store/foo`, `@/shell/hooks/bar`, etc.)
- **Exception**: `index.ts` barrel files themselves may import freely for re-exporting
- **To add a new feature**: add its name to `FEATURES` array in `.eslintrc.js`
