# SuperApp — Frontend

A modular, VSCode-style single-page application built with **React 18 + TypeScript**. The app hosts multiple self-contained feature modules (Workspace, Projects, Knowledge, Logs, Notes, Wiki) inside a shared "shell" that provides the activity bar, side bar, editor tabs, panels, and command palette — much like an IDE.

## Tech Stack

- **Framework:** React 18, TypeScript 4.9
- **Build tooling:** Create React App via [CRACO](https://craco.js.org/) (`craco.config.js`)
- **State:** [Zustand](https://github.com/pmndrs/zustand) (per-module stores + selectors)
- **Styling:** Tailwind CSS 3 + [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives), `class-variance-authority`, `tailwind-merge`
- **Data / API:** Axios, `@microsoft/signalr` (real-time)
- **Rich content:** Tiptap editor, Monaco editor, `marked` + `shiki`
- **Data viz / flow:** `@xyflow/react`, `@dagrejs/dagre`, Recharts
- **Tables & trees:** `@tanstack/react-table`, `react-arborist`
- **Forms & validation:** React Hook Form + Zod
- **Routing:** React Router 6
- **Real-time:** SignalR (`@microsoft/signalr`) — used by the K module for repo sync
- **Auth:** Local login + Google OAuth (PKCE), JWT access token + HttpOnly refresh cookie
- **Testing:** `craco test` (Jest via Create React App). Testing Library and Vitest are installed but there are currently no test files in `src/`.
- **Component dev:** Storybook 9 is configured (`npm run storybook`), but no `*.stories.tsx` exist yet.

## Getting Started

### Prerequisites
- Node.js (LTS) and npm

### Install
```bash
npm install
```

### Configure environment
Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `REACT_APP_LOCAL_API_URL` | Backend API base URL (local) |
| `REACT_APP_PRO_API_URL` | Backend API base URL (production) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `REACT_APP_GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |
| `ENVIRONMENT` | Active environment selector |
| `PORT` | Dev server port (default `3000`) |

> In CRA, custom variables **must** be prefixed with `REACT_APP_` to be available in the build.

### Run

```bash
npm start            # dev server (http://localhost:3000)
npm run build        # production build
npm test             # Jest test runner (no tests in src/ yet)
npm run storybook    # Storybook on :6006 (no stories yet)
```

## Architecture

The codebase follows a strict **layered, feature-based architecture** enforced by ESLint.

```
src/
├── App.tsx            # Root component, registers modules (side-effect import)
├── Main.tsx           # Global providers + shell layout
├── features/          # Self-contained feature modules
│   ├── workspace/     #   File/folder workspace explorer
│   ├── project/       #   Projects & tasks
│   ├── taskDetail/    #   Task detail view
│   ├── K/             #   Knowledge module (SRS, Q-Flow, dashboards)
│   ├── Wiki/          #   Wiki graph
│   ├── note/          #   Rich-text notes
│   ├── lifeLog/       #   Life logging & tracking
│   ├── dailyLog/      #   Daily logs
│   └── multiProject/  #   Multi-project views
├── shell/             # VSCode-like host (activity bar, sidebar, tabs, panels,
│                      #   command palette, module registry, generic filter)
└── shared/            # Fully independent utilities (auth, fetch, components,
                       #   icons, file, flow, keyword, userProfile, …)
```

### Dependency direction (enforced by ESLint)

```
features → shell → shared
features → shared
```

- **features** may import from other `@/features/X`, `@/shell`, and `@/shared` — **through their index barrels only**.
- **shell** may import from feature barrels and `@/shared`.
- **shared** is fully independent and must **not** import from any feature or shell.
- Cross-boundary imports go through the `index.ts` barrel — never from subdirectories.
- Exceptions: `import type`, `*.constants.ts`, and `*.types.ts` may be imported directly.

Path aliases are configured in `tsconfig.json` (`@/features/*`, `@/shell`, `@/shared`, …).

### Module system

Feature modules register themselves into the shell via `src/shell/modules.config.ts`. Each module lives at `src/features/<name>/shell/<name>.module.ts` and plugs into the shared shell (ActivityBar, SideBar, EditorArea, Panel) with **no shell changes required**. The same file also registers context menus, filters, and command-palette (keyword navigator) plugins.

To add a new module:
1. Create `src/features/<name>/shell/<name>.module.ts`.
2. Register it in `modules.config.ts`.
3. Add the feature name to the `FEATURES` array in `.eslintrc.js`.

## Code Conventions

Per-module files follow a fixed naming convention (see `CLAUDE.md` for full rules):

| Type | Naming |
| --- | --- |
| UI | `ModuleName.tsx` |
| helper | `useModuleName.helper.ts` |
| headless (effects) | `useModuleName.headless.ts` |
| selector | `useModuleName.selector.ts` |
| store | `useModuleName.store.ts` |
| service | `moduleName.service.ts` |
| type | `moduleName.type.ts` |
| constants | `moduleName.constants.ts` |
| utils | `moduleName.utils.ts` |

Key rules: max **400 lines per file**, single responsibility per file type, no cross-file re-exports, and always destructure without aliases. See [`CLAUDE.md`](CLAUDE.md) and [`BEST_PRACTICES.md`](BEST_PRACTICES.md).

## Related

- `extension/` — companion browser extension (see [`extension/README.md`](extension/README.md))
- `database-objects/` — database object definitions
- `qa-mobile-debug-and-performance.md` — mobile debug & performance notes
