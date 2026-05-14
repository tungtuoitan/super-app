---
name: sa-system
description: System overview for SuperApp — FE, BE, DB, production server, ports, URLs, and key config at a glance.
---

# SuperApp — System Overview

Use this as a reference when you need to know where things live, what runs where, and how the pieces connect.

---

## Repositories

| Layer | Local Path |
|-------|-----------|
| Frontend | `C:\Users\Admin\source\SuperApp` |
| Backend | `C:\Users\Admin\source\Timeline` |

---

## Frontend

| Detail | Value |
|--------|-------|
| Framework | React 18.3.1 (CRA + Craco) |
| Language | TypeScript 4.9.5 |
| Dev server port | **3000** |
| Storybook port | **6006** |
| State management | Zustand 5 |
| UI libraries | MUI 7, Radix UI, TailwindCSS 3 |
| Rich text editor | Tiptap 3 (see `/richtext-editor` skill) |
| Routing | React Router DOM 6 |
| Forms | React Hook Form 7 + Zod 4 |
| HTTP | `apiFetch` wrapper (shared) — base URL from `config/app.config.ts` |
| Build | `npm run build` (craco build) |
| Dev start | `npm start` |

**API base URL config (`config/app.config.ts`):**
- Dev: `http://localhost:5000`
- Prod: `http://157.66.101.51:5000`

**Key env vars (`.env.development.local`):**
```
REACT_APP_LOCAL_API_URL=http://localhost:5000
REACT_APP_PRO_API_URL=http://157.66.101.51:5000
REACT_APP_GOOGLE_CLIENT_ID=887853390661-...
PORT=3000
```

---

## Backend

| Detail | Value |
|--------|-------|
| Framework | ASP.NET Core .NET 8 (Kestrel) |
| Language | C# |
| API port | **5000** |
| Solution file | `Timeline\SuperApp-Service.sln` |
| Main project | `Timeline\SuperAppAPI\SuperAppAPI.csproj` |
| Dev start | `dotnet run` inside `SuperAppAPI/` |
| ORM | Entity Framework Core (SQL Server provider) |
| Auth | JWT Bearer + Google OAuth 2.0 |
| Logging | Serilog — daily rolling file in `Logs/superapp-{date}.log` |
| Config | `.env` file at repo root (loaded by DotNetEnv) |

**Project layers:**

| Project | Purpose |
|---------|---------|
| `SuperAppAPI` | Controllers, middleware, DI wiring |
| `SuperAppServices` | Business logic services |
| `SuperAppDataRepositories` | EF Core DbContext, repositories |
| `SuperAppModels` | Domain models, DTOs |

**Key JWT config:**
- Dev issuer: `SuperApp-Development` / audience: `SuperApp-API-Development` / expiry: 15 min
- Prod issuer: `SuperApp-Production` / audience: `SuperApp-API-Production` / expiry: 60 min

**Rate limiting:** disabled dev, 60 req/min prod.  
**Max request body:** 50 MB.

---

## Database

| Detail | Value |
|--------|-------|
| Engine | Microsoft SQL Server |
| Host | `157.66.101.51,1433` |
| Auth | SQL Server (`sa` user) |
| Password | `sa` sa; (password: ask user if needed) |
| Dev DB | `SuperApp-dev` |
| Prod DB | `SuperApp-pro` |
| Connection names | `SuperAppConnection`, `UserProfileConnection` (both point to same DB) |
| EF migrations | `Timeline\migrations\` |
| Retry policy | Max 3 retries |
| Command timeout | 120 s |

**Connection string pattern:**
```
Server=157.66.101.51,1433;Database=SuperApp-{dev|pro};User Id=sa;Password=***;
TrustServerCertificate=True;Encrypt=False;Connection Timeout=30;
```

---

## Production Server

| Service | URL |
|---------|-----|
| Server IP | `157.66.101.51` |
| API | `http://157.66.101.51:5000` |
| Frontend | `http://157.66.101.51:3000` |
| Public domain | `https://www.tungle.uk` |
| DB | `157.66.101.51:1433` (SQL Server) |

---

## External Integrations

| Service | Purpose | Key |
|---------|---------|-----|
| Google OAuth 2.0 | Login | Client ID in `.env` / `REACT_APP_GOOGLE_CLIENT_ID` |
| Google Drive | File storage | Scope: `drive.file` |
| OpenRouter AI | LLM inference | Base: `https://openrouter.ai/api/v1` |
| ngrok | Dev OAuth tunneling | `https://unparcelled-geralyn-deutoplasmic.ngrok-free.dev` |

**AI models (OpenRouter):**
- Primary: `nvidia/nemotron-3-super-120b-a12b:free`
- Fallback: `qwen/qwen3.5-35b-a3b`

---

## CORS Allowed Origins

**Development:** `localhost:3000`, `localhost:3001`, `localhost:3003`, `localhost:5000`, ngrok tunnel, `www.tungle.uk`  
**Production:** `157.66.101.51`, `https://157.66.101.51`, `https://www.tungle.uk`

---

## Quick Ports Reference

| Service | Port |
|---------|------|
| React dev server | 3000 |
| .NET API (dev + prod) | 5000 |
| SQL Server | 1433 |
| Storybook | 6006 |

---

## Task

{ARGS}

Use the system context above to answer the question or complete the task. If no args are provided, print this overview as a reference.
