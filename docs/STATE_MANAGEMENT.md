# 🔄 STATE MANAGEMENT - Data & UI State Patterns

> **Philosophy**: Use the right tool for the right job. Server state ≠ UI state.

---

## 🎯 State Categories

### State Decision Matrix

| State Type | Solution | When to Use | Example |
|-----------|----------|-------------|---------|
| **Server State** | React Query | Data from API | Notes list, user profile |
| **Global UI** | Context | Shared across app | Auth, theme, navigation |
| **Feature UI** | Context | Feature-specific | Note filters, dialog state |
| **Local UI** | useState | Component only | Form input, toggle |
| **URL State** | React Router | Shareable state | Page number, filters |
| **Form State** | React Hook Form | Complex forms | Note editor, settings |

---

## 🚀 React Query (Server State)

### Setup

```typescript
// lib/react-query.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

// main.tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/react-query'

<QueryClientProvider client={queryClient}>
    <App />
</QueryClientProvider>
```

---

### Query Hooks (GET)

#### Basic Query

```typescript
// features/notes/hooks/useNotes.ts
import { useQuery } from '@tanstack/react-query'
import { noteService } from '../services/noteService'
import type { GetNotesParams } from '../types/note.types'

export function useNotes(params?: GetNotesParams) {
    return useQuery({
        queryKey: ['notes', params],
        queryFn: () => noteService.getNotes(params),
    })
}

// Usage
function NotesList() {
    const { data: notes, isLoading, error } = useNotes({ archived: false })
    
    if (isLoading) return <Spinner />
    if (error) return <ErrorAlert error={error} />
    
    return <NoteGrid notes={notes} />
}
```

#### Single Item Query

```typescript
// features/notes/hooks/useNote.ts
export function useNote(id: number, enabled = true) {
    return useQuery({
        queryKey: ['notes', id],
        queryFn: () => noteService.getNoteById(id),
        enabled, // Only fetch when enabled is true
    })
}

// Usage
function NoteDetail({ noteId }: { noteId: number }) {
    const { data: note, isLoading } = useNote(noteId)
    
    if (isLoading) return <Spinner />
    if (!note) return <div>Note not found</div>
    
    return <NoteCard note={note} />
}
```

#### Dependent Queries

```typescript
// First query
const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: userService.getCurrentUser,
})

// Second query depends on first
const { data: notes } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: () => noteService.getNotesByUser(user!.id),
    enabled: !!user, // Only run when user exists
})
```

---

### Mutation Hooks (POST, PUT, DELETE)

#### Create Mutation

```typescript
// features/notes/hooks/useCreateNote.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { noteService } from '../services/noteService'
import type { CreateNoteDTO } from '../types/note.types'

export function useCreateNote() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: (data: CreateNoteDTO) => noteService.createNote(data),
        onSuccess: () => {
            // Invalidate and refetch notes list
            queryClient.invalidateQueries({ queryKey: ['notes'] })
        },
    })
}

// Usage
function CreateNoteButton() {
    const createNote = useCreateNote()
    
    const handleClick = async () => {
        try {
            await createNote.mutateAsync({
                name: 'New Note',
                description: 'Description',
            })
            toast.success('Note created!')
        } catch (error) {
            toast.error('Failed to create note')
        }
    }
    
    return (
        <Button 
            onClick={handleClick}
            disabled={createNote.isPending}
        >
            {createNote.isPending ? 'Creating...' : 'Create Note'}
        </Button>
    )
}
```

#### Update Mutation

```typescript
// features/notes/hooks/useUpdateNote.ts
export function useUpdateNote() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateNoteDTO }) =>
            noteService.updateNote(id, data),
        onSuccess: (_, { id }) => {
            // Invalidate specific note and list
            queryClient.invalidateQueries({ queryKey: ['notes', id] })
            queryClient.invalidateQueries({ queryKey: ['notes'] })
        },
    })
}

// Usage
function NoteEditor({ note }: { note: Note }) {
    const updateNote = useUpdateNote()
    
    const handleSave = async (data: UpdateNoteDTO) => {
        await updateNote.mutateAsync({ id: note.id, data })
    }
    
    return <NoteForm initialData={note} onSubmit={handleSave} />
}
```

#### Delete Mutation

```typescript
// features/notes/hooks/useDeleteNote.ts
export function useDeleteNote() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: (id: number) => noteService.deleteNote(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes'] })
        },
    })
}
```

---

### Optimistic Updates

```typescript
export function useUpdateNote() {
    const queryClient = useQueryClient()
    
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateNoteDTO }) =>
            noteService.updateNote(id, data),
            
        // Before mutation
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['notes', id] })
            
            // Snapshot current value
            const previousNote = queryClient.getQueryData(['notes', id])
            
            // Optimistically update
            queryClient.setQueryData(['notes', id], (old: Note) => ({
                ...old,
                ...data,
            }))
            
            return { previousNote }
        },
        
        // On error, rollback
        onError: (err, { id }, context) => {
            queryClient.setQueryData(['notes', id], context?.previousNote)
        },
        
        // Always refetch after error or success
        onSettled: (_, __, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['notes', id] })
        },
    })
}
```

---

### Query Keys Pattern

```typescript
// features/notes/hooks/noteKeys.ts
export const noteKeys = {
    all: ['notes'] as const,
    lists: () => [...noteKeys.all, 'list'] as const,
    list: (params?: GetNotesParams) => [...noteKeys.lists(), params] as const,
    details: () => [...noteKeys.all, 'detail'] as const,
    detail: (id: number) => [...noteKeys.details(), id] as const,
}

// Usage
export function useNotes(params?: GetNotesParams) {
    return useQuery({
        queryKey: noteKeys.list(params), // ['notes', 'list', params]
        queryFn: () => noteService.getNotes(params),
    })
}

// Invalidate all notes
queryClient.invalidateQueries({ queryKey: noteKeys.all })

// Invalidate specific note
queryClient.invalidateQueries({ queryKey: noteKeys.detail(5) })
```

---

## 🌐 Context (Global UI State)

### When to Use Context

**✅ Good use cases:**
- Authentication state
- Theme/dark mode
- Language/i18n
- Navigation state
- Global modals/toasts

**❌ Bad use cases:**
- Server data (use React Query)
- Form state (use React Hook Form)
- Local component state (use useState)

---

### Context Pattern

```typescript
// shared/store/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '@/shared/types/user.types'

interface AuthContextValue {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    
    // Initialize auth state
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            // Verify token and load user
            authService.verifyToken(token)
                .then(setUser)
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setIsLoading(false))
        } else {
            setIsLoading(false)
        }
    }, [])
    
    const login = async (email: string, password: string) => {
        const response = await authService.login({ email, password })
        setUser(response.user)
        localStorage.setItem('token', response.token)
    }
    
    const logout = () => {
        setUser(null)
        localStorage.removeItem('token')
    }
    
    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
    }
    
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

// Hook with error checking
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
```

---

## 🎨 Feature Context (Feature UI State)

### Centralized Provider Pattern

**🎯 IMPORTANT**: All Context providers (including feature contexts) should be centralized in `Main.tsx` to enable cross-feature data sharing and maintain a single source of truth.

### Pattern for Feature-Specific UI State

```typescript
// features/notes/store/NoteUIContext.tsx
import { createContext, useContext, useState } from 'react'
import type { Note, NoteFilters } from '../types/note.types'

interface NoteUIContextValue {
    // Dialog state
    selectedNote: Note | null
    isDialogOpen: boolean
    openDialog: (note: Note) => void
    closeDialog: () => void
    
    // Filter state
    filters: NoteFilters
    setFilters: (filters: NoteFilters) => void
    
    // Pagination state
    page: number
    pageSize: number
    setPage: (page: number) => void
    setPageSize: (size: number) => void
}

const NoteUIContext = createContext<NoteUIContextValue | null>(null)

export function NoteUIProvider({ children }: { children: React.ReactNode }) {
    // Dialog state
    const [selectedNote, setSelectedNote] = useState<Note | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    
    // Filter state
    const [filters, setFilters] = useState<NoteFilters>({
        archived: false,
        type: undefined,
    })
    
    // Pagination state
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(25)
    
    const openDialog = (note: Note) => {
        setSelectedNote(note)
        setIsDialogOpen(true)
    }
    
    const closeDialog = () => {
        setIsDialogOpen(false)
        setTimeout(() => setSelectedNote(null), 200)
    }
    
    const value = {
        selectedNote,
        isDialogOpen,
        openDialog,
        closeDialog,
        filters,
        setFilters,
        page,
        pageSize,
        setPage,
        setPageSize,
    }
    
    return (
        <NoteUIContext.Provider value={value}>
            {children}
        </NoteUIContext.Provider>
    )
}

export function useNoteUI() {
    const context = useContext(NoteUIContext)
    if (!context) {
        throw new Error('useNoteUI must be used within NoteUIProvider')
    }
    return context
}
```

### Centralized Provider Setup

All providers must be centralized in `Main.tsx`:

```typescript
// Main.tsx - Centralized Provider Setup
function Main() {
    return (
        <BrowserRouter>
            <SnackbarProvider autoHideDuration={3000}>
                <AuthProvider>
                    <NoteUIProvider>
                        <DialogProvider>
                            <MainNav />
                        </DialogProvider>
                    </NoteUIProvider>
                </AuthProvider>
            </SnackbarProvider>
        </BrowserRouter>
    );
}
```

**Benefits of Centralized Providers:**
- **Cross-Feature Sharing**: Any component can access any context
- **Single Source of Truth**: All app state in one place
- **Easier Debugging**: Clear provider hierarchy
- **Consistent Access**: No need to wrap individual pages

### Page Implementation (No Provider Wrapping)

```typescript
// pages/NotesPage.tsx - Direct context usage
export function NotesPage() {
    return (
        <ErrorBoundary>
            <NotesPageContent />
        </ErrorBoundary>
    );
}

function NotesPageContent() {
    // Direct access to centralized contexts
    const { filters, page, pageSize } = useNoteUI();
    const { data: notes, isLoading } = useNotes({ ...filters, page, pageSize });
    
    return (
        <div>
            <NoteFilters />
            <NoteGrid notes={notes} loading={isLoading} />
            <NotePagination />
            <NoteDialog />
        </div>
    );
}
```

---

## 📝 Local State (useState)

### When to Use useState

**✅ Use for:**
- Form inputs
- Toggle states
- Local UI state (collapsed/expanded)
- Component-specific state

**❌ Don't use for:**
- Server data
- Shared state across components
- State that needs persistence

### Examples

```typescript
// Toggle state
function Collapsible({ children }: { children: React.ReactNode }) {
    const [isExpanded, setIsExpanded] = useState(false)
    
    return (
        <div>
            <button onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? 'Collapse' : 'Expand'}
            </button>
            {isExpanded && <div>{children}</div>}
        </div>
    )
}

// Form input
function SearchBar() {
    const [searchText, setSearchText] = useState('')
    
    return (
        <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search..."
        />
    )
}

// Multiple related states
function NoteEditor() {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [tags, setTags] = useState<string[]>([])
    
    return (
        <form>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            {/* ... */}
        </form>
    )
}
```

---

## 🎛️ Complex Local State (useReducer)

### When to Use useReducer

**✅ Use when:**
- Multiple related state values
- Complex state logic
- Next state depends on previous
- Want to test state logic separately

```typescript
// State type
interface NoteFormState {
    title: string
    description: string
    tags: string[]
    isSubmitting: boolean
    error: string | null
}

// Actions
type NoteFormAction =
    | { type: 'SET_TITLE'; payload: string }
    | { type: 'SET_DESCRIPTION'; payload: string }
    | { type: 'ADD_TAG'; payload: string }
    | { type: 'REMOVE_TAG'; payload: string }
    | { type: 'SUBMIT_START' }
    | { type: 'SUBMIT_SUCCESS' }
    | { type: 'SUBMIT_ERROR'; payload: string }
    | { type: 'RESET' }

// Reducer
function noteFormReducer(state: NoteFormState, action: NoteFormAction): NoteFormState {
    switch (action.type) {
        case 'SET_TITLE':
            return { ...state, title: action.payload }
        case 'SET_DESCRIPTION':
            return { ...state, description: action.payload }
        case 'ADD_TAG':
            return { ...state, tags: [...state.tags, action.payload] }
        case 'REMOVE_TAG':
            return { ...state, tags: state.tags.filter(t => t !== action.payload) }
        case 'SUBMIT_START':
            return { ...state, isSubmitting: true, error: null }
        case 'SUBMIT_SUCCESS':
            return { ...state, isSubmitting: false }
        case 'SUBMIT_ERROR':
            return { ...state, isSubmitting: false, error: action.payload }
        case 'RESET':
            return initialState
        default:
            return state
    }
}

// Usage
function NoteForm() {
    const [state, dispatch] = useReducer(noteFormReducer, {
        title: '',
        description: '',
        tags: [],
        isSubmitting: false,
        error: null,
    })
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        dispatch({ type: 'SUBMIT_START' })
        
        try {
            await noteService.createNote({
                title: state.title,
                description: state.description,
                tags: state.tags,
            })
            dispatch({ type: 'SUBMIT_SUCCESS' })
            dispatch({ type: 'RESET' })
        } catch (error) {
            dispatch({ type: 'SUBMIT_ERROR', payload: error.message })
        }
    }
    
    return (
        <form onSubmit={handleSubmit}>
            <input
                value={state.title}
                onChange={(e) => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
            />
            {/* ... */}
        </form>
    )
}
```

---

## 🔗 URL State (React Router)

### When to Use URL State

**✅ Use for:**
- Page numbers
- Search queries
- Filter values
- Tab selections
- Anything that should be shareable via URL

```typescript
import { useSearchParams } from 'react-router-dom'

function NotesList() {
    const [searchParams, setSearchParams] = useSearchParams()
    
    // Read from URL
    const page = Number(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || undefined
    
    // Fetch with URL params
    const { data: notes } = useNotes({ page, search, type })
    
    // Update URL
    const handlePageChange = (newPage: number) => {
        setSearchParams({ page: String(newPage), search, type: type || '' })
    }
    
    const handleSearchChange = (newSearch: string) => {
        setSearchParams({ page: '1', search: newSearch, type: type || '' })
    }
    
    return (
        <div>
            <SearchBar value={search} onChange={handleSearchChange} />
            <NoteGrid notes={notes} />
            <Pagination page={page} onChange={handlePageChange} />
        </div>
    )
}
```

---

## 📋 Form State (React Hook Form)

### When to Use React Hook Form

**✅ Use for:**
- Forms with validation
- Multiple fields
- Complex validation rules
- Need performance (less re-renders)

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Validation schema
const noteSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(1000).optional(),
    tags: z.array(z.string()).optional(),
    type: z.enum(['meeting', 'brainstorm', 'research']).optional(),
})

type NoteFormData = z.infer<typeof noteSchema>

function NoteForm({ onSubmit }: { onSubmit: (data: NoteFormData) => void }) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<NoteFormData>({
        resolver: zodResolver(noteSchema),
        defaultValues: {
            title: '',
            description: '',
            tags: [],
        },
    })
    
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <input {...register('title')} />
                {errors.title && <span>{errors.title.message}</span>}
            </div>
            
            <div>
                <textarea {...register('description')} />
                {errors.description && <span>{errors.description.message}</span>}
            </div>
            
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
            </button>
        </form>
    )
}
```

---

## 🎯 State Best Practices

### 1. **Don't Store Derived State**

```typescript
// ❌ BAD: Storing derived state
function NotesList() {
    const [notes, setNotes] = useState<Note[]>([])
    const [activeNotes, setActiveNotes] = useState<Note[]>([])
    
    useEffect(() => {
        setActiveNotes(notes.filter(n => !n.archived))
    }, [notes])
}

// ✅ GOOD: Calculate on the fly
function NotesList() {
    const [notes, setNotes] = useState<Note[]>([])
    const activeNotes = notes.filter(n => !n.archived)
}

// ✅ BETTER: Memoize if expensive
function NotesList() {
    const [notes, setNotes] = useState<Note[]>([])
    const activeNotes = useMemo(
        () => notes.filter(n => !n.archived),
        [notes]
    )
}
```

### 2. **Colocate State**

```typescript
// ❌ BAD: State too high in tree
function App() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    return (
        <div>
            <Header />
            <Sidebar />
            <Content>
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            </Content>
        </div>
    )
}

// ✅ GOOD: State where it's used
function Content() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    return (
        <div>
            <button onClick={() => setIsModalOpen(true)}>Open</button>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    )
}
```

### 3. **Single Source of Truth**

```typescript
// ❌ BAD: Duplicated state
function NoteEditor() {
    const { data: note } = useNote(id)
    const [localNote, setLocalNote] = useState(note) // Duplicate!
}

// ✅ GOOD: Single source
function NoteEditor() {
    const { data: note } = useNote(id)
    const [editedFields, setEditedFields] = useState({})
    
    const displayNote = { ...note, ...editedFields }
}
```

### 4. **Avoid State Sync**

```typescript
// ❌ BAD: Syncing props to state
function NoteCard({ note }: { note: Note }) {
    const [localNote, setLocalNote] = useState(note)
    
    useEffect(() => {
        setLocalNote(note) // Anti-pattern!
    }, [note])
}

// ✅ GOOD: Use props directly
function NoteCard({ note }: { note: Note }) {
    return <div>{note.title}</div>
}

// ✅ GOOD: Only store edited values
function NoteCard({ note }: { note: Note }) {
    const [editedTitle, setEditedTitle] = useState<string | null>(null)
    
    const displayTitle = editedTitle ?? note.title
}
```

---

## 🔄 State Flow Patterns

### Pattern 1: Server State → UI

```typescript
function NotesList() {
    // 1. Fetch from server (React Query)
    const { data: notes, isLoading } = useNotes()
    
    // 2. Local UI state
    const [selectedId, setSelectedId] = useState<number | null>(null)
    
    // 3. Derived state
    const selectedNote = notes?.find(n => n.id === selectedId)
    
    return (
        <div>
            <NoteGrid 
                notes={notes} 
                onSelect={setSelectedId}
            />
            {selectedNote && <NoteDetail note={selectedNote} />}
        </div>
    )
}
```

### Pattern 2: User Input → Server

```typescript
function CreateNoteButton() {
    // 1. Local form state
    const [title, setTitle] = useState('')
    
    // 2. Mutation hook
    const createNote = useCreateNote()
    
    // 3. Submit to server
    const handleSubmit = async () => {
        await createNote.mutateAsync({ title })
        setTitle('') // Reset form
    }
    
    return (
        <div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <button onClick={handleSubmit}>Create</button>
        </div>
    )
}
```

### Pattern 3: Multi-Step Form

```typescript
function MultiStepForm() {
    // Step state
    const [currentStep, setCurrentStep] = useState(1)
    
    // Form data (accumulated across steps)
    const [formData, setFormData] = useState({
        step1: {},
        step2: {},
        step3: {},
    })
    
    const updateStep1 = (data: Step1Data) => {
        setFormData(prev => ({ ...prev, step1: data }))
        setCurrentStep(2)
    }
    
    const updateStep2 = (data: Step2Data) => {
        setFormData(prev => ({ ...prev, step2: data }))
        setCurrentStep(3)
    }
    
    const handleFinalSubmit = async () => {
        await createNote.mutateAsync({
            ...formData.step1,
            ...formData.step2,
            ...formData.step3,
        })
    }
    
    return (
        <div>
            {currentStep === 1 && <Step1 onNext={updateStep1} />}
            {currentStep === 2 && <Step2 onNext={updateStep2} />}
            {currentStep === 3 && <Step3 onSubmit={handleFinalSubmit} />}
        </div>
    )
}
```

---

## 🎨 Custom Hooks for State Logic

### Encapsulating Complex State

```typescript
// features/notes/hooks/useNoteFilters.ts
interface NoteFilters {
    search: string
    type?: string
    archived: boolean
}

export function useNoteFilters() {
    const [filters, setFilters] = useState<NoteFilters>({
        search: '',
        type: undefined,
        archived: false,
    })
    
    const setSearch = (search: string) => {
        setFilters(prev => ({ ...prev, search }))
    }
    
    const setType = (type: string | undefined) => {
        setFilters(prev => ({ ...prev, type }))
    }
    
    const toggleArchived = () => {
        setFilters(prev => ({ ...prev, archived: !prev.archived }))
    }
    
    const resetFilters = () => {
        setFilters({ search: '', type: undefined, archived: false })
    }
    
    return {
        filters,
        setSearch,
        setType,
        toggleArchived,
        resetFilters,
    }
}

// Usage
function NoteFilters() {
    const { filters, setSearch, setType, toggleArchived, resetFilters } = useNoteFilters()
    
    return (
        <div>
            <input value={filters.search} onChange={(e) => setSearch(e.target.value)} />
            <select value={filters.type} onChange={(e) => setType(e.target.value)}>
                {/* options */}
            </select>
            <button onClick={toggleArchived}>
                {filters.archived ? 'Show Active' : 'Show Archived'}
            </button>
            <button onClick={resetFilters}>Reset</button>
        </div>
    )
}
```

---

## 📊 State Management Decision Tree

```
Do you need state?
├─ Is it from an API?
│  └─ YES → Use React Query
│
├─ Is it in the URL?
│  └─ YES → Use useSearchParams
│
├─ Is it a form?
│  ├─ Simple (1-3 fields) → useState
│  └─ Complex (validation, many fields) → React Hook Form
│
├─ Is it shared across the whole app?
│  └─ YES → Context (AuthContext, ThemeContext)
│
├─ Is it shared within a feature?
│  └─ YES → Feature Context (NoteUIContext)
│
└─ Is it local to a component?
   ├─ Simple → useState
   └─ Complex → useReducer
```

---

## 🚫 Anti-Patterns

### 1. **Using Context for Server State**

```typescript
// ❌ BAD: Server state in Context
function NotesProvider({ children }) {
    const [notes, setNotes] = useState([])
    const [loading, setLoading] = useState(false)
    
    useEffect(() => {
        setLoading(true)
        fetch('/api/notes')
            .then(res => res.json())
            .then(setNotes)
            .finally(() => setLoading(false))
    }, [])
    
    return <NotesContext.Provider value={{ notes, loading }}>{children}</NotesContext.Provider>
}

// ✅ GOOD: Use React Query
function NotesList() {
    const { data: notes, isLoading } = useNotes()
}
```

### 2. **Too Much State in Context**

```typescript
// ❌ BAD: Everything in one Context
interface AppState {
    user: User
    theme: Theme
    notes: Note[]
    settings: Settings
    notifications: Notification[]
    // ... 50 more properties
}

// ✅ GOOD: Split into multiple Contexts
<AuthProvider>
    <ThemeProvider>
        <NotificationProvider>
            <App />
        </NotificationProvider>
    </ThemeProvider>
</AuthProvider>
```

### 3. **Unnecessary State**

```typescript
// ❌ BAD: State for derived value
function UserCard({ user }: { user: User }) {
    const [fullName, setFullName] = useState('')
    
    useEffect(() => {
        setFullName(`${user.firstName} ${user.lastName}`)
    }, [user])
}

// ✅ GOOD: Calculate directly
function UserCard({ user }: { user: User }) {
    const fullName = `${user.firstName} ${user.lastName}`
}
```

---

## 📝 State Checklist

Before adding state, ask:

- [ ] Is this server data? (Use React Query)
- [ ] Does it need to be in the URL? (Use useSearchParams)
- [ ] Is it shared app-wide? (Use Context)
- [ ] Is it feature-specific? (Use Feature Context)
- [ ] Is it local? (Use useState/useReducer)
- [ ] Can it be derived? (Don't store it)
- [ ] Will it cause unnecessary re-renders? (Optimize placement)

---

**Remember**: The best state management is often no state management. Derive when possible, lift when necessary.() {
    return (
        <NoteUIProvider>
            <NotesPageContent />
        </NoteUIProvider>
    )
}

