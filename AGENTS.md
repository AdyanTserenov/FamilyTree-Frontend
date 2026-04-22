# AGENTS.md — FamilyTree Frontend

Permanent context document for sub-agents working on the FamilyTree frontend.

---

## 1. Project Overview

**FamilyTree** is a ВКР (graduation project) at НИУ ВШЭ — a genealogy web application.  
This repository (`FamilyTree-Frontend`) contains the React SPA frontend.

---

## 2. Repository Structure

```
FamilyTree-Frontend/
├── src/
│   ├── api/               # API modules (auth.ts, trees.ts, axiosConfig.ts)
│   ├── components/        # Shared components (Navbar, Layout, ErrorBoundary, ui/)
│   ├── hooks/             # Custom hooks (useNotifications, useVoiceInput, usePageTitle)
│   ├── pages/             # Page components (one per route)
│   ├── store/             # Zustand stores (authStore, notificationStore)
│   ├── types/             # TypeScript interfaces (index.ts)
│   ├── utils/             # Utilities (treeLayout.ts, formatDate.ts, roleUtils.ts, jwtUtils.ts)
│   ├── App.tsx            # Router setup
│   └── main.tsx           # Entry point
├── public/
├── nginx.conf             # nginx config for Docker container
├── Dockerfile             # Multi-stage: Vite build → nginx serve
├── docker-compose.yml     # Frontend container (port 3000)
├── vite.config.ts         # Vite config with dev proxy
└── README.md              # Full frontend documentation
```

---

## 3. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 5 | Build tool |
| TanStack Query (React Query) | v5 | Server state management, caching |
| Zustand | 4 | Client state (auth, notifications) |
| ReactFlow | 11 | Family tree graph visualization |
| Tailwind CSS | 3 | Styling |
| Axios | 1 | HTTP client |
| React Router DOM | 6 | Client-side routing |
| React Hook Form | 7 | Form management |
| react-hot-toast | 2 | Toast notifications |
| html-to-image | — | PNG export |
| jsPDF | — | PDF export |

---

## 4. Infrastructure

### Deployed VM
- **URL**: `http://158.160.55.234:3000`
- **SSH**: `ssh atserenov@158.160.55.234`
- **Project directory on VM**: `~/vkr/FamilyTree-Frontend/`

### Docker Container
- Frontend runs in nginx container on port 3000
- nginx serves the Vite build output
- nginx proxies API calls to backend services:
  - `/api/auth/**` → `familytree-auth:8081` (strips `/api` prefix)
  - `/api/**` → `familytree-tree:8080`

### CI/CD
- GitHub Actions: `.github/workflows/deploy.yml`
- On push to `main`: SSH into VM → `git pull && docker compose build && docker compose up -d`
- Secrets: `VM_HOST`, `VM_USER`, `VM_SSH_KEY`

---

## 5. Local Development

### Prerequisites
- Node.js 18+, npm

### Setup & Run

```bash
cd FamilyTree-Frontend
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build
npm run preview    # Preview production build
npm test           # Run Vitest unit tests
npm run coverage   # Test coverage report
```

### Dev Proxy (vite.config.ts)
In development, Vite proxies API calls:
- `/api/auth` → `http://localhost:8081`
- `/api` → `http://localhost:8080`

---

## 6. Environment Variables

```env
# .env (optional — defaults work for local dev with backend on localhost)
VITE_API_BASE_URL=http://158.160.55.234:3000
```

The frontend uses relative URLs (`/api/...`) so nginx handles routing in production.  
In development, `vite.config.ts` proxy handles it.

---

## 7. API Architecture

### Two Axios Instances (`src/api/axiosConfig.ts`)

| Instance | Base URL | Used For |
|----------|----------|---------|
| `authApi` | `/api/auth` | auth-service endpoints (login, register, profile) |
| `treeApi` | `/api` | tree-service endpoints (trees, persons, media, etc.) |

Both instances have interceptors that:
1. Attach `Authorization: Bearer <token>` from Zustand `authStore`
2. On 401 response: clear auth state and redirect to `/login`
3. Skip auth header for public endpoints (login, register, confirm, reset, public tree)

### API Modules
- `src/api/auth.ts` — auth endpoints (signIn, signUp, getProfile, updateProfile, changePassword, etc.)
- `src/api/trees.ts` — all tree-service endpoints (trees, persons, relationships, media, comments, notifications, AI)

---

## 8. State Management

### authStore (Zustand + persist to localStorage)
```typescript
// src/store/authStore.ts
{
  user: User | null,
  token: string | null,
  setAuth: (user, token) => void,
  clearAuth: () => void,
  updateUser: (user) => void,
}
```
- Persisted to `localStorage` under key `auth-storage`
- Token is read by Axios interceptors on every request

### notificationStore (Zustand, in-memory)
```typescript
// src/store/notificationStore.ts
{
  notifications: Notification[],
  setNotifications: (notifications) => void,
  markAsRead: (id) => void,
  unmarkAsRead: (id) => void,
  markAllAsRead: () => void,
  removeNotification: (id) => void,
}
```
- Optimistic updates: UI updates immediately, then syncs with server

---

## 9. Routing (`src/App.tsx`)

### Public Routes
| Path | Component |
|------|-----------|
| `/` | `LandingPage` |
| `/login` | `LoginPage` |
| `/register` | `RegisterPage` |
| `/forgot-password` | `ForgotPasswordPage` |
| `/reset-password` | `ResetPasswordPage` |
| `/confirm-email` | `ConfirmEmailPage` |
| `/public/tree/:token` | `PublicTreePage` |

### Private Routes (require JWT)
| Path | Component |
|------|-----------|
| `/dashboard` | `DashboardPage` |
| `/trees/:treeId` | `TreePage` |
| `/trees/:treeId/persons/:personId` | `PersonPage` |
| `/profile` | `ProfilePage` |
| `/notifications` | `NotificationsPage` |
| `/accept-invite` | `AcceptInvitePage` |

Route protection: `PrivateRoute` component checks `authStore.token`; redirects to `/login` if absent.

---

## 10. Key Pages

### DashboardPage (`src/pages/DashboardPage.tsx`)
- Lists user's trees with tabs: Все / Мои / Совместные
- Sorting: by name, by date
- Actions per tree: edit name, delete, invite member, get invite link, generate/revoke public link
- Invite menu only shown to OWNER role

### TreePage (`src/pages/TreePage.tsx`)
- Full-screen ReactFlow graph of family tree
- Custom layout algorithm: `src/utils/treeLayout.ts` (NOT dagre)
- Node types: `PersonNode` (person card), `CoupleNode` (virtual node for partnerships)
- Filters panel: by name, gender, alive/deceased, ancestors/descendants
- Export: PNG (`html-to-image`) and PDF (`jsPDF`)
- Add/edit/delete persons and relationships via modals
- Voice input for biography field: `VoiceInputButton` component
- Role-based UI: VIEWER cannot add/edit/delete

### PersonPage (`src/pages/PersonPage.tsx`)
- Tabs: Информация / Связи / Медиа / Комментарии / История / ИИ-анализ
- Media: upload up to 10 files (photo/document/audio/video), download, delete
- Comments: add/edit/delete (edit/delete only for own comments)
- History: audit log of field changes
- AI: biography analysis via YandexGPT (extracts dates, places, professions, events)

### NotificationsPage (`src/pages/NotificationsPage.tsx`)
- Filter tabs: Все / Непрочитанные
- Mark as read (individual or all)
- Delete notifications

### ProfilePage (`src/pages/ProfilePage.tsx`)
- Edit name, email
- Change password
- Resend email verification
- Delete account

---

## 11. Tree Visualization

### Custom Layout (`src/utils/treeLayout.ts`)
- NOT dagre — custom algorithm for family tree layout
- Handles: PARENT/CHILD relationships, PARTNERSHIP (couple nodes), SIBLING
- CoupleNode: virtual node placed between partners, children connect to it

### ReactFlow Setup
- `nodeTypes`: `{ person: PersonNode, couple: CoupleNode }`
- Edges: solid lines for parent/child, dashed for partnership
- Handles: each PersonNode has multiple connection points (top, bottom, left, right)
- Filters applied to nodes/edges before rendering

### Export
- PNG: `html-to-image` captures the ReactFlow container
- PDF: `jsPDF` wraps the PNG
- ⚠️ S3 avatar images cause canvas CORS taint — avatars are excluded from export via `exportImageFilter`

---

## 12. Voice Input

- Component: `src/components/ui/VoiceInputButton.tsx`
- Hook: `src/hooks/useVoiceInput.ts`
- Uses Web Speech API (`SpeechRecognition`)
- Language: Russian (`ru-RU`)
- Used in: TreePage person create/edit modal (biography field)
- Not available in all browsers (Chrome/Edge only)

---

## 13. Testing

- Framework: Vitest + React Testing Library
- Config: `vite.config.ts` (test section)
- Setup: `src/test/setup.ts`
- Test files: `*.test.ts` / `*.test.tsx` co-located with source
- Run: `npm test` or `npm run coverage`

Existing tests:
- `src/store/authStore.test.ts`
- `src/utils/formatDate.test.ts`
- `src/utils/roleUtils.test.ts`
- `src/hooks/useVoiceInput.test.ts`
- `src/components/ui/VoiceInputButton.test.tsx`

---

## 14. Deployment Commands (on VM)

```bash
# SSH into VM
ssh atserenov@158.160.55.234

# Navigate to Frontend repo
cd ~/vkr/FamilyTree-Frontend

# Pull latest changes
git pull

# Rebuild and restart container
docker compose build && docker compose up -d

# View logs
docker compose logs -f

# Check container status
docker compose ps
```

---

## 15. Important Gotchas

1. **Two Axios instances**: `authApi` for auth-service, `treeApi` for tree-service. Do NOT mix them — auth-service and tree-service have different base paths and different response formats.

2. **nginx proxy strips `/api` prefix for auth**: nginx rewrites `/api/auth/sign-in` → `/auth/sign-in` before forwarding to auth-service. The auth-service itself has no `/api` prefix.

3. **TanStack Query v5 syntax**: Uses `{ queryKey, queryFn }` object syntax. `onSuccess`/`onError` callbacks are NOT in `useQuery` options in v5 — use `useEffect` or mutation callbacks instead.

4. **ReactFlow requires fixed height**: The ReactFlow container must have an explicit height (e.g., `h-screen` or `flex-1`). Without it, the graph renders with zero height.

5. **Zustand persist**: `authStore` is persisted to localStorage. On logout, call `clearAuth()` which clears both state and localStorage. Do NOT manually clear localStorage.

6. **Role checks**: Use `src/utils/roleUtils.ts` helpers (`canEdit()`, `canDelete()`, etc.) for consistent role-based UI logic. Role is fetched per-tree via `GET /api/trees/{treeId}/my-role`.

7. **Media file limit**: Max 10 files per person. The upload button is disabled when limit is reached. Server also enforces this limit (returns 400 if exceeded).

8. **Voice input browser support**: `SpeechRecognition` is only available in Chrome/Edge. The `VoiceInputButton` gracefully hides itself if the API is not available.

9. **Public tree page**: `PublicTreePage` uses a separate read-only view without auth. It fetches via `GET /api/trees/public/{token}` which does not require JWT.

10. **ErrorBoundary**: `src/components/ErrorBoundary.tsx` wraps the app in `App.tsx`. Catches React render errors and shows a fallback UI instead of a blank screen.
