# Code Validation Rules

Validate all new/modified code against these rules before committing.

## Module Structure

- Each module has 5-10 corresponding files: UI, helper, utils, store, selector, headless, constants, service, type
- When a module grows too large, split into submodules
  - Example: module `Task` -> submodules: `TaskLinked`, `TaskChecklist`, `TaskComment`
- if file is small UI component, leave them on /small folder
- File naming convention:
  - **UI**: `ModuleName.tsx` (PascalCase)
  - **helper**: `useModuleName.helper.ts`
  - **headless**: `useModuleName.headless.ts`
  - **selector**: `useModuleName.selector.ts`
  - **store**: `useModuleName.store.ts`
  - **service**: `moduleName.service.ts`
  - **type**: `moduleName.type.ts`
  - **constants**: `moduleName.constants.ts`
  - **utils**: `moduleName.utils.ts`

## File Size

- Maximum 400 lines per file

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

## No Passing state/helper/selector as Params

- Do NOT pass state, helper, or selector as parameters into helper/selector/UI files
- Exception: Reusable components may accept these as props
- If a helper/selector/UI/headless needs data, call the corresponding headless hook directly

## Headless & Params

- helper, selector, UI, and headless files MUST NOT accept params
- If they need data, call headless hooks directly inside

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

## UI file rule
- each UI file contain max 1 big component

## Vị trí lưu file
src/
├── Components/                      # chỉ chứa file UI
├── hooks/                           # chỉ chứa file helper
├── HeadlessComponents/              # chỉ chứa file headless
├── Selectors/                       # chỉ chứa file selectors
├── store/                           # chỉ chứa file store
├── services/                        # chỉ chứa file service
├── types/                           # chỉ chứa file type
│
├── utils/                           # Pure utility functions
