# 🎯 COPILOT INSTRUCTIONS - SuperApp Frontend

> **Philosophy**: Simple, Maintainable, Scalable  
> **Pattern**: React Query + Context + Feature-first Architecture

## 📚 Documentation

- **[ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - Layers, folder structure, service patterns
- **[STATE_MANAGEMENT.md](../docs/STATE_MANAGEMENT.md)** - React Query, Context
- **[TYPE_SAFETY.md](../docs/TYPE_SAFETY.md)** - TypeScript patterns
- **[ERROR_HANDLING.md](../docs/ERROR_HANDLING.md)** - Error boundaries, API errors
- **[DATA_TYPES.md](../docs/DATA_TYPES.md)** - Type transformation
- **[COMMON_PATTERNS.md](../docs/COMMON_PATTERNS.md)** - Anti-patterns & best practices

---

## 🎯 Core Principles

1. **Simple > Clever**: Code rõ ràng hơn code thông minh
2. **Explicit > Implicit**: Tên biến/hàm mô tả rõ mục đích
3. **Colocation > Abstraction**: Code liên quan ở gần nhau
4. **Standard > Custom**: Dùng thư viện chuẩn, không wrap không cần thiết
5. **Design System Consistency**: Dùng theme tokens, không hardcode
6. "Explorer" component chính là "Workspace" component

---

## 🏗️ Architecture

### Layer Flow
```
Component → React Query → Service → API Client → Backend
```

### State Decision Matrix

| State Type | Solution | Example |
|------------|----------|---------|
| **Server** | React Query | API data, cache |
| **Global UI** | Context (Main.tsx) | Auth, theme |
| **Feature UI** | Context (Main.tsx) | Filters, dialogs |
| **Local** | useState | Inputs, toggles |
| **URL** | Router params | Shareable state |

### Folder Structure

```
src/
├── features/[name]/        # Domain modules
│   ├── components/         # Feature UI
│   ├── hooks/             # React Query hooks
│   ├── services/          # API calls
│   ├── store/             # Feature Context
│   └── types/             # Types & DTOs
├── shared/
│   ├── components/ui/     # Reusable UI
│   ├── hooks/             # Generic hooks
│   └── types/             # Shared types
└── lib/
    ├── api-client.ts      # Axios/Fetch
    ├── react-query.ts     # QueryClient
    └── theme/             # MUI theme tokens
```

---

## 🔄 Common Patterns

### 1. Data Fetching
```typescript
// features/notes/hooks/useNotes.ts
export function useNotes() {
    return useQuery({
        queryKey: ['notes'],
        queryFn: noteService.getNotes,
        staleTime: 5 * 60 * 1000,
    });
}

// Component
const { data: notes, isLoading, error } = useNotes();
```

### 2. Data Mutation
```typescript
export function useCreateNote() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: noteService.createNote,
        onSuccess: () => queryClient.invalidateQueries(['notes']),
    });
}
```

### 3. Service Pattern
```typescript
class NoteService {
    private basePath = '/api/notes';
    
    async getNotes(): Promise<Note[]> {
        return apiClient.get<Note[]>(this.basePath);
    }
    
    async createNote(data: CreateNoteDTO): Promise<Note> {
        return apiClient.post<Note>(this.basePath, data);
    }
}
export const noteService = new NoteService();
```

### 4. Context Pattern
```typescript
// features/notes/store/NoteUIContext.tsx
const NoteUIContext = createContext<NoteUIValue | null>(null);

export function NoteDetailProvider({ children }) {
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    return (
        <NoteUIContext.Provider value={{ selectedNote, setSelectedNote }}>
            {children}
        </NoteUIContext.Provider>
    );
}

export function useNoteDetailStore() {
    const ctx = useContext(NoteUIContext);
    if (!ctx) throw new Error('useNoteDetailStore requires NoteDetailProvider');
    return ctx;
}
```

### 5. Centralized Providers (Main.tsx)
```typescript
function Main() {
    return (
        <QueryClientProvider>
            <AuthProvider>
                <NoteDetailProvider>
                    <App />
                </NoteDetailProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
```

---

## 🎯 Code Style

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `NoteCard` |
| Hooks | use + camelCase | `useNotes` |
| Functions | camelCase | `createNote` |
| Types | PascalCase | `Note`, `CreateNoteDTO` |
| Constants | UPPER_SNAKE | `API_BASE_URL` |
| Files | Match export | `NoteCard.tsx` |

### Import Order
1. React
2. External libs
3. Internal (@/ aliases - MANDATORY)
4. Relative (same dir only)

### Import Rules
```typescript
// ❌ Never relative for shared/features
import { Button } from '../../../shared/ui/Button'

// ✅ Always @ aliases
import { Button } from '@/shared/components/ui/Button'
import { useNotes } from '@/features/notes/hooks/useNotes'
```

---

## ✅ Best Practices

1. **Components**: <200 dòng, single responsibility
2. **Server State**: Luôn dùng React Query, không useState + useEffect
3. **Colocation**: Code liên quan trong cùng folder
4. **Error Handling**: Try/catch mutations, error boundaries cho queries
5. **Type Safety**: Type tất cả params, returns, props
6. **Service Layer**: Thin services, chỉ API calls + transform
7. **Context**: Chỉ UI state, không server data

---

## 🚫 Anti-Patterns

1. **Context cho server state** → Dùng React Query
2. **Derived state** → Tính trực tiếp hoặc useMemo
3. **Prop drilling** → Context
4. **Wrapper hooks** → Dùng React Query direct
5. **useEffect cho fetch** → React Query
6. **Type any** → Proper types hoặc unknown
7. **Index as key** → Unique ID
8. **Inline styles** → sx hoặc styled
9. **Hardcoded values** → Theme tokens
10. **Relative imports** → @ aliases

---

## 🔧 New Feature Checklist

```bash
# 1. Structure
src/features/[name]/{components,hooks,services,store,types}

# 2. Order
types → service → hooks → context → components → public API

# 3. Integration
Add provider to Main.tsx (nếu cần context)
```

---

## 📖 When to Read Docs

| Need | Doc |
|------|-----|
| System design | ARCHITECTURE.md |
| State management | STATE_MANAGEMENT.md |
| TypeScript | TYPE_SAFETY.md |
| Errors | ERROR_HANDLING.md |
| Data transform | DATA_TYPES.md |
| Examples | COMMON_PATTERNS.md |

---

## 🆘 Quick Decisions

**Context vs React Query?**  
→ Server data = Query, UI state = Context

**Custom hook?**  
→ Chỉ khi reuse hoặc logic phức tạp

**Component size?**  
→ >200 dòng = tách nhỏ

**sx vs styled()?**  
→ sx = layout/spacing, styled = reusable/complex

---

**Remember**: Simple > Clever, Explicit > Implicit, Standard > Custom

🚀